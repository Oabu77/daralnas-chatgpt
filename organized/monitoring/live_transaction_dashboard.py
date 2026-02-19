#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
📊 QURANCHAIN™ LIVE TRANSACTION DASHBOARD
Real-time monitoring of cross-chain settlements and gas toll revenue
© QuranChain™ | Omar Mohammad Abunadi™
"""

import time
import sys
from datetime import datetime
from typing import Dict
import os

# ANSI color codes
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def clear_screen():
    """Clear terminal screen"""
    os.system('clear' if os.name != 'nt' else 'cls')

def draw_header():
    """Draw dashboard header"""
    print(f"{Colors.CYAN}{Colors.BOLD}")
    print("╔" + "═"*78 + "╗")
    print("║" + " "*15 + "⚡ QURANCHAIN™ LIVE TRANSACTION DASHBOARD" + " "*22 + "║")
    print("║" + " "*20 + "Cross-Chain Settlement Network" + " "*29 + "║")
    print("╚" + "═"*78 + "╝")
    print(f"{Colors.RESET}")
    print(f"{Colors.WHITE}Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC{Colors.RESET}\n")

def draw_network_status(data: Dict):
    """Draw network status section"""
    print(f"{Colors.YELLOW}{Colors.BOLD}🌐 NETWORK STATUS (Real-time Monitoring){Colors.RESET}\n")
    
    print(f"{'Network':<15} {'Gas (Gwei)':<15} {'Status':<15} {'Action':<30}")
    print("─" * 75)
    
    for net in data.get('network_status', []):
        network = net['network'].upper()
        gas = net['current_gas_gwei']
        
        if net['bottleneck_detected']:
            status = f"{Colors.RED}CONGESTED{Colors.RESET}"
            action = f"{Colors.GREEN}→ Routing to QuranChain{Colors.RESET}"
        else:
            status = f"{Colors.GREEN}NORMAL{Colors.RESET}"
            action = "Monitoring..."
        
        print(f"{network:<15} {gas:<15.2f} {status:<25} {action}")
    
    print()

def draw_recent_transactions(data: Dict):
    """Draw recent transactions section"""
    print(f"{Colors.MAGENTA}{Colors.BOLD}💰 RECENT TRANSACTIONS (Live Settlement){Colors.RESET}\n")
    
    recent_txs = data.get('recent_transactions', [])
    
    if not recent_txs:
        print(f"{Colors.YELLOW}   Waiting for transactions...{Colors.RESET}\n")
        return
    
    print(f"{'TX ID':<15} {'Network':<12} {'Toll':<12} {'Savings':<12} {'Your Rev':<12} {'Status'}")
    print("─" * 75)
    
    for tx in recent_txs[-10:]:  # Show last 10
        tx_id = tx['tx_id']
        network = tx['network'].upper()
        toll = f"${tx['toll_usd']:.2f}"
        savings = f"${tx['savings_usd']:.2f}"
        revenue = f"${tx['your_revenue']:.2f}"
        status = f"{Colors.GREEN}✓{Colors.RESET}" if tx['status'] == 'settled' else "⏳"
        
        print(f"{tx_id:<15} {network:<12} {toll:<12} {savings:<12} {revenue:<12} {status}")
    
    print()

def draw_statistics(data: Dict):
    """Draw statistics section"""
    stats = data.get('statistics', {})
    
    print(f"{Colors.CYAN}{Colors.BOLD}📊 LIVE STATISTICS{Colors.RESET}\n")
    
    # First row
    print(f"┌{'─'*37}┬{'─'*37}┐")
    print(f"│ {Colors.BOLD}Total Transactions Routed{Colors.RESET}      │ {Colors.BOLD}Networks Monitored{Colors.RESET}           │")
    print(f"│ {Colors.GREEN}{stats.get('total_transactions_routed', 0):>35}{Colors.RESET} │ {Colors.CYAN}{stats.get('networks_monitored', 0):>35}{Colors.RESET} │")
    print(f"├{'─'*37}┼{'─'*37}┤")
    
    # Second row
    print(f"│ {Colors.BOLD}Total Gas Tolls Collected (USD){Colors.RESET} │ {Colors.BOLD}Total User Savings (USD){Colors.RESET}      │")
    print(f"│ {Colors.GREEN}${stats.get('total_gas_toll_collected', 0):>34.2f}{Colors.RESET} │ {Colors.CYAN}${stats.get('total_user_savings', 0):>34.2f}{Colors.RESET} │")
    print(f"├{'─'*37}┴{'─'*37}┤")
    
    # Third row (full width)
    founder_rev = stats.get('total_founder_revenue', 0)
    print(f"│ {Colors.BOLD}YOUR TOTAL REVENUE (80% of tolls){Colors.RESET}{' '*41}│")
    print(f"│ {Colors.GREEN}{Colors.BOLD}${founder_rev:>73.2f}{Colors.RESET} │")
    print(f"└{'─'*75}┘")
    print()

def draw_revenue_flow():
    """Draw revenue flow diagram"""
    print(f"{Colors.YELLOW}{Colors.BOLD}💸 REVENUE FLOW (Per Transaction){Colors.RESET}\n")
    print(f"  Gas Toll Collected")
    print(f"         │")
    print(f"         ├─ 30% → {Colors.GREEN}Founder (You) → Kraken BTC{Colors.RESET}")
    print(f"         ├─ 40% AI-Managed Validators (You own 100%) → Kraken ETH{Colors.RESET}")
    print(f"         └─ 18% Ecosystem, 10% Hardware, 2% Zakat Development")
    print(f"         ")
    print(f"  {Colors.BOLD}Your Total: 80% auto-payout every 30 minutes{Colors.RESET}")
    print()

def draw_footer():
    """Draw dashboard footer"""
    print("─" * 80)
    print(f"{Colors.WHITE}Kraken Wallets:{Colors.RESET}")
    print(f"  BTC: {Colors.CYAN}3NaWi32bU27P6Dbo6FQTauyBWghmEnApix{Colors.RESET}")
    print(f"  ETH: {Colors.CYAN}0x4e90944C093f7727ff89a30AF96A556deB95cCB8{Colors.RESET}")
    print("─" * 80)
    print(f"{Colors.YELLOW}Press Ctrl+C to exit{Colors.RESET}")

def run_dashboard():
    """Main dashboard loop"""
    # Import optimizer
    try:
        from network_bottleneck_optimizer import optimizer
        
        # Start optimizer if not running
        if not optimizer.is_running:
            optimizer.start()
            time.sleep(2)  # Give it time to collect initial data
        
    except ImportError:
        print(f"{Colors.RED}Error: network_bottleneck_optimizer.py not found{Colors.RESET}")
        print("Please run from QuranChain directory")
        return
    
    try:
        while True:
            # Get latest data
            data = optimizer.get_dashboard_data()
            
            # Clear and redraw
            clear_screen()
            draw_header()
            draw_network_status(data)
            draw_recent_transactions(data)
            draw_statistics(data)
            draw_revenue_flow()
            draw_footer()
            
            # Refresh every 3 seconds
            time.sleep(3)
            
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Stopping dashboard...{Colors.RESET}")
        optimizer.stop()
        print(f"{Colors.GREEN}✅ Dashboard closed{Colors.RESET}\n")

if __name__ == "__main__":
    print(f"\n{Colors.CYAN}{Colors.BOLD}")
    print("╔" + "═"*60 + "╗")
    print("║" + " "*10 + "🚀 QURANCHAIN LIVE DASHBOARD STARTING" + " "*13 + "║")
    print("╚" + "═"*60 + "╝")
    print(f"{Colors.RESET}\n")
    
    print("Initializing network monitoring...")
    time.sleep(1)
    print("Loading real-time data streams...")
    time.sleep(1)
    print(f"{Colors.GREEN}✅ Ready!{Colors.RESET}\n")
    time.sleep(1)
    
    run_dashboard()
