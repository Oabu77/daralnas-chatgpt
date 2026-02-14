#!/usr/bin/env python3
import sqlite3
from datetime import datetime

conn = sqlite3.connect("/home/omar/Desktop/QuranChain/crm/crm.db")
cursor = conn.cursor()

# Analyze deals and suggest improvements
cursor.execute("SELECT COUNT(*), AVG(deal_value), SUM(deal_value) FROM deals")
deal_count, avg_value, total_pipeline = cursor.fetchone()

total_pipeline = total_pipeline or 0
avg_value = avg_value or 0

# Identify high-value industries
cursor.execute("""
    SELECT l.industry, AVG(d.deal_value) as avg_deal
    FROM leads l
    JOIN deals d ON l.id = d.lead_id
    GROUP BY l.industry
    ORDER BY avg_deal DESC
    LIMIT 3
""")

top_industries = cursor.fetchall()

conn.close()

print(f"[{datetime.now()}] Optimization AI: Analyzed {deal_count} deals, ${total_pipeline:.2f} pipeline")
if top_industries:
    print(f"   Top industries: {', '.join(ind for ind, _ in top_industries)}")
