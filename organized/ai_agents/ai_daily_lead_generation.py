#!/usr/bin/env python3
import sqlite3
from datetime import datetime
import random

# Simulate lead generation (in production, this would scrape websites, social media, etc.)
conn = sqlite3.connect("/home/omar/Desktop/QuranChain/crm/crm.db")
cursor = conn.cursor()

industries = ['freight', 'logistics', 'ecommerce', 'defi', 'gaming', 'nft']
new_leads = random.randint(2, 8)  # Generate 2-8 leads per run

for i in range(new_leads):
    industry = random.choice(industries)
    score = random.randint(50, 95)
    
    cursor.execute("""
        INSERT INTO leads (name, email, company, source, status, score, industry, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"Company_{datetime.now().strftime('%Y%m%d%H%M%S')}_{i}",
        f"contact_{datetime.now().strftime('%Y%m%d%H%M%S')}_{i}@example.com",
        f"Company_{datetime.now().strftime('%Y%m%d%H%M%S')}_{i}",
        "marketing_ai_automated",
        "new",
        score,
        industry,
        datetime.now().isoformat(),
        datetime.now().isoformat()
    ))

conn.commit()
conn.close()

print(f"[{datetime.now()}] Marketing AI: Generated {new_leads} new leads")
