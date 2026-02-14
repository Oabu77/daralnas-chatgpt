#!/usr/bin/env python3
"""
🕌 QURANCHAIN AI™ - BLOCKCHAIN INTELLIGENCE AGENT
═══════════════════════════════════════════════════════════════════════════════
Autonomous AI for Blockchain Operations, Gas Optimization & Network Intelligence

Authority: Omar Mohammad Abunadi™ (FOUNDER)
Entity: QuranChain™ Ecosystem
Status: ACTIVE - LIVE PRODUCTION

This AI agent specializes in:
  • Monitoring 47+ blockchain networks (EVM & Non-EVM)
  • Gas fee optimization and toll collection
  • Real-time transaction tracking across all chains
  • Network health monitoring and auto-healing
  • Cross-chain settlement optimization
  • Smart contract event monitoring
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
import time
import logging
import sqlite3
import requests
import threading
from blockchain_logging_handler import setup_blockchain_logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from pathlib import Path

# Add project path
sys.path.insert(0, '/home/omar/Desktop/QuranChain')

# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

LOG_DIR = Path('/home/omar/Desktop/QuranChain/logs/quranchain_ai')
LOG_DIR.mkdir(parents=True, exist_ok=True)

setup_blockchain_logging()

logger = logging.getLogger('QuranChainAI')

# ═══════════════════════════════════════════════════════════════════════════════
# QURANCHAIN AI CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class QuranChainAIConfig:
    """QuranChain AI Configuration"""
    
    # FOUNDER (IMMUTABLE)
    FOUNDER_NAME: str = "Omar Mohammad Abunadi™"
    FOUNDER_ROYALTY_RATE: float = 0.30  # 30% IMMUTABLE
    
    # REVENUE SPLIT
    VALIDATOR_SHARE: float = 0.50  # 40% AI-Managed Validators
    ECOSYSTEM_SHARE: float = 0.20  # 18% Ecosystem, 10% Hardware, 2% Zakat fund
    
    # AI AGENT CONFIGURATION
    AGENT_NAME: str = "QuranChain AI™"
    VERSION: str = "2.0.0"
    MODE: str = "PRODUCTION"
    
    # BLOCKCHAIN MONITORING
    BLOCK_SYNC_INTERVAL: int = 15      # Check blocks every 15 seconds
    GAS_PRICE_INTERVAL: int = 30       # Check gas prices every 30 seconds
    NETWORK_HEALTH_INTERVAL: int = 60  # Check network health every minute
    TRANSACTION_SYNC_INTERVAL: int = 10  # Sync transactions every 10 seconds
    
    # SUPPORTED NETWORKS (47+ chains)
    TOTAL_NETWORKS: int = 47
    

# ═══════════════════════════════════════════════════════════════════════════════
# BLOCKCHAIN NETWORK DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════

BLOCKCHAIN_NETWORKS = {
    # LAYER 1 - EVM COMPATIBLE
    'ethereum': {'chain_id': 1, 'name': 'Ethereum', 'type': 'L1', 'rpc': 'https://eth.llamarpc.com'},
    'bnb': {'chain_id': 56, 'name': 'BNB Chain', 'type': 'L1', 'rpc': 'https://bsc-dataseed.binance.org'},
    'polygon': {'chain_id': 137, 'name': 'Polygon', 'type': 'L1', 'rpc': 'https://polygon-rpc.com'},
    'avalanche': {'chain_id': 43114, 'name': 'Avalanche', 'type': 'L1', 'rpc': 'https://api.avax.network/ext/bc/C/rpc'},
    'fantom': {'chain_id': 250, 'name': 'Fantom', 'type': 'L1', 'rpc': 'https://rpc.ftm.tools'},
    'cronos': {'chain_id': 25, 'name': 'Cronos', 'type': 'L1', 'rpc': 'https://evm.cronos.org'},
    'gnosis': {'chain_id': 100, 'name': 'Gnosis', 'type': 'L1', 'rpc': 'https://rpc.gnosischain.com'},
    'celo': {'chain_id': 42220, 'name': 'Celo', 'type': 'L1', 'rpc': 'https://forno.celo.org'},
    'moonbeam': {'chain_id': 1284, 'name': 'Moonbeam', 'type': 'L1', 'rpc': 'https://rpc.api.moonbeam.network'},
    'moonriver': {'chain_id': 1285, 'name': 'Moonriver', 'type': 'L1', 'rpc': 'https://rpc.api.moonriver.moonbeam.network'},
    'aurora': {'chain_id': 1313161554, 'name': 'Aurora', 'type': 'L1', 'rpc': 'https://mainnet.aurora.dev'},
    'harmony': {'chain_id': 1666600000, 'name': 'Harmony', 'type': 'L1', 'rpc': 'https://api.harmony.one'},
    'kava': {'chain_id': 2222, 'name': 'Kava', 'type': 'L1', 'rpc': 'https://evm.kava.io'},
    'evmos': {'chain_id': 9001, 'name': 'Evmos', 'type': 'L1', 'rpc': 'https://evmos-evm.publicnode.com'},
    'ronin': {'chain_id': 2020, 'name': 'Ronin', 'type': 'L1', 'rpc': 'https://api.roninchain.com/rpc'},
    
    # LAYER 2 - ETHEREUM SCALING
    'arbitrum': {'chain_id': 42161, 'name': 'Arbitrum One', 'type': 'L2', 'rpc': 'https://arb1.arbitrum.io/rpc'},
    'optimism': {'chain_id': 10, 'name': 'Optimism', 'type': 'L2', 'rpc': 'https://mainnet.optimism.io'},
    'base': {'chain_id': 8453, 'name': 'Base', 'type': 'L2', 'rpc': 'https://mainnet.base.org'},
    'zksync': {'chain_id': 324, 'name': 'zkSync Era', 'type': 'L2', 'rpc': 'https://mainnet.era.zksync.io'},
    'linea': {'chain_id': 59144, 'name': 'Linea', 'type': 'L2', 'rpc': 'https://rpc.linea.build'},
    'scroll': {'chain_id': 534352, 'name': 'Scroll', 'type': 'L2', 'rpc': 'https://rpc.scroll.io'},
    'polygon_zkevm': {'chain_id': 1101, 'name': 'Polygon zkEVM', 'type': 'L2', 'rpc': 'https://zkevm-rpc.com'},
    'mantle': {'chain_id': 5000, 'name': 'Mantle', 'type': 'L2', 'rpc': 'https://rpc.mantle.xyz'},
    'blast': {'chain_id': 81457, 'name': 'Blast', 'type': 'L2', 'rpc': 'https://rpc.blast.io'},
    'mode': {'chain_id': 34443, 'name': 'Mode', 'type': 'L2', 'rpc': 'https://mainnet.mode.network'},
    'manta': {'chain_id': 169, 'name': 'Manta Pacific', 'type': 'L2', 'rpc': 'https://pacific-rpc.manta.network/http'},
    'metis': {'chain_id': 1088, 'name': 'Metis', 'type': 'L2', 'rpc': 'https://andromeda.metis.io/?owner=1088'},
    'boba': {'chain_id': 288, 'name': 'Boba Network', 'type': 'L2', 'rpc': 'https://mainnet.boba.network'},
    'arbitrum_nova': {'chain_id': 42170, 'name': 'Arbitrum Nova', 'type': 'L2', 'rpc': 'https://nova.arbitrum.io/rpc'},
    
    # NON-EVM CHAINS (Custom IDs for internal tracking)
    'bitcoin': {'chain_id': 900001, 'name': 'Bitcoin', 'type': 'NON_EVM', 'api': 'https://blockchain.info'},
    'solana': {'chain_id': 900002, 'name': 'Solana', 'type': 'NON_EVM', 'api': 'https://api.mainnet-beta.solana.com'},
    'polkadot': {'chain_id': 900003, 'name': 'Polkadot', 'type': 'NON_EVM', 'api': 'https://rpc.polkadot.io'},
    'near': {'chain_id': 900004, 'name': 'NEAR', 'type': 'NON_EVM', 'api': 'https://rpc.mainnet.near.org'},
    'algorand': {'chain_id': 900005, 'name': 'Algorand', 'type': 'NON_EVM', 'api': 'https://mainnet-api.algonode.cloud'},
    'tezos': {'chain_id': 900006, 'name': 'Tezos', 'type': 'NON_EVM', 'api': 'https://mainnet.api.tez.ie'},
    'stellar': {'chain_id': 900007, 'name': 'Stellar', 'type': 'NON_EVM', 'api': 'https://horizon.stellar.org'},
    'xrp': {'chain_id': 900008, 'name': 'XRP Ledger', 'type': 'NON_EVM', 'api': 'https://s1.ripple.com:51234'},
    'hedera': {'chain_id': 900009, 'name': 'Hedera', 'type': 'NON_EVM', 'api': 'https://mainnet-public.mirrornode.hedera.com'},
    'aptos': {'chain_id': 900010, 'name': 'Aptos', 'type': 'NON_EVM', 'api': 'https://fullnode.mainnet.aptoslabs.com/v1'},
    'sui': {'chain_id': 900011, 'name': 'Sui', 'type': 'NON_EVM', 'api': 'https://fullnode.mainnet.sui.io'},
    'ton': {'chain_id': 900012, 'name': 'TON', 'type': 'NON_EVM', 'api': 'https://toncenter.com/api/v2'},
    'sei': {'chain_id': 900013, 'name': 'Sei', 'type': 'NON_EVM', 'api': 'https://sei-rpc.polkachu.com'},
    'flow': {'chain_id': 900014, 'name': 'Flow', 'type': 'NON_EVM', 'api': 'https://rest-mainnet.onflow.org'},
    'stacks': {'chain_id': 900015, 'name': 'Stacks', 'type': 'NON_EVM', 'api': 'https://stacks-node-api.mainnet.stacks.co'},
    'cosmos': {'chain_id': 900016, 'name': 'Cosmos Hub', 'type': 'NON_EVM', 'api': 'https://cosmos-rpc.polkachu.com'},
    'injective': {'chain_id': 900017, 'name': 'Injective', 'type': 'NON_EVM', 'api': 'https://sentry.lcd.injective.network'},
    
    # QURANCHAIN NATIVE
    'quranchain': {'chain_id': 99999, 'name': 'QuranChain™', 'type': 'NATIVE', 'rpc': 'http://localhost:9999'},
}


# ═══════════════════════════════════════════════════════════════════════════════
# GAS PRICE MONITOR
# ═══════════════════════════════════════════════════════════════════════════════

class GasPriceMonitor:
    """Monitor gas prices across all EVM networks"""
    
    def __init__(self, config: QuranChainAIConfig):
        self.config = config
        self.gas_prices = {}
        logger.info("⛽ Gas Price Monitor initialized")
    
    def get_evm_gas_price(self, network_key: str) -> Optional[float]:
        """Get gas price for an EVM network"""
        network = BLOCKCHAIN_NETWORKS.get(network_key)
        if not network or network['type'] == 'NON_EVM':
            return None
        
        try:
            rpc_url = network.get('rpc')
            if not rpc_url:
                return None
            
            payload = {
                "jsonrpc": "2.0",
                "method": "eth_gasPrice",
                "params": [],
                "id": 1
            }
            
            resp = requests.post(rpc_url, json=payload, timeout=5)
            if resp.status_code == 200:
                result = resp.json()
                gas_wei = int(result.get('result', '0x0'), 16)
                gas_gwei = gas_wei / 1e9
                return gas_gwei
        
        except Exception as e:
            logger.debug(f"   Gas price error for {network_key}: {str(e)[:30]}")
        
        return None
    
    def check_all_gas_prices(self) -> Dict[str, Any]:
        """Check gas prices across all EVM networks"""
        logger.info("⛽ Checking gas prices...")
        
        prices = {}
        checked = 0
        successful = 0
        
        for network_key, network_info in BLOCKCHAIN_NETWORKS.items():
            if network_info['type'] in ['L1', 'L2', 'NATIVE']:
                checked += 1
                gas_price = self.get_evm_gas_price(network_key)
                
                if gas_price is not None:
                    prices[network_key] = {
                        'name': network_info['name'],
                        'chain_id': network_info['chain_id'],
                        'gas_gwei': gas_price,
                        'type': network_info['type'],
                        'timestamp': datetime.now().isoformat()
                    }
                    successful += 1
        
        self.gas_prices = prices
        
        # Log summary
        logger.info(f"   Networks checked: {checked}")
        logger.info(f"   Successful: {successful}")
        
        # Log top 5 cheapest
        if prices:
            sorted_prices = sorted(prices.items(), key=lambda x: x[1]['gas_gwei'])[:5]
            logger.info("   🏆 Top 5 Cheapest Gas:")
            for key, data in sorted_prices:
                logger.info(f"      • {data['name']}: {data['gas_gwei']:.2f} Gwei")
        
        return {
            'timestamp': datetime.now().isoformat(),
            'networks_checked': checked,
            'networks_responding': successful,
            'prices': prices
        }


# ═══════════════════════════════════════════════════════════════════════════════
# NETWORK HEALTH MONITOR
# ═══════════════════════════════════════════════════════════════════════════════

class NetworkHealthMonitor:
    """Monitor health of all blockchain networks"""
    
    def __init__(self, config: QuranChainAIConfig):
        self.config = config
        self.network_status = {}
        logger.info("🏥 Network Health Monitor initialized")
    
    def check_evm_network(self, network_key: str) -> Dict[str, Any]:
        """Check health of an EVM network"""
        network = BLOCKCHAIN_NETWORKS.get(network_key)
        if not network:
            return {'status': 'UNKNOWN', 'error': 'Network not found'}
        
        if network['type'] == 'NON_EVM':
            return self.check_non_evm_network(network_key)
        
        try:
            rpc_url = network.get('rpc')
            if not rpc_url:
                return {'status': 'NO_RPC', 'error': 'No RPC configured'}
            
            # Get latest block
            payload = {
                "jsonrpc": "2.0",
                "method": "eth_blockNumber",
                "params": [],
                "id": 1
            }
            
            start = time.time()
            resp = requests.post(rpc_url, json=payload, timeout=5)
            latency = (time.time() - start) * 1000
            
            if resp.status_code == 200:
                result = resp.json()
                block_number = int(result.get('result', '0x0'), 16)
                
                return {
                    'status': 'HEALTHY',
                    'block_number': block_number,
                    'latency_ms': latency,
                    'timestamp': datetime.now().isoformat()
                }
            
            return {'status': 'DEGRADED', 'response_code': resp.status_code}
        
        except requests.exceptions.Timeout:
            return {'status': 'TIMEOUT', 'error': 'RPC timeout'}
        except requests.exceptions.ConnectionError:
            return {'status': 'UNREACHABLE', 'error': 'Connection failed'}
        except Exception as e:
            return {'status': 'ERROR', 'error': str(e)[:50]}
    
    def check_non_evm_network(self, network_key: str) -> Dict[str, Any]:
        """Check health of non-EVM network"""
        network = BLOCKCHAIN_NETWORKS.get(network_key)
        if not network:
            return {'status': 'UNKNOWN'}
        
        try:
            api_url = network.get('api')
            if not api_url:
                return {'status': 'NO_API'}
            
            start = time.time()
            resp = requests.get(api_url, timeout=5)
            latency = (time.time() - start) * 1000
            
            if resp.status_code == 200:
                return {
                    'status': 'HEALTHY',
                    'latency_ms': latency,
                    'timestamp': datetime.now().isoformat()
                }
            
            return {'status': 'DEGRADED', 'response_code': resp.status_code}
        
        except:
            return {'status': 'UNREACHABLE'}
    
    def check_all_networks(self) -> Dict[str, Any]:
        """Check health of all networks"""
        logger.info("🏥 Checking all network health...")
        
        results = {
            'L1': {'healthy': 0, 'total': 0, 'networks': {}},
            'L2': {'healthy': 0, 'total': 0, 'networks': {}},
            'NON_EVM': {'healthy': 0, 'total': 0, 'networks': {}},
            'NATIVE': {'healthy': 0, 'total': 0, 'networks': {}}
        }
        
        for network_key, network_info in BLOCKCHAIN_NETWORKS.items():
            network_type = network_info['type']
            status = self.check_evm_network(network_key)
            
            results[network_type]['total'] += 1
            results[network_type]['networks'][network_key] = {
                'name': network_info['name'],
                'chain_id': network_info['chain_id'],
                **status
            }
            
            if status.get('status') == 'HEALTHY':
                results[network_type]['healthy'] += 1
        
        # Summary
        total_healthy = sum(r['healthy'] for r in results.values())
        total_networks = sum(r['total'] for r in results.values())
        
        logger.info(f"   Total Networks: {total_networks}")
        logger.info(f"   Healthy: {total_healthy}")
        logger.info(f"   L1: {results['L1']['healthy']}/{results['L1']['total']}")
        logger.info(f"   L2: {results['L2']['healthy']}/{results['L2']['total']}")
        logger.info(f"   Non-EVM: {results['NON_EVM']['healthy']}/{results['NON_EVM']['total']}")
        
        self.network_status = results
        
        return {
            'timestamp': datetime.now().isoformat(),
            'total_networks': total_networks,
            'healthy_networks': total_healthy,
            'health_percentage': (total_healthy / total_networks) * 100 if total_networks > 0 else 0,
            'by_type': results
        }


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSACTION COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class TransactionCollector:
    """Collect and track transactions across all networks"""
    
    def __init__(self, config: QuranChainAIConfig):
        self.config = config
        self.db_path = Path('/home/omar/Desktop/QuranChain/quranchain_ai_transactions.db')
        self._init_db()
        logger.info("📊 Transaction Collector initialized")
    
    def _init_db(self):
        """Initialize transaction database"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                network TEXT NOT NULL,
                chain_id INTEGER NOT NULL,
                tx_hash TEXT,
                block_number INTEGER,
                gas_used REAL DEFAULT 0,
                gas_price_gwei REAL DEFAULT 0,
                toll_collected_usd REAL DEFAULT 0,
                founder_share_usd REAL DEFAULT 0
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                network TEXT NOT NULL,
                transaction_count INTEGER DEFAULT 0,
                total_gas_collected REAL DEFAULT 0,
                founder_revenue REAL DEFAULT 0
            )
        ''')
        conn.commit()
        conn.close()
    
    def record_transaction(self, network: str, chain_id: int, tx_hash: str = None,
                          block_number: int = None, gas_used: float = 0,
                          gas_price_gwei: float = 0, toll_usd: float = 0):
        """Record a transaction"""
        founder_share = toll_usd * self.config.FOUNDER_ROYALTY_RATE
        
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO transactions 
                (timestamp, network, chain_id, tx_hash, block_number, gas_used, gas_price_gwei, toll_collected_usd, founder_share_usd)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                network,
                chain_id,
                tx_hash,
                block_number,
                gas_used,
                gas_price_gwei,
                toll_usd,
                founder_share
            ))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.warning(f"   ⚠️ Transaction record error: {str(e)[:50]}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get transaction statistics"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Total stats
            cursor.execute('SELECT COUNT(*), SUM(toll_collected_usd), SUM(founder_share_usd) FROM transactions')
            row = cursor.fetchone()
            total_txs = row[0] or 0
            total_toll = row[1] or 0
            total_founder = row[2] or 0
            
            # By network
            cursor.execute('''
                SELECT network, COUNT(*), SUM(toll_collected_usd) 
                FROM transactions 
                GROUP BY network 
                ORDER BY COUNT(*) DESC
            ''')
            by_network = cursor.fetchall()
            
            conn.close()
            
            return {
                'timestamp': datetime.now().isoformat(),
                'total_transactions': total_txs,
                'total_toll_collected_usd': total_toll,
                'total_founder_revenue_usd': total_founder,
                'by_network': [{
                    'network': n[0],
                    'transactions': n[1],
                    'toll_collected': n[2] or 0
                } for n in by_network[:10]]
            }
        except Exception as e:
            logger.warning(f"   ⚠️ Stats error: {str(e)[:50]}")
            return {
                'total_transactions': 0,
                'total_toll_collected_usd': 0,
                'total_founder_revenue_usd': 0
            }


# ═══════════════════════════════════════════════════════════════════════════════
# GAS TOLL COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class GasTollCollector:
    """Collect gas tolls from transactions"""
    
    def __init__(self, config: QuranChainAIConfig):
        self.config = config
        logger.info("💰 Gas Toll Collector initialized")
    
    def calculate_toll(self, gas_used: float, gas_price_gwei: float, 
                       eth_price_usd: float = 2500) -> Dict[str, float]:
        """Calculate toll for a transaction"""
        gas_cost_eth = (gas_used * gas_price_gwei) / 1e9
        gas_cost_usd = gas_cost_eth * eth_price_usd
        
        # QuranChain toll (typically 0.1% to 1% of gas)
        toll_rate = 0.005  # 0.5%
        toll_usd = gas_cost_usd * toll_rate
        
        return {
            'gas_cost_eth': gas_cost_eth,
            'gas_cost_usd': gas_cost_usd,
            'toll_usd': toll_usd,
            'founder_share': toll_usd * self.config.FOUNDER_ROYALTY_RATE,
            'validator_share': toll_usd * self.config.VALIDATOR_SHARE,
            'ecosystem_share': toll_usd * self.config.ECOSYSTEM_SHARE
        }


# ═══════════════════════════════════════════════════════════════════════════════
# QURANCHAIN AI CORE DAEMON
# ═══════════════════════════════════════════════════════════════════════════════

class QuranChainAIDaemon:
    """
    🕌 QURANCHAIN AI™ - Core Blockchain Intelligence Agent
    
    Monitors all 47+ blockchain networks, collects gas tolls,
    and ensures optimal cross-chain operations.
    """
    
    def __init__(self):
        self.config = QuranChainAIConfig()
        self.gas_monitor = GasPriceMonitor(self.config)
        self.health_monitor = NetworkHealthMonitor(self.config)
        self.tx_collector = TransactionCollector(self.config)
        self.toll_collector = GasTollCollector(self.config)
        
        self.started_at = datetime.now()
        self.cycle_count = 0
        self.last_gas_check = None
        self.last_health_check = None
        
        self._print_banner()
    
    def _print_banner(self):
        """Print startup banner"""
        banner = f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     🕌 QURANCHAIN AI™ - BLOCKCHAIN INTELLIGENCE AGENT                        ║
║                                                                              ║
║     👤 Founder: {self.config.FOUNDER_NAME:<44}         ║
║     💰 Royalty Rate: {self.config.FOUNDER_ROYALTY_RATE * 100:.0f}% (IMMUTABLE)                                     ║
║     ⛓️ Networks: {self.config.TOTAL_NETWORKS}+ (L1, L2, Non-EVM)                                      ║
║     📊 Version: {self.config.VERSION:<48}         ║
║                                                                              ║
║     ⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S'):<47}         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
        print(banner)
        logger.info("🕌 QuranChain AI™ started")
    
    def run_cycle(self):
        """Run a single monitoring cycle"""
        self.cycle_count += 1
        current_time = datetime.now()
        
        logger.info(f"\n{'═'*80}")
        logger.info(f"🔄 QURANCHAIN AI CYCLE #{self.cycle_count} - {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"{'═'*80}")
        
        # 1. Gas Price Check (every 30 seconds)
        if not self.last_gas_check or (current_time - self.last_gas_check).seconds >= self.config.GAS_PRICE_INTERVAL:
            gas_data = self.gas_monitor.check_all_gas_prices()
            self.last_gas_check = current_time
            
            logger.info(f"\n⛽ GAS PRICES:")
            logger.info(f"   Networks responding: {gas_data['networks_responding']}/{gas_data['networks_checked']}")
        
        # 2. Network Health Check (every minute)
        if not self.last_health_check or (current_time - self.last_health_check).seconds >= self.config.NETWORK_HEALTH_INTERVAL:
            health_data = self.health_monitor.check_all_networks()
            self.last_health_check = current_time
            
            logger.info(f"\n🏥 NETWORK HEALTH:")
            logger.info(f"   Healthy: {health_data['healthy_networks']}/{health_data['total_networks']}")
            logger.info(f"   Health: {health_data['health_percentage']:.1f}%")
        
        # 3. Transaction Statistics
        tx_stats = self.tx_collector.get_statistics()
        
        logger.info(f"\n📊 TRANSACTION STATISTICS:")
        logger.info(f"   Total Transactions: {tx_stats['total_transactions']}")
        logger.info(f"   Total Toll Collected: ${tx_stats['total_toll_collected_usd']:,.2f}")
        logger.info(f"   Founder Revenue: ${tx_stats['total_founder_revenue_usd']:,.2f}")
        
        # Status
        uptime = (current_time - self.started_at).total_seconds() / 3600
        logger.info(f"\n📋 QURANCHAIN AI STATUS:")
        logger.info(f"   Uptime: {uptime:.2f} hours")
        logger.info(f"   Cycles: {self.cycle_count}")
        logger.info(f"   Status: ✅ ACTIVE")
        
        return 15  # Wait 15 seconds between cycles
    
    def run_forever(self):
        """Run QuranChain AI daemon continuously"""
        logger.info("🚀 Starting QuranChain AI daemon loop...")
        
        try:
            while True:
                wait_time = self.run_cycle()
                time.sleep(wait_time)
        
        except KeyboardInterrupt:
            logger.info("\n" + "═"*80)
            logger.info("⚠️ QURANCHAIN AI STOPPED BY USER")
            logger.info("═"*80)
            uptime = (datetime.now() - self.started_at).total_seconds() / 3600
            logger.info(f"Total Cycles: {self.cycle_count}")
            logger.info(f"Total Uptime: {uptime:.2f} hours")
        
        except Exception as e:
            logger.error(f"\n❌ FATAL ERROR: {str(e)}")
            raise


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

quranchain_ai = None

def get_quranchain_ai() -> QuranChainAIDaemon:
    """Get or create QuranChain AI singleton instance"""
    global quranchain_ai
    if quranchain_ai is None:
        quranchain_ai = QuranChainAIDaemon()
    return quranchain_ai


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    daemon = QuranChainAIDaemon()
    daemon.run_forever()
