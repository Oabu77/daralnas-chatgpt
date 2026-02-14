"""
QuranChain Pay™ - API Schemas
© QuranChain™ | Omar Mohammad Abunadi™

Pydantic models for request/response validation.
"""

from decimal import Decimal
from datetime import datetime
from typing import Optional, Dict, List, Any
from enum import Enum
from pydantic import BaseModel, Field, EmailStr, field_validator
import uuid


class PaymentRail(str, Enum):
    """Supported payment rails."""
    USDC = "usdc"
    ACH = "ach"
    BTC = "btc"
    CARD = "card"


class PaymentIntentStatus(str, Enum):
    """Payment intent states."""
    REQUIRES_PAYMENT = "requires_payment"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"


# ═══════════════════════════════════════════════════════════════════════════════
# MERCHANT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class MerchantOnboardRequest(BaseModel):
    """
    Merchant onboarding request.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    business_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    
    # Accepted rails
    accepts_usdc: bool = True
    accepts_ach: bool = True
    accepts_btc: bool = True
    accepts_card: bool = True
    
    # Payout destinations
    payout_usdc_address: Optional[str] = Field(None, pattern=r"^0x[a-fA-F0-9]{40}$")
    payout_ach_routing: Optional[str] = Field(None, pattern=r"^\d{9}$")
    payout_ach_account: Optional[str] = Field(None, pattern=r"^\d{4,17}$")
    payout_btc_address: Optional[str] = None
    payout_bank_name: Optional[str] = None
    
    @field_validator('payout_usdc_address')
    @classmethod
    def validate_usdc_if_accepted(cls, v):
        # Validation happens at field level
        return v
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "business_name": "Acme Corp",
                "email": "payments@acme.com",
                "accepts_usdc": True,
                "accepts_ach": True,
                "accepts_card": True,
                "payout_usdc_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3",
            }
        }
    }


class MerchantOnboardResponse(BaseModel):
    """
    Merchant onboarding response.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    id: str
    business_name: str
    email: str
    api_key: str  # Returned ONLY at creation
    api_key_prefix: str
    accepted_rails: List[str]
    created_at: datetime
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "business_name": "Acme Corp",
                "email": "payments@acme.com",
                "api_key": "qcp_live_abc123def456...",
                "api_key_prefix": "qcp_live_abc1",
                "accepted_rails": ["usdc", "ach", "card"],
                "created_at": "2025-12-12T12:00:00Z"
            }
        }
    }


class MerchantResponse(BaseModel):
    """Merchant info (without API key)."""
    id: str
    business_name: str
    email: str
    accepted_rails: List[str]
    is_active: bool
    created_at: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT INTENT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class CreatePaymentIntentRequest(BaseModel):
    """
    Create payment intent request.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    amount: int = Field(..., gt=0, description="Amount in cents")
    currency: str = Field(default="usd", pattern=r"^[a-z]{3}$")
    
    customer_email: Optional[EmailStr] = None
    customer_wallet: Optional[str] = Field(None, pattern=r"^0x[a-fA-F0-9]{40}$")
    
    description: Optional[str] = Field(None, max_length=500)
    
    preferred_rail: Optional[PaymentRail] = None
    
    metadata: Optional[Dict[str, Any]] = None
    
    idempotency_key: Optional[str] = Field(None, max_length=64)
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "amount": 10000,
                "currency": "usd",
                "customer_email": "customer@example.com",
                "description": "Order #12345",
                "preferred_rail": "usdc",
                "metadata": {"order_id": "12345"}
            }
        }
    }


class PaymentIntentResponse(BaseModel):
    """
    Payment intent response.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    id: str
    amount: int
    currency: str
    status: PaymentIntentStatus
    
    selected_rail: Optional[str]
    rail_selection_reason: Optional[str]
    
    customer_email: Optional[str]
    description: Optional[str]
    
    estimated_fee: Optional[int]
    estimated_merchant_net: Optional[int]
    
    metadata: Dict[str, Any]
    
    created_at: datetime
    confirmed_at: Optional[datetime]
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "pi_550e8400-e29b-41d4-a716-446655440000",
                "amount": 10000,
                "currency": "usd",
                "status": "requires_payment",
                "selected_rail": "usdc",
                "rail_selection_reason": "Cheapest available rail",
                "estimated_fee": 10,
                "estimated_merchant_net": 9740,
                "created_at": "2025-12-12T12:00:00Z"
            }
        }
    }


class ConfirmPaymentRequest(BaseModel):
    """
    Confirm payment request.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    payment_source: Optional[str] = None  # Wallet address, bank token, or card token
    rail_override: Optional[PaymentRail] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "payment_source": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3",
            }
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT/LEDGER SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class PaymentResponse(BaseModel):
    """
    Payment response with full ledger details.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    id: str
    payment_intent_id: str
    status: str
    
    # Amounts
    gross_amount: str  # Decimal as string
    founder_fee: str
    merchant_net: str
    currency: str
    
    # Rail info
    rail: str
    settlement_tx_hash: Optional[str]
    founder_payout_tx: Optional[str]
    merchant_payout_tx: Optional[str]
    
    # Addresses
    founder_payout_address: str
    merchant_payout_address: str
    
    created_at: datetime
    settled_at: Optional[datetime]
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "led_550e8400-e29b-41d4-a716-446655440000",
                "payment_intent_id": "pi_550e8400-e29b-41d4-a716-446655440000",
                "status": "succeeded",
                "gross_amount": "100.00",
                "founder_fee": "2.50",
                "merchant_net": "97.50",
                "currency": "USD",
                "rail": "usdc",
                "settlement_tx_hash": "0x123abc...",
                "created_at": "2025-12-12T12:00:00Z"
            }
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH & ERROR SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    timestamp: datetime
    database: str
    rails: Dict[str, bool]


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    code: str
    details: Optional[Dict[str, Any]] = None


class RailFeesResponse(BaseModel):
    """Rail fees comparison."""
    amount: int
    currency: str
    fees: Dict[str, Dict[str, Any]]
