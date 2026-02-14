"""
QuranChain Pay™ - Rail Selection Engine
© QuranChain™ | Omar Mohammad Abunadi™

Automatic payment rail selection based on:
1. Cost (cheapest first)
2. Availability
3. Merchant acceptance
4. Customer capability
"""

from decimal import Decimal
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PaymentRail(str, Enum):
    """Payment rails in order of preference (cheapest first)."""
    USDC = "usdc"
    ACH = "ach"
    BTC = "btc"
    CARD = "card"


@dataclass
class RailConfig:
    """
    Configuration for a payment rail.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    rail: PaymentRail
    percentage_fee: Decimal  # e.g., 0.001 = 0.1%
    fixed_fee_cents: int
    is_available: bool
    min_amount_cents: int
    max_amount_cents: int
    settlement_time_hours: int


# Default rail configurations (production values)
DEFAULT_RAIL_CONFIGS: Dict[PaymentRail, RailConfig] = {
    PaymentRail.USDC: RailConfig(
        rail=PaymentRail.USDC,
        percentage_fee=Decimal("0.001"),  # 0.1%
        fixed_fee_cents=0,
        is_available=True,
        min_amount_cents=100,  # $1.00
        max_amount_cents=100000000,  # $1,000,000
        settlement_time_hours=0,  # Instant
    ),
    PaymentRail.ACH: RailConfig(
        rail=PaymentRail.ACH,
        percentage_fee=Decimal("0.008"),  # 0.8%
        fixed_fee_cents=25,  # $0.25 flat
        is_available=True,
        min_amount_cents=100,
        max_amount_cents=10000000,  # $100,000
        settlement_time_hours=48,  # 2 business days
    ),
    PaymentRail.BTC: RailConfig(
        rail=PaymentRail.BTC,
        percentage_fee=Decimal("0.005"),  # 0.5%
        fixed_fee_cents=50,  # Network fee estimate
        is_available=True,
        min_amount_cents=500,  # $5.00
        max_amount_cents=100000000,
        settlement_time_hours=1,  # ~1 hour for confirmations
    ),
    PaymentRail.CARD: RailConfig(
        rail=PaymentRail.CARD,
        percentage_fee=Decimal("0.029"),  # 2.9%
        fixed_fee_cents=30,  # $0.30 flat
        is_available=True,
        min_amount_cents=50,  # $0.50
        max_amount_cents=99999900,  # $999,999
        settlement_time_hours=72,  # 3 business days
    ),
}


@dataclass
class RailSelection:
    """
    Result of rail selection.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    selected_rail: PaymentRail
    reason: str
    estimated_fee_cents: int
    alternatives: List[Tuple[PaymentRail, int]]  # [(rail, fee_cents), ...]


class RailSelector:
    """
    Payment Rail Selector Engine.
    Chooses the cheapest available rail for each payment.
    © QuranChain™ | Omar Mohammad Abunadi™
    """
    
    # Rail preference order (cheapest first)
    PREFERENCE_ORDER = [
        PaymentRail.USDC,
        PaymentRail.ACH,
        PaymentRail.BTC,
        PaymentRail.CARD,
    ]
    
    def __init__(self, rail_configs: Dict[PaymentRail, RailConfig] = None):
        self.rail_configs = rail_configs or DEFAULT_RAIL_CONFIGS
    
    def calculate_fee(self, rail: PaymentRail, amount_cents: int) -> int:
        """
        Calculate total fee for a rail given amount.
        Returns fee in cents.
        """
        config = self.rail_configs.get(rail)
        if not config:
            return 999999999  # Effectively infinite fee
        
        percentage_fee = int(amount_cents * config.percentage_fee)
        total_fee = percentage_fee + config.fixed_fee_cents
        return total_fee
    
    def is_rail_available(
        self,
        rail: PaymentRail,
        amount_cents: int,
        merchant_accepts: Dict[PaymentRail, bool],
        customer_has_wallet: bool = False,
        customer_has_bank: bool = False,
    ) -> Tuple[bool, str]:
        """
        Check if a rail is available for this transaction.
        Returns (is_available, reason).
        """
        config = self.rail_configs.get(rail)
        
        if not config:
            return False, "Rail not configured"
        
        if not config.is_available:
            return False, "Rail temporarily unavailable"
        
        if not merchant_accepts.get(rail, False):
            return False, "Merchant does not accept this rail"
        
        if amount_cents < config.min_amount_cents:
            return False, f"Amount below minimum (${config.min_amount_cents/100:.2f})"
        
        if amount_cents > config.max_amount_cents:
            return False, f"Amount above maximum (${config.max_amount_cents/100:.2f})"
        
        # Rail-specific requirements
        if rail == PaymentRail.USDC and not customer_has_wallet:
            return False, "Customer wallet required for USDC"
        
        if rail == PaymentRail.BTC and not customer_has_wallet:
            return False, "Customer wallet required for BTC"
        
        if rail == PaymentRail.ACH and not customer_has_bank:
            return False, "Customer bank account required for ACH"
        
        return True, "Available"
    
    def select_rail(
        self,
        amount_cents: int,
        merchant_accepts: Dict[PaymentRail, bool],
        customer_has_wallet: bool = False,
        customer_has_bank: bool = False,
        preferred_rail: Optional[PaymentRail] = None,
    ) -> RailSelection:
        """
        Select the optimal payment rail.
        © QuranChain™ | Omar Mohammad Abunadi™
        
        Selection logic:
        1. If preferred rail is specified and available, use it
        2. Otherwise, calculate fees for all available rails
        3. Select the cheapest available rail
        4. Fall back to CARD if nothing else works
        """
        available_rails: List[Tuple[PaymentRail, int, str]] = []
        unavailable_reasons: Dict[PaymentRail, str] = {}
        
        # Check all rails
        for rail in self.PREFERENCE_ORDER:
            is_available, reason = self.is_rail_available(
                rail=rail,
                amount_cents=amount_cents,
                merchant_accepts=merchant_accepts,
                customer_has_wallet=customer_has_wallet,
                customer_has_bank=customer_has_bank,
            )
            
            if is_available:
                fee = self.calculate_fee(rail, amount_cents)
                available_rails.append((rail, fee, reason))
            else:
                unavailable_reasons[rail] = reason
        
        # No rails available
        if not available_rails:
            logger.error(f"No payment rails available: {unavailable_reasons}")
            raise ValueError(f"No payment rails available. Reasons: {unavailable_reasons}")
        
        # Check if preferred rail is available
        if preferred_rail:
            for rail, fee, _ in available_rails:
                if rail == preferred_rail:
                    return RailSelection(
                        selected_rail=rail,
                        reason=f"Customer preferred rail: {rail.value}",
                        estimated_fee_cents=fee,
                        alternatives=[(r, f) for r, f, _ in available_rails if r != rail],
                    )
        
        # Sort by fee (cheapest first)
        available_rails.sort(key=lambda x: x[1])
        
        # Select cheapest
        selected_rail, selected_fee, _ = available_rails[0]
        
        reason = f"Cheapest available rail. Fee: ${selected_fee/100:.2f} ({selected_rail.value})"
        
        logger.info(
            f"Rail selected: {selected_rail.value} for ${amount_cents/100:.2f} "
            f"(fee: ${selected_fee/100:.2f})"
        )
        
        return RailSelection(
            selected_rail=selected_rail,
            reason=reason,
            estimated_fee_cents=selected_fee,
            alternatives=[(r, f) for r, f, _ in available_rails[1:]],
        )
    
    def get_all_fees(self, amount_cents: int) -> Dict[PaymentRail, int]:
        """Get fees for all rails for comparison."""
        return {
            rail: self.calculate_fee(rail, amount_cents)
            for rail in self.PREFERENCE_ORDER
        }


# Singleton instance
rail_selector = RailSelector()
