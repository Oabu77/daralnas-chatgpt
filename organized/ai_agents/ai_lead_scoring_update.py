#!/usr/bin/env python3
import sqlite3
from datetime import datetime

conn = sqlite3.connect("/home/omar/Desktop/QuranChain/crm/crm.db")
cursor = conn.cursor()

# Boost scores for engaged leads
cursor.execute("""
    UPDATE leads
    SET score = score + 10
    WHERE status = 'responded'
    AND score < 95
""")

responded_boost = cursor.rowcount

# Decay scores for inactive leads
cursor.execute("""
    UPDATE leads
    SET score = score - 5
    WHERE status = 'contacted'
    AND score > 30
""")

inactive_decay = cursor.rowcount

conn.commit()
conn.close()

print(f"[{datetime.now()}] Marketing AI: Updated {responded_boost} engaged leads, decayed {inactive_decay} inactive")
