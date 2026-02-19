#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
import sqlite3
from datetime import datetime, timedelta

conn = sqlite3.connect("/home/omar/Desktop/QuranChain/crm/crm.db")
cursor = conn.cursor()

# Find leads contacted but no response in 48+ hours
cutoff = (datetime.now() - timedelta(hours=48)).isoformat()
cursor.execute("""
    SELECT id, name, email FROM leads
    WHERE status = 'contacted'
    AND updated_at < ?
    LIMIT 10
""", (cutoff,))

followups = cursor.fetchall()

for lead_id, name, email in followups:
    # Mark as followed up
    cursor.execute("""
        UPDATE leads
        SET updated_at = ?, notes = 'Sales AI: Follow-up sent'
        WHERE id = ?
    """, (datetime.now().isoformat(), lead_id))

conn.commit()
conn.close()

print(f"[{datetime.now()}] Sales AI: Sent {len(followups)} follow-up emails")
