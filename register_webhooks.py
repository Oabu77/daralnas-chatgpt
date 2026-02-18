#!/usr/bin/env python3
"""
DarCloud OpenAI Webhook Registration Script
============================================
Registers webhook endpoints for all OpenAI projects via the API.

Since OpenAI webhooks are per-project and configured via the dashboard,
this script:
1. Lists all projects and their webhook state  
2. Tests the live webhook endpoint
3. Generates the dashboard configuration steps
4. Once secret is provided, stores it and deploys to Cloudflare Worker

Usage:
  python3 register_webhooks.py              # Full setup guide
  python3 register_webhooks.py --test       # Test webhook endpoint
  python3 register_webhooks.py --set-secret "whsec_xxx"  # Store secret

Bismillah — All praise to Allah ﷻ
"""

import os
import sys
import json
import requests
from datetime import datetime

# ═══════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════

ADMIN_KEY = os.environ.get('OPENAI_ADMIN_KEY') or os.environ.get('OPENAI_FUNGIMESH_ADMIN_KEY')
WEBHOOK_URL = "https://webhook.darcloud.host/openai"
WEBHOOK_URL_ALT = "https://hooks.darcloud.host/openai"

# All subscribable event types
ALL_EVENTS = [
    "response.completed",
    "response.failed",
    "response.cancelled",
    "response.incomplete",
    "batch.completed",
    "batch.failed",
    "batch.cancelled",
    "batch.expired",
    "eval_run.succeeded",
    "eval_run.failed",
    "eval_run.canceled",
    "fine_tuning.job.succeeded",
    "fine_tuning.job.failed",
    "fine_tuning.job.cancelled",
]

ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'QuranChain', '.env')

def load_admin_key():
    """Load admin key from env file if not in environment"""
    global ADMIN_KEY
    if ADMIN_KEY:
        return ADMIN_KEY
    
    env_path = ENV_FILE
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith('OPENAI_FUNGIMESH_ADMIN_KEY='):
                    ADMIN_KEY = line.strip().split('=', 1)[1]
                    return ADMIN_KEY
                elif line.startswith('OPENAI_ADMIN_KEY='):
                    ADMIN_KEY = line.strip().split('=', 1)[1]
                    return ADMIN_KEY
    
    print("ERROR: No admin key found. Set OPENAI_FUNGIMESH_ADMIN_KEY in .env")
    sys.exit(1)

def list_projects():
    """List all OpenAI projects"""
    key = load_admin_key()
    resp = requests.get(
        "https://api.openai.com/v1/organization/projects",
        headers={"Authorization": f"Bearer {key}"}
    )
    if resp.status_code != 200:
        print(f"Error: {resp.status_code} — {resp.text}")
        return []
    return resp.json().get('data', [])

def test_webhook_endpoint():
    """Send test event to webhook endpoint"""
    test_event = {
        "object": "event",
        "id": f"evt_test_{int(datetime.now().timestamp())}",
        "type": "response.completed",
        "created_at": int(datetime.now().timestamp()),
        "data": {"id": "resp_test_verification"}
    }
    
    print(f"\n  Testing: POST {WEBHOOK_URL}")
    try:
        resp = requests.post(WEBHOOK_URL, json=test_event, timeout=10)
        data = resp.json()
        if resp.status_code == 200 and data.get('received'):
            print(f"  ✅ Webhook endpoint LIVE — Status: {data.get('status')}")
            return True
        else:
            print(f"  ❌ Unexpected response: {resp.status_code} — {data}")
            return False
    except Exception as e:
        print(f"  ❌ Connection failed: {e}")
        return False

def store_webhook_secret(secret):
    """Store webhook secret in .env and update Worker"""
    env_path = ENV_FILE
    
    # Add to .env
    with open(env_path, 'r') as f:
        content = f.read()
    
    if 'OPENAI_WEBHOOK_SECRET=' in content:
        # Replace existing
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('OPENAI_WEBHOOK_SECRET='):
                lines[i] = f'OPENAI_WEBHOOK_SECRET={secret}'
                break
        content = '\n'.join(lines)
    else:
        # Append
        content += f'\n# OpenAI Webhook Secret (for signature verification)\nOPENAI_WEBHOOK_SECRET={secret}\n'
    
    with open(env_path, 'w') as f:
        f.write(content)
    
    print(f"  ✅ Saved OPENAI_WEBHOOK_SECRET to .env")
    
    # Deploy secret to Cloudflare Worker
    print(f"  📤 Deploying secret to Cloudflare Worker...")
    os.system(f'cd {os.path.dirname(os.path.abspath(__file__))}/workers/webhook && '
              f'echo "{secret}" | CLOUDFLARE_API_KEY="1b781976c6025473c6218e1fc608328bca296" '
              f'CLOUDFLARE_EMAIL="omarabunadi28@gmail.com" '
              f'../../node_modules/.bin/wrangler secret put OPENAI_WEBHOOK_SECRET 2>&1')
    print(f"  ✅ Worker secret configured")

def print_registration_guide(projects):
    """Print step-by-step dashboard registration guide"""
    print("\n" + "═" * 70)
    print("  OPENAI WEBHOOK REGISTRATION GUIDE")
    print("═" * 70)
    print(f"\n  Webhook URL: {WEBHOOK_URL}")
    print(f"  Alt URL:     {WEBHOOK_URL_ALT}")
    print(f"\n  Total Projects: {len(projects)}")
    print(f"  Event Types:    {len(ALL_EVENTS)}")
    
    print("\n" + "─" * 70)
    print("  STEP 1: Register webhook for each project")
    print("─" * 70)
    
    for i, proj in enumerate(projects, 1):
        pid = proj['id']
        name = proj['name']
        url = f"https://platform.openai.com/settings/{pid}/webhooks"
        print(f"\n  {i}. {name} ({pid})")
        print(f"     Dashboard: {url}")
        print(f"     → Click 'Create'")
        print(f"     → Name: 'DarCloud Webhook'")
        print(f"     → URL:  {WEBHOOK_URL}")
        print(f"     → Events: Select ALL")
    
    print("\n" + "─" * 70)
    print("  STEP 2: Save the webhook signing secret")
    print("─" * 70)
    print(f"\n  After creating the first webhook, copy the signing secret")
    print(f"  (starts with 'whsec_') and run:")
    print(f"\n    python3 register_webhooks.py --set-secret 'whsec_YOUR_SECRET'")
    
    print("\n" + "─" * 70)
    print("  STEP 3: Test with a background response")
    print("─" * 70)
    print(f"\n  python3 -c \"")
    print(f"  from openai import OpenAI")
    print(f"  client = OpenAI()")
    print(f"  resp = client.responses.create(")
    print(f"      model='gpt-4o',")
    print(f"      input='Say hello',")
    print(f"      background=True,")
    print(f"  )")
    print(f"  print('Background response:', resp.id, resp.status)")
    print(f"  \"")
    
    print("\n" + "═" * 70)

def main():
    print("\n  🕌 DarCloud OpenAI Webhook Registration")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    if '--test' in sys.argv:
        test_webhook_endpoint()
        return

    if '--set-secret' in sys.argv:
        idx = sys.argv.index('--set-secret')
        if idx + 1 < len(sys.argv):
            store_webhook_secret(sys.argv[idx + 1])
        else:
            print("  ERROR: Provide secret: --set-secret 'whsec_xxx'")
        return

    # Full registration flow
    print("  [1/3] Testing webhook endpoint...")
    endpoint_live = test_webhook_endpoint()
    
    if not endpoint_live:
        print("\n  ⚠️  Webhook endpoint not reachable. Deploy first:")
        print("  cd workers/webhook && wrangler deploy")
        return

    print("\n  [2/3] Listing OpenAI projects...")
    projects = list_projects()
    for p in projects:
        print(f"    • {p['name']} ({p['id']}) — {p['status']}")

    print("\n  [3/3] Generating registration guide...")
    print_registration_guide(projects)

if __name__ == '__main__':
    main()
