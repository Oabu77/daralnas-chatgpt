#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
⛓️ QURANCHAIN BLOCKCHAIN LOGGING HANDLER
Custom logging handler that stores logs on QuranChain blockchain via DarCloud
© QuranChain™ | Omar Mohammad Abunadi™
"""

import os
import sys
import json
import time
import logging
import hashlib
import requests
import threading
from datetime import datetime
from typing import Dict, List, Optional
from queue import Queue
from pathlib import Path

# Add project root to path
sys.path.insert(0, "/home/omar/Desktop/QuranChain")

class BlockchainLogHandler(logging.Handler):
    """Custom logging handler that stores logs on QuranChain blockchain"""

    def __init__(self, blockchain_api_url: str = "http://localhost:8087", service_name: str = "QuranChain", batch_size: int = 10):
        super().__init__()
        self.blockchain_api_url = blockchain_api_url
        self.service_name = service_name
        self.batch_size = batch_size
        self.log_queue = Queue()
        self.session = requests.Session()

        # Start background worker thread
        self.worker_thread = threading.Thread(target=self._process_log_batch, daemon=True)
        self.worker_thread.start()

        # Set formatter for structured logging
        self.setFormatter(logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "service": "' + service_name + '", "logger": "%(name)s", "message": "%(message)s", "module": "%(module)s", "function": "%(funcName)s", "line": %(lineno)d}'
        ))

    def emit(self, record):
        """Emit log record to blockchain storage"""
        try:
            # Format the log record as JSON
            log_entry = self.format(record)

            # Add to processing queue
            self.log_queue.put(log_entry)

            # Process batch if queue is full
            if self.log_queue.qsize() >= self.batch_size:
                self._process_log_batch()

        except Exception as e:
            # Fallback to stderr if blockchain logging fails
            print(f"Blockchain logging failed: {e}", file=sys.stderr)

    def _process_log_batch(self):
        """Process a batch of log entries to blockchain storage"""
        try:
            log_entries = []

            # Collect batch of log entries
            while not self.log_queue.empty() and len(log_entries) < self.batch_size:
                try:
                    log_entry = self.log_queue.get_nowait()
                    log_entries.append(log_entry)
                except:
                    break

            if not log_entries:
                return

            # Combine log entries into a single data block
            batch_data = "\n".join(log_entries)
            batch_bytes = batch_data.encode('utf-8')

            # Create unique data ID for this log batch
            timestamp = int(time.time())
            data_hash = hashlib.sha256(batch_bytes).hexdigest()
            data_id = f"log_batch_{self.service_name}_{timestamp}_{data_hash[:8]}"

            # Store on blockchain
            store_url = f"{self.blockchain_api_url}/store"
            payload = {
                "data_id": data_id,
                "data_size": len(batch_bytes),
                "data_type": "system_logs",
                "owner": self.service_name
            }

            response = self.session.post(store_url, params=payload, timeout=10)

            if response.status_code == 200:
                result = response.json()
                tx_id = result.get("data", {}).get("tx_id", "unknown")
                print(f"✅ Logs stored on blockchain (TX: {tx_id})", file=sys.stderr)
            else:
                print(f"❌ Failed to store logs on blockchain: {response.status_code}", file=sys.stderr)
                # Fallback: write to local file
                self._fallback_to_file(batch_data, data_id)

        except Exception as e:
            print(f"Blockchain log processing failed: {e}", file=sys.stderr)
            # Fallback: write to local file
            try:
                self._fallback_to_file(batch_data if 'batch_data' in locals() else "Log processing error", "error_fallback")
            except:
                pass

    def _fallback_to_file(self, data: str, data_id: str):
        """Fallback method to write logs to local file if blockchain is unavailable"""
        try:
            fallback_dir = Path("/home/omar/Desktop/QuranChain/logs/blockchain_fallback")
            fallback_dir.mkdir(exist_ok=True)

            fallback_file = fallback_dir / f"{data_id}.log"
            with open(fallback_file, 'w') as f:
                f.write(data)

            print(f"📁 Logs written to fallback file: {fallback_file}", file=sys.stderr)
        except Exception as e:
            print(f"Fallback logging failed: {e}", file=sys.stderr)

def setup_blockchain_logging(service_name: str = "QuranChain", log_level: int = logging.INFO) -> logging.Logger:
    """Setup blockchain logging for a service"""

    # Create logger
    logger = logging.getLogger(service_name)
    logger.setLevel(log_level)

    # Remove existing handlers to avoid duplicates
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # Add blockchain handler
    blockchain_handler = BlockchainLogHandler(service_name=service_name)
    logger.addHandler(blockchain_handler)

    # Also add console handler for immediate feedback
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_formatter = logging.Formatter(
        '[%(asctime)s] 📊 %(levelname)s - %(name)s - %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    return logger

def migrate_existing_logs_to_blockchain(log_directory: str = "/home/omar/Desktop/QuranChain/logs"):
    """Migrate existing local logs to blockchain storage"""

    blockchain_handler = BlockchainLogHandler()

    log_dir = Path(log_directory)
    if not log_dir.exists():
        print(f"Log directory {log_directory} does not exist")
        return

    migrated_count = 0

    for log_file in log_dir.rglob("*.log"):
        try:
            with open(log_file, 'r') as f:
                log_content = f.read()

            if log_content.strip():
                # Create data ID from filename
                data_id = f"migrated_log_{log_file.stem}_{int(time.time())}"

                # Store on blockchain
                batch_bytes = log_content.encode('utf-8')
                store_url = f"{blockchain_handler.blockchain_api_url}/store"
                payload = {
                    "data_id": data_id,
                    "data_size": len(batch_bytes),
                    "data_type": "migrated_logs",
                    "owner": "QuranChain"
                }

                response = blockchain_handler.session.post(store_url, params=payload, timeout=10)

                if response.status_code == 200:
                    print(f"✅ Migrated {log_file.name} to blockchain")
                    migrated_count += 1

                    # Optionally backup and remove original
                    backup_file = log_file.with_suffix('.log.backup')
                    log_file.rename(backup_file)
                else:
                    print(f"❌ Failed to migrate {log_file.name}: {response.status_code}")

        except Exception as e:
            print(f"Error migrating {log_file.name}: {e}")

    print(f"📊 Migration complete: {migrated_count} log files migrated to blockchain")

if __name__ == "__main__":
    # Test the blockchain logging handler
    print("⛓️ Testing QuranChain Blockchain Logging Handler...")

    # Setup blockchain logging
    logger = setup_blockchain_logging("TestService")

    # Test log messages
    logger.info("Testing blockchain logging integration")
    logger.warning("This is a test warning message")
    logger.error("This is a test error message")

    # Wait for processing
    time.sleep(5)

    print("✅ Blockchain logging test complete")

    # Optionally migrate existing logs
    if len(sys.argv) > 1 and sys.argv[1] == "migrate":
        print("📁 Migrating existing logs to blockchain...")
        migrate_existing_logs_to_blockchain()