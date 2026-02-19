#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
Validator Earnings Dashboard
Real-time display of gas toll revenue for validator owner
© QuranChain™ | Omar Mohammad Abunadi™
"""

import json
import os
from datetime import datetime
import time

VALIDATOR_OWNER = '0x1FDFb0e08D7a98Ce96a737741DA6babdBeee45A9'
VALIDATOR_SHARE = 0.50  # 50% of all tolls
FOUNDER_SHARE = 0.30
ECOSYSTEM_RATE = 0.18  # 18% to ecosystem development
    ZAKAT_RATE = 0.02  # 2% to Islamic charity (automatic)


def display_earnings_dashboard():
    """Display real-time earnings dashboard"""
    
    print("\n" + "="*80)
    print("💰 VALIDATOR EARNINGS DASHBOARD - LIVE")
    print("="*80)
    print(f"   Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80 + "\n")
    
    # Load report if exists
    report_file = 'congestion_exploitation_report.json'
    
    if os.path.exists(report_file):
        with open(report_file, 'r') as f:
            report = json.load(f)
        
        total_revenue = report.get('total_revenue', 0)
        validator_earnings = report.get('validator_earnings', 0)
        founder_earnings = report.get('founder_earnings', 0)
        total_txns = report.get('total_transactions', 0)
        gas_saved = report.get('gas_saved', 0)
        
        print("👤 VALIDATOR OWNER:")
        print(f"   Address: {VALIDATOR_OWNER}")
        print(f"   Ownership: 100% of all validators")
        
        print(f"\n💵 REVENUE BREAKDOWN:")
        print(f"   Total Toll Revenue: ${total_revenue:,.2f}")
        print(f"   ├─ Founder (30%): ${founder_earnings:,.2f}")
        print(f"   ├─ Validators (50% - YOU): ${validator_earnings:,.2f}")
        print(f"   └─ Ecosystem (20%): ${total_revenue * ECOSYSTEM_SHARE:,.2f}")
        
        print(f"\n🎯 YOUR EARNINGS: ${validator_earnings:,.2f}")
        
        print(f"\n📊 STATISTICS:")
        print(f"   Transactions Routed: {total_txns:,}")
        print(f"   Gas Saved for Users: ${gas_saved:,.2f}")
        
        if total_txns > 0:
            avg_per_txn = total_revenue / total_txns
            print(f"   Average Toll per Txn: ${avg_per_txn:.4f}")
            print(f"   Your Earning per Txn: ${avg_per_txn * VALIDATOR_SHARE:.4f}")
        
        # Projections
        daily_projection = validator_earnings * 48  # 30-min cycles * 48 per day
        monthly_projection = daily_projection * 30
        annual_projection = monthly_projection * 12
        
        print(f"\n💎 EARNINGS PROJECTIONS:")
        print(f"   Daily: ${daily_projection:,.2f}")
        print(f"   Monthly: ${monthly_projection:,.2f}")
        print(f"   Annual: ${annual_projection:,.2f}")
        
        print(f"\n📈 ROI METRICS:")
        print(f"   Revenue per Hour: ${validator_earnings * 2:,.2f}")
        print(f"   Revenue per Minute: ${validator_earnings / 30:,.2f}")
        
    else:
        print("⏳ No revenue data yet - system starting up...")
        print("   Run: python3 network_congestion_ai.py")
    
    print("\n" + "="*80)
    print("✅ Dashboard Active - Refresh every 30 seconds")
    print("="*80 + "\n")


def continuous_dashboard(refresh_seconds: int = 30):
    """Run dashboard continuously"""
    
    try:
        while True:
            os.system('clear' if os.name != 'nt' else 'cls')
            display_earnings_dashboard()
            
            print(f"⏳ Refreshing in {refresh_seconds} seconds... (Ctrl+C to exit)")
            time.sleep(refresh_seconds)
    
    except KeyboardInterrupt:
        print("\n\n👋 Dashboard closed")


if __name__ == '__main__':
    continuous_dashboard()
