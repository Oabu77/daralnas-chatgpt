# © QuranChain™ | Dar Al-Nas™
# Founder: Omar Mohammad Abunadi
# Ownership Signature Enforced

"""Append-only audit ledger with hash chaining."""

import json
import hashlib
from dataclasses import asdict, dataclass
from datetime import datetime
from threading import Lock
from typing import Any, Dict, Iterable, Optional

from . import config


@dataclass
class AuditRecord:
    timestamp: str
    actor: str
    action: str
    details: Dict[str, Any]
    previous_hash: Optional[str]
    record_hash: str

    @classmethod
    def create(cls, actor: str, action: str, details: Dict[str, Any], previous_hash: Optional[str]) -> "AuditRecord":
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "actor": actor,
            "action": action,
            "details": details,
            "previous_hash": previous_hash,
        }
        serialized = json.dumps(payload, sort_keys=True)
        return cls(
            timestamp=payload["timestamp"],
            actor=actor,
            action=action,
            details=details,
            previous_hash=previous_hash,
            record_hash=hashlib.sha256(serialized.encode()).hexdigest(),
        )


class AuditLedger:
    """JSONL-based append-only ledger with hash chain verification."""

    def __init__(self, path=config.AUDIT_LOG_PATH) -> None:
        self.path = path
        self._lock = Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _load_last_hash(self) -> Optional[str]:
        if not self.path.exists():
            return None
        last_line = None
        with self.path.open("r") as handle:
            for line in handle:
                if line.strip():
                    last_line = line
        if not last_line:
            return None
        return json.loads(last_line).get("record_hash")

    def append(self, actor: str, action: str, details: Dict[str, Any]) -> AuditRecord:
        with self._lock:
            previous_hash = self._load_last_hash()
            record = AuditRecord.create(actor=actor, action=action, details=details, previous_hash=previous_hash)
            with self.path.open("a") as handle:
                handle.write(json.dumps(asdict(record)) + "\n")
            return record

    def verify(self) -> bool:
        def iterate_records() -> Iterable[AuditRecord]:
            if not self.path.exists():
                return
            with self.path.open("r") as handle:
                for line in handle:
                    if line.strip():
                        data = json.loads(line)
                        yield AuditRecord(**data)

        last_hash: Optional[str] = None
        for record in iterate_records():
            payload = {
                "timestamp": record.timestamp,
                "actor": record.actor,
                "action": record.action,
                "details": record.details,
                "previous_hash": record.previous_hash,
            }
            computed = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
            if computed != record.record_hash or record.previous_hash != last_hash:
                return False
            last_hash = record.record_hash
        return True
