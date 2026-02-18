#!/usr/bin/env python3
"""
AI Response Monitor (REAL)
© QuranChain™ | Omar Mohammad Abunadi™

This script no longer simulates responses. It only processes
verified responses provided by a real inbox or webhook pipeline.
"""

import os
import json
import requests
from datetime import datetime

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')
API_KEY = os.getenv('API_KEY', '')
RESPONSES_FILE = os.getenv('RESPONSE_EVENTS_FILE')
REAL_RESPONSE_MODE = os.getenv('REAL_RESPONSE_MODE', 'false').lower() == 'true'


def load_response_events():
    if not RESPONSES_FILE:
        return []
    if not os.path.exists(RESPONSES_FILE):
        return []
    try:
        with open(RESPONSES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('responses', [])
    except Exception:
        return []


def update_lead_status(lead_id, notes):
    response = requests.put(
        f'{API_BASE}/api/crm/leads/{lead_id}/status',
        json={'status': 'responded', 'notes': notes},
        headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'},
        timeout=10
    )
    return response.status_code == 200


def create_deal(lead_id, name, value):
    response = requests.post(
        f'{API_BASE}/api/crm/deals',
        json={
            'lead_id': lead_id,
            'name': name,
            'deal_value': value,
            'product': 'quranchain_services',
            'probability': 25,
            'assigned_to': 'sales_ai',
            'notes': 'Created from verified response event'
        },
        headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'},
        timeout=10
    )
    return response.status_code == 200


def main():
    print(f"[{datetime.now().isoformat()}] AI Response Monitor (REAL)")

    if not REAL_RESPONSE_MODE:
        print("  ℹ️  REAL_RESPONSE_MODE is false. No simulated responses will be processed.")
        return

    events = load_response_events()
    if not events:
        print("  ℹ️  No response events to process.")
        return

    processed = 0
    for event in events:
        lead_id = event.get('lead_id')
        lead_name = event.get('lead_name', 'Customer')
        deal_value = float(event.get('deal_value', 0))
        if not lead_id or deal_value <= 0:
            continue

        if update_lead_status(lead_id, event.get('notes', 'Verified response received')):
            create_deal(lead_id, f"{lead_name} - Service", deal_value)
            processed += 1

    print(f"  ✅ Processed {processed} verified response events")


if __name__ == '__main__':
    main()
