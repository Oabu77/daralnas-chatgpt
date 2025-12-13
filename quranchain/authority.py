# © QuranChain™ | Dar Al-Nas™
# Founder: Omar Mohammad Abunadi
# Ownership Signature Enforced

"""Founder approval and authorization gates."""

import os
from typing import Dict

from . import config
from .audit import AuditLedger
from .kill_switch import KillSwitch
from .transactions import TransactionRecord, TransactionStatus


class FounderAuthority:
    """Ensures Founder-only approval of sensitive actions."""

    def __init__(self, audit: AuditLedger, kill_switch: KillSwitch) -> None:
        self.audit = audit
        self.kill_switch = kill_switch
        self.founder_token = os.getenv("FOUNDER_TOKEN", "")

    def _assert_founder(self, token: str) -> None:
        self.kill_switch.guard()
        if token != self.founder_token or not token:
            raise PermissionError("Founder authorization failed.")

    def approve_transaction(self, token: str, record: TransactionRecord, note: str | None = None) -> TransactionRecord:
        self._assert_founder(token)
        if record.status != TransactionStatus.PENDING:
            raise ValueError("Only pending transactions can be approved.")
        record.status = TransactionStatus.APPROVED
        record.metadata["approval_note"] = note or ""
        self.audit.append(
            actor=config.FOUNDER_ID,
            action="transaction.approved",
            details={"transaction_id": record.id, "note": note},
        )
        return record

    def reject_transaction(self, token: str, record: TransactionRecord, reason: str) -> TransactionRecord:
        self._assert_founder(token)
        if record.status != TransactionStatus.PENDING:
            raise ValueError("Only pending transactions can be rejected.")
        record.status = TransactionStatus.REJECTED
        record.metadata["rejection_reason"] = reason
        self.audit.append(
            actor=config.FOUNDER_ID,
            action="transaction.rejected",
            details={"transaction_id": record.id, "reason": reason},
        )
        return record

    def engage_kill_switch(self, token: str, reason: str) -> Dict[str, str]:
        self._assert_founder(token)
        state = self.kill_switch.engage(reason)
        self.audit.append(actor=config.FOUNDER_ID, action="kill_switch.engaged", details=state)
        return state

    def release_kill_switch(self, token: str, note: str | None = None) -> Dict[str, str]:
        self._assert_founder(token)
        state = self.kill_switch.release(note)
        self.audit.append(actor=config.FOUNDER_ID, action="kill_switch.released", details=state)
        return state
