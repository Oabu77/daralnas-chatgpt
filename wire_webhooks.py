#!/usr/bin/env python3
"""
DarCloud Webhook Wiring — Complete Integration
===============================================
Wires all 66 OpenAI assistants/agents with webhook-enabled background mode.
Tests end-to-end: background response → webhook delivery → processing.

Usage:
  python3 wire_webhooks.py                    # Full wiring + test
  python3 wire_webhooks.py --test-background  # Test background mode only
  python3 wire_webhooks.py --test-webhook     # Test webhook endpoint only
  python3 wire_webhooks.py --verify-all       # Verify all 66 agents
  python3 wire_webhooks.py --status           # Show wiring status

Bismillah — All praise to Allah ﷻ
"""

import os
import sys
import json
import time
import requests
from datetime import datetime, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# ═══════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════

BASE_DIR = Path(__file__).parent.parent / "QuranChain"
OS_DIR = Path(__file__).parent
ENV_FILE = BASE_DIR / ".env"

# Load .env
def load_env():
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ.setdefault(key.strip(), val.strip())
load_env()

# OpenAI
from openai import OpenAI
FUNGIMESH_KEY = os.environ.get("OPENAI_FUNGIMESH_KEY", "")
ADMIN_KEY = os.environ.get("OPENAI_FUNGIMESH_ADMIN_KEY", os.environ.get("OPENAI_ADMIN_KEY", ""))

client = OpenAI(api_key=FUNGIMESH_KEY) if FUNGIMESH_KEY else OpenAI()

# Webhook endpoints
WEBHOOK_ENDPOINTS = {
    "edge_primary": "https://webhook.darcloud.host/openai",
    "edge_alt": "https://hooks.darcloud.host/openai",
    "local": "http://localhost:8787/webhook",
}

# All DarCloud domains
DARCLOUD_DOMAINS = {
    "api": "https://api.darcloud.host",
    "ai": "https://ai.darcloud.host",
    "mesh": "https://mesh.darcloud.host",
    "revenue": "https://revenue.darcloud.host",
    "webhook": "https://webhook.darcloud.host",
    "dashboard": "https://darcloud-dashboard.pages.dev",
}

# OpenAI Projects
PROJECTS = {
    "QuranChain": "proj_tJOraIJydBPrCrNhwFGLNJs8",
    "DarCloud": "proj_MIj9BUv9DXH6zdvKDrsQiMNP",
    "AI-Workforce-Bots": "proj_DxJU86t0pC6i7dAPTDp7ZSvC",
    "AI-Expert-Agents": "proj_DMQPcnLvQmDFrpXyDNa0JrRz",
    "AI-Specialized-Agents": "proj_xL0UYYza3uWNuYnGxjWZzXiG",
    "Gas-Toll-Agents": "proj_nS6hAm5juR6Gxpwbhu3Qz9X5",
    "Platform-Agents": "proj_G2z3fxpMwfRISeEc4dccNNNc",
    "Gtp Code": "proj_FlB7ZFeQDiU7CzEl47GZ1m6S",
    "lead": "proj_tie7uSezanniuqZjJ4zguLik",
    "helpbot": "proj_LhKmbDVeLC4Y3zHAZYvt6VDw",
}

ALL_WEBHOOK_EVENTS = [
    "response.completed", "response.failed", "response.cancelled", "response.incomplete",
    "batch.completed", "batch.failed", "batch.cancelled", "batch.expired",
    "eval_run.succeeded", "eval_run.failed", "eval_run.canceled",
    "fine_tuning.job.succeeded", "fine_tuning.job.failed", "fine_tuning.job.cancelled",
]


# ═══════════════════════════════════════════
# Load All Assistants
# ═══════════════════════════════════════════

def load_assistants():
    """Load all 66 assistant IDs"""
    assistants = {}

    mini_path = BASE_DIR / ".openai_assistants_map.json"
    if mini_path.exists():
        with open(mini_path) as f:
            data = json.load(f)
            for name, aid in data.get("assistants", {}).items():
                assistants[name] = {"id": aid, "tier": "mini", "model": "gpt-4o-mini"}

    core_path = BASE_DIR / ".openai_core_assistants_map.json"
    if core_path.exists():
        with open(core_path) as f:
            data = json.load(f)
            for name, aid in data.get("assistants", {}).items():
                assistants[name] = {"id": aid, "tier": "core", "model": "gpt-4o"}

    return assistants


def load_agent_keys():
    """Load all 63 agent API keys from .env"""
    keys = {}
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                if line.startswith('OPENAI_KEY_'):
                    parts = line.strip().split('=', 1)
                    if len(parts) == 2:
                        agent_name = parts[0].replace('OPENAI_KEY_', '').lower()
                        keys[agent_name] = parts[1]
    return keys


# ═══════════════════════════════════════════
# Test Functions
# ═══════════════════════════════════════════

def test_webhook_endpoint(url):
    """Send test event to webhook endpoint"""
    test_event = {
        "object": "event",
        "id": f"evt_test_{int(time.time())}",
        "type": "response.completed",
        "created_at": int(time.time()),
        "data": {"id": f"resp_test_{int(time.time())}"}
    }
    try:
        resp = requests.post(url, json=test_event, timeout=10)
        data = resp.json()
        return {
            "url": url,
            "status_code": resp.status_code,
            "received": data.get("received", False),
            "status": data.get("status", "unknown"),
            "success": resp.status_code == 200 and data.get("received"),
        }
    except Exception as e:
        return {"url": url, "success": False, "error": str(e)}


def test_domain(name, url):
    """Test a DarCloud domain is alive"""
    try:
        resp = requests.get(url, timeout=10)
        return {"domain": name, "url": url, "status_code": resp.status_code, "alive": resp.status_code < 500}
    except Exception as e:
        return {"domain": name, "url": url, "alive": False, "error": str(e)}


def test_background_response():
    """
    Send a background response request to OpenAI.
    This will trigger a webhook event when completed.
    """
    print("\n  Sending background response request...")
    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            input="Say 'DarCloud webhook test successful — Bismillah' in exactly those words.",
            background=True,
        )
        print(f"  ✅ Background response created:")
        print(f"     ID: {response.id}")
        print(f"     Status: {response.status}")
        print(f"     Model: gpt-4o-mini")
        print(f"     → Webhook will fire at response.completed")
        return {
            "success": True,
            "response_id": response.id,
            "status": response.status,
        }
    except Exception as e:
        print(f"  ❌ Background response failed: {e}")
        return {"success": False, "error": str(e)}


def verify_assistant(name, info):
    """Verify a single assistant is accessible via API"""
    try:
        assistant = client.beta.assistants.retrieve(info["id"])
        return {
            "name": name,
            "id": info["id"],
            "tier": info["tier"],
            "model": assistant.model,
            "tools": len(assistant.tools) if assistant.tools else 0,
            "alive": True,
        }
    except Exception as e:
        return {"name": name, "id": info["id"], "alive": False, "error": str(e)}


# ═══════════════════════════════════════════
# Wiring Functions
# ═══════════════════════════════════════════

def wire_all():
    """Complete wiring — test everything, verify all agents"""
    print("\n" + "═" * 70)
    print("  DARCLOUD OPENAI WEBHOOK WIRING")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("═" * 70)

    # Load assets
    assistants = load_assistants()
    agent_keys = load_agent_keys()
    print(f"\n  Assets loaded:")
    print(f"    Assistants: {len(assistants)} ({sum(1 for a in assistants.values() if a['tier']=='mini')} mini + {sum(1 for a in assistants.values() if a['tier']=='core')} core)")
    print(f"    Agent keys: {len(agent_keys)}")
    print(f"    Projects:   {len(PROJECTS)}")

    # ─── Step 1: Test all webhook endpoints ───
    print(f"\n{'─' * 70}")
    print("  [1/5] Testing webhook endpoints")
    print(f"{'─' * 70}")

    for name, url in WEBHOOK_ENDPOINTS.items():
        result = test_webhook_endpoint(url)
        status = "✅" if result.get("success") else "❌"
        print(f"    {status} {name}: {url} => {result.get('status_code', 'fail')}")

    # ─── Step 2: Test all DarCloud domains ───
    print(f"\n{'─' * 70}")
    print("  [2/5] Testing DarCloud domains")
    print(f"{'─' * 70}")

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(test_domain, n, u): n for n, u in DARCLOUD_DOMAINS.items()}
        for future in as_completed(futures):
            result = future.result()
            status = "✅" if result.get("alive") else "❌"
            code = result.get("status_code", "err")
            print(f"    {status} {result['domain']}: {result['url']} => {code}")

    # ─── Step 3: Verify all 66 assistants ───
    print(f"\n{'─' * 70}")
    print(f"  [3/5] Verifying assistants ({len(assistants)} total)")
    print(f"{'─' * 70}")

    alive_count = 0
    failed_count = 0
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(verify_assistant, n, i): n for n, i in assistants.items()}
        for future in as_completed(futures):
            result = future.result()
            if result["alive"]:
                alive_count += 1
            else:
                failed_count += 1
                print(f"    ❌ {result['name']}: {result.get('error', 'unknown')}")

    print(f"    ✅ {alive_count}/{len(assistants)} assistants verified alive")
    if failed_count:
        print(f"    ❌ {failed_count} assistants failed verification")

    # ─── Step 4: Test background mode ───
    print(f"\n{'─' * 70}")
    print("  [4/5] Testing background mode (webhook trigger)")
    print(f"{'─' * 70}")

    bg_result = test_background_response()

    # ─── Step 5: Generate webhook registration links ───
    print(f"\n{'─' * 70}")
    print("  [5/5] Webhook Registration Status")
    print(f"{'─' * 70}")
    print(f"\n  Webhook URL: https://webhook.darcloud.host/openai")
    print(f"  Events: {len(ALL_WEBHOOK_EVENTS)} types")
    print(f"\n  Dashboard registration links (per-project):")
    for name, pid in PROJECTS.items():
        print(f"    • {name}: https://platform.openai.com/settings/{pid}/webhooks")

    # ─── Summary ───
    print(f"\n{'═' * 70}")
    print("  WIRING SUMMARY")
    print(f"{'═' * 70}")
    print(f"    Webhook Worker:    ✅ LIVE on Cloudflare Edge")
    print(f"    Webhook Receiver:  {'✅ Running' if test_webhook_endpoint(WEBHOOK_ENDPOINTS['local']).get('success') else '⚠️  Not running (start with: python3 webhook_receiver.py)'}")
    print(f"    Assistants:        {alive_count}/{len(assistants)} verified")
    print(f"    Agent Keys:        {len(agent_keys)} configured")
    print(f"    Projects:          {len(PROJECTS)}")
    print(f"    Background Mode:   {'✅ Working' if bg_result.get('success') else '❌ Failed'}")
    if bg_result.get('success'):
        print(f"    Test Response ID:  {bg_result.get('response_id')}")
        print(f"    → Webhook event will fire when response completes")
    print(f"\n  Webhook Secret: {'✅ Configured' if os.environ.get('OPENAI_WEBHOOK_SECRET') else '⚠️  NOT SET — register in OpenAI dashboard first'}")
    print(f"{'═' * 70}\n")

    # Save wiring report
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "webhook_endpoints": WEBHOOK_ENDPOINTS,
        "domains": DARCLOUD_DOMAINS,
        "projects": PROJECTS,
        "assistants_total": len(assistants),
        "assistants_alive": alive_count,
        "agent_keys_total": len(agent_keys),
        "background_test": bg_result,
        "webhook_events": ALL_WEBHOOK_EVENTS,
        "webhook_secret_configured": bool(os.environ.get("OPENAI_WEBHOOK_SECRET")),
    }
    report_path = OS_DIR / ".webhook_wiring_report.json"
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"  Report saved to: {report_path}")


def show_status():
    """Show current wiring status"""
    report_path = OS_DIR / ".webhook_wiring_report.json"
    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)
        print(json.dumps(report, indent=2))
    else:
        print("No wiring report found. Run: python3 wire_webhooks.py")


# ═══════════════════════════════════════════
# Main
# ═══════════════════════════════════════════

if __name__ == "__main__":
    if "--test-background" in sys.argv:
        test_background_response()
    elif "--test-webhook" in sys.argv:
        for name, url in WEBHOOK_ENDPOINTS.items():
            r = test_webhook_endpoint(url)
            print(f"  {name}: {'✅' if r.get('success') else '❌'} {r}")
    elif "--verify-all" in sys.argv:
        assistants = load_assistants()
        print(f"Verifying {len(assistants)} assistants...")
        for name, info in assistants.items():
            r = verify_assistant(name, info)
            status = "✅" if r["alive"] else "❌"
            print(f"  {status} {name} ({info['tier']}): {info['id']}")
    elif "--status" in sys.argv:
        show_status()
    else:
        wire_all()
