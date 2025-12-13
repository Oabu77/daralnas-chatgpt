# © QuranChain™ | Dar Al-Nas™
# Founder: Omar Mohammad Abunadi
# Ownership Signature Enforced

"""Treasury management with revenue-first enforcement."""

import json
from dataclasses import asdict, dataclass
from decimal import Decimal
from threading import Lock
from typing import Dict, Optional

from . import config


@dataclass
class AccountBalance:
    account_id: str
    currency: str
    available: Decimal
    pending: Decimal

    def allocate(self, amount: Decimal) -> None:
        self.pending += amount

    def settle(self, amount: Decimal) -> None:
        self.available += amount
        self.pending -= amount


class Treasury:
    """Tracks balances, revenue, and founder royalty accruals."""

    def __init__(self, snapshot_path=config.TREASURY_SNAPSHOT_PATH) -> None:
        self.snapshot_path = snapshot_path
        self._lock = Lock()
        self._balances: Dict[str, AccountBalance] = {}
        self._load()

    def _load(self) -> None:
        if not self.snapshot_path.exists():
            return
        data = json.loads(self.snapshot_path.read_text())
        for entry in data:
            balance = AccountBalance(
                account_id=entry["account_id"],
                currency=entry["currency"],
                available=Decimal(entry["available"]),
                pending=Decimal(entry["pending"]),
            )
            self._balances[balance.account_id] = balance

    def _persist(self) -> None:
        with self.snapshot_path.open("w") as handle:
            serialized = [
                {
                    "account_id": bal.account_id,
                    "currency": bal.currency,
                    "available": str(bal.available),
                    "pending": str(bal.pending),
                }
                for bal in self._balances.values()
            ]
            json.dump(serialized, handle, indent=2)

    def _get_or_create(self, account_id: str, currency: str) -> AccountBalance:
        if account_id not in self._balances:
            self._balances[account_id] = AccountBalance(
                account_id=account_id,
                currency=currency,
                available=Decimal("0"),
                pending=Decimal("0"),
            )
        return self._balances[account_id]

    def allocate_payment(self, source: str, destination: str, amount: Decimal, currency: str) -> Dict[str, str]:
        with self._lock:
            src = self._get_or_create(source, currency)
            dst = self._get_or_create(destination, currency)
            src.allocate(-amount)
            dst.allocate(amount)
            self._persist()
            return {"source": source, "destination": destination, "currency": currency, "amount": str(amount)}

    def accrue_revenue(self, amount: Decimal, currency: str) -> None:
        with self._lock:
            royalty_account = self._get_or_create("founder-royalty", currency)
            royalty_account.allocate(amount)
            self._persist()

    def prepare_fee_schedule(self, amount: Decimal, fee_bps: int, royalty_rate: Decimal) -> Dict[str, Decimal]:
        fee = (amount * Decimal(fee_bps) / Decimal(10000)).quantize(Decimal("0.01"))
        royalty = (amount * royalty_rate).quantize(Decimal("0.01"))
        net = amount - fee - royalty
        return {"fee": fee, "royalty": royalty, "net": net}

    def snapshot(self) -> Dict[str, Dict[str, str]]:
        with self._lock:
            return {account: asdict(balance) for account, balance in self._balances.items()}
