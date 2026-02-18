#!/usr/bin/env python3
"""
Redeploy 45 Mini Assistants to FungiMesh Project
=================================================
Reads assistant configs from original key, recreates under FungiMesh key
so all 66 agents are in one project for unified webhook delivery.

Bismillah — All praise to Allah ﷻ
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from datetime import datetime, timezone

BASE_DIR = Path(__file__).parent.parent / "QuranChain"
ENV_FILE = BASE_DIR / ".env"

def load_env():
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ.setdefault(key.strip(), val.strip())
load_env()

ORIG_KEY = os.environ.get("OPENAI_API_KEY", "")
FUNGI_KEY = os.environ.get("OPENAI_FUNGIMESH_KEY", "")

HEADERS_ORIG = {
    "Authorization": f"Bearer {ORIG_KEY}",
    "OpenAI-Beta": "assistants=v2",
    "Content-Type": "application/json",
}

HEADERS_FUNGI = {
    "Authorization": f"Bearer {FUNGI_KEY}",
    "OpenAI-Beta": "assistants=v2",
    "Content-Type": "application/json",
}

BASE_URL = "https://api.openai.com/v1"


def get_mini_assistants():
    """Fetch all 45 mini assistants from original key"""
    with open(BASE_DIR / ".openai_assistants_map.json") as f:
        data = json.load(f)
    return data.get("assistants", {})


def retrieve_assistant(asst_id, headers):
    """Get full assistant config"""
    resp = requests.get(f"{BASE_URL}/assistants/{asst_id}", headers=headers)
    if resp.status_code == 200:
        return resp.json()
    return None


def create_assistant(config, headers):
    """Create assistant with given config"""
    payload = {
        "model": config.get("model", "gpt-4o-mini"),
        "name": config.get("name", ""),
        "instructions": config.get("instructions", ""),
        "tools": config.get("tools", []),
        "metadata": config.get("metadata", {}),
    }
    if config.get("description"):
        payload["description"] = config["description"]
    if config.get("temperature") is not None:
        payload["temperature"] = config["temperature"]
    if config.get("top_p") is not None:
        payload["top_p"] = config["top_p"]

    resp = requests.post(f"{BASE_URL}/assistants", headers=headers, json=payload)
    if resp.status_code == 200:
        return resp.json()
    else:
        print(f"    ERROR creating {config.get('name')}: {resp.status_code} {resp.text[:200]}")
        return None


def main():
    print("\n" + "═" * 70)
    print("  REDEPLOY MINI ASSISTANTS → FUNGIMESH PROJECT")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("═" * 70)

    mini_map = get_mini_assistants()
    print(f"\n  Mini assistants to migrate: {len(mini_map)}")

    new_map = {}
    success = 0
    failed = 0

    for i, (name, old_id) in enumerate(mini_map.items(), 1):
        print(f"\n  [{i}/{len(mini_map)}] {name} ({old_id})")

        # Retrieve full config from original key
        config = retrieve_assistant(old_id, HEADERS_ORIG)
        if not config:
            print(f"    ❌ Could not retrieve from original key")
            failed += 1
            continue

        print(f"    📋 Retrieved: model={config['model']}, tools={len(config.get('tools',[]))}")

        # Create under FungiMesh key
        new_asst = create_assistant(config, HEADERS_FUNGI)
        if new_asst:
            new_id = new_asst["id"]
            new_map[name] = new_id
            success += 1
            print(f"    ✅ Created: {new_id}")
        else:
            failed += 1

        # Rate limit protection
        if i % 10 == 0:
            time.sleep(1)

    # Save updated map
    output = {
        "deployment_date": datetime.now(timezone.utc).isoformat(),
        "total_deployed": success,
        "total_failed": failed,
        "source": "redeployed from original key to FungiMesh project",
        "assistants": new_map,
    }

    output_path = BASE_DIR / ".openai_assistants_map.json"
    # Backup old
    backup_path = BASE_DIR / ".openai_assistants_map.backup.json"
    if output_path.exists():
        import shutil
        shutil.copy2(output_path, backup_path)
        print(f"\n  📦 Backed up old map to {backup_path}")

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    # Also update .env with new assistant IDs
    env_updates = []
    for name, new_id in new_map.items():
        env_key = f"OPENAI_ASST_{name.upper().replace(' ', '_').replace('-', '_')}"
        env_updates.append(f"{env_key}={new_id}")

    if env_updates:
        with open(ENV_FILE, 'r') as f:
            env_content = f.read()

        # Replace existing OPENAI_ASST_ entries
        lines = env_content.split('\n')
        new_lines = [l for l in lines if not l.startswith('OPENAI_ASST_')]

        # Add new entries
        new_lines.append("\n# Redeployed Mini Assistants (FungiMesh Project)")
        new_lines.extend(env_updates)

        with open(ENV_FILE, 'w') as f:
            f.write('\n'.join(new_lines))
        print(f"  📝 Updated .env with {len(env_updates)} new assistant IDs")

    print(f"\n{'═' * 70}")
    print(f"  MIGRATION COMPLETE")
    print(f"  ✅ Succeeded: {success}/{len(mini_map)}")
    print(f"  ❌ Failed:    {failed}/{len(mini_map)}")
    print(f"  📄 Map saved: {output_path}")
    print(f"{'═' * 70}\n")


if __name__ == "__main__":
    if "--dry-run" in sys.argv:
        mini_map = get_mini_assistants()
        print(f"Would migrate {len(mini_map)} assistants:")
        for name, aid in mini_map.items():
            print(f"  {name}: {aid}")
    else:
        main()
