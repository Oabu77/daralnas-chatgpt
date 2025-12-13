# © QuranChain™ | Dar Al-Nas™
# Founder: Omar Mohammad Abunadi
# Ownership Signature Enforced

"""OmarAi orchestration layer."""

from decimal import Decimal
from typing import Dict, Optional

from .audit import AuditLedger
from .authority import FounderAuthority
from .config import FOUNDER_ROYALTY
from .kill_switch import KillSwitch
from .transactions import TransactionIntent, TransactionRecord, TransactionService
from .treasury import Treasury


class OmarAi:
    """Coordinates treasury, risk, authority, and audit flows."""

    def __init__(self) -> None:
        self.audit = AuditLedger()
        self.kill_switch = KillSwitch()
        self.treasury = Treasury()
        self.transactions = TransactionService(treasury=self.treasury, audit=self.audit, kill_switch=self.kill_switch)
        self.authority = FounderAuthority(audit=self.audit, kill_switch=self.kill_switch)
        self.signer_adapters: Dict[str, str] = {}

    def register_signer_adapter(self, name: str, endpoint: str) -> None:
        self.signer_adapters[name] = endpoint
        self.audit.append(actor="omarai", action="signer.adapter_registered", details={"name": name, "endpoint": endpoint})

    def build_intent(
        self,
        amount: Decimal,
        currency: str,
        source: str,
        destination: str,
        purpose: str,
        asset: str,
        chain: str,
        fee_bps: int = 50,
        royalty_rate: Decimal = FOUNDER_ROYALTY,
        metadata: Optional[Dict[str, str]] = None,
    ) -> TransactionRecord:
        intent = TransactionIntent(
            amount=amount,
            currency=currency,
            source=source,
            destination=destination,
            purpose=purpose,
            asset=asset,
            chain=chain,
            fee_bps=fee_bps,
            royalty_rate=royalty_rate,
            metadata=metadata or {},
        )
        return self.transactions.prepare_intent(intent)

    def approve(self, token: str, transaction_id: str, note: str | None = None) -> TransactionRecord:
        record = self.transactions.get_record(transaction_id)
        if not record:
            raise ValueError("Transaction not found")
        approved = self.authority.approve_transaction(token, record, note)
        self.transactions.update_record(approved)
        return approved

    def reject(self, token: str, transaction_id: str, reason: str) -> TransactionRecord:
        record = self.transactions.get_record(transaction_id)
        if not record:
            raise ValueError("Transaction not found")
        rejected = self.authority.reject_transaction(token, record, reason)
        self.transactions.update_record(rejected)
        return rejected
