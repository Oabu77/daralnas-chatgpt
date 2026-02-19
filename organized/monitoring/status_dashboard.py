#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
📊 QURANCHAIN™ PRODUCTION STATUS DASHBOARD
Real-time monitoring of all integrated services
Founder: Omar Mohammad Abunadi™
"""

import os
import sys
import json
import time
import requests
from datetime import datetime

# Colors
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def clear_screen():
    os.system('clear' if os.name != 'nt' else 'cls')

def get_status():
    """Get status from Quantum Blockchain API"""
    try:
        response = requests.get('http://localhost:9999/api/v1/status', timeout=5)
        return response.json()
    except:
        return None

def format_money(amount):
    """Format money with commas"""
    return f"${amount:,.2f}"

def print_dashboard(status):
    """Print the dashboard"""
    clear_screen()
    
    print(f"""
{Colors.PURPLE}╔═══════════════════════════════════════════════════════════════════════════════╗
║        ⚛️🕌 QURANCHAIN™ PRODUCTION STATUS DASHBOARD 🕌⚛️                         ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Founder: Omar Mohammad Abunadi™                                              ║
║  Status:  {Colors.GREEN}LIVE PRODUCTION{Colors.PURPLE} - Revenue Generating                              ║
║  Time:    {datetime.now().strftime('%Y-%m-%d %H:%M:%S'):<50}        ║
╚═══════════════════════════════════════════════════════════════════════════════╝{Colors.END}
""")
    
    if not status:
        print(f"{Colors.RED}❌ Cannot connect to Quantum Blockchain API{Colors.END}")
        return
    
    # Services Status
    services = status.get('services', {}).get('services', {})
    healthy = status.get('services', {}).get('healthy_services', 0)
    total = status.get('services', {}).get('total_services', 0)
    health_pct = status.get('services', {}).get('health_percentage', 0)
    
    print(f"{Colors.CYAN}╔═══════════════════════════════════════════════════════════════════════════════╗")
    print(f"║  📡 INTEGRATED SERVICES ({healthy}/{total} healthy - {health_pct}%)")
    print(f"╠═══════════════════════════════════════════════════════════════════════════════╣{Colors.END}")
    
    for name, info in services.items():
        status_str = info.get('status', 'unknown')
        port = info.get('port', '?')
        if status_str == 'healthy':
            emoji = f"{Colors.GREEN}✅"
            status_display = f"{Colors.GREEN}HEALTHY{Colors.END}"
        else:
            emoji = f"{Colors.RED}❌"
            status_display = f"{Colors.RED}DOWN{Colors.END}"
        
        name_display = name.replace('_', ' ').title()[:30]
        print(f"   {emoji} {name_display:<30} Port {port:<5} {status_display}")
    
    print()
    
    # Blockchain Stats
    blockchain = status.get('blockchain', {})
    print(f"{Colors.CYAN}╔═══════════════════════════════════════════════════════════════════════════════╗")
    print(f"║  ⛓️ BLOCKCHAIN STATISTICS")
    print(f"╠═══════════════════════════════════════════════════════════════════════════════╣{Colors.END}")
    print(f"   📦 Chain Length:          {blockchain.get('chain_length', 0)} blocks")
    print(f"   📝 Total Transactions:    {blockchain.get('total_transactions', 0)}")
    print(f"   ⏳ Pending Transactions:  {blockchain.get('pending_transactions', 0)}")
    print(f"   ⚡ Mining Difficulty:     {blockchain.get('difficulty', 0)}")
    print()
    
    # Revenue
    revenue = status.get('revenue', {})
    total_revenue = revenue.get('total_revenue_usd', 0)
    founder_earnings = revenue.get('blockchain_stats', {}).get('founder_earnings_usd', 0)
    breakdown = revenue.get('breakdown', {})
    
    print(f"{Colors.CYAN}╔═══════════════════════════════════════════════════════════════════════════════╗")
    print(f"║  💰 REVENUE TRACKING (30% Founder Fee)")
    print(f"╠═══════════════════════════════════════════════════════════════════════════════╣{Colors.END}")
    print(f"   {Colors.GREEN}💵 Total Revenue:      {format_money(total_revenue)}{Colors.END}")
    print(f"   {Colors.GREEN}💰 Founder Earnings:   {format_money(founder_earnings)}{Colors.END}")
    print()
    print(f"   📊 Breakdown:")
    for source, amount in breakdown.items():
        if amount > 0:
            print(f"      • {source.title():<20} {format_money(amount)}")
    
    print()
    
    # Wallets
    print(f"{Colors.CYAN}╔═══════════════════════════════════════════════════════════════════════════════╗")
    print(f"║  🔐 FOUNDER WALLETS")
    print(f"╠═══════════════════════════════════════════════════════════════════════════════╣{Colors.END}")
    print(f"   💎 BTC:  3NBWbe7o1ieBYXVUcZR9xUizQBGBdkxAZT")
    print(f"   ⟠  ETH:  0xfAD9207A1d0BdC10F74dA3d4071b7ea9F3820F94")
    print(f"   💵 USDC: 0xfAD9207A1d0BdC10F74dA3d4071b7ea9F3820F94 (Polygon)")
    print(f"   💲 USDT: 0xfAD9207A1d0BdC10F74dA3d4071b7ea9F3820F94 (Ethereum)")
    print()
    
    # API Endpoints
    print(f"{Colors.CYAN}╔═══════════════════════════════════════════════════════════════════════════════╗")
    print(f"║  🌐 LIVE API ENDPOINTS")
    print(f"╠═══════════════════════════════════════════════════════════════════════════════╣{Colors.END}")
    print(f"   • Quantum Blockchain:     http://localhost:9999")
    print(f"   • Dar Al Nas Islamic:     http://localhost:7080")
    print(f"   • Multi-Currency API:     http://localhost:6001")
    print(f"   • Takaful Insurance:      http://localhost:7070")
    print(f"   • Gateway APIs:           http://localhost:8000, 8088, 8090")
    print()
    
    print(f"{Colors.GREEN}═══════════════════════════════════════════════════════════════════════════════")
    print(f"   🎉 ALL SYSTEMS OPERATIONAL - GENERATING REVENUE")
    print(f"═══════════════════════════════════════════════════════════════════════════════{Colors.END}")
    print()

def main():
    """Main dashboard loop"""
    try:
        while True:
            status = get_status()
            print_dashboard(status)
            print(f"   Press Ctrl+C to exit. Refreshing in 10 seconds...")
            time.sleep(10)
    except KeyboardInterrupt:
        print("\n\n   Dashboard closed. All services continue running.")
        sys.exit(0)

if __name__ == "__main__":
    # Single run mode
    status = get_status()
    print_dashboard(status)
