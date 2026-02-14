#!/usr/bin/env python3
"""
Fungi Mesh Payment Processor (Stub)
----------------------------------
Minimal service to satisfy integration health checks and avoid connection refusals.
Provides /health and /status endpoints. Upgrade later with real processing logic.
"""

import sys
import os
from typing import Any, Callable, Dict, List

# Optional FastAPI import with safe fallback stubs
try:
    from fastapi import FastAPI  # type: ignore
    FASTAPI_AVAILABLE = True
except Exception:
    FASTAPI_AVAILABLE = False

    class FastAPI:  # type: ignore
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self._routes: List[Dict[str, Any]] = []
        def get(self, path: str = "/", **kwargs: Any):
            def deco(f):
                self._routes.append({"method": "GET", "path": path})
                return f
            return deco

from datetime import datetime

SERVICE_NAME = "Fungi Mesh Payment Processor"
SERVICE_ID = "fungi_mesh_payment_v0"
DEFAULT_PORT = 6000

app = FastAPI(title=SERVICE_NAME, version="0.0.1", description="Stub service")

@app.get("/health")
def health():
    return {"status": "healthy", "service": SERVICE_NAME, "timestamp": datetime.utcnow().isoformat() + "Z"}

@app.get("/status")
def status():
    return {
        "service": SERVICE_NAME,
        "service_id": SERVICE_ID,
        "message": "Stub payment processor online",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

if __name__ == "__main__":
    try:
        import importlib
        try:
            uvicorn = importlib.import_module("uvicorn")
        except Exception:
            # Fallback to Hypercorn if uvicorn missing
            hypercorn_asyncio = importlib.import_module("hypercorn.asyncio")
            hypercorn_config = importlib.import_module("hypercorn.config")
            import asyncio
            def _hypercorn_run(app_obj, host="0.0.0.0", port=DEFAULT_PORT, reload=False):
                cfg = hypercorn_config.Config()
                cfg.bind = [f"{host}:{port}"]
                asyncio.run(hypercorn_asyncio.serve(app_obj, cfg))
            class _UvicornShim:
                run = staticmethod(_hypercorn_run)
            uvicorn = _UvicornShim()
    except Exception:
        print("uvicorn/hypercorn not available; cannot start server.")
        sys.exit(1)

    print(f"🚀 Starting {SERVICE_NAME} on 0.0.0.0:{DEFAULT_PORT}")
    uvicorn.run(app, host="0.0.0.0", port=DEFAULT_PORT, reload=False)
