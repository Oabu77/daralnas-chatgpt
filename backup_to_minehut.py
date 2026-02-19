#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
═══════════════════════════════════════════════════════════════════════
MineHut Server Backup System — QuranChain + DarCloud Ecosystem
═══════════════════════════════════════════════════════════════════════
Backs up all AI agent/bot source files to our MineHut servers:
  - QCMesh1.minehut.gg (US-East) — Primary backup
  - QCMesh2.minehut.gg (EU-West) — Secondary backup

Uses Minehut API for:
  1. Authentication (owner login)
  2. Server start/wake
  3. File upload via server file API
  4. Verification

Files are stored as base64 JSON data in the server's plugin data directories
and as compressed archives transferred via the Minehut file manager API.
═══════════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
import time
import hashlib
import tarfile
import base64
import io
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# ─── Configuration ─────────────────────────────────────────────────
QC_DIR = Path("/home/omar/Desktop/QuranChain")
OS_DIR = Path("/home/omar/Desktop/QuranChain-OS")
BACKUP_DIR = OS_DIR / "backups" / "minehut"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

MINEHUT_API = "https://api.minehut.com"
SERVERS = {
    "QCMesh1": {"id": "69900a476a79cd81c5a50307", "region": "us-east"},
    "QCMesh2": {"id": "69900a90712b794f6247495b", "region": "eu-west"},
}

# Minehut auth — will prompt if not set
MINEHUT_EMAIL = os.environ.get("MINEHUT_EMAIL", "omarabunadi28@gmail.com")
MINEHUT_PASSWORD = os.environ.get("MINEHUT_PASSWORD", "")

# ─── Files to backup ──────────────────────────────────────────────

# QuranChain-OS (Node.js bots, workers, configs)
OS_FILES = [
    # Core bots
    "revenue-server.js",
    "agent-webhook-receiver.js",
    "dar-al-nas-realestate-bot.js",
    "landing-page-manager-bot.js",
    "halal-wealth-club-bot.js",
    "ai-bot-manager.js",
    "marketing-bots.js",
    "marketing-dashboard.js",
    "customer-acquisition.js",
    "email-campaign.js",
    "partner-outreach.js",
    "social-media-generator.js",
    "real-revenue-activator.js",
    "payment-webhook-server.js",
    "bot-earners-service.js",
    "bot-earners.js",
    "affiliate-program.js",
    "dashboard-server.js",
    "agent-actions-server.js",
    "fungimesh_monitor.js",
    "launch_mesh_node.js",
    "create-payment-links.js",
    "setup-stripe.js",
    "update-stripe-products.js",
    "release-workers.js",
    "test-mesh.js",
    # Deploy scripts
    "deploy_all_agents_and_bots.sh",
    "deploy_agents.sh",
    "deploy_all_live.sh",
    "deploy_core_assistants.py",
    "deploy_openai_assistants.py",
    "deploy_production_live.py",
    "deploy_landing_page_agents.py",
    "automated_revenue.py",
    # Config
    "package.json",
]

# QuranChain (Python agents, services, core)
QC_CRITICAL_FILES = [
    ".env",
    "quranchain_blockchain_host.py",
    "quranchain_v5.py",
    "ai_agent_scheduler.py",
    "autonomous_ai_agent.py",
    "ai_network_integration.py",
    "ai_mobile_repair_system.py",
    "production_port_binder.py",
    "deploy_gaming_mesh.py",
    "setup_gaming_mesh.py",
    "launch_gaming_server_mesh.sh",
]

# Directories to fully backup
QC_DIRS = [
    "ai_workforce",
    "organized/ai_agents",
    "organized/services",
    "organized/monitoring",
    "organized/revenue",
    "organized/blockchain",
    "crm",
]

OS_DIRS = [
    "workers",
    "data",
]


def api_request(url, method="GET", data=None, headers=None, timeout=30):
    """Make HTTP request to Minehut API."""
    if headers is None:
        headers = {"Content-Type": "application/json"}
    
    if data and isinstance(data, dict):
        data = json.dumps(data).encode()
    elif data and isinstance(data, str):
        data = data.encode()
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return {"error": True, "status": e.code, "message": body}
    except Exception as e:
        return {"error": True, "message": str(e)}


def minehut_login():
    """Authenticate with Minehut and get session token."""
    print("\n🔐 Authenticating with Minehut...")
    
    # Try ghost login first (no credentials needed for public API access)
    result = api_request(f"{MINEHUT_API}/users/ghost_login", method="POST", data={})
    if result and not result.get("error"):
        token = result.get("token")
        if token:
            print(f"   ✅ Ghost session obtained")
            return token, None
    
    # If we have credentials, try full login
    if MINEHUT_PASSWORD:
        result = api_request(f"{MINEHUT_API}/users/login", method="POST", data={
            "email": MINEHUT_EMAIL,
            "password": MINEHUT_PASSWORD
        })
        if result and not result.get("error"):
            token = result.get("token")
            session_id = result.get("sessionId")
            print(f"   ✅ Authenticated as {MINEHUT_EMAIL}")
            return token, session_id
    
    print("   ⚠️ No Minehut auth — will use direct backup method")
    return None, None


def check_server_status(server_name):
    """Check if a Minehut server is online."""
    result = api_request(f"{MINEHUT_API}/server/{server_name}?byName=true")
    if result and "server" in result:
        srv = result["server"]
        return {
            "name": srv["name"],
            "id": srv["_id"],
            "online": srv.get("online", False),
            "plan": srv.get("server_plan", "FREE"),
            "type": srv.get("server_version_type", "PAPER"),
        }
    return None


def create_backup_archive(name, base_dir, files=None, dirs=None):
    """Create a compressed tar.gz archive of specified files and directories."""
    archive_name = f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.tar.gz"
    archive_path = BACKUP_DIR / archive_name
    
    file_count = 0
    with tarfile.open(archive_path, "w:gz") as tar:
        # Add individual files
        if files:
            for f in files:
                fpath = base_dir / f
                if fpath.exists():
                    tar.add(str(fpath), arcname=f"{name}/{f}")
                    file_count += 1
        
        # Add directories
        if dirs:
            for d in dirs:
                dpath = base_dir / d
                if dpath.exists():
                    for root, _, filenames in os.walk(dpath):
                        for fn in filenames:
                            if fn.endswith(('.py', '.js', '.json', '.toml', '.sh', '.yaml', '.yml', '.md', '.html', '.css', '.env', '.txt', '.db')):
                                full = os.path.join(root, fn)
                                arcname = f"{name}/{os.path.relpath(full, base_dir)}"
                                tar.add(full, arcname=arcname)
                                file_count += 1
    
    size = archive_path.stat().st_size
    return archive_path, file_count, size


def create_manifest(qc_archive, os_archive, qc_count, os_count):
    """Create a JSON manifest of the backup."""
    manifest = {
        "backup_timestamp": datetime.now().isoformat(),
        "backup_type": "full_ecosystem",
        "version": "1.0",
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
            }
        },
        "servers": {
            "QCMesh1": {"address": "QCMesh1.minehut.gg", "region": "us-east", "role": "primary"},
            "QCMesh2": {"address": "QCMesh2.minehut.gg", "region": "eu-west", "role": "secondary"},
        },
        "openai_assistants": 76,
        "cloudflare_workers": 8,
        "node_bots": len(OS_FILES),
        "python_agents": qc_count,
        "domains": ["darcloud.host", "darcloud.net"],
    }
    
    manifest_path = BACKUP_DIR / "backup_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    return manifest_path, manifest


def upload_to_minehut(token, server_id, archive_path, server_name):
    """Upload backup archive to Minehut server via plugin data.
    
    Minehut file API: POST /file/{serverId}/edit/plugins/QuranChain/{filename}
    For SFTP-like access on free tier, we store as base64 chunks in multiple files.
    """
    if not token:
        print(f"   ⚠️ No auth token — saving locally for manual upload to {server_name}")
        return False
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    # Read the archive
    archive_data = archive_path.read_bytes()
    archive_b64 = base64.b64encode(archive_data).decode()
    
    # Minehut free servers have limited file API — store as JSON data file
    # The plugin can read this back to reconstruct the archive
    chunk_size = 500_000  # ~500KB per file (Minehut limit)
    chunks = [archive_b64[i:i+chunk_size] for i in range(0, len(archive_b64), chunk_size)]
    
    print(f"   📦 Uploading {archive_path.name} to {server_name} ({len(chunks)} chunks)...")
    
    for i, chunk in enumerate(chunks):
        file_content = json.dumps({
            "archive": archive_path.name,
            "chunk": i,
            "total_chunks": len(chunks),
            "data": chunk,
            "timestamp": datetime.now().isoformat(),
        })
        
        # Minehut file edit endpoint
        file_path = f"plugins/QuranChain/backup_chunk_{i}.json"
        result = api_request(
            f"{MINEHUT_API}/file/{server_id}/edit/{file_path}",
            method="POST",
            data={"content": file_content},
            headers=headers,
        )
        
        if result and not result.get("error"):
            print(f"   ✅ Chunk {i+1}/{len(chunks)} uploaded")
        else:
            print(f"   ❌ Chunk {i+1} failed: {result.get('message', 'unknown')}")
            return False
    
    # Upload manifest
    manifest_content = json.dumps({
        "archive": archive_path.name,
        "total_chunks": len(chunks),
        "size_bytes": len(archive_data),
        "sha256": hashlib.sha256(archive_data).hexdigest(),
        "timestamp": datetime.now().isoformat(),
        "server": server_name,
    })
    
    api_request(
        f"{MINEHUT_API}/file/{server_id}/edit/plugins/QuranChain/backup_manifest.json",
        method="POST",
        data={"content": manifest_content},
        headers=headers,
    )
    
    return True


def save_local_backup_for_upload(archive_path, server_name):
    """Create a ready-to-upload copy organized for manual Minehut SFTP upload."""
    upload_dir = BACKUP_DIR / f"upload_to_{server_name}"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy the archive
    import shutil
    dest = upload_dir / archive_path.name
    shutil.copy2(archive_path, dest)
    
    # Create upload instructions
    instructions = f"""# Upload Instructions for {server_name}
# ═══════════════════════════════════════════════════════
# 
# Method 1: Minehut File Manager (Web Dashboard)
#   1. Go to https://minehut.com/dashboard
#   2. Select server: {server_name}
#   3. Click "File Manager"
#   4. Navigate to plugins/QuranChain/
#   5. Upload: {archive_path.name}
#
# Method 2: Minehut SFTP (if available on plan)
#   Host: {server_name}.minehut.gg
#   Port: Check Minehut dashboard for SFTP port
#   Upload to: /plugins/QuranChain/
#
# Method 3: Plugin Channel (automated)
#   The FungiMesh plugin can receive data via MC protocol:
#   /qcmesh backup-receive <chunk_id>
#
# Archive: {archive_path.name}
# Size: {archive_path.stat().st_size:,} bytes
# SHA256: {hashlib.sha256(archive_path.read_bytes()).hexdigest()}
# Created: {datetime.now().isoformat()}
"""
    (upload_dir / "UPLOAD_INSTRUCTIONS.txt").write_text(instructions)
    return upload_dir


def main():
    print("═" * 65)
    print("  MINEHUT BACKUP SYSTEM — QuranChain + DarCloud Ecosystem")
    print("═" * 65)
    
    # ── Step 1: Check Minehut servers ──────────────────────────────
    print("\n📡 Checking Minehut server status...")
    for name in SERVERS:
        status = check_server_status(name)
        if status:
            state = "🟢 ONLINE" if status["online"] else "🔴 OFFLINE"
            print(f"   {name}: {state} | {status['plan']} | {status['type']}")
        else:
            print(f"   {name}: ❌ NOT FOUND")
    
    # ── Step 2: Authenticate ───────────────────────────────────────
    token, session_id = minehut_login()
    
    # ── Step 3: Create backup archives ─────────────────────────────
    print("\n📦 Creating backup archives...")
    
    print("   Archiving QuranChain (Python agents, services, core)...")
    qc_archive, qc_count, qc_size = create_backup_archive(
        "quranchain", QC_DIR, files=QC_CRITICAL_FILES, dirs=QC_DIRS
    )
    print(f"   ✅ QuranChain: {qc_count} files, {qc_size:,} bytes → {qc_archive.name}")
    
    print("   Archiving QuranChain-OS (Node.js bots, workers)...")
    os_archive, os_count, os_size = create_backup_archive(
        "quranchain_os", OS_DIR, files=OS_FILES, dirs=OS_DIRS
    )
    print(f"   ✅ QuranChain-OS: {os_count} files, {os_size:,} bytes → {os_archive.name}")
    
    # ── Step 4: Create manifest ────────────────────────────────────
    manifest_path, manifest = create_manifest(qc_archive, os_archive, qc_count, os_count)
    print(f"\n📋 Manifest: {manifest_path}")
    
    # ── Step 5: Upload to Minehut servers ──────────────────────────
    print("\n🚀 Uploading to MineHut servers...")
    
    for server_name, server_info in SERVERS.items():
        print(f"\n   ── {server_name} ({server_info['region']}) ──")
        
        # Try API upload first
        uploaded_qc = upload_to_minehut(token, server_info["id"], qc_archive, server_name)
        uploaded_os = upload_to_minehut(token, server_info["id"], os_archive, server_name)
        
        if not uploaded_qc or not uploaded_os:
            # Prepare for manual upload
            upload_dir = save_local_backup_for_upload(qc_archive, server_name)
            save_local_backup_for_upload(os_archive, server_name)
            print(f"   📂 Local copies ready at: {upload_dir}")
            print(f"   📌 Upload manually via Minehut dashboard → File Manager")
    
    # ── Step 6: Also save to local backup location ─────────────────
    print("\n💾 Local backup copies saved to:")
    print(f"   {BACKUP_DIR}")
    for f in sorted(BACKUP_DIR.glob("*.tar.gz")):
        print(f"   📦 {f.name} ({f.stat().st_size:,} bytes)")
    
    # ── Summary ────────────────────────────────────────────────────
    total_files = qc_count + os_count
    total_size = qc_size + os_size
    
    print("\n═" * 65)
    print("  BACKUP COMPLETE")
    print("═" * 65)
    print(f"  Total Files:     {total_files}")
    print(f"  Total Size:      {total_size:,} bytes ({total_size/1024/1024:.1f} MB)")
    print(f"  QC Archive:      {qc_archive.name}")
    print(f"  OS Archive:      {os_archive.name}")
    print(f"  Manifest:        {manifest_path.name}")
    print(f"  Targets:         QCMesh1 (US-East), QCMesh2 (EU-West)")
    print(f"  Backup Dir:      {BACKUP_DIR}")
    print("═" * 65)
    
    return manifest


if __name__ == "__main__":
    main()
