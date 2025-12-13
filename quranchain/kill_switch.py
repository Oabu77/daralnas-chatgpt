# © QuranChain™ | Dar Al-Nas™
# Founder: Omar Mohammad Abunadi
# Ownership Signature Enforced

"""Global kill switch enforcement."""

import json
from datetime import datetime
from threading import Lock
from typing import Any, Dict

from . import config


class KillSwitch:
    """Persists and enforces a global kill switch across services."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._state = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        if config.KILL_SWITCH_PATH.exists():
            return json.loads(config.KILL_SWITCH_PATH.read_text())
        return {"engaged": False, "reason": None, "timestamp": None, "note": None}

    def _persist(self) -> None:
        with self._lock:
            config.KILL_SWITCH_PATH.write_text(json.dumps(self._state, indent=2))

    def engage(self, reason: str) -> Dict[str, Any]:
        with self._lock:
            self._state = {
                "engaged": True,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat(),
                "note": None,
            }
            self._persist()
            return self._state

    def release(self, note: str | None = None) -> Dict[str, Any]:
        with self._lock:
            self._state.update(
                {
                    "engaged": False,
                    "reason": None,
                    "timestamp": datetime.utcnow().isoformat(),
                    "note": note,
                }
            )
            self._persist()
            return self._state

    def is_engaged(self) -> bool:
        return bool(self._state.get("engaged"))

    def guard(self) -> None:
        if self.is_engaged():
            raise PermissionError("Kill switch is engaged; operations are halted.")

    def state(self) -> Dict[str, Any]:
        return dict(self._state)
