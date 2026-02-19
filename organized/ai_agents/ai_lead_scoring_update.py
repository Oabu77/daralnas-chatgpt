#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
AI Lead Scoring Update (REAL)
© QuranChain™ | Omar Mohammad Abunadi™

Updates lead scores only from verified engagement events.
No simulated boosting/decay.
"""

import os
import json
import requests
from datetime import datetime

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')
API_KEY = os.getenv('API_KEY', '')
SCORE_EVENTS_FILE = os.getenv('SCORE_EVENTS_FILE')
REAL_SCORING_MODE = os.getenv('REAL_SCORING_MODE', 'false').lower() == 'true'


def load_score_events():
    if not SCORE_EVENTS_FILE:
        return []
    if not os.path.exists(SCORE_EVENTS_FILE):
        return []
    try:
        with open(SCORE_EVENTS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('scores', [])
    except Exception:
        return []


def update_lead_score(lead_id, score, notes):
    response = requests.put(
        f'{API_BASE}/api/crm/leads/{lead_id}/status',
        json={'status': 'contacted', 'score': score, 'notes': notes},
        headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'},
        timeout=10
    )
    return response.status_code == 200


def main():
    print(f"[{datetime.now().isoformat()}] AI Lead Scoring Update (REAL)")

    if not REAL_SCORING_MODE:
        print("  ℹ️  REAL_SCORING_MODE is false. No simulated scoring will be applied.")
        return

    events = load_score_events()
    if not events:
        print("  ℹ️  No score events to process.")
        return

    updated = 0
    for event in events:
        lead_id = event.get('lead_id')
        score = event.get('score')
        if lead_id is None or score is None:
            continue
        score = max(0, min(100, int(score)))
        notes = event.get('notes', 'Score updated from verified engagement event')
        if update_lead_score(lead_id, score, notes):
            updated += 1

    print(f"  ✅ Updated {updated} leads with verified scores")


if __name__ == '__main__':
    main()
