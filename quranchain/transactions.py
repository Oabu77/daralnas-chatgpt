# © QuranChain™ | Dar Al-Nas™
# Founder: Omar Mohammad Abunadi
# Ownership Signature Enforced

"""Transaction intent preparation and risk management."""

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
from threading import Lock
from typing import Dict, List, Optional

from . import config
from .audit import AuditLedger
from .kill_switch import KillSwitch
from .treasury import Treasury


class TransactionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    BROADCAST_READY = "broadcast_ready"


@dataclass
class TransactionIntent:
    amount: Decimal
    currency: str
    source: str
    destination: str
    purpose: str
    asset: str
    chain: str
    fee_bps: int = 50
    royalty_rate: Decimal = config.FOUNDER_ROYALTY
    metadata: Dict[str, str] = field(default_factory=dict)


@dataclass
class TransactionRecord:
    id: str
    intent: TransactionIntent
    status: TransactionStatus
    created_at: str
    metadata: Dict[str, str] = field(default_factory=dict)
    risk_flags: List[str] = field(default_factory=list)


class TransactionService:
    """Prepares intents, applies revenue hooks, and records state changes."""

    def __init__(self, treasury: Treasury, audit: AuditLedger, kill_switch: KillSwitch) -> None:
        self.treasury = treasury
        self.audit = audit
        self.kill_switch = kill_switch
        self._lock = Lock()
        self._records: Dict[str, TransactionRecord] = {}
        self._load()

    def _load(self) -> None:
        if not config.TRANSACTION_LOG_PATH.exists():
            return
        data = json.loads(config.TRANSACTION_LOG_PATH.read_text())
        for entry in data:
            intent_data = entry["intent"]
            intent = TransactionIntent(
                amount=Decimal(intent_data["amount"]),
                currency=intent_data["currency"],
                source=intent_data["source"],
                destination=intent_data["destination"],
                purpose=intent_data["purpose"],
                asset=intent_data["asset"],
                chain=intent_data["chain"],
                fee_bps=intent_data.get("fee_bps", 50),
                royalty_rate=Decimal(intent_data.get("royalty_rate", config.FOUNDER_ROYALTY)),
                metadata=intent_data.get("metadata", {}),
            )
            record = TransactionRecord(
                id=entry["id"],
                intent=intent,
                status=TransactionStatus(entry["status"]),
                created_at=entry["created_at"],
                metadata=entry.get("metadata", {}),
                risk_flags=entry.get("risk_flags", []),
            )
            self._records[record.id] = record

    def _persist(self) -> None:
        serialized = []
        for record in self._records.values():
            data = {
                "id": record.id,
                "intent": {
                    **asdict(record.intent),
                    "amount": str(record.intent.amount),
                    "royalty_rate": str(record.intent.royalty_rate),
                },
                "status": record.status.value,
                "created_at": record.created_at,
                "metadata": record.metadata,
                "risk_flags": record.risk_flags,
            }
            serialized.append(data)
        config.TRANSACTION_LOG_PATH.write_text(json.dumps(serialized, indent=2))

    def _risk_check(self, intent: TransactionIntent) -> List[str]:
        flags: List[str] = []
        if intent.amount <= 0:
            flags.append("amount_non_positive")
        if intent.amount > config.MAX_SINGLE_TX:
            flags.append("amount_above_limit")
        if intent.destination not in config.WHITELISTED_DESTINATIONS:
            flags.append("destination_not_whitelisted")
        return flags

    def prepare_intent(self, intent: TransactionIntent) -> TransactionRecord:
        self.kill_switch.guard()
        risk_flags = self._risk_check(intent)
        if risk_flags:
            raise ValueError(f"Risk checks failed: {', '.join(risk_flags)}")

        with self._lock:
            fee_schedule = self.treasury.prepare_fee_schedule(intent.amount, intent.fee_bps, intent.royalty_rate)
            self.treasury.allocate_payment(intent.source, intent.destination, fee_schedule["net"], intent.currency)
            self.treasury.accrue_revenue(fee_schedule["royalty"], intent.currency)
            record = TransactionRecord(
                id=str(uuid.uuid4()),
                intent=intent,
                status=TransactionStatus.PENDING,
                created_at=datetime.utcnow().isoformat(),
                metadata={
                    "fee": str(fee_schedule["fee"]),
                    "royalty": str(fee_schedule["royalty"]),
                    "net": str(fee_schedule["net"]),
                },
                risk_flags=[],
            )
            self._records[record.id] = record
            self._persist()
            self.audit.append(
                actor="omarai",
                action="transaction.prepared",
                details={"transaction_id": record.id, "fee_schedule": {k: str(v) for k, v in fee_schedule.items()}},
            )
            return record

    def update_record(self, record: TransactionRecord) -> None:
        with self._lock:
            self._records[record.id] = record
            self._persist()

    def mark_broadcast_ready(self, record: TransactionRecord, payload: Dict[str, str]) -> TransactionRecord:
        self.kill_switch.guard()
        if record.status != TransactionStatus.APPROVED:
            raise ValueError("Transaction must be approved before broadcast.")
        record.status = TransactionStatus.BROADCAST_READY
        record.metadata["unsigned_payload"] = json.dumps(payload)
        self.update_record(record)
        self.audit.append(
            actor="omarai",
            action="transaction.broadcast_ready",
            details={"transaction_id": record.id, "payload_keys": list(payload.keys())},
        )
        return record

    def get_record(self, record_id: str) -> Optional[TransactionRecord]:
        return self._records.get(record_id)

    def list_records(self) -> List[TransactionRecord]:
        return list(self._records.values())
