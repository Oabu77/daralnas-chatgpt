"""
QuranChain Pay™ - Main FastAPI Application
© QuranChain™ | Omar Mohammad Abunadi™

Production payment orchestration API.
"""

import os
import uuid
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.schemas import (
    MerchantOnboardRequest, MerchantOnboardResponse, MerchantResponse,
    CreatePaymentIntentRequest, PaymentIntentResponse, ConfirmPaymentRequest,
    PaymentResponse, HealthResponse, ErrorResponse, RailFeesResponse,
    PaymentIntentStatus, PaymentRail,
)
from app.security import APIKeyManager, RateLimiter, ReplayProtection
from app.rail_selector import RailSelector, RailSelection
from app.settlement import (
    SettlementEngine, USDCSettlementProvider, ACHSettlementProvider,
    CardSettlementProvider, SettlementResult,
)

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

# Load from environment
SECRET_KEY = os.getenv("SECRET_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./quranchain_pay.db")
FOUNDER_ROYALTY_PERCENT = Decimal(os.getenv("FOUNDER_ROYALTY_PERCENT", "0.025"))
FOUNDER_USDC_ADDRESS = os.getenv("FOUNDER_USDC_ADDRESS", "")
FOUNDER_ETH_ADDRESS = os.getenv("FOUNDER_ETH_ADDRESS", "")
FOUNDER_BTC_ADDRESS = os.getenv("FOUNDER_BTC_ADDRESS", "")
ETH_RPC_URL = os.getenv("ETH_RPC_URL", "")
POLYGON_RPC_URL = os.getenv("POLYGON_RPC_URL", "")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
ACH_PROVIDER_API_KEY = os.getenv("ACH_PROVIDER_API_KEY", "")
ACH_PROVIDER_URL = os.getenv("ACH_PROVIDER_URL", "")
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# IN-MEMORY STORAGE (Replace with PostgreSQL in production)
# ═══════════════════════════════════════════════════════════════════════════════

merchants_db: Dict[str, Dict] = {}
merchants_by_api_key: Dict[str, str] = {}  # api_key_hash -> merchant_id
payment_intents_db: Dict[str, Dict] = {}
ledger_db: Dict[str, Dict] = {}

# ═══════════════════════════════════════════════════════════════════════════════
# SERVICES
# ═══════════════════════════════════════════════════════════════════════════════

rate_limiter = RateLimiter(
    requests_per_window=RATE_LIMIT_REQUESTS,
    window_seconds=RATE_LIMIT_WINDOW,
)
replay_protection = ReplayProtection()
rail_selector = RailSelector()

# Initialize settlement providers
usdc_provider = USDCSettlementProvider(
    rpc_url=ETH_RPC_URL or "https://eth.llamarpc.com",
    usdc_contract="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    chain_id=1,
) if ETH_RPC_URL else None

ach_provider = ACHSettlementProvider(
    api_key=ACH_PROVIDER_API_KEY,
    api_url=ACH_PROVIDER_URL or "",
) if ACH_PROVIDER_API_KEY else None

card_provider = CardSettlementProvider(
    stripe_secret_key=STRIPE_SECRET_KEY,
) if STRIPE_SECRET_KEY else None

settlement_engine = SettlementEngine(
    usdc_provider=usdc_provider,
    ach_provider=ach_provider,
    card_provider=card_provider,
    founder_royalty_percent=FOUNDER_ROYALTY_PERCENT,
)

# ═══════════════════════════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("╔══════════════════════════════════════════════════════════════╗")
    logger.info("║          QuranChain Pay™ - Starting Production API           ║")
    logger.info("║          © QuranChain™ | Omar Mohammad Abunadi™              ║")
    logger.info("╚══════════════════════════════════════════════════════════════╝")
    yield
    logger.info("QuranChain Pay™ shutting down")


app = FastAPI(
    title="QuranChain Pay™",
    description="Production Payment Orchestration Platform. © QuranChain™ | Omar Mohammad Abunadi™",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════

async def verify_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> Dict:
    """Verify API key and return merchant."""
    if not APIKeyManager.validate_format(x_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key format")
    
    key_hash = APIKeyManager.hash_api_key(x_api_key)
    merchant_id = merchants_by_api_key.get(key_hash)
    
    if not merchant_id:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    merchant = merchants_db.get(merchant_id)
    if not merchant or not merchant.get("is_active"):
        raise HTTPException(status_code=401, detail="Merchant account inactive")
    
    return merchant


async def check_rate_limit(
    request: Request,
    response: Response,
    x_api_key: str = Header(None, alias="X-API-Key"),
):
    """Check rate limit."""
    identifier = x_api_key or request.client.host
    allowed, info = rate_limiter.is_allowed(identifier)
    
    response.headers["X-RateLimit-Limit"] = str(info["limit"])
    response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
    response.headers["X-RateLimit-Reset"] = str(info["reset"])
    
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers=response.headers,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        database="connected",
        rails={
            "usdc": usdc_provider is not None,
            "ach": ach_provider is not None,
            "card": card_provider is not None,
            "btc": False,  # Not yet implemented
        }
    )


# ═══════════════════════════════════════════════════════════════════════════════
# MERCHANT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/merchant/onboard",
    response_model=MerchantOnboardResponse,
    tags=["Merchants"],
    dependencies=[Depends(check_rate_limit)],
)
async def onboard_merchant(request: MerchantOnboardRequest):
    """
    Onboard a new merchant.
    © QuranChain™ | Omar Mohammad Abunadi™
    
    Returns API key (shown only once).
    """
    # Check for duplicate email
    for m in merchants_db.values():
        if m["email"] == request.email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate IDs and API key
    merchant_id = str(uuid.uuid4())
    api_key, api_key_hash, api_key_prefix = APIKeyManager.generate_api_key()
    
    # Build accepted rails list
    accepted_rails = []
    if request.accepts_usdc:
        accepted_rails.append("usdc")
    if request.accepts_ach:
        accepted_rails.append("ach")
    if request.accepts_btc:
        accepted_rails.append("btc")
    if request.accepts_card:
        accepted_rails.append("card")
    
    # Store merchant
    merchant = {
        "id": merchant_id,
        "business_name": request.business_name,
        "email": request.email,
        "api_key_hash": api_key_hash,
        "api_key_prefix": api_key_prefix,
        "accepts_usdc": request.accepts_usdc,
        "accepts_ach": request.accepts_ach,
        "accepts_btc": request.accepts_btc,
        "accepts_card": request.accepts_card,
        "payout_usdc_address": request.payout_usdc_address,
        "payout_ach_routing": request.payout_ach_routing,
        "payout_ach_account": request.payout_ach_account,
        "payout_btc_address": request.payout_btc_address,
        "payout_bank_name": request.payout_bank_name,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "accepted_rails": accepted_rails,
    }
    
    merchants_db[merchant_id] = merchant
    merchants_by_api_key[api_key_hash] = merchant_id
    
    logger.info(f"Merchant onboarded: {merchant_id} ({request.business_name})")
    
    return MerchantOnboardResponse(
        id=merchant_id,
        business_name=request.business_name,
        email=request.email,
        api_key=api_key,
        api_key_prefix=api_key_prefix,
        accepted_rails=accepted_rails,
        created_at=merchant["created_at"],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT INTENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/payment_intents",
    response_model=PaymentIntentResponse,
    tags=["Payment Intents"],
    dependencies=[Depends(check_rate_limit)],
)
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    merchant: Dict = Depends(verify_api_key),
):
    """
    Create a payment intent.
    © QuranChain™ | Omar Mohammad Abunadi™
    
    Automatically selects the cheapest available payment rail.
    """
    # Check idempotency
    if request.idempotency_key:
        is_new, existing_id = replay_protection.check_and_record(
            request.idempotency_key, merchant["id"]
        )
        if not is_new and existing_id:
            existing = payment_intents_db.get(existing_id)
            if existing:
                return create_payment_intent_response(existing)
    
    # Build merchant acceptance map
    merchant_accepts = {
        PaymentRail.USDC: merchant.get("accepts_usdc", False),
        PaymentRail.ACH: merchant.get("accepts_ach", False),
        PaymentRail.BTC: merchant.get("accepts_btc", False),
        PaymentRail.CARD: merchant.get("accepts_card", False),
    }
    
    # Determine customer capabilities
    customer_has_wallet = bool(request.customer_wallet)
    customer_has_bank = bool(request.customer_email)  # Assume email = can link bank
    
    # Select rail
    try:
        selection = rail_selector.select_rail(
            amount_cents=request.amount,
            merchant_accepts=merchant_accepts,
            customer_has_wallet=customer_has_wallet,
            customer_has_bank=customer_has_bank,
            preferred_rail=PaymentRail(request.preferred_rail) if request.preferred_rail else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Calculate fees
    founder_fee = settlement_engine.calculate_founder_fee(request.amount)
    estimated_total_fee = selection.estimated_fee_cents + founder_fee
    merchant_net = request.amount - estimated_total_fee
    
    # Create payment intent
    intent_id = str(uuid.uuid4())
    
    intent = {
        "id": intent_id,
        "merchant_id": merchant["id"],
        "amount": request.amount,
        "currency": request.currency.upper(),
        "customer_email": request.customer_email,
        "customer_wallet": request.customer_wallet,
        "description": request.description,
        "status": PaymentIntentStatus.REQUIRES_PAYMENT.value,
        "selected_rail": selection.selected_rail.value,
        "rail_selection_reason": selection.reason,
        "idempotency_key": request.idempotency_key,
        "metadata": request.metadata or {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "confirmed_at": None,
        "estimated_fee": estimated_total_fee,
        "estimated_merchant_net": merchant_net,
    }
    
    payment_intents_db[intent_id] = intent
    
    # Record idempotency
    if request.idempotency_key:
        replay_protection.record(request.idempotency_key, merchant["id"], intent_id)
    
    logger.info(
        f"Payment intent created: {intent_id} for ${request.amount/100:.2f} "
        f"via {selection.selected_rail.value}"
    )
    
    return create_payment_intent_response(intent)


def create_payment_intent_response(intent: Dict) -> PaymentIntentResponse:
    """Helper to create response from intent dict."""
    return PaymentIntentResponse(
        id=f"pi_{intent['id']}",
        amount=intent["amount"],
        currency=intent["currency"],
        status=PaymentIntentStatus(intent["status"]),
        selected_rail=intent.get("selected_rail"),
        rail_selection_reason=intent.get("rail_selection_reason"),
        customer_email=intent.get("customer_email"),
        description=intent.get("description"),
        estimated_fee=intent.get("estimated_fee"),
        estimated_merchant_net=intent.get("estimated_merchant_net"),
        metadata=intent.get("metadata", {}),
        created_at=intent["created_at"],
        confirmed_at=intent.get("confirmed_at"),
    )


@app.post(
    "/payment_intents/{intent_id}/confirm",
    response_model=PaymentResponse,
    tags=["Payment Intents"],
    dependencies=[Depends(check_rate_limit)],
)
async def confirm_payment_intent(
    intent_id: str,
    request: ConfirmPaymentRequest,
    merchant: Dict = Depends(verify_api_key),
):
    """
    Confirm and execute a payment intent.
    © QuranChain™ | Omar Mohammad Abunadi™
    
    Executes settlement and records to immutable ledger.
    """
    # Strip prefix if present
    if intent_id.startswith("pi_"):
        intent_id = intent_id[3:]
    
    intent = payment_intents_db.get(intent_id)
    
    if not intent:
        raise HTTPException(status_code=404, detail="Payment intent not found")
    
    if intent["merchant_id"] != merchant["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if intent["status"] != PaymentIntentStatus.REQUIRES_PAYMENT.value:
        raise HTTPException(
            status_code=400,
            detail=f"Payment intent is {intent['status']}, cannot confirm"
        )
    
    # Update status to processing
    intent["status"] = PaymentIntentStatus.PROCESSING.value
    intent["updated_at"] = datetime.utcnow()
    
    # Get merchant payout address based on rail
    rail = request.rail_override.value if request.rail_override else intent["selected_rail"]
    merchant_payout = get_merchant_payout_address(merchant, rail)
    founder_payout = get_founder_payout_address(rail)
    
    if not merchant_payout:
        intent["status"] = PaymentIntentStatus.FAILED.value
        raise HTTPException(
            status_code=400,
            detail=f"Merchant has no payout address configured for {rail}"
        )
    
    # Execute settlement
    result = await settlement_engine.settle(
        rail=rail,
        amount_cents=intent["amount"],
        merchant_payout_address=merchant_payout,
        founder_payout_address=founder_payout,
        metadata={
            "payment_intent_id": intent_id,
            "merchant_id": merchant["id"],
        }
    )
    
    # Update intent and create ledger entry
    if result.success:
        intent["status"] = PaymentIntentStatus.SUCCEEDED.value
        intent["confirmed_at"] = datetime.utcnow()
        intent["external_tx_id"] = result.tx_hash
        
        # Create ledger entry
        ledger_id = str(uuid.uuid4())
        ledger_entry = {
            "id": ledger_id,
            "payment_intent_id": intent_id,
            "gross_amount": str(result.gross_amount),
            "founder_fee": str(result.founder_fee),
            "merchant_net": str(result.merchant_net),
            "currency": intent["currency"],
            "rail": rail,
            "settlement_tx_hash": result.tx_hash,
            "founder_payout_tx": result.founder_payout_tx,
            "merchant_payout_tx": result.merchant_payout_tx,
            "founder_payout_address": founder_payout,
            "merchant_payout_address": merchant_payout,
            "created_at": datetime.utcnow(),
            "settled_at": result.settled_at,
        }
        ledger_db[ledger_id] = ledger_entry
        
        logger.info(
            f"Payment confirmed: {intent_id} | Gross: ${result.gross_amount} | "
            f"Founder Fee: ${result.founder_fee} | Merchant Net: ${result.merchant_net}"
        )
        
        return PaymentResponse(
            id=f"led_{ledger_id}",
            payment_intent_id=f"pi_{intent_id}",
            status="succeeded",
            gross_amount=str(result.gross_amount),
            founder_fee=str(result.founder_fee),
            merchant_net=str(result.merchant_net),
            currency=intent["currency"],
            rail=rail,
            settlement_tx_hash=result.tx_hash,
            founder_payout_tx=result.founder_payout_tx,
            merchant_payout_tx=result.merchant_payout_tx,
            founder_payout_address=founder_payout,
            merchant_payout_address=merchant_payout,
            created_at=ledger_entry["created_at"],
            settled_at=result.settled_at,
        )
    else:
        intent["status"] = PaymentIntentStatus.FAILED.value
        logger.error(f"Payment failed: {intent_id} - {result.error}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Settlement failed: {result.error}"
        )


def get_merchant_payout_address(merchant: Dict, rail: str) -> Optional[str]:
    """Get merchant payout address for rail."""
    if rail == "usdc":
        return merchant.get("payout_usdc_address")
    elif rail == "ach":
        routing = merchant.get("payout_ach_routing")
        account = merchant.get("payout_ach_account")
        if routing and account:
            return f"{routing}:{account}"
        return None
    elif rail == "btc":
        return merchant.get("payout_btc_address")
    elif rail == "card":
        # For Stripe, this would be connected account ID
        return merchant.get("payout_usdc_address")  # Fallback
    return None


def get_founder_payout_address(rail: str) -> str:
    """Get founder payout address for rail."""
    if rail in ["usdc", "card"]:
        return FOUNDER_USDC_ADDRESS or FOUNDER_ETH_ADDRESS or "0x0000000000000000000000000000000000000000"
    elif rail == "btc":
        return FOUNDER_BTC_ADDRESS or ""
    return FOUNDER_USDC_ADDRESS or ""


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT QUERY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/payments/{payment_id}",
    response_model=PaymentResponse,
    tags=["Payments"],
    dependencies=[Depends(check_rate_limit)],
)
async def get_payment(
    payment_id: str,
    merchant: Dict = Depends(verify_api_key),
):
    """
    Get payment details from ledger.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    # Strip prefix if present
    if payment_id.startswith("led_"):
        payment_id = payment_id[4:]
    if payment_id.startswith("pi_"):
        # Look up by payment intent
        intent_id = payment_id[3:]
        for ledger in ledger_db.values():
            if ledger["payment_intent_id"] == intent_id:
                payment_id = ledger["id"]
                break
    
    ledger = ledger_db.get(payment_id)
    
    if not ledger:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Verify ownership
    intent = payment_intents_db.get(ledger["payment_intent_id"])
    if intent and intent["merchant_id"] != merchant["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return PaymentResponse(
        id=f"led_{ledger['id']}",
        payment_intent_id=f"pi_{ledger['payment_intent_id']}",
        status="succeeded",
        gross_amount=ledger["gross_amount"],
        founder_fee=ledger["founder_fee"],
        merchant_net=ledger["merchant_net"],
        currency=ledger["currency"],
        rail=ledger["rail"],
        settlement_tx_hash=ledger.get("settlement_tx_hash"),
        founder_payout_tx=ledger.get("founder_payout_tx"),
        merchant_payout_tx=ledger.get("merchant_payout_tx"),
        founder_payout_address=ledger["founder_payout_address"],
        merchant_payout_address=ledger["merchant_payout_address"],
        created_at=ledger["created_at"],
        settled_at=ledger.get("settled_at"),
    )


@app.get(
    "/rails/fees",
    response_model=RailFeesResponse,
    tags=["Rails"],
    dependencies=[Depends(check_rate_limit)],
)
async def get_rail_fees(amount: int):
    """
    Get fee comparison across all rails.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    fees = rail_selector.get_all_fees(amount)
    founder_fee = settlement_engine.calculate_founder_fee(amount)
    
    return RailFeesResponse(
        amount=amount,
        currency="USD",
        fees={
            rail.value: {
                "rail_fee_cents": fee,
                "founder_fee_cents": founder_fee,
                "total_fee_cents": fee + founder_fee,
                "merchant_net_cents": amount - fee - founder_fee,
            }
            for rail, fee in fees.items()
        }
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ERROR HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "code": f"E{exc.status_code}"},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "code": "E500"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# RUN SERVER
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8080"))
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        workers=4,
        log_level="info",
    )
