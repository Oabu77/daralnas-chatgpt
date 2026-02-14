#!/usr/bin/env python3
"""
🎯 QURANCHAIN™ BACKGROUND MONITORING DAEMON
Runs monitoring in background with periodic JSON reports
No interactive dashboard - pure data collection and logging
"""

import os
import sys
import json
import time
import subprocess
import requests
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict
import threading
import signal

# Import the monitoring engine from main dashboard
sys.path.insert(0, '/home/omar/Desktop/QuranChain')
from continuous_monitoring_dashboard import (
    ContinuousMonitoringEngine,
    MONITORING_CONFIG,
)

# ======================================================================================
# BACKGROUND DAEMON
# ======================================================================================


class MonitoringDaemon:
    """Background monitoring daemon that logs to JSON files"""

    def __init__(self):
        self.engine = ContinuousMonitoringEngine()
        self.report_dir = "/home/omar/Desktop/QuranChain/monitoring_reports"
        self.running = False

        # Create report directory
        os.makedirs(self.report_dir, exist_ok=True)

    def generate_json_report(self) -> Dict:
        """Generate JSON report of current state"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "services": {},
            "blockchains": {},
            "revenue": None,
            "alerts_summary": {
                "total_alerts": len(self.engine.alerts),
                "recent_alerts": [
                    {
                        "time": a["timestamp"],
                        "type": a["type"],
                        "message": a["message"]
                    }
                    for a in self.engine.alerts[-20:]
                ]
            },
            "network_summary": {
                "services_online": sum(
                    1 for m in self.engine.service_metrics.values()
                    if m.status == "running"
                ),
                "total_services": len(self.engine.service_metrics),
                "blockchains_online": sum(
                    1 for m in self.engine.blockchain_metrics.values()
                    if m.status == "online"
                ),
                "total_blockchains": len(self.engine.blockchain_metrics),
                "average_congestion": sum(
                    m.congestion_percent for m in self.engine.blockchain_metrics.values()
                ) / max(len(self.engine.blockchain_metrics), 1)
            }
        }

        # Services
        for name, metrics in self.engine.service_metrics.items():
            report["services"][name] = {
                "status": metrics.status,
                "pid": metrics.pid,
                "cpu_percent": metrics.cpu_percent,
                "memory_mb": metrics.memory_mb,
                "uptime_seconds": metrics.uptime_seconds,
                "requests_per_minute": metrics.requests_per_minute,
                "errors": metrics.errors,
                "last_check": metrics.last_check
            }

        # Blockchains
        for blockchain_id, metrics in self.engine.blockchain_metrics.items():
            report["blockchains"][blockchain_id] = {
                "name": metrics.name,
                "symbol": metrics.symbol,
                "status": metrics.status,
                "tps": metrics.tps,
                "avg_fee_usd": metrics.avg_fee_usd,
                "congestion_percent": metrics.congestion_percent,
                "transactions_collected": metrics.transactions_collected,
                "revenue_usd": metrics.revenue_usd,
                "last_update": metrics.last_update
            }

        # Revenue
        if self.engine.revenue_metrics:
            latest_revenue = self.engine.revenue_metrics[-1]
            report["revenue"] = {
                "hourly_usd": latest_revenue.total_hourly_usd,
                "daily_usd": latest_revenue.total_daily_usd,
                "monthly_projected_usd": latest_revenue.total_monthly_projected,
                "founder_share_daily": latest_revenue.founder_share_daily,
                "founder_share_monthly_projected": latest_revenue.founder_share_monthly_projected,
                "by_blockchain": latest_revenue.by_blockchain,
                "by_service": latest_revenue.by_service
            }

        return report

    def save_hourly_report(self):
        """Save hourly JSON report"""
        report = self.generate_json_report()
        hour_key = datetime.now().strftime("%Y-%m-%d_%H")
        filename = f"{self.report_dir}/report_{hour_key}.json"

        with open(filename, "w") as f:
            json.dump(report, f, indent=2)

        print(f"✅ Hourly report saved: {filename}")

    def save_daily_summary(self):
        """Save daily summary"""
        report = self.generate_json_report()
        date_key = datetime.now().strftime("%Y-%m-%d")
        filename = f"{self.report_dir}/daily_summary_{date_key}.json"

        with open(filename, "w") as f:
            json.dump(report, f, indent=2)

        print(f"✅ Daily summary saved: {filename}")

    def save_latest_snapshot(self):
        """Save latest snapshot (always updated)"""
        report = self.generate_json_report()
        filename = f"{self.report_dir}/latest_snapshot.json"

        with open(filename, "w") as f:
            json.dump(report, f, indent=2)

    def run_daemon(self):
        """Run daemon loop"""
        self.running = True
        self.engine.log_alert("info", "🟢 Background monitoring daemon started")

        last_hourly_save = datetime.now()
        last_daily_save = datetime.now()

        try:
            while self.running:
                # Run monitoring cycle
                self.engine.run_monitoring_cycle()

                # Save latest snapshot every cycle
                self.save_latest_snapshot()

                # Hourly report
                now = datetime.now()
                if (now - last_hourly_save).total_seconds() >= 3600:
                    self.save_hourly_report()
                    last_hourly_save = now

                # Daily summary
                if (now - last_daily_save).total_seconds() >= 86400:
                    self.save_daily_summary()
                    last_daily_save = now

                # Wait for next cycle
                time.sleep(MONITORING_CONFIG["update_interval"])

        except KeyboardInterrupt:
            self.running = False
            self.engine.log_alert("info", "🔴 Background monitoring daemon stopped")
        except Exception as e:
            self.engine.log_alert("error", f"Daemon error: {e}")
            self.running = False

    def signal_handler(self, signum, frame):
        """Handle signals"""
        print("\n⚠️  Received signal, shutting down...")
        self.running = False


def main():
    """Main entry point"""
    print("🎯 QuranChain™ Background Monitoring Daemon")
    print("=" * 80)
    print("📊 Running in background...")
    print("📁 Reports: /home/omar/Desktop/QuranChain/monitoring_reports/")
    print("📝 Logs: /home/omar/Desktop/QuranChain/monitoring_logs/dashboard.log")
    print("=" * 80)
    print()

    daemon = MonitoringDaemon()

    # Setup signal handlers
    signal.signal(signal.SIGTERM, daemon.signal_handler)
    signal.signal(signal.SIGINT, daemon.signal_handler)

    # Run daemon
    daemon.run_daemon()

    print("✅ Daemon stopped")


if __name__ == "__main__":
    main()
