# © QuranChain™ | Dar Al-Nas™
# Founder: Omar Mohammad Abunadi
# Ownership Signature Enforced

"""Static configuration for QuranChain runtime."""

from pathlib import Path
from decimal import Decimal

DATA_DIR = Path(__file__).resolve().parent / "data"
AUDIT_LOG_PATH = DATA_DIR / "audit_log.jsonl"
KILL_SWITCH_PATH = DATA_DIR / "kill_switch_state.json"
TREASURY_SNAPSHOT_PATH = DATA_DIR / "treasury_snapshot.json"
TRANSACTION_LOG_PATH = DATA_DIR / "transactions.json"

FOUNDER_ID = "omar_m_abunadi"
FOUNDER_ROYALTY = Decimal("0.10")
DEFAULT_CURRENCY = "USD"
MAX_SINGLE_TX = Decimal("1000000")
WHITELISTED_DESTINATIONS = {"quranchain:foundation", "quranchain:treasury", "quranchain:partners"}


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


ensure_directories()
