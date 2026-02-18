#!/usr/bin/env python3
"""
📊 QURANCHAIN™ PRODUCTION MONITORING SYSTEM
Real-time health monitoring and metrics collection for all ecosystem services
Founder: Omar Mohammad Abunadi™
"""

import time
import requests
import json
import logging
# from blockchain_logging_handler import setup_blockchain_logging  # FIXME: Module not found
from datetime import datetime
from pathlib import Path
from typing import Dict, List

# Configuration
QURANCHAIN_DIR = Path("/home/omar/Desktop/QuranChain")
LOG_FILE = QURANCHAIN_DIR / "monitoring_logs" / "production_monitor.log"
SNAPSHOT_DIR = QURANCHAIN_DIR / ".snapshots"
CHECK_INTERVAL = 60  # 1 minute

# Setup logging
LOG_FILE.parent.mkdir(exist_ok=True)
SNAPSHOT_DIR.mkdir(exist_ok=True)
setup_blockchain_logging()
logger = logging.getLogger(__name__)

# Services to monitor
SERVICES = {
    'quantum_blockchain': 9999,
    'quranchain_pay': 8080,
    'marketing_ai': 7300,
    'sales_ai': 7301,
}

def check_all_services() -> Dict:
    """Check health of all services"""
    results = {}
    for name, port in SERVICES.items():
        try:
            resp = requests.get(f"http://127.0.0.1:{port}/health", timeout=2)
            results[name] = {
                'status': 'healthy' if resp.status_code == 200 else 'unhealthy',
                'port': port,
                'response_time_ms': resp.elapsed.total_seconds() * 1000
            }
        except Exception as e:
            results[name] = {
                'status': 'down',
                'port': port,
                'error': str(e)
            }
    return results

def save_snapshot(data: Dict):
    """Save monitoring snapshot"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    snapshot_file = SNAPSHOT_DIR / f"monitoring_snapshot_{timestamp}.json"
    with open(snapshot_file, 'w') as f:
        json.dump(data, f, indent=2)

def main():
    logger.info("📊 Production Monitoring System started")
    logger.info(f"Monitoring {len(SERVICES)} services every {CHECK_INTERVAL}s")
    
    while True:
        try:
            results = check_all_services()
            
            # Count statuses
            healthy = sum(1 for s in results.values() if s['status'] == 'healthy')
            total = len(results)
            
            logger.info(f"Health check: {healthy}/{total} services healthy")
            
            # Save snapshot every 5 minutes
            if int(time.time()) % 300 < CHECK_INTERVAL:
                snapshot = {
                    'timestamp': datetime.now().isoformat(),
                    'services': results,
                    'summary': {
                        'healthy': healthy,
                        'total': total,
                        'health_percentage': (healthy / total * 100) if total > 0 else 0
                    }
                }
                save_snapshot(snapshot)
            
            time.sleep(CHECK_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("Monitoring system stopped by user")
            break
        except Exception as e:
            logger.error(f"Monitoring error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()
