#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════
 MineHut Auto-Backup System — QuranChain + DarCloud Ecosystem
═══════════════════════════════════════════════════════════════════════════
 Fully automated backup pipeline:
   1. Authenticate (Selenium auto-login OR cached/manual tokens)
   2. Wake servers from hibernation (POST /server/{id}/start_service)
   3. Wait for servers to come online (polling)
   4. Create compressed backup archives
   5. Upload files to MineHut servers
   6. Verify uploads
   7. Hibernate servers to save resources
   8. Repeat on schedule (daemon mode) or one-shot via cron

 Auth Methods (tried in order):
   A) Cached tokens from ~/.minehut_tokens (auto-refreshed)
   B) Selenium headless Chrome → auto-login → extract localStorage tokens
   C) Manual tokens via MINEHUT_AUTH_TOKEN + MINEHUT_SESSION_ID env vars

 Servers:
   QCMesh1 (US-East) — Primary backup
   QCMesh2 (EU-West) — Secondary backup

 Usage:
   python3 minehut_auto_backup.py                    # One-shot backup
   python3 minehut_auto_backup.py --daemon            # Run every 6 hours
   python3 minehut_auto_backup.py --daemon --interval 3600  # Every hour
   python3 minehut_auto_backup.py --extract-tokens    # Just get tokens
   python3 minehut_auto_backup.py --set-tokens        # Paste tokens manually
═══════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
import time
import hashlib
import tarfile
import base64
import signal
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path

# ─── Configuration ─────────────────────────────────────────────────────────
QC_DIR = Path("/home/omar/Desktop/QuranChain")
OS_DIR = Path("/home/omar/Desktop/QuranChain-OS")
BACKUP_DIR = OS_DIR / "backups" / "minehut"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

TOKEN_CACHE = Path.home() / ".minehut_tokens"
LOG_FILE = OS_DIR / "logs" / "minehut_backup.log"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
PID_FILE = OS_DIR / "minehut_backup.pid"

MINEHUT_API = "https://api.minehut.com"
MINEHUT_DASHBOARD = "https://minehut.com/dashboard"
MINEHUT_EMAIL = os.environ.get("MINEHUT_EMAIL", "omarabunadi28@gmail.com")
MINEHUT_PASSWORD = os.environ.get("MINEHUT_PASSWORD", "")

SERVERS = {
    "QCMesh1": {"id": "69900a476a79cd81c5a50307", "region": "us-east", "role": "primary"},
    "QCMesh2": {"id": "69900a90712b794f6247495b", "region": "eu-west", "role": "secondary"},
}

DEFAULT_INTERVAL = 6 * 3600  # 6 hours
SERVER_WAKE_TIMEOUT = 180     # 3 minutes to wait for server to come online
SERVER_POLL_INTERVAL = 10     # Check every 10 seconds
MAX_BACKUP_AGE_DAYS = 30      # Clean up backups older than this
MAX_FILE_UPLOAD_SIZE = 3_500_000  # ~3.5MB per file edit (Minehut limit ~4GB but be safe)

HEADERS = {
    "User-Agent": "QuranChain-BackupAgent/2.0 (DarCloud Ecosystem)",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

# ─── Files and directories to backup ──────────────────────────────────────

OS_FILES = [
    "revenue-server.js", "agent-webhook-receiver.js", "dar-al-nas-realestate-bot.js",
    "landing-page-manager-bot.js", "halal-wealth-club-bot.js", "ai-bot-manager.js",
    "marketing-bots.js", "marketing-dashboard.js", "customer-acquisition.js",
    "email-campaign.js", "partner-outreach.js", "social-media-generator.js",
    "real-revenue-activator.js", "payment-webhook-server.js", "bot-earners-service.js",
    "bot-earners.js", "affiliate-program.js", "dashboard-server.js",
    "agent-actions-server.js", "fungimesh_monitor.js", "launch_mesh_node.js",
    "create-payment-links.js", "setup-stripe.js", "update-stripe-products.js",
    "release-workers.js", "deploy_all_agents_and_bots.sh", "deploy_agents.sh",
    "deploy_all_live.sh", "deploy_core_assistants.py", "deploy_openai_assistants.py",
    "deploy_production_live.py", "deploy_landing_page_agents.py", "automated_revenue.py",
    "package.json", "backup_to_minehut.py", "minehut_auto_backup.py",
]

QC_CRITICAL_FILES = [
    ".env", "quranchain_blockchain_host.py", "quranchain_v5.py",
    "ai_agent_scheduler.py", "autonomous_ai_agent.py", "ai_network_integration.py",
    "ai_mobile_repair_system.py", "production_port_binder.py",
    "deploy_gaming_mesh.py", "setup_gaming_mesh.py", "launch_gaming_server_mesh.sh",
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

# ─── Logging ───────────────────────────────────────────────────────────────

def log(msg, level="INFO"):
    """Log to both console and file."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    icon = {"INFO": "ℹ️", "OK": "✅", "WARN": "⚠️", "ERR": "❌", "UP": "🚀"}.get(level, "")
    line = f"[{ts}] [{level}] {icon} {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ─── HTTP Helpers ──────────────────────────────────────────────────────────

def api_request(url, method="GET", data=None, extra_headers=None, timeout=30):
    """Make HTTP request to Minehut API with retry."""
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
            if e.code == 429:  # Rate limited
                wait = min(2 ** attempt * 5, 60)
                log(f"Rate limited, waiting {wait}s...", "WARN")
                time.sleep(wait)
                continue
            return {"error": True, "status": e.code, "message": err_body}
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
                continue
            return {"error": True, "message": str(e)}
    return {"error": True, "message": "Max retries exceeded"}


def auth_headers(token, session_id):
    """Build authorization headers for Minehut API."""
    h = {}
    if token:
        h["Authorization"] = token
    if session_id:
        h["X-Session-Id"] = session_id
    return h


# ─── Token Management ─────────────────────────────────────────────────────

def load_cached_tokens():
    """Load cached auth tokens from file."""
    if not TOKEN_CACHE.exists():
        return None, None, None

    try:
        data = json.loads(TOKEN_CACHE.read_text())
        token = data.get("auth_token")
        session_id = data.get("session_id")
        expires = data.get("expires")

        if expires:
            exp_time = datetime.fromisoformat(expires)
            if datetime.now() > exp_time:
                log("Cached tokens expired", "WARN")
                return None, None, None

        if token and session_id:
            log(f"Loaded cached tokens (expires: {expires or 'unknown'})")
            return token, session_id, expires

    except Exception as e:
        log(f"Error loading cached tokens: {e}", "WARN")

    return None, None, None


def save_cached_tokens(token, session_id, expires_hours=12):
    """Save auth tokens to cache file."""
    data = {
        "auth_token": token,
        "session_id": session_id,
        "expires": (datetime.now() + timedelta(hours=expires_hours)).isoformat(),
        "email": MINEHUT_EMAIL,
        "cached_at": datetime.now().isoformat(),
    }
    TOKEN_CACHE.write_text(json.dumps(data, indent=2))
    TOKEN_CACHE.chmod(0o600)  # Owner-only read/write
    log(f"Tokens cached to {TOKEN_CACHE} (expires in {expires_hours}h)")


def validate_tokens(token, session_id):
    """Test if tokens are still valid by hitting an auth-required endpoint."""
    if not token or not session_id:
        return False

    # Try to get server data (requires auth)
    sid = SERVERS["QCMesh1"]["id"]
    result = api_request(
        f"{MINEHUT_API}/server/{sid}/status",
        extra_headers=auth_headers(token, session_id),
    )
    if result and not result.get("error"):
        log("Token validation: VALID", "OK")
        return True

    # Also try server_data endpoint
    result = api_request(
        f"{MINEHUT_API}/servers/{sid}/server_data",
        extra_headers=auth_headers(token, session_id),
    )
    if result and not result.get("error"):
        log("Token validation: VALID (via server_data)", "OK")
        return True

    log(f"Token validation: INVALID ({result.get('message', 'unknown')})", "WARN")
    return False


def extract_tokens_selenium():
    """Use Selenium to login to Minehut dashboard and extract auth tokens."""
    if not MINEHUT_PASSWORD:
        log("No MINEHUT_PASSWORD set — cannot use Selenium auto-login", "WARN")
        return None, None

    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
    except ImportError:
        log("Selenium not installed. Run: pip3 install selenium", "ERR")
        return None, None

    log("Starting Selenium headless Chrome for Minehut login...")

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument(f"--user-agent={HEADERS['User-Agent']}")

    driver = None
    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.set_page_load_timeout(60)

        # Navigate to Minehut login
        log("Navigating to Minehut dashboard...")
        driver.get("https://minehut.com/login")
        time.sleep(3)

        # Find and fill email field
        log("Filling login credentials...")
        try:
            email_field = WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="email"], input[name="email"], input[placeholder*="email" i]'))
            )
            email_field.clear()
            email_field.send_keys(MINEHUT_EMAIL)
        except Exception as e:
            log(f"Could not find email field: {e}", "ERR")
            # Try alternative selectors
            inputs = driver.find_elements(By.TAG_NAME, "input")
            if inputs:
                inputs[0].send_keys(MINEHUT_EMAIL)

        time.sleep(1)

        # Find and fill password field
        try:
            pass_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="password"]'))
            )
            pass_field.clear()
            pass_field.send_keys(MINEHUT_PASSWORD)
        except Exception as e:
            log(f"Could not find password field: {e}", "ERR")
            inputs = driver.find_elements(By.CSS_SELECTOR, 'input[type="password"]')
            if inputs:
                inputs[0].send_keys(MINEHUT_PASSWORD)

        time.sleep(1)

        # Click login button
        try:
            login_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")'))
            )
            login_btn.click()
        except:
            # Try clicking any submit button
            buttons = driver.find_elements(By.CSS_SELECTOR, 'button[type="submit"], button')
            for btn in buttons:
                text = btn.text.lower()
                if any(w in text for w in ['log in', 'sign in', 'login', 'submit']):
                    btn.click()
                    break

        # Wait for dashboard to load
        log("Waiting for dashboard to load...")
        time.sleep(8)

        # Extract tokens from localStorage
        auth_token = driver.execute_script("return localStorage.getItem('minehut_auth_token');")
        session_id = driver.execute_script("return localStorage.getItem('minehut_session_id');")

        if not auth_token:
            # Try alternative storage keys
            all_keys = driver.execute_script("""
                var keys = [];
                for (var i = 0; i < localStorage.length; i++) {
                    keys.push({key: localStorage.key(i), value: localStorage.getItem(localStorage.key(i))});
                }
                return keys;
            """)
            log(f"LocalStorage keys found: {[k['key'] for k in (all_keys or [])]}", "WARN")

            for item in (all_keys or []):
                k = item['key'].lower()
                if 'token' in k or 'auth' in k:
                    auth_token = item['value']
                if 'session' in k:
                    session_id = item['value']

        if auth_token and session_id:
            log(f"Selenium extracted tokens successfully!", "OK")
            save_cached_tokens(auth_token, session_id)
            return auth_token, session_id
        else:
            log(f"Selenium login: tokens not found in localStorage", "ERR")
            # Save screenshot for debugging
            try:
                ss_path = BACKUP_DIR / "selenium_debug.png"
                driver.save_screenshot(str(ss_path))
                log(f"Debug screenshot saved: {ss_path}")
            except:
                pass
            return None, None

    except Exception as e:
        log(f"Selenium error: {e}", "ERR")
        return None, None
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass


def get_auth_tokens():
    """Get auth tokens using the best available method."""
    # Method 1: Try cached tokens
    token, session_id, _ = load_cached_tokens()
    if token and session_id:
        if validate_tokens(token, session_id):
            return token, session_id
        log("Cached tokens invalid, trying other methods...", "WARN")

    # Method 2: Try environment variables
    env_token = os.environ.get("MINEHUT_AUTH_TOKEN", "")
    env_session = os.environ.get("MINEHUT_SESSION_ID", "")
    if env_token and env_session:
        if validate_tokens(env_token, env_session):
            save_cached_tokens(env_token, env_session)
            return env_token, env_session
        log("Env var tokens invalid", "WARN")

    # Method 3: Try Selenium auto-login
    token, session_id = extract_tokens_selenium()
    if token and session_id:
        return token, session_id

    log("ALL AUTH METHODS FAILED — backup will be local-only", "ERR")
    return None, None


def interactive_set_tokens():
    """Interactive prompt for user to paste tokens from browser DevTools."""
    print("""
╔═══════════════════════════════════════════════════════════════╗
║          MINEHUT TOKEN SETUP — Manual Mode                  ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  1. Open https://minehut.com/dashboard in Chrome/Firefox      ║
║  2. Login to your account                                     ║
║  3. Press F12 (or Ctrl+Shift+I) to open DevTools              ║
║  4. Click the "Application" tab (Chrome) or "Storage" (FF)    ║
║  5. Expand "Local Storage" → click "https://minehut.com"      ║
║  6. Find and copy these two values:                           ║
║     • minehut_auth_token                                      ║
║     • minehut_session_id                                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
""")

    auth_token = input("Paste minehut_auth_token: ").strip()
    session_id = input("Paste minehut_session_id: ").strip()

    if auth_token and session_id:
        if validate_tokens(auth_token, session_id):
            save_cached_tokens(auth_token, session_id)
            print("\n✅ Tokens saved and validated! Auto-backup is ready.")
            return True
        else:
            print("\n❌ Tokens appear invalid. Double-check values and try again.")
            # Save anyway — they might just need a server to be active
            save_cached_tokens(auth_token, session_id)
            print("   (Saved anyway — they may work once servers are active)")
            return True
    else:
        print("\n❌ Both values are required.")
        return False


# ─── Server Management ────────────────────────────────────────────────────

def get_server_status(server_name):
    """Get server status (no auth needed)."""
    result = api_request(f"{MINEHUT_API}/server/{server_name}?byName=true")
    if result and "server" in result:
        srv = result["server"]
        return {
            "name": srv.get("name"),
            "id": srv.get("_id"),
            "online": srv.get("online", False),
            "status": srv.get("status"),
            "plan": srv.get("server_plan", "FREE"),
            "suspended": srv.get("suspended", False),
            "players": srv.get("playerCount", 0),
        }
    return None


def wake_server(server_id, token, session_id):
    """Wake a server from hibernation using start_service."""
    log(f"Waking server {server_id}...")
    result = api_request(
        f"{MINEHUT_API}/server/{server_id}/start_service",
        method="POST",
        data={},
        extra_headers=auth_headers(token, session_id),
    )
    if result and not result.get("error"):
        log("start_service sent successfully", "OK")
        return True

    # If start_service fails (not hibernated), try regular start
    log(f"start_service response: {result}", "WARN")
    result = api_request(
        f"{MINEHUT_API}/server/{server_id}/start",
        method="POST",
        data={},
        extra_headers=auth_headers(token, session_id),
    )
    if result and not result.get("error"):
        log("start sent successfully", "OK")
        return True

    log(f"Failed to wake server: {result.get('message', 'unknown')}", "ERR")
    return False


def wait_for_online(server_name, timeout=SERVER_WAKE_TIMEOUT):
    """Poll until server is online or timeout."""
    log(f"Waiting for {server_name} to come online (timeout: {timeout}s)...")
    start = time.time()
    while time.time() - start < timeout:
        status = get_server_status(server_name)
        if status and status.get("online"):
            elapsed = int(time.time() - start)
            log(f"{server_name} is ONLINE! (took {elapsed}s)", "OK")
            return True

        remaining = int(timeout - (time.time() - start))
        if remaining > 0:
            log(f"  {server_name} still offline... ({remaining}s remaining)")
            time.sleep(SERVER_POLL_INTERVAL)

    log(f"{server_name} did not come online within {timeout}s", "ERR")
    return False


def hibernate_server(server_id, token, session_id):
    """Hibernate server to save resources (free tier)."""
    log(f"Hibernating server {server_id}...")
    result = api_request(
        f"{MINEHUT_API}/server/{server_id}/destroy_service",
        method="POST",
        data={},
        extra_headers=auth_headers(token, session_id),
    )
    if result and not result.get("error"):
        log("Server hibernated", "OK")
        return True
    log(f"Hibernate failed: {result.get('message', '')}", "WARN")
    return False


# ─── File Operations ──────────────────────────────────────────────────────

def create_folder(server_id, folder_name, directory, token, session_id):
    """Create a folder on the MineHut server."""
    result = api_request(
        f"{MINEHUT_API}/file/{server_id}/folder/create",
        method="POST",
        data={"name": folder_name, "directory": directory},
        extra_headers=auth_headers(token, session_id),
    )
    return result and not result.get("error")


def upload_file_content(server_id, file_path, content, token, session_id):
    """Upload a text file to MineHut server using the edit endpoint."""
    result = api_request(
        f"{MINEHUT_API}/file/{server_id}/edit/{file_path}",
        method="POST",
        data={"content": content},
        extra_headers=auth_headers(token, session_id),
        timeout=60,
    )
    if result and not result.get("error"):
        return True
    return False


def list_files(server_id, path, token, session_id):
    """List files on the MineHut server."""
    endpoint = f"{MINEHUT_API}/file/{server_id}/list/{path}" if path else f"{MINEHUT_API}/file/{server_id}/list"
    result = api_request(endpoint, extra_headers=auth_headers(token, session_id))
    return result


def upload_backup_to_server(server_id, server_name, archive_path, token, session_id):
    """Upload a backup archive to MineHut server.

    Strategy:
    - For files under ~3.5MB: upload as base64 encoded content via /file/edit
    - For larger files: split into chunks and upload as separate files
    - Also upload the manifest for reconstruction
    """
    if not token or not session_id:
        log(f"No auth — skipping upload to {server_name}", "WARN")
        return False

    archive_data = archive_path.read_bytes()
    archive_size = len(archive_data)
    archive_b64 = base64.b64encode(archive_data).decode()

    log(f"Uploading {archive_path.name} ({archive_size:,} bytes) to {server_name}...")

    # Create directory structure
    create_folder(server_id, "QuranChain", "/", token, session_id)
    time.sleep(0.5)
    create_folder(server_id, "backups", "QuranChain", token, session_id)
    time.sleep(0.5)

    success_count = 0
    fail_count = 0

    if len(archive_b64) <= MAX_FILE_UPLOAD_SIZE:
        # Small enough for single file upload
        file_data = json.dumps({
            "archive": archive_path.name,
            "size_bytes": archive_size,
            "sha256": hashlib.sha256(archive_data).hexdigest(),
            "data": archive_b64,
            "timestamp": datetime.now().isoformat(),
            "chunks": 1,
            "chunk_index": 0,
        })

        if upload_file_content(
            server_id,
            f"QuranChain/backups/{archive_path.stem}.json",
            file_data, token, session_id
        ):
            log(f"  Uploaded {archive_path.name} as single file", "OK")
            success_count = 1
        else:
            log(f"  Failed to upload {archive_path.name}", "ERR")
            fail_count = 1
    else:
        # Split into chunks
        chunk_size = MAX_FILE_UPLOAD_SIZE - 1000  # Leave room for metadata
        chunks = [archive_b64[i:i+chunk_size] for i in range(0, len(archive_b64), chunk_size)]
        total_chunks = len(chunks)

        log(f"  Splitting into {total_chunks} chunks...")

        for i, chunk in enumerate(chunks):
            chunk_data = json.dumps({
                "archive": archive_path.name,
                "chunk_index": i,
                "total_chunks": total_chunks,
                "data": chunk,
                "timestamp": datetime.now().isoformat(),
            })

            if upload_file_content(
                server_id,
                f"QuranChain/backups/{archive_path.stem}_chunk_{i}.json",
                chunk_data, token, session_id
            ):
                success_count += 1
                log(f"  Chunk {i+1}/{total_chunks} uploaded", "OK")
            else:
                fail_count += 1
                log(f"  Chunk {i+1}/{total_chunks} FAILED", "ERR")

            time.sleep(0.5)  # Rate limit protection

    # Upload reconstruction manifest
    manifest = json.dumps({
        "archive": archive_path.name,
        "size_bytes": archive_size,
        "sha256": hashlib.sha256(archive_data).hexdigest(),
        "total_chunks": success_count + fail_count,
        "successful_chunks": success_count,
        "timestamp": datetime.now().isoformat(),
        "server": server_name,
        "ecosystem": "QuranChain + DarCloud",
    }, indent=2)

    upload_file_content(
        server_id,
        f"QuranChain/backups/{archive_path.stem}_manifest.json",
        manifest, token, session_id
    )

    if fail_count == 0:
        log(f"  Upload complete: {success_count} chunks to {server_name}", "OK")
        return True
    else:
        log(f"  Upload partial: {success_count} OK, {fail_count} failed", "WARN")
        return False


# ─── Backup Archive Creation ──────────────────────────────────────────────

def create_backup_archive(name, base_dir, files=None, dirs=None):
    """Create a compressed tar.gz archive."""
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    archive_name = f"{name}_{ts}.tar.gz"
    archive_path = BACKUP_DIR / archive_name

    file_count = 0
    with tarfile.open(archive_path, "w:gz") as tar:
        if files:
            for f in files:
                fpath = base_dir / f
                if fpath.exists():
                    tar.add(str(fpath), arcname=f"{name}/{f}")
                    file_count += 1

        if dirs:
            for d in dirs:
                dpath = base_dir / d
                if dpath.exists():
                    for root, _, filenames in os.walk(dpath):
                        for fn in filenames:
                            if Path(fn).suffix in BACKUP_EXTENSIONS:
                                full = os.path.join(root, fn)
                                arcname = f"{name}/{os.path.relpath(full, base_dir)}"
                                tar.add(full, arcname=arcname)
                                file_count += 1

    size = archive_path.stat().st_size
    return archive_path, file_count, size


def create_full_manifest(qc_archive, os_archive, qc_count, os_count, upload_results):
    """Create comprehensive backup manifest."""
    manifest = {
        "backup_timestamp": datetime.now().isoformat(),
        "backup_type": "full_ecosystem_auto",
        "version": "2.0",
        "founder_royalty_rate": 0.30,
        "archives": {
            "quranchain": {
                "filename": qc_archive.name,
                "files": qc_count,
                "size_bytes": qc_archive.stat().st_size,
                "sha256": hashlib.sha256(qc_archive.read_bytes()).hexdigest(),
            },
            "quranchain_os": {
                "filename": os_archive.name,
                "files": os_count,
                "size_bytes": os_archive.stat().st_size,
                "sha256": hashlib.sha256(os_archive.read_bytes()).hexdigest(),
            },
        },
        "upload_results": upload_results,
        "servers": dict(SERVERS),
        "ecosystem": {
            "openai_assistants": 76,
            "cloudflare_workers": 8,
            "node_bots": len(OS_FILES),
            "python_agents_backed_up": qc_count,
            "domains": ["darcloud.host", "darcloud.net"],
        },
    }

    manifest_path = BACKUP_DIR / "backup_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    return manifest_path, manifest


def cleanup_old_backups():
    """Remove backup archives older than MAX_BACKUP_AGE_DAYS."""
    cutoff = datetime.now() - timedelta(days=MAX_BACKUP_AGE_DAYS)
    removed = 0
    for f in BACKUP_DIR.glob("*.tar.gz"):
        try:
            if datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
                f.unlink()
                removed += 1
        except:
            pass
    if removed:
        log(f"Cleaned up {removed} old backup archives")


# ─── Local Backup Mirror ─────────────────────────────────────────────────

def save_local_mirror(archive_path, server_name):
    """Save a local mirror copy organized by server."""
    import shutil
    mirror_dir = QC_DIR / "minehut_backup_mirrors" / server_name
    mirror_dir.mkdir(parents=True, exist_ok=True)

    dest = mirror_dir / archive_path.name
    shutil.copy2(archive_path, dest)

    # Upload instructions
    instructions = f"""# Upload to {server_name} via Minehut Dashboard
#
# 1. Go to https://minehut.com/dashboard
# 2. Select {server_name} → File Manager
# 3. Create folder: QuranChain/backups/
# 4. Upload: {archive_path.name}
#
# Archive: {archive_path.name}
# Size: {archive_path.stat().st_size:,} bytes
# SHA256: {hashlib.sha256(archive_path.read_bytes()).hexdigest()}
# Created: {datetime.now().isoformat()}
"""
    (mirror_dir / "UPLOAD_INSTRUCTIONS.txt").write_text(instructions)
    return mirror_dir


# ─── Main Backup Flow ────────────────────────────────────────────────────

def run_backup():
    """Execute a single backup cycle."""
    log("=" * 65)
    log("MINEHUT AUTO-BACKUP — QuranChain + DarCloud Ecosystem", "UP")
    log("=" * 65)

    upload_results = {}

    # ── Step 1: Check server status ──
    log("\n📡 Checking MineHut server status...")
    for name, info in SERVERS.items():
        status = get_server_status(name)
        if status:
            state = "🟢 ONLINE" if status["online"] else "🔴 OFFLINE"
            log(f"  {name}: {state} | {status['plan']} | suspended={status['suspended']}")
        else:
            log(f"  {name}: ❌ NOT FOUND", "ERR")

    # ── Step 2: Authenticate ──
    log("\n🔐 Authenticating...")
    token, session_id = get_auth_tokens()
    has_auth = bool(token and session_id)

    if has_auth:
        log("Authentication successful", "OK")
    else:
        log("No authentication — backup will be local-only", "WARN")

    # ── Step 3: Wake servers (if auth available) ──
    if has_auth:
        log("\n⏰ Waking MineHut servers from hibernation...")
        servers_to_upload = []

        for name, info in SERVERS.items():
            status = get_server_status(name)
            if status and status["online"]:
                log(f"  {name} already online!", "OK")
                servers_to_upload.append(name)
            elif status and not status.get("suspended"):
                if wake_server(info["id"], token, session_id):
                    if wait_for_online(name):
                        servers_to_upload.append(name)
                    else:
                        log(f"  {name}: timed out waiting for online", "WARN")
                else:
                    log(f"  {name}: failed to wake", "ERR")
            else:
                log(f"  {name}: suspended or unavailable", "ERR")

    # ── Step 4: Create backup archives ──
    log("\n📦 Creating backup archives...")

    log("  Archiving QuranChain (Python agents, services, core)...")
    qc_archive, qc_count, qc_size = create_backup_archive(
        "quranchain", QC_DIR, files=QC_CRITICAL_FILES, dirs=QC_DIRS
    )
    log(f"  QuranChain: {qc_count} files, {qc_size:,} bytes", "OK")

    log("  Archiving QuranChain-OS (Node.js bots, workers)...")
    os_archive, os_count, os_size = create_backup_archive(
        "quranchain_os", OS_DIR, files=OS_FILES, dirs=OS_DIRS
    )
    log(f"  QuranChain-OS: {os_count} files, {os_size:,} bytes", "OK")

    # ── Step 5: Upload to MineHut servers ──
    if has_auth:
        log("\n🚀 Uploading to MineHut servers...")

        for name, info in SERVERS.items():
            status = get_server_status(name)
            if not (status and status.get("online")):
                log(f"  {name} not online — saving local mirror only", "WARN")
                save_local_mirror(qc_archive, name)
                save_local_mirror(os_archive, name)
                upload_results[name] = {"status": "local_only", "reason": "server_offline"}
                continue

            log(f"\n  ── Uploading to {name} ({info['region']}) ──")
            qc_ok = upload_backup_to_server(info["id"], name, qc_archive, token, session_id)
            os_ok = upload_backup_to_server(info["id"], name, os_archive, token, session_id)

            upload_results[name] = {
                "status": "complete" if (qc_ok and os_ok) else "partial",
                "quranchain": "uploaded" if qc_ok else "failed",
                "quranchain_os": "uploaded" if os_ok else "failed",
                "timestamp": datetime.now().isoformat(),
            }

        # ── Step 6: Hibernate servers to save resources ──
        log("\n💤 Hibernating servers to save free-tier resources...")
        for name, info in SERVERS.items():
            time.sleep(2)
            hibernate_server(info["id"], token, session_id)
    else:
        # No auth — save local mirrors for all servers
        for name in SERVERS:
            save_local_mirror(qc_archive, name)
            save_local_mirror(os_archive, name)
            upload_results[name] = {"status": "local_only", "reason": "no_auth"}

    # ── Step 7: Create manifest ──
    manifest_path, manifest = create_full_manifest(
        qc_archive, os_archive, qc_count, os_count, upload_results
    )

    # ── Step 8: Cleanup old backups ──
    cleanup_old_backups()

    # ── Summary ──
    total_files = qc_count + os_count
    total_size = qc_size + os_size

    log("\n" + "=" * 65)
    log("BACKUP COMPLETE", "OK")
    log("=" * 65)
    log(f"  Total Files:     {total_files}")
    log(f"  Total Size:      {total_size:,} bytes ({total_size/1024/1024:.1f} MB)")
    log(f"  QC Archive:      {qc_archive.name}")
    log(f"  OS Archive:      {os_archive.name}")
    log(f"  Manifest:        {manifest_path.name}")
    log(f"  Auth:            {'✅ Active' if has_auth else '❌ None'}")
    for name, result in upload_results.items():
        log(f"  {name}:          {result['status']}")
    log(f"  Next backup:     (scheduled or manual)")
    log("=" * 65)

    return manifest


# ─── Daemon Mode ──────────────────────────────────────────────────────────

def write_pid():
    """Write PID file for daemon tracking."""
    PID_FILE.write_text(str(os.getpid()))


def remove_pid():
    """Remove PID file on exit."""
    try:
        PID_FILE.unlink()
    except:
        pass


def daemon_loop(interval):
    """Run backup on a schedule."""
    log(f"Starting daemon mode — backups every {interval}s ({interval/3600:.1f}h)")
    write_pid()

    def handle_signal(sig, frame):
        log("Received shutdown signal, cleaning up...", "WARN")
        remove_pid()
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    try:
        while True:
            try:
                run_backup()
            except Exception as e:
                log(f"Backup cycle failed: {e}", "ERR")
                import traceback
                traceback.print_exc()

            log(f"\n⏳ Next backup in {interval/3600:.1f} hours...")
            time.sleep(interval)
    finally:
        remove_pid()


# ─── CLI Entry Point ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="MineHut Auto-Backup System — QuranChain + DarCloud Ecosystem"
    )
    parser.add_argument("--daemon", action="store_true", help="Run in daemon mode (repeating backups)")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL, help=f"Backup interval in seconds (default: {DEFAULT_INTERVAL})")
    parser.add_argument("--extract-tokens", action="store_true", help="Extract tokens via Selenium and save")
    parser.add_argument("--set-tokens", action="store_true", help="Manually paste tokens from browser DevTools")
    parser.add_argument("--validate", action="store_true", help="Validate cached tokens")
    parser.add_argument("--status", action="store_true", help="Check server status only")

    args = parser.parse_args()

    if args.set_tokens:
        interactive_set_tokens()
        return

    if args.extract_tokens:
        token, session_id = extract_tokens_selenium()
        if token:
            print(f"\n✅ Tokens extracted and cached!")
            print(f"   Token: {token[:20]}...")
            print(f"   Session: {session_id[:20]}...")
        else:
            print("\n❌ Failed to extract tokens. Set MINEHUT_PASSWORD env var or use --set-tokens")
        return

    if args.validate:
        token, session_id, exp = load_cached_tokens()
        if token:
            valid = validate_tokens(token, session_id)
            print(f"Tokens: {'✅ VALID' if valid else '❌ INVALID'} (expires: {exp})")
        else:
            print("No cached tokens found. Use --set-tokens or --extract-tokens")
        return

    if args.status:
        for name in SERVERS:
            status = get_server_status(name)
            if status:
                state = "🟢 ONLINE" if status["online"] else "🔴 OFFLINE"
                print(f"{name}: {state} | {status['plan']} | suspended={status['suspended']}")
            else:
                print(f"{name}: ❌ NOT FOUND")
        return

    if args.daemon:
        daemon_loop(args.interval)
    else:
        run_backup()


if __name__ == "__main__":
    main()
