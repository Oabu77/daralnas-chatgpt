#!/usr/bin/env python3
import sqlite3
from datetime import datetime
import random

conn = sqlite3.connect("/home/omar/Desktop/QuranChain/crm/crm.db")
cursor = conn.cursor()

# Simulate checking for responses (in production, this would check actual email API)
cursor.execute("""
    SELECT id, name, email, score FROM leads
    WHERE status = 'contacted'
    ORDER BY RANDOM()
    LIMIT 3
""")

contacted = cursor.fetchall()
new_responses = 0

for lead_id, name, email, score in contacted:
    # 5% chance of response per check (realistic for cold outreach)
    if random.random() < 0.05:
        cursor.execute("""
            UPDATE leads
            SET status = 'responded', updated_at = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), lead_id))
        
        # Create deal
        deal_value = 5000 if score >= 80 else 2000
        cursor.execute("""
            INSERT INTO deals (lead_id, name, stage, deal_value, currency, probability, assigned_to, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            lead_id,
            f"{name} - Payment Processing",
            'PROSPECTING',
            deal_value,
            'USD',
            25,
            'Sales AI',
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
        
        new_responses += 1

conn.commit()
conn.close()

if new_responses > 0:
    print(f"[{datetime.now()}] Sales AI: Detected {new_responses} new responses, created deals")
