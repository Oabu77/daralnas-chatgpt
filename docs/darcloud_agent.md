# DarCloud Agent Daemon

Python-based Flask agent exposing status and command execution endpoints for QuranChain/Omar AI orchestration.

## Runtime summary
- **Port:** 7788
- **Env:** `QURANCHAIN_WALLET` binds the agent to a QuranChain wallet identity.
- **Log:** `~/darcloud_agent/agent.log` captures every request and receipt.
- **Executable:** `darcloud_agent.py`

## API
### `GET /status`
Returns the online heartbeat for the agent with host-anchored identity and wallet binding.

### `POST /execute`
Accepts JSON `{ "command": "<shell command>" }`, executes locally, and returns a receipt with stdout/stderr, success flag, and identifiers.

## Deployment
### Linux (bash)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip flask
export QURANCHAIN_WALLET="<your-wallet-address>"
python darcloud_agent.py
```

### Termux (Android)
```bash
pkg update -y && pkg install -y python git
python -m venv ~/darcloud_venv
source ~/darcloud_venv/bin/activate
pip install --upgrade pip flask
export QURANCHAIN_WALLET="<your-wallet-address>"
python ~/darcloud_agent.py
```

## Verification flow
1. Ensure the agent is running on port 7788.
2. Check status:
   ```bash
   curl -s http://localhost:7788/status | jq
   ```
3. Execute a safe command and capture receipt:
   ```bash
   curl -s -X POST http://localhost:7788/execute \\
     -H 'Content-Type: application/json' \\
     -d '{"command":"uname -a"}' | jq
   ```
4. Confirm `success` is `true` and review `~/darcloud_agent/agent.log` for the recorded execution and receipt.

## Order completion bridge
- **Order definition:** Each order maps to an executable command plus metadata that specifies the required outcome.
- **Command mapping:** The order payload provides the shell command submitted to `/execute`.
- **Receipt as proof:** The `/execute` response (task_id + output + success + timestamp + wallet + agent_id) is the cryptographic-ready proof of work.
- **Completion rule:** When `success` is true, the order is marked **COMPLETE** and the receipt is stored/forwarded for settlement.
- **Auditability:** Receipts are deterministic JSON blobs with UUID task IDs and timestamps; the same payload is logged to disk for replay or on-chain submission later.

## Sample responses
Captured from the verification run (localhost):
- `GET /status` example:
  ```json
  {
    "agent_id": "f6bf65f9de4c",
    "wallet": "demo-wallet-001",
    "status": "ONLINE",
    "timestamp": 1765603002
  }
  ```
- `POST /execute` example receipt:
  ```json
  {
    "agent_id": "f6bf65f9de4c",
    "command": "uname -a",
    "output": "Linux f6bf65f9de4c 6.12.13 #1 SMP Thu Mar 13 11:34:50 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux",
    "success": true,
    "task_id": "0ade3e4f-63b4-4da1-b85f-9eecbec42f67",
    "timestamp": 1765603003,
    "wallet": "demo-wallet-001"
  }
  ```
