"""
QuranChain Pay™ - Settlement Engine
© QuranChain™ | Omar Mohammad Abunadi™

Real settlement execution across payment rails:
- USDC: On-chain transfer (Ethereum/Polygon/Base)
- ACH: Bank transfer via provider
- BTC: On-chain Bitcoin transfer
- CARD: Stripe charge
"""

import os
import logging
import hashlib
import secrets
from decimal import Decimal
from typing import Dict, Optional, Tuple
from datetime import datetime
from abc import ABC, abstractmethod
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SettlementResult:
    """
    Result of a settlement operation.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    success: bool
    tx_hash: Optional[str]
    error: Optional[str]
    rail: str
    gross_amount: Decimal
    founder_fee: Decimal
    merchant_net: Decimal
    founder_payout_tx: Optional[str]
    merchant_payout_tx: Optional[str]
    settled_at: Optional[datetime]


class BaseSettlementProvider(ABC):
    """
    Abstract base for settlement providers.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    
    @abstractmethod
    async def settle(
        self,
        amount_cents: int,
        founder_fee_cents: int,
        merchant_address: str,
        founder_address: str,
        metadata: Dict,
    ) -> SettlementResult:
        """Execute settlement."""
        pass
    
    @abstractmethod
    async def check_status(self, tx_hash: str) -> Dict:
        """Check transaction status."""
        pass


class USDCSettlementProvider(BaseSettlementProvider):
    """
    USDC Settlement via EVM chains.
    © QuranChain™ | Omar Mohammad Abunadi™
    
    Supports: Ethereum, Polygon, Base mainnet.
    Uses real RPC endpoints for production transfers.
    """
    
    def __init__(
        self,
        rpc_url: str,
        usdc_contract: str,
        private_key: Optional[str] = None,
        chain_id: int = 1,
    ):
        self.rpc_url = rpc_url
        self.usdc_contract = usdc_contract
        self.chain_id = chain_id
        # Private key loaded from secure environment only
        self._private_key = private_key or os.getenv("SETTLEMENT_PRIVATE_KEY")
        
        if not self._private_key:
            logger.warning("No settlement private key configured - dry run mode")
    
    async def settle(
        self,
        amount_cents: int,
        founder_fee_cents: int,
        merchant_address: str,
        founder_address: str,
        metadata: Dict,
    ) -> SettlementResult:
        """
        Execute USDC settlement.
        Split payment between founder and merchant.
        """
        try:
            # Import web3 only when needed
            from web3 import Web3
            from web3.middleware import geth_poa_middleware
            
            w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            
            # Add PoA middleware for Polygon
            if self.chain_id == 137:
                w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            
            if not w3.is_connected():
                return SettlementResult(
                    success=False,
                    tx_hash=None,
                    error="Cannot connect to RPC",
                    rail="usdc",
                    gross_amount=Decimal(amount_cents) / 100,
                    founder_fee=Decimal(founder_fee_cents) / 100,
                    merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                    founder_payout_tx=None,
                    merchant_payout_tx=None,
                    settled_at=None,
                )
            
            # USDC has 6 decimals
            gross_usdc = amount_cents * 10000  # cents to USDC smallest unit
            founder_usdc = founder_fee_cents * 10000
            merchant_usdc = gross_usdc - founder_usdc
            
            # ERC20 transfer ABI
            transfer_abi = [
                {
                    "constant": False,
                    "inputs": [
                        {"name": "_to", "type": "address"},
                        {"name": "_value", "type": "uint256"}
                    ],
                    "name": "transfer",
                    "outputs": [{"name": "", "type": "bool"}],
                    "type": "function"
                }
            ]
            
            usdc = w3.eth.contract(
                address=Web3.to_checksum_address(self.usdc_contract),
                abi=transfer_abi
            )
            
            if not self._private_key:
                # Dry run mode - simulate tx
                tx_hash = "0x" + secrets.token_hex(32)
                logger.info(f"DRY RUN: Would transfer {merchant_usdc/1e6} USDC to {merchant_address}")
                logger.info(f"DRY RUN: Would transfer {founder_usdc/1e6} USDC to {founder_address}")
                
                return SettlementResult(
                    success=True,
                    tx_hash=tx_hash,
                    error=None,
                    rail="usdc",
                    gross_amount=Decimal(amount_cents) / 100,
                    founder_fee=Decimal(founder_fee_cents) / 100,
                    merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                    founder_payout_tx=tx_hash,
                    merchant_payout_tx=tx_hash,
                    settled_at=datetime.utcnow(),
                )
            
            # Real transaction
            account = w3.eth.account.from_key(self._private_key)
            nonce = w3.eth.get_transaction_count(account.address)
            gas_price = w3.eth.gas_price
            
            # Transfer to merchant
            merchant_tx = usdc.functions.transfer(
                Web3.to_checksum_address(merchant_address),
                merchant_usdc
            ).build_transaction({
                'chainId': self.chain_id,
                'gas': 100000,
                'gasPrice': gas_price,
                'nonce': nonce,
            })
            
            signed_merchant = w3.eth.account.sign_transaction(merchant_tx, self._private_key)
            merchant_tx_hash = w3.eth.send_raw_transaction(signed_merchant.rawTransaction)
            
            # Transfer to founder
            founder_tx = usdc.functions.transfer(
                Web3.to_checksum_address(founder_address),
                founder_usdc
            ).build_transaction({
                'chainId': self.chain_id,
                'gas': 100000,
                'gasPrice': gas_price,
                'nonce': nonce + 1,
            })
            
            signed_founder = w3.eth.account.sign_transaction(founder_tx, self._private_key)
            founder_tx_hash = w3.eth.send_raw_transaction(signed_founder.rawTransaction)
            
            return SettlementResult(
                success=True,
                tx_hash=merchant_tx_hash.hex(),
                error=None,
                rail="usdc",
                gross_amount=Decimal(amount_cents) / 100,
                founder_fee=Decimal(founder_fee_cents) / 100,
                merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                founder_payout_tx=founder_tx_hash.hex(),
                merchant_payout_tx=merchant_tx_hash.hex(),
                settled_at=datetime.utcnow(),
            )
            
        except ImportError:
            logger.error("web3 library not installed")
            return SettlementResult(
                success=False,
                tx_hash=None,
                error="web3 library not available",
                rail="usdc",
                gross_amount=Decimal(amount_cents) / 100,
                founder_fee=Decimal(founder_fee_cents) / 100,
                merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                founder_payout_tx=None,
                merchant_payout_tx=None,
                settled_at=None,
            )
        except Exception as e:
            logger.error(f"USDC settlement failed: {e}")
            return SettlementResult(
                success=False,
                tx_hash=None,
                error=str(e),
                rail="usdc",
                gross_amount=Decimal(amount_cents) / 100,
                founder_fee=Decimal(founder_fee_cents) / 100,
                merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                founder_payout_tx=None,
                merchant_payout_tx=None,
                settled_at=None,
            )
    
    async def check_status(self, tx_hash: str) -> Dict:
        """Check USDC transaction status."""
        try:
            from web3 import Web3
            w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            
            return {
                "confirmed": receipt is not None,
                "status": "succeeded" if receipt and receipt.status == 1 else "failed",
                "block_number": receipt.blockNumber if receipt else None,
            }
        except Exception as e:
            return {"confirmed": False, "status": "unknown", "error": str(e)}


class ACHSettlementProvider(BaseSettlementProvider):
    """
    ACH Settlement via banking provider.
    © QuranChain™ | Omar Mohammad Abunadi™
    
    Abstract interface - implement with Plaid, Dwolla, or direct bank API.
    """
    
    def __init__(self, api_key: str, api_url: str):
        self.api_key = api_key
        self.api_url = api_url
    
    async def settle(
        self,
        amount_cents: int,
        founder_fee_cents: int,
        merchant_address: str,  # Bank account in format: routing:account
        founder_address: str,
        metadata: Dict,
    ) -> SettlementResult:
        """Execute ACH settlement."""
        try:
            import httpx
            
            # Parse bank details
            if ":" not in merchant_address:
                return SettlementResult(
                    success=False,
                    tx_hash=None,
                    error="Invalid merchant bank format. Expected: routing:account",
                    rail="ach",
                    gross_amount=Decimal(amount_cents) / 100,
                    founder_fee=Decimal(founder_fee_cents) / 100,
                    merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                    founder_payout_tx=None,
                    merchant_payout_tx=None,
                    settled_at=None,
                )
            
            merchant_routing, merchant_account = merchant_address.split(":", 1)
            merchant_net_cents = amount_cents - founder_fee_cents
            
            # Generate transfer reference
            transfer_ref = f"qcp_{secrets.token_hex(16)}"
            
            if not self.api_key or self.api_key == "":
                # Dry run mode
                logger.info(f"DRY RUN ACH: Would transfer ${merchant_net_cents/100:.2f} to {merchant_routing}:{merchant_account[:4]}***")
                
                return SettlementResult(
                    success=True,
                    tx_hash=transfer_ref,
                    error=None,
                    rail="ach",
                    gross_amount=Decimal(amount_cents) / 100,
                    founder_fee=Decimal(founder_fee_cents) / 100,
                    merchant_net=Decimal(merchant_net_cents) / 100,
                    founder_payout_tx=transfer_ref,
                    merchant_payout_tx=transfer_ref,
                    settled_at=datetime.utcnow(),
                )
            
            # Real ACH transfer (implement with actual provider)
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/transfers",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "amount": merchant_net_cents,
                        "routing_number": merchant_routing,
                        "account_number": merchant_account,
                        "reference": transfer_ref,
                        "metadata": metadata,
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return SettlementResult(
                        success=True,
                        tx_hash=data.get("transfer_id", transfer_ref),
                        error=None,
                        rail="ach",
                        gross_amount=Decimal(amount_cents) / 100,
                        founder_fee=Decimal(founder_fee_cents) / 100,
                        merchant_net=Decimal(merchant_net_cents) / 100,
                        founder_payout_tx=transfer_ref,
                        merchant_payout_tx=data.get("transfer_id"),
                        settled_at=datetime.utcnow(),
                    )
                else:
                    return SettlementResult(
                        success=False,
                        tx_hash=None,
                        error=f"ACH provider error: {response.status_code}",
                        rail="ach",
                        gross_amount=Decimal(amount_cents) / 100,
                        founder_fee=Decimal(founder_fee_cents) / 100,
                        merchant_net=Decimal(merchant_net_cents) / 100,
                        founder_payout_tx=None,
                        merchant_payout_tx=None,
                        settled_at=None,
                    )
                    
        except Exception as e:
            logger.error(f"ACH settlement failed: {e}")
            return SettlementResult(
                success=False,
                tx_hash=None,
                error=str(e),
                rail="ach",
                gross_amount=Decimal(amount_cents) / 100,
                founder_fee=Decimal(founder_fee_cents) / 100,
                merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                founder_payout_tx=None,
                merchant_payout_tx=None,
                settled_at=None,
            )
    
    async def check_status(self, tx_hash: str) -> Dict:
        """Check ACH transfer status."""
        # Implement with actual provider API
        return {"status": "pending", "reference": tx_hash}


class CardSettlementProvider(BaseSettlementProvider):
    """
    Card Settlement via Stripe.
    © QuranChain™ | Omar Mohammad Abunadi™
    
    Fallback payment method when crypto/ACH unavailable.
    """
    
    def __init__(self, stripe_secret_key: str):
        self.stripe_key = stripe_secret_key
    
    async def settle(
        self,
        amount_cents: int,
        founder_fee_cents: int,
        merchant_address: str,  # Stripe connected account ID
        founder_address: str,
        metadata: Dict,
    ) -> SettlementResult:
        """Execute card settlement via Stripe."""
        try:
            import stripe
            stripe.api_key = self.stripe_key
            
            if not self.stripe_key or not self.stripe_key.startswith("sk_"):
                # Dry run mode
                charge_id = f"ch_dry_{secrets.token_hex(12)}"
                logger.info(f"DRY RUN CARD: Would charge ${amount_cents/100:.2f}")
                
                return SettlementResult(
                    success=True,
                    tx_hash=charge_id,
                    error=None,
                    rail="card",
                    gross_amount=Decimal(amount_cents) / 100,
                    founder_fee=Decimal(founder_fee_cents) / 100,
                    merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                    founder_payout_tx=charge_id,
                    merchant_payout_tx=charge_id,
                    settled_at=datetime.utcnow(),
                )
            
            # Real Stripe charge with application fee
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="usd",
                application_fee_amount=founder_fee_cents,
                transfer_data={"destination": merchant_address},
                metadata=metadata,
            )
            
            return SettlementResult(
                success=True,
                tx_hash=payment_intent.id,
                error=None,
                rail="card",
                gross_amount=Decimal(amount_cents) / 100,
                founder_fee=Decimal(founder_fee_cents) / 100,
                merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                founder_payout_tx=payment_intent.id,
                merchant_payout_tx=payment_intent.id,
                settled_at=datetime.utcnow(),
            )
            
        except ImportError:
            logger.error("stripe library not installed")
            return SettlementResult(
                success=False,
                tx_hash=None,
                error="stripe library not available",
                rail="card",
                gross_amount=Decimal(amount_cents) / 100,
                founder_fee=Decimal(founder_fee_cents) / 100,
                merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                founder_payout_tx=None,
                merchant_payout_tx=None,
                settled_at=None,
            )
        except Exception as e:
            logger.error(f"Card settlement failed: {e}")
            return SettlementResult(
                success=False,
                tx_hash=None,
                error=str(e),
                rail="card",
                gross_amount=Decimal(amount_cents) / 100,
                founder_fee=Decimal(founder_fee_cents) / 100,
                merchant_net=Decimal(amount_cents - founder_fee_cents) / 100,
                founder_payout_tx=None,
                merchant_payout_tx=None,
                settled_at=None,
            )
    
    async def check_status(self, tx_hash: str) -> Dict:
        """Check Stripe payment status."""
        try:
            import stripe
            pi = stripe.PaymentIntent.retrieve(tx_hash)
            return {
                "status": pi.status,
                "amount": pi.amount,
                "confirmed": pi.status == "succeeded",
            }
        except Exception as e:
            return {"status": "unknown", "error": str(e)}


class SettlementEngine:
    """
    Main Settlement Engine - orchestrates all providers.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    
    def __init__(
        self,
        usdc_provider: Optional[USDCSettlementProvider] = None,
        ach_provider: Optional[ACHSettlementProvider] = None,
        card_provider: Optional[CardSettlementProvider] = None,
        founder_royalty_percent: Decimal = Decimal("0.025"),  # 2.5%
    ):
        self.providers = {
            "usdc": usdc_provider,
            "ach": ach_provider,
            "card": card_provider,
        }
        self.founder_royalty_percent = founder_royalty_percent
    
    def calculate_founder_fee(self, amount_cents: int) -> int:
        """Calculate founder fee in cents."""
        return int(amount_cents * self.founder_royalty_percent)
    
    async def settle(
        self,
        rail: str,
        amount_cents: int,
        merchant_payout_address: str,
        founder_payout_address: str,
        metadata: Dict = None,
    ) -> SettlementResult:
        """
        Execute settlement on specified rail.
        Enforces founder royalty split.
        """
        provider = self.providers.get(rail)
        
        if not provider:
            return SettlementResult(
                success=False,
                tx_hash=None,
                error=f"No provider configured for rail: {rail}",
                rail=rail,
                gross_amount=Decimal(amount_cents) / 100,
                founder_fee=Decimal(0),
                merchant_net=Decimal(amount_cents) / 100,
                founder_payout_tx=None,
                merchant_payout_tx=None,
                settled_at=None,
            )
        
        founder_fee_cents = self.calculate_founder_fee(amount_cents)
        
        logger.info(
            f"Settling ${amount_cents/100:.2f} via {rail}. "
            f"Founder fee: ${founder_fee_cents/100:.2f} ({self.founder_royalty_percent*100}%)"
        )
        
        return await provider.settle(
            amount_cents=amount_cents,
            founder_fee_cents=founder_fee_cents,
            merchant_address=merchant_payout_address,
            founder_address=founder_payout_address,
            metadata=metadata or {},
        )
