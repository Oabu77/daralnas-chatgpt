#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
 MineHut Bridge Server — QuranChain ↔ MineHut Tunnel
═══════════════════════════════════════════════════════════════════════════════
 Port: 9035  (Cloudflare tunnel: backup.darcloud.host)

 A persistent bridge service that connects the local QuranChain ecosystem
 to MineHut servers. Provides:
   • REST API for server management (wake/hibernate/status)
   • Token management (extract, cache, refresh)
   • Automated backup pipeline (create → wake → upload → hibernate)
   • Real-time web dashboard for remote monitoring
   • Webhook callbacks for external integration
   • Health checks for ecosystem monitoring

 Architecture:
   ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
   │  Local Host   │────→│ Cloudflare Tunnel │────→│  backup.darcloud │
   │  Port 9035    │     │  93ea7222-3b95... │     │      .host       │
   └──────┬───────┘     └──────────────────┘     └──────────────────┘
          │
   ┌──────▼───────┐     ┌──────────────────┐
   │ Backup Engine │────→│   MineHut API    │
   │ Token Manager │     │ api.minehut.com  │
   │ Server Ctrl   │     │ QCMesh1/QCMesh2  │
   └──────────────┘     └──────────────────┘

 Usage:
   python3 minehut_bridge_server.py            # Start bridge server
   python3 minehut_bridge_server.py --port 9035
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
import time
import hashlib
import tarfile
import base64
import signal
import threading
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse, parse_qs

# ─── Configuration ─────────────────────────────────────────────────────────
PORT = int(os.environ.get("BRIDGE_PORT", 9035))
HOST = "0.0.0.0"

QC_DIR = Path("/home/omar/Desktop/QuranChain")
OS_DIR = Path("/home/omar/Desktop/QuranChain-OS")
BACKUP_DIR = OS_DIR / "backups" / "minehut"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR = OS_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "minehut_bridge.log"
PID_FILE = OS_DIR / "minehut_bridge.pid"
TOKEN_CACHE = Path.home() / ".minehut_tokens"

MINEHUT_API = "https://api.minehut.com"
MINEHUT_EMAIL = os.environ.get("MINEHUT_EMAIL", "omarabunadi28@gmail.com")
MINEHUT_PASSWORD = os.environ.get("MINEHUT_PASSWORD", "")

SERVERS = {
    "QCMesh1": {"id": "69900a476a79cd81c5a50307", "region": "us-east", "role": "primary"},
    "QCMesh2": {"id": "69900a90712b794f6247495b", "region": "eu-west", "role": "secondary"},
}

HEADERS = {
    "User-Agent": "QuranChain-Bridge/2.0 (DarCloud Ecosystem)",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

# Files to backup
OS_FILES = [
    "revenue-server.js", "agent-webhook-receiver.js", "dar-al-nas-realestate-bot.js",
    "landing-page-manager-bot.js", "halal-wealth-club-bot.js", "ai-bot-manager.js",
    "marketing-bots.js", "marketing-dashboard.js", "customer-acquisition.js",
    "real-revenue-activator.js", "payment-webhook-server.js", "bot-earners-service.js",
    "agent-actions-server.js", "deploy_all_agents_and_bots.sh", "deploy_agents.sh",
    "deploy_production_live.py", "automated_revenue.py", "package.json",
    "minehut_auto_backup.py", "minehut_bridge_server.py",
]

QC_CRITICAL_FILES = [
    ".env", "quranchain_blockchain_host.py", "quranchain_v5.py",
    "ai_agent_scheduler.py", "autonomous_ai_agent.py", "ai_network_integration.py",
    "production_port_binder.py",
]

QC_DIRS = [
    "ai_workforce", "organized/ai_agents", "organized/services",
    "organized/monitoring", "organized/revenue", "organized/blockchain", "crm",
]
OS_DIRS = ["workers", "data"]

BACKUP_EXTENSIONS = {
    '.py', '.js', '.json', '.toml', '.sh', '.yaml', '.yml',
    '.md', '.html', '.css', '.env', '.txt', '.db', '.sql',
}

# ─── State ─────────────────────────────────────────────────────────────────
bridge_state = {
    "started_at": None,
    "last_backup": None,
    "last_backup_status": None,
    "backup_count": 0,
    "backups_running": False,
    "auth_token": None,
    "session_id": None,
    "token_valid": False,
    "token_expires": None,
    "servers": {},
    "logs": [],
    "version": "2.0.0",
}

state_lock = threading.Lock()

# ─── Logging ───────────────────────────────────────────────────────────────

def blog(msg, level="INFO"):
    """Bridge log — console + file + state."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    icons = {"INFO": "ℹ️", "OK": "✅", "WARN": "⚠️", "ERR": "❌", "UP": "🚀", "SYNC": "🔄"}
    icon = icons.get(level, "")
    line = f"[{ts}] [{level}] {icon} {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass
    with state_lock:
        bridge_state["logs"].append({"ts": ts, "level": level, "msg": msg})
        if len(bridge_state["logs"]) > 500:
            bridge_state["logs"] = bridge_state["logs"][-300:]


# ─── HTTP Helpers ──────────────────────────────────────────────────────────

def api_request(url, method="GET", data=None, extra_headers=None, timeout=30):
    """HTTP request with retry."""
    headers = dict(HEADERS)
    if extra_headers:
        headers.update(extra_headers)
    body = None
    if data is not None:
        if isinstance(data, dict):
            body = json.dumps(data).encode()
        elif isinstance(data, str):
            body = data.encode()
        elif isinstance(data, bytes):
            body = data

    for attempt in range(3):
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode()
                return json.loads(raw) if raw.strip() else {"ok": True}
        except urllib.error.HTTPError as e:
            err_body = ""
            try:
                err_body = e.read().decode()
            except:
                pass
            if e.code == 429:
                time.sleep(min(2 ** attempt * 5, 60))
                continue
            return {"error": True, "status": e.code, "message": err_body}
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
                continue
            return {"error": True, "message": str(e)}
    return {"error": True, "message": "Max retries"}


def auth_headers():
    """Build auth headers from state."""
    h = {}
    if bridge_state.get("auth_token"):
        h["Authorization"] = bridge_state["auth_token"]
    if bridge_state.get("session_id"):
        h["X-Session-Id"] = bridge_state["session_id"]
    return h


# ─── Token Management ─────────────────────────────────────────────────────

def load_cached_tokens():
    """Load tokens from cache."""
    if not TOKEN_CACHE.exists():
        return False
    try:
        data = json.loads(TOKEN_CACHE.read_text())
        token = data.get("auth_token")
        session_id = data.get("session_id")
        expires = data.get("expires")
        if expires:
            exp_time = datetime.fromisoformat(expires)
            if datetime.now() > exp_time:
                blog("Cached tokens expired", "WARN")
                return False
        if token and session_id:
            with state_lock:
                bridge_state["auth_token"] = token
                bridge_state["session_id"] = session_id
                bridge_state["token_expires"] = expires
            blog(f"Loaded cached tokens (expires: {expires})")
            return True
    except Exception as e:
        blog(f"Token load error: {e}", "WARN")
    return False


def save_tokens(token, session_id, hours=12):
    """Save tokens to state + cache."""
    expires = (datetime.now() + timedelta(hours=hours)).isoformat()
    with state_lock:
        bridge_state["auth_token"] = token
        bridge_state["session_id"] = session_id
        bridge_state["token_expires"] = expires
        bridge_state["token_valid"] = True
    data = {
        "auth_token": token,
        "session_id": session_id,
        "expires": expires,
        "email": MINEHUT_EMAIL,
        "cached_at": datetime.now().isoformat(),
    }
    TOKEN_CACHE.write_text(json.dumps(data, indent=2))
    TOKEN_CACHE.chmod(0o600)
    blog(f"Tokens saved (expires in {hours}h)", "OK")


def validate_tokens():
    """Check if current tokens work."""
    token = bridge_state.get("auth_token")
    session_id = bridge_state.get("session_id")
    if not token or not session_id:
        return False

    sid = SERVERS["QCMesh1"]["id"]
    result = api_request(
        f"{MINEHUT_API}/server/{sid}/status",
        extra_headers=auth_headers(),
    )
    valid = result and not result.get("error")
    with state_lock:
        bridge_state["token_valid"] = valid
    return valid


def extract_tokens_selenium():
    """Use Selenium headless Chrome to login and extract tokens."""
    if not MINEHUT_PASSWORD:
        blog("No MINEHUT_PASSWORD — Selenium disabled", "WARN")
        return False
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
    except ImportError:
        blog("Selenium not installed", "ERR")
        return False

    blog("Selenium: Starting headless Chrome login...", "SYNC")
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")

    driver = None
    try:
        driver = webdriver.Chrome(options=opts)
        driver.set_page_load_timeout(60)
        driver.get("https://minehut.com/login")
        time.sleep(4)

        # Fill email
        try:
            email_field = WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="email"], input[name="email"]'))
            )
            email_field.clear()
            email_field.send_keys(MINEHUT_EMAIL)
        except:
            inputs = driver.find_elements(By.TAG_NAME, "input")
            if inputs:
                inputs[0].send_keys(MINEHUT_EMAIL)

        time.sleep(1)

        # Fill password
        try:
            pass_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="password"]'))
            )
            pass_field.clear()
            pass_field.send_keys(MINEHUT_PASSWORD)
        except:
            pass

        time.sleep(1)

        # Click login
        buttons = driver.find_elements(By.CSS_SELECTOR, 'button[type="submit"], button')
        for btn in buttons:
            if any(w in btn.text.lower() for w in ['log in', 'sign in', 'login']):
                btn.click()
                break

        time.sleep(8)

        # Extract tokens
        auth_token = driver.execute_script("return localStorage.getItem('minehut_auth_token');")
        session_id = driver.execute_script("return localStorage.getItem('minehut_session_id');")

        if not auth_token:
            all_keys = driver.execute_script("""
                var items = [];
                for (var i = 0; i < localStorage.length; i++) {
                    items.push({k: localStorage.key(i), v: localStorage.getItem(localStorage.key(i))});
                }
                return items;
            """)
            for item in (all_keys or []):
                if 'token' in item['k'].lower() or 'auth' in item['k'].lower():
                    auth_token = item['v']
                if 'session' in item['k'].lower():
                    session_id = item['v']

        if auth_token and session_id:
            save_tokens(auth_token, session_id)
            blog("Selenium: Tokens extracted!", "OK")
            return True
        else:
            blog("Selenium: No tokens found in localStorage", "ERR")
            return False
    except Exception as e:
        blog(f"Selenium error: {e}", "ERR")
        return False
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass


def ensure_auth():
    """Ensure we have valid auth tokens."""
    # Try cached first
    if bridge_state.get("auth_token") and bridge_state.get("session_id"):
        if validate_tokens():
            return True

    # Load from file
    if load_cached_tokens():
        if validate_tokens():
            return True

    # Try Selenium
    if extract_tokens_selenium():
        return True

    blog("No valid authentication available", "ERR")
    return False


# ─── Server Operations ────────────────────────────────────────────────────

def refresh_server_status():
    """Update status of all servers."""
    for name, info in SERVERS.items():
        result = api_request(f"{MINEHUT_API}/server/{name}?byName=true")
        if result and "server" in result:
            srv = result["server"]
            with state_lock:
                bridge_state["servers"][name] = {
                    "id": srv.get("_id"),
                    "online": srv.get("online", False),
                    "status": srv.get("status"),
                    "plan": srv.get("server_plan", "FREE"),
                    "suspended": srv.get("suspended", False),
                    "players": srv.get("playerCount", 0),
                    "checked_at": datetime.now().isoformat(),
                }
        else:
            with state_lock:
                bridge_state["servers"][name] = {
                    "error": True,
                    "checked_at": datetime.now().isoformat(),
                }


def wake_server(server_name):
    """Wake a specific server from hibernation."""
    info = SERVERS.get(server_name)
    if not info:
        return {"error": f"Unknown server: {server_name}"}

    if not ensure_auth():
        return {"error": "No authentication — set tokens first"}

    blog(f"Waking {server_name}...", "UP")

    # Try start_service (from hibernation)
    result = api_request(
        f"{MINEHUT_API}/server/{info['id']}/start_service",
        method="POST", data={},
        extra_headers=auth_headers(),
    )
    if result and not result.get("error"):
        blog(f"{server_name}: start_service sent", "OK")
        # Poll for online
        for i in range(18):  # 3 minutes
            time.sleep(10)
            status = api_request(f"{MINEHUT_API}/server/{server_name}?byName=true")
            if status and status.get("server", {}).get("online"):
                blog(f"{server_name}: ONLINE after {(i+1)*10}s!", "OK")
                refresh_server_status()
                return {"status": "online", "server": server_name, "took_seconds": (i+1)*10}
        return {"status": "timeout", "server": server_name, "message": "Server started but didn't come online within 3 minutes"}

    # Try regular start
    result = api_request(
        f"{MINEHUT_API}/server/{info['id']}/start",
        method="POST", data={},
        extra_headers=auth_headers(),
    )
    if result and not result.get("error"):
        blog(f"{server_name}: start sent (not hibernated)", "OK")
        return {"status": "starting", "server": server_name}

    return {"error": f"Failed to wake: {result.get('message', 'unknown')}"}


def hibernate_server(server_name):
    """Hibernate a server."""
    info = SERVERS.get(server_name)
    if not info:
        return {"error": f"Unknown server: {server_name}"}

    if not ensure_auth():
        return {"error": "No authentication"}

    result = api_request(
        f"{MINEHUT_API}/server/{info['id']}/destroy_service",
        method="POST", data={},
        extra_headers=auth_headers(),
    )
    if result and not result.get("error"):
        blog(f"{server_name}: Hibernated", "OK")
        refresh_server_status()
        return {"status": "hibernated", "server": server_name}

    return {"error": f"Hibernate failed: {result.get('message', '')}"}


def wake_all_servers():
    """Wake all servers."""
    results = {}
    for name in SERVERS:
        results[name] = wake_server(name)
    return results


def hibernate_all_servers():
    """Hibernate all servers."""
    results = {}
    for name in SERVERS:
        results[name] = hibernate_server(name)
        time.sleep(2)
    return results


# ─── Backup Operations ────────────────────────────────────────────────────

def create_archive(name, base_dir, files=None, dirs=None):
    """Create compressed backup archive."""
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    archive_path = BACKUP_DIR / f"{name}_{ts}.tar.gz"
    count = 0
    with tarfile.open(archive_path, "w:gz") as tar:
        if files:
            for f in files:
                fpath = base_dir / f
                if fpath.exists():
                    tar.add(str(fpath), arcname=f"{name}/{f}")
                    count += 1
        if dirs:
            for d in dirs:
                dpath = base_dir / d
                if dpath.exists():
                    for root, _, filenames in os.walk(dpath):
                        for fn in filenames:
                            if Path(fn).suffix in BACKUP_EXTENSIONS:
                                full = os.path.join(root, fn)
                                tar.add(full, arcname=f"{name}/{os.path.relpath(full, base_dir)}")
                                count += 1
    return archive_path, count, archive_path.stat().st_size


def upload_to_server(server_name, archive_path):
    """Upload archive to a single MineHut server."""
    info = SERVERS.get(server_name)
    if not info:
        return {"error": f"Unknown server: {server_name}"}

    token = bridge_state.get("auth_token")
    session_id = bridge_state.get("session_id")
    if not token or not session_id:
        return {"error": "No auth tokens"}

    ah = auth_headers()
    sid = info["id"]

    # Create directories
    api_request(f"{MINEHUT_API}/file/{sid}/folder/create", method="POST",
                data={"name": "QuranChain", "directory": "/"}, extra_headers=ah)
    time.sleep(0.5)
    api_request(f"{MINEHUT_API}/file/{sid}/folder/create", method="POST",
                data={"name": "backups", "directory": "QuranChain"}, extra_headers=ah)
    time.sleep(0.5)

    archive_data = archive_path.read_bytes()
    archive_b64 = base64.b64encode(archive_data).decode()

    chunk_size = 3_000_000
    chunks = [archive_b64[i:i+chunk_size] for i in range(0, len(archive_b64), chunk_size)]
    ok = 0
    fail = 0

    for i, chunk in enumerate(chunks):
        content = json.dumps({
            "archive": archive_path.name,
            "chunk_index": i,
            "total_chunks": len(chunks),
            "data": chunk,
            "ts": datetime.now().isoformat(),
        })
        result = api_request(
            f"{MINEHUT_API}/file/{sid}/edit/QuranChain/backups/{archive_path.stem}_chunk_{i}.json",
            method="POST", data={"content": content},
            extra_headers=ah, timeout=60,
        )
        if result and not result.get("error"):
            ok += 1
        else:
            fail += 1
        time.sleep(0.5)

    # Manifest
    manifest = json.dumps({
        "archive": archive_path.name,
        "size": len(archive_data),
        "sha256": hashlib.sha256(archive_data).hexdigest(),
        "chunks": len(chunks),
        "ok": ok,
        "fail": fail,
        "ts": datetime.now().isoformat(),
    }, indent=2)
    api_request(
        f"{MINEHUT_API}/file/{sid}/edit/QuranChain/backups/{archive_path.stem}_manifest.json",
        method="POST", data={"content": manifest}, extra_headers=ah,
    )

    return {"chunks_ok": ok, "chunks_fail": fail, "total": len(chunks), "archive": archive_path.name}


def run_full_backup():
    """Full backup pipeline: create → wake → upload → hibernate."""
    with state_lock:
        if bridge_state["backups_running"]:
            return {"error": "Backup already in progress"}
        bridge_state["backups_running"] = True

    try:
        blog("=" * 50, "UP")
        blog("FULL BACKUP PIPELINE STARTING", "UP")
        results = {"started": datetime.now().isoformat(), "servers": {}}

        # 1. Create archives
        blog("Creating backup archives...")
        qc_archive, qc_count, qc_size = create_archive(
            "quranchain", QC_DIR, files=QC_CRITICAL_FILES, dirs=QC_DIRS
        )
        blog(f"QuranChain: {qc_count} files, {qc_size:,} bytes", "OK")

        os_archive, os_count, os_size = create_archive(
            "quranchain_os", OS_DIR, files=OS_FILES, dirs=OS_DIRS
        )
        blog(f"QuranChain-OS: {os_count} files, {os_size:,} bytes", "OK")

        results["archives"] = {
            "quranchain": {"files": qc_count, "size": qc_size, "name": qc_archive.name},
            "quranchain_os": {"files": os_count, "size": os_size, "name": os_archive.name},
        }

        # 2. Check auth
        has_auth = ensure_auth()
        results["auth"] = has_auth

        if has_auth:
            # 3. Wake servers
            blog("Waking MineHut servers...")
            for name, info in SERVERS.items():
                status = api_request(f"{MINEHUT_API}/server/{name}?byName=true")
                is_online = status and status.get("server", {}).get("online")

                if not is_online:
                    wake_result = wake_server(name)
                    is_online = wake_result.get("status") == "online"

                if is_online:
                    # 4. Upload
                    blog(f"Uploading to {name}...")
                    qc_res = upload_to_server(name, qc_archive)
                    os_res = upload_to_server(name, os_archive)
                    results["servers"][name] = {
                        "status": "uploaded",
                        "quranchain": qc_res,
                        "quranchain_os": os_res,
                    }
                else:
                    results["servers"][name] = {"status": "offline", "reason": "could not wake"}
                    blog(f"{name}: Could not bring online", "WARN")

            # 5. Hibernate to save resources
            blog("Hibernating servers...")
            time.sleep(3)
            for name, info in SERVERS.items():
                hibernate_server(name)
                time.sleep(2)
        else:
            for name in SERVERS:
                results["servers"][name] = {"status": "local_only", "reason": "no_auth"}

        results["completed"] = datetime.now().isoformat()
        results["total_files"] = qc_count + os_count
        results["total_size"] = qc_size + os_size

        with state_lock:
            bridge_state["last_backup"] = datetime.now().isoformat()
            bridge_state["last_backup_status"] = results
            bridge_state["backup_count"] += 1

        blog("BACKUP PIPELINE COMPLETE", "OK")
        blog("=" * 50)

        # Cleanup old archives (30+ days)
        cutoff = datetime.now() - timedelta(days=30)
        for f in BACKUP_DIR.glob("*.tar.gz"):
            try:
                if datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
                    f.unlink()
            except:
                pass

        return results

    except Exception as e:
        blog(f"Backup pipeline error: {e}", "ERR")
        return {"error": str(e)}
    finally:
        with state_lock:
            bridge_state["backups_running"] = False


# ─── Dashboard HTML ────────────────────────────────────────────────────────

def get_dashboard_html():
    """Generate the bridge dashboard UI."""
    servers_html = ""
    for name, info in SERVERS.items():
        srv = bridge_state.get("servers", {}).get(name, {})
        online = srv.get("online", False)
        status_class = "online" if online else "offline"
        status_text = "🟢 ONLINE" if online else "🔴 OFFLINE"
        servers_html += f"""
        <div class="server-card {status_class}">
            <h3>{name}</h3>
            <div class="status">{status_text}</div>
            <div class="meta">Region: {info['region']} | Role: {info['role']}</div>
            <div class="meta">Plan: {srv.get('plan', '?')} | Players: {srv.get('players', 0)}</div>
            <div class="actions">
                <button onclick="apiCall('/api/wake/{name}', 'POST')" class="btn-wake">⏰ Wake</button>
                <button onclick="apiCall('/api/hibernate/{name}', 'POST')" class="btn-hibernate">💤 Hibernate</button>
            </div>
        </div>"""

    token_status = "✅ Valid" if bridge_state.get("token_valid") else ("⚠️ Set" if bridge_state.get("auth_token") else "❌ None")
    token_expires = bridge_state.get("token_expires", "N/A")
    last_backup = bridge_state.get("last_backup", "Never")
    backup_count = bridge_state.get("backup_count", 0)
    uptime = ""
    if bridge_state.get("started_at"):
        delta = datetime.now() - datetime.fromisoformat(bridge_state["started_at"])
        hours = int(delta.total_seconds() // 3600)
        mins = int((delta.total_seconds() % 3600) // 60)
        uptime = f"{hours}h {mins}m"

    recent_logs = ""
    for entry in bridge_state.get("logs", [])[-20:]:
        level_class = entry["level"].lower()
        recent_logs += f'<div class="log-entry {level_class}">[{entry["ts"]}] [{entry["level"]}] {entry["msg"]}</div>\n'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MineHut Bridge — QuranChain ↔ MineHut Tunnel</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%);
    color: #e0e0e0;
    min-height: 100vh;
}}
.header {{
    background: rgba(0,0,0,0.4);
    border-bottom: 2px solid #00ff88;
    padding: 20px 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}}
.header h1 {{
    font-size: 1.6em;
    background: linear-gradient(90deg, #00ff88, #00ccff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}}
.header .meta {{ color: #888; font-size: 0.85em; }}
.container {{ max-width: 1200px; margin: 0 auto; padding: 20px; }}

.grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }}
@media (max-width: 768px) {{ .grid {{ grid-template-columns: 1fr; }} }}

.card {{
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 20px;
    backdrop-filter: blur(10px);
}}
.card h2 {{
    font-size: 1.1em;
    color: #00ff88;
    margin-bottom: 15px;
    border-bottom: 1px solid rgba(0,255,136,0.2);
    padding-bottom: 8px;
}}
.server-card {{
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 10px;
    transition: all 0.3s;
}}
.server-card.online {{ border-color: #00ff88; box-shadow: 0 0 15px rgba(0,255,136,0.1); }}
.server-card.offline {{ border-color: #ff4444; }}
.server-card h3 {{ color: #fff; font-size: 1.1em; }}
.server-card .status {{ font-size: 1.2em; margin: 8px 0; }}
.server-card .meta {{ color: #888; font-size: 0.85em; margin: 3px 0; }}
.server-card .actions {{ margin-top: 10px; display: flex; gap: 8px; }}

button {{
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 600;
    transition: all 0.2s;
}}
.btn-wake {{ background: #00ff88; color: #000; }}
.btn-wake:hover {{ background: #00cc6a; transform: scale(1.05); }}
.btn-hibernate {{ background: #6644ff; color: #fff; }}
.btn-hibernate:hover {{ background: #5533dd; }}
.btn-backup {{ background: linear-gradient(135deg, #ff6600, #ff3366); color: #fff; padding: 12px 24px; font-size: 1em; width: 100%; }}
.btn-backup:hover {{ transform: scale(1.02); }}
.btn-refresh {{ background: #00ccff; color: #000; }}
.btn-refresh:hover {{ background: #00aadd; }}
.btn-token {{ background: #ffcc00; color: #000; }}
.btn-token:hover {{ background: #ddaa00; }}

.stat-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }}
.stat {{
    background: rgba(0,255,136,0.05);
    border: 1px solid rgba(0,255,136,0.15);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
}}
.stat .value {{ font-size: 1.4em; font-weight: 700; color: #00ff88; }}
.stat .label {{ font-size: 0.75em; color: #888; margin-top: 4px; }}

.log-box {{
    max-height: 300px;
    overflow-y: auto;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 0.78em;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    padding: 10px;
}}
.log-entry {{ padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }}
.log-entry.ok {{ color: #00ff88; }}
.log-entry.err {{ color: #ff4444; }}
.log-entry.warn {{ color: #ffcc00; }}
.log-entry.up {{ color: #00ccff; }}
.log-entry.sync {{ color: #cc66ff; }}

.token-form {{ margin-top: 10px; }}
.token-form input {{
    width: 100%;
    padding: 8px 12px;
    margin: 5px 0;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    color: #fff;
    font-family: monospace;
}}
.token-form input::placeholder {{ color: #666; }}

#result-box {{
    display: none;
    margin-top: 15px;
    padding: 12px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 0.85em;
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
}}
#result-box.success {{ background: rgba(0,255,136,0.1); border: 1px solid #00ff88; }}
#result-box.error {{ background: rgba(255,68,68,0.1); border: 1px solid #ff4444; }}

.pulse {{ animation: pulse 2s infinite; }}
@keyframes pulse {{ 0%,100% {{ opacity:1; }} 50% {{ opacity:0.5; }} }}
</style>
</head>
<body>

<div class="header">
    <div>
        <h1>🌉 MineHut Bridge — QuranChain ↔ MineHut Tunnel</h1>
        <div class="meta">Port {PORT} | backup.darcloud.host | Uptime: {uptime}</div>
    </div>
    <div>
        <button class="btn-refresh" onclick="location.reload()">🔄 Refresh</button>
    </div>
</div>

<div class="container">
    <!-- Stats -->
    <div class="stat-grid" style="margin-top: 20px;">
        <div class="stat"><div class="value">{token_status}</div><div class="label">Auth Status</div></div>
        <div class="stat"><div class="value">{backup_count}</div><div class="label">Backups Done</div></div>
        <div class="stat"><div class="value">{last_backup[:16] if last_backup != 'Never' else 'Never'}</div><div class="label">Last Backup</div></div>
        <div class="stat"><div class="value">{uptime or 'Just started'}</div><div class="label">Uptime</div></div>
    </div>

    <div class="grid">
        <!-- Servers -->
        <div class="card">
            <h2>📡 MineHut Servers</h2>
            {servers_html}
            <div style="margin-top: 15px; display: flex; gap: 8px;">
                <button class="btn-wake" onclick="apiCall('/api/wake-all', 'POST')">⏰ Wake All</button>
                <button class="btn-hibernate" onclick="apiCall('/api/hibernate-all', 'POST')">💤 Hibernate All</button>
            </div>
        </div>

        <!-- Backup Control -->
        <div class="card">
            <h2>📦 Backup Control</h2>
            <p style="color:#888; margin-bottom:15px;">Full pipeline: Create archives → Wake servers → Upload → Hibernate</p>
            <button class="btn-backup" onclick="runBackup()">🚀 Run Full Backup Now</button>
            <div id="backup-status" style="margin-top:10px;"></div>

            <h2 style="margin-top:20px;">🔑 Token Management</h2>
            <div style="color:#888; margin-bottom:8px;">
                Status: {token_status} | Expires: {token_expires[:16] if token_expires and token_expires != 'N/A' else 'N/A'}
            </div>
            <div class="token-form">
                <input type="text" id="auth-token" placeholder="Paste minehut_auth_token from browser DevTools...">
                <input type="text" id="session-id" placeholder="Paste minehut_session_id from browser DevTools...">
                <button class="btn-token" onclick="setTokens()" style="margin-top:5px; width:100%;">
                    💾 Save Tokens
                </button>
            </div>
        </div>
    </div>

    <!-- Result Box -->
    <div id="result-box"></div>

    <!-- Logs -->
    <div class="card" style="margin-top: 20px;">
        <h2>📋 Bridge Logs (Recent)</h2>
        <div class="log-box" id="log-box">
            {recent_logs}
        </div>
    </div>

    <!-- API Reference -->
    <div class="card" style="margin-top: 20px;">
        <h2>🔌 Bridge API Endpoints</h2>
        <div style="font-family: monospace; font-size: 0.85em; color: #aaa;">
            <div>GET  /health ................. Health check</div>
            <div>GET  /api/status ............. Full bridge status</div>
            <div>GET  /api/servers ............ Server status</div>
            <div>POST /api/wake/&lt;name&gt; ....... Wake specific server</div>
            <div>POST /api/wake-all ........... Wake all servers</div>
            <div>POST /api/hibernate/&lt;name&gt; .. Hibernate server</div>
            <div>POST /api/hibernate-all ...... Hibernate all servers</div>
            <div>POST /api/backup ............. Run full backup pipeline</div>
            <div>POST /api/tokens ............. Set auth tokens (JSON body)</div>
            <div>GET  /api/tokens/validate .... Validate current tokens</div>
            <div>GET  /api/logs ............... Recent logs</div>
            <div>GET  / ...................... This dashboard</div>
        </div>
    </div>
</div>

<script>
async function apiCall(path, method='GET', body=null) {{
    const box = document.getElementById('result-box');
    box.style.display = 'block';
    box.className = '';
    box.textContent = 'Loading...';

    try {{
        const opts = {{ method }};
        if (body) {{
            opts.headers = {{'Content-Type': 'application/json'}};
            opts.body = JSON.stringify(body);
        }}
        const resp = await fetch(path, opts);
        const data = await resp.json();
        box.className = data.error ? 'error' : 'success';
        box.textContent = JSON.stringify(data, null, 2);
        setTimeout(() => location.reload(), 3000);
    }} catch(e) {{
        box.className = 'error';
        box.textContent = 'Error: ' + e.message;
    }}
}}

async function setTokens() {{
    const token = document.getElementById('auth-token').value.trim();
    const session = document.getElementById('session-id').value.trim();
    if (!token || !session) {{
        alert('Both fields required');
        return;
    }}
    await apiCall('/api/tokens', 'POST', {{ auth_token: token, session_id: session }});
}}

async function runBackup() {{
    const box = document.getElementById('backup-status');
    box.innerHTML = '<span class="pulse" style="color:#ffcc00;">⏳ Running backup pipeline... this may take several minutes</span>';
    await apiCall('/api/backup', 'POST');
}}

// Auto-refresh logs every 10s
setInterval(async () => {{
    try {{
        const resp = await fetch('/api/logs');
        const data = await resp.json();
        const logBox = document.getElementById('log-box');
        logBox.innerHTML = data.logs.map(l =>
            `<div class="log-entry ${{l.level.toLowerCase()}}">[${{{l.ts}}}] [${{l.level}}] ${{l.msg}}</div>`
        ).join('');
        logBox.scrollTop = logBox.scrollHeight;
    }} catch(e) {{}}
}}, 10000);
</script>

</body>
</html>"""


# ─── HTTP Server ───────────────────────────────────────────────────────────

class BridgeHandler(BaseHTTPRequestHandler):
    """HTTP handler for the bridge server."""

    def log_message(self, format, *args):
        """Suppress default access logs."""
        pass

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())

    def send_html(self, html, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode())

    def read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length:
            return json.loads(self.rfile.read(length).decode())
        return {}

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "" or path == "/":
            refresh_server_status()
            self.send_html(get_dashboard_html())
            return

        if path == "/health":
            self.send_json({
                "status": "healthy",
                "service": "minehut-bridge",
                "port": PORT,
                "uptime": bridge_state.get("started_at"),
                "version": bridge_state["version"],
            })
            return

        if path == "/api/status":
            refresh_server_status()
            self.send_json({
                "bridge": {
                    "port": PORT,
                    "uptime": bridge_state.get("started_at"),
                    "version": bridge_state["version"],
                    "backup_count": bridge_state["backup_count"],
                    "last_backup": bridge_state.get("last_backup"),
                    "backups_running": bridge_state["backups_running"],
                },
                "auth": {
                    "has_token": bool(bridge_state.get("auth_token")),
                    "valid": bridge_state.get("token_valid", False),
                    "expires": bridge_state.get("token_expires"),
                },
                "servers": bridge_state.get("servers", {}),
            })
            return

        if path == "/api/servers":
            refresh_server_status()
            self.send_json({"servers": bridge_state.get("servers", {})})
            return

        if path == "/api/tokens/validate":
            valid = validate_tokens()
            self.send_json({"valid": valid, "expires": bridge_state.get("token_expires")})
            return

        if path == "/api/logs":
            self.send_json({"logs": bridge_state.get("logs", [])[-50:]})
            return

        self.send_json({"error": "Not found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        # POST /api/wake/<server_name>
        if path.startswith("/api/wake/"):
            server_name = path.split("/")[-1]
            result = wake_server(server_name)
            self.send_json(result)
            return

        if path == "/api/wake-all":
            def _wake():
                return wake_all_servers()
            t = threading.Thread(target=_wake)
            t.start()
            self.send_json({"status": "waking", "message": "Wake commands sent to all servers"})
            return

        # POST /api/hibernate/<server_name>
        if path.startswith("/api/hibernate/"):
            server_name = path.split("/")[-1]
            result = hibernate_server(server_name)
            self.send_json(result)
            return

        if path == "/api/hibernate-all":
            result = hibernate_all_servers()
            self.send_json(result)
            return

        if path == "/api/backup":
            def _backup():
                run_full_backup()
            t = threading.Thread(target=_backup)
            t.start()
            self.send_json({"status": "started", "message": "Backup pipeline started in background"})
            return

        if path == "/api/tokens":
            body = self.read_body()
            token = body.get("auth_token", "").strip()
            session_id = body.get("session_id", "").strip()
            if token and session_id:
                save_tokens(token, session_id)
                valid = validate_tokens()
                self.send_json({
                    "status": "saved",
                    "valid": valid,
                    "message": f"Tokens {'validated ✅' if valid else 'saved (validation pending — servers may be offline)'}",
                })
            else:
                self.send_json({"error": "Both auth_token and session_id required"}, 400)
            return

        if path == "/api/tokens/refresh":
            success = extract_tokens_selenium()
            self.send_json({"refreshed": success})
            return

        self.send_json({"error": "Not found"}, 404)


# ─── Background Tasks ─────────────────────────────────────────────────────

def auto_backup_scheduler():
    """Background thread: runs backup every 6 hours."""
    interval = 6 * 3600  # 6 hours
    while True:
        time.sleep(interval)
        try:
            blog("Scheduled auto-backup starting...", "SYNC")
            run_full_backup()
        except Exception as e:
            blog(f"Scheduled backup failed: {e}", "ERR")


def token_refresh_loop():
    """Background thread: try to refresh tokens every 4 hours."""
    while True:
        time.sleep(4 * 3600)
        try:
            if bridge_state.get("auth_token"):
                if not validate_tokens():
                    blog("Tokens expired, attempting refresh...", "SYNC")
                    load_cached_tokens()
                    if not validate_tokens():
                        extract_tokens_selenium()
        except Exception as e:
            blog(f"Token refresh error: {e}", "WARN")


def server_status_loop():
    """Background thread: refresh server status every 5 minutes."""
    while True:
        time.sleep(300)
        try:
            refresh_server_status()
        except:
            pass


# ─── Main Entry ────────────────────────────────────────────────────────────

def main():
    blog("=" * 60)
    blog(f"MineHut Bridge Server starting on port {PORT}", "UP")
    blog(f"Dashboard: http://localhost:{PORT}/")
    blog(f"Tunnel:    https://backup.darcloud.host/")
    blog("=" * 60)

    with state_lock:
        bridge_state["started_at"] = datetime.now().isoformat()

    # Write PID
    PID_FILE.write_text(str(os.getpid()))

    # Load any cached tokens
    load_cached_tokens()

    # Initial server status check
    refresh_server_status()

    # Start background threads
    threads = [
        threading.Thread(target=auto_backup_scheduler, daemon=True, name="auto-backup"),
        threading.Thread(target=token_refresh_loop, daemon=True, name="token-refresh"),
        threading.Thread(target=server_status_loop, daemon=True, name="status-monitor"),
    ]
    for t in threads:
        t.start()
        blog(f"Background thread started: {t.name}")

    # Handle shutdown
    def shutdown(sig, frame):
        blog("Shutting down bridge server...", "WARN")
        try:
            PID_FILE.unlink()
        except:
            pass
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    # Start HTTP server
    server = HTTPServer((HOST, PORT), BridgeHandler)
    blog(f"Bridge server LIVE on {HOST}:{PORT}", "OK")
    blog(f"Servers: {', '.join(SERVERS.keys())}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        blog("Bridge server stopped", "WARN")
    finally:
        server.server_close()
        try:
            PID_FILE.unlink()
        except:
            pass


if __name__ == "__main__":
    main()
