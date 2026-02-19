#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
📊 QURANCHAIN™ UNIFIED REAL-TIME MONITORING DASHBOARD
Live monitoring of all services, nodes, and revenue streams
© QuranChain™ | Omar Mohammad Abunadi™
"""

import requests
import json
import time
import os
from datetime import datetime
from threading import Thread
import curses

QURANCHAIN_SERVICES = {
    "Financial General": ("http://localhost:8101/status", "💰"),
    "Real Estate General": ("http://localhost:8102/status", "🏠"),
    "Fungi Mesh 10K": ("http://localhost:5006/status", "🍄"),
    "MeshTalk OS": ("http://localhost:9001/status", "🌐"),
}

class UnifiedDashboard:
    """Real-time unified monitoring"""
    
    def __init__(self):
        self.services_data = {}
        self.running = True
        self.update_count = 0
        
    def fetch_all_services(self):
        """Fetch data from all services"""
        self.services_data = {}
        
        for name, (url, emoji) in QURANCHAIN_SERVICES.items():
            try:
                response = requests.get(url, timeout=2)
                if response.status_code == 200:
                    self.services_data[name] = {
                        "data": response.json(),
                        "status": "✅ ONLINE",
                        "emoji": emoji
                    }
                else:
                    self.services_data[name] = {
                        "data": {},
                        "status": "⚠️ ERROR",
                        "emoji": emoji
                    }
            except Exception as e:
                self.services_data[name] = {
                    "data": {},
                    "status": "❌ OFFLINE",
                    "emoji": emoji
                }
    
    def display_dashboard(self):
        """Display live dashboard"""
        os.system('clear' if os.name == 'posix' else 'cls')
        
        print("\n" + "="*120)
        print("╔" + "="*118 + "╗")
        print("║" + " "*30 + "📊 QURANCHAIN™ UNIFIED LIVE MONITORING DASHBOARD 📊" + " "*35 + "║")
        print("╚" + "="*118 + "╝")
        print("="*120)
        print(f"\n⏰ Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Updates: {self.update_count}")
        print("\n" + "-"*120)
        
        total_nodes = 0
        total_tps = 0
        total_revenue = 0
        
        for name, (url, emoji) in QURANCHAIN_SERVICES.items():
            data = self.services_data.get(name, {})
            status = data.get("status", "❓")
            info = data.get("data", {})
            
            print(f"\n{emoji} {name.upper()} - {status}")
            print("-" * 120)
            
            if status == "✅ ONLINE":
                # Financial General
                if "ai_financial" in info or "strategy" in info:
                    print(f"   📈 Status: {info.get('status', 'unknown')}")
                    print(f"   💳 Transactions: {info.get('transactions_processed', 0):,}")
                    print(f"   💰 Revenue Collected: ${info.get('total_revenue', 0):,.2f}")
                    total_revenue += info.get('total_revenue', 0)
                
                # Real Estate
                elif "real_estate" in info:
                    print(f"   🏗️ Status: {info.get('status', 'unknown')}")
                    print(f"   📊 Properties Analyzed: {info.get('properties_analyzed', 0):,}")
                    print(f"   💰 Revenue: ${info.get('total_revenue', 0):,.2f}")
                    total_revenue += info.get('total_revenue', 0)
                
                # Fungi Mesh 10K
                elif "Fungi Mesh 10K" in name:
                    nodes = info.get('nodes', {})
                    perf = info.get('performance', {})
                    rev = info.get('revenue', {})
                    
                    print(f"   🌍 Nodes: {nodes.get('total', 0):,} (Healthy: {nodes.get('healthy', 0):,}, Health: {nodes.get('health_percent', 0):.1f}%)")
                    print(f"   ⚡ TPS: {perf.get('current_tps', 0):,} / Target: {perf.get('target_tps', 0):,}")
                    print(f"   📦 Total Transactions: {perf.get('total_transactions', 0):,}")
                    print(f"   💰 Revenue Collected: ${rev.get('total_collected_usd', 0):,.2f}")
                    
                    total_nodes += nodes.get('total', 0)
                    total_tps += perf.get('current_tps', 0)
                    total_revenue += rev.get('total_collected_usd', 0)
                
                # MeshTalk
                elif "Mesh" in name:
                    print(f"   📡 Status: {info.get('status', 'unknown')}")
                    print(f"   🌍 Nodes: {info.get('nodes', 0):,}")
                    print(f"   ⏱️ Uptime: {info.get('uptime', 'unknown')}")
            
            else:
                print(f"   ⚠️ Service is not responding")
        
        print("\n" + "="*120)
        print("\n📊 SYSTEM-WIDE TOTALS:")
        print("-" * 120)
        print(f"   🌍 Total Active Nodes: {total_nodes:,}")
        print(f"   ⚡ Combined TPS: {total_tps:,} / Target: 159,000+")
        print(f"   💰 Total Revenue Generated: ${total_revenue:,.2f}")
        print(f"   👤 Founder Address: 0xfAD9207A1d0BdC10F74dA3d4071b7ea9F3820F94")
        print(f"   🏆 Founder Royalty: 30% (automatically collected)")
        print("\n" + "="*120)
        
        print("\n📋 ENDPOINT STATUS:")
        print("-" * 120)
        for name, status_info in self.services_data.items():
            print(f"   {status_info['emoji']} {name}: {status_info['status']}")
        
        print("\n" + "="*120)
        print("\n🎯 QUICK COMMANDS:")
        print("   Watch Fungi Mesh logs:  tail -f /home/omar/Desktop/QuranChain/monitoring_logs/fungi_mesh_10k_nodes.log")
        print("   View all logs:          ls /home/omar/Desktop/QuranChain/monitoring_logs/")
        print("   Check database:         sqlite3 /home/omar/Desktop/QuranChain/monitoring_logs/fungi_mesh_10k_production.db")
        print("\n" + "="*120 + "\n")
    
    def run_continuous(self):
        """Run continuous monitoring"""
        try:
            while self.running:
                self.fetch_all_services()
                self.display_dashboard()
                self.update_count += 1
                time.sleep(5)  # Update every 5 seconds
        except KeyboardInterrupt:
            print("\n\n🛑 Dashboard stopped")
            self.running = False


def main():
    """Main entry point"""
    print("\n🚀 Starting QuranChain™ Unified Live Monitoring Dashboard...")
    print("   Press Ctrl+C to stop\n")
    time.sleep(2)
    
    dashboard = UnifiedDashboard()
    dashboard.run_continuous()


if __name__ == "__main__":
    main()
