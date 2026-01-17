#!/usr/bin/env python3
"""
QuranChain Founder Execution Agent
Role-based command execution with audit logging and rate limiting
"""
import os
import shlex
import subprocess
import time
from collections import deque, defaultdict
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel

APP = FastAPI(title="QuranChain Founder Execution Agent")

FOUNDER = os.environ.get("QC_AGENT_TOKEN_FOUNDER", "")
WORKER = os.environ.get("QC_AGENT_TOKEN_WORKER", "")
DEFAULT_ROLE = os.environ.get("QC_AGENT_ROLE_DEFAULT", "worker").strip().lower()
RATE = int(os.environ.get("QC_AGENT_RATE_LIMIT_PER_MIN", "30"))

# Worker: telemetry only (no file reads, no service control)
ALLOW_WORKER = {
    "ss", "lsof", "ps", "netstat", "ip", "ping",
    "uname", "uptime", "df", "du", "free", "whoami", "pwd"
}

# Founder: ops-level, still constrained
ALLOW_FOUNDER = set(ALLOW_WORKER) | {
    "systemctl", "journalctl", "docker", "git", "cloudflared", "curl", "jq"
}

AUDIT_PATH = os.path.expanduser("~/quranchain_fee/logs/agent_audit.log")

# simple in-memory rate limiter per token hash
WINDOW = 60
hits = defaultdict(lambda: deque())


class Cmd(BaseModel):
    cmd: str


def _role(x_qc_token: str) -> str:
    if not FOUNDER and not WORKER:
        raise HTTPException(500, "Agent tokens not set")
    if x_qc_token == FOUNDER:
        return "founder"
    if x_qc_token == WORKER:
        return "worker"
    raise HTTPException(401, "Unauthorized")


def _allowlist(role: str):
    return ALLOW_FOUNDER if role == "founder" else ALLOW_WORKER


def _rate_limit(key: str):
    now = time.time()
    q = hits[key]
    while q and now - q[0] > WINDOW:
        q.popleft()
    if len(q) >= RATE:
        raise HTTPException(429, f"Rate limit exceeded ({RATE}/min)")
    q.append(now)


def _audit(role: str, cmd: str, ok: bool, rc: int, elapsed: float):
    try:
        line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} role={role} ok={ok} rc={rc} elapsed={elapsed:.3f}s cmd={cmd}\n"
        with open(AUDIT_PATH, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass


@APP.post("/run")
def run(payload: Cmd, request: Request, x_qc_token: str = Header(default="")):
    role = _role(x_qc_token) if x_qc_token else DEFAULT_ROLE
    # If caller didn't provide token, deny (no anonymous use)
    if not x_qc_token:
        raise HTTPException(401, "Missing X-QC-Token")

    # rate limit per token (don't log token)
    _rate_limit(role)

    parts = shlex.split(payload.cmd)
    if not parts:
        raise HTTPException(400, "Empty command")

    allow = _allowlist(role)
    if parts[0] not in allow:
        raise HTTPException(403, f"Command not allowed for role={role}: {parts[0]}")

    # Guard dangerous founder-only usage
    if parts[0] == "systemctl":
        # allow only status/is-active/restart for qc-agent and cloudflared-tunnel
        safe_units = {"qc-agent", "cloudflared-tunnel", "wg-quick@wg0"}
        safe_verbs = {"status", "is-active", "restart", "start", "stop"}
        if len(parts) < 3 or parts[1] not in safe_verbs or parts[2] not in safe_units:
            raise HTTPException(403, "systemctl restricted to qc-agent/cloudflared-tunnel/wg-quick@wg0 with safe verbs")

    if parts[0] == "journalctl":
        # allow only reading qc-agent + cloudflared-tunnel logs
        if "-u" not in parts:
            raise HTTPException(403, "journalctl requires -u <unit>")
        uidx = parts.index("-u")
        if uidx + 1 >= len(parts):
            raise HTTPException(403, "journalctl missing unit")
        if parts[uidx + 1] not in {"qc-agent", "cloudflared-tunnel"}:
            raise HTTPException(403, "journalctl unit restricted")
        # also enforce max lines
        if "-n" in parts:
            nidx = parts.index("-n")
            try:
                n = int(parts[nidx + 1])
                if n > 200:
                    raise HTTPException(403, "journalctl -n max 200")
            except Exception:
                raise HTTPException(403, "journalctl invalid -n")
        else:
            parts += ["-n", "120"]

    t0 = time.time()
    try:
        p = subprocess.run(parts, capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        _audit(role, payload.cmd, False, 408, time.time() - t0)
        raise HTTPException(408, "Command timed out")

    elapsed = time.time() - t0
    ok = (p.returncode == 0)
    _audit(role, payload.cmd, ok, p.returncode, elapsed)

    return {
        "role": role,
        "ok": ok,
        "returncode": p.returncode,
        "stdout": p.stdout[-20000:],
        "stderr": p.stderr[-20000:],
        "elapsed_s": round(elapsed, 3)
    }


@APP.get("/health")
def health():
    return {"ok": True, "agent": "online"}
