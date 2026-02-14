#!/usr/bin/env python3
"""
Real Blockchain Readers
Read-only access to Bitcoin and EVM chains for actual transaction tracking
© QuranChain™ | Omar Mohammad Abunadi™
"""

import os
import json
import requests
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from decimal import Decimal

# REQUIRED ENV VARS
ETH_RPC_URL = os.getenv("ETH_RPC_URL")  # e.g., https://eth-mainnet.g.alchemy.com/v2/KEY
POLYGON_RPC_URL = os.getenv("POLYGON_RPC_URL")
ARBITRUM_RPC_URL = os.getenv("ARBITRUM_RPC_URL")
OPTIMISM_RPC_URL = os.getenv("OPTIMISM_RPC_URL")
BTC_DATA_PROVIDER = os.getenv("BTC_DATA_PROVIDER", "https://blockstream.info/api")
FX_USD_PRICER = os.getenv("FX_USD_PRICER", "https://api.coingecko.com/api/v3")

# Wallet addresses (from continuous_monitoring_dashboard.py WALLETS dict)
WALLETS = {
    "bitcoin": os.getenv("BTC_WALLET", "3NaWi32bU27P6Dbo6FQTauyBWghmEnApix"),
    "ethereum": os.getenv("ETH_WALLET", "0x4e90944C093f7727ff89a30AF96A556deB95cCB8"),
}

# ERC20 token contracts (USDC, USDT on different chains)
TOKEN_CONTRACTS = json.loads(os.getenv("TOKEN_CONTRACTS_JSON", json.dumps({
    "ethereum": {
        "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    },
    "polygon": {
        "USDC": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    }
})))

# Price cache (60 second TTL)
_price_cache = {}
_cache_ttl = 60


class BlockchainReader:
    """Base class for blockchain readers"""
    
    def get_usd_price(self, asset: str) -> float:
        """
        Get current USD price for asset from real API
        Uses cache to avoid rate limits
        """
        now = time.time()
        cache_key = asset.lower()
        
        if cache_key in _price_cache:
            price, timestamp = _price_cache[cache_key]
            if now - timestamp < _cache_ttl:
                return price
        
        # Stablecoins
        if asset.upper() in ["USDC", "USDT", "DAI", "BUSD"]:
            price = 1.00
            _price_cache[cache_key] = (price, now)
            return price
        
        # Fetch from API
        try:
            # CoinGecko API (free tier, rate limited)
            coin_id_map = {
                "BTC": "bitcoin",
                "ETH": "ethereum",
                "MATIC": "matic-network",
                "SOL": "solana",
                "AVAX": "avalanche-2"
            }
            
            coin_id = coin_id_map.get(asset.upper())
            if not coin_id:
                return 0.0
            
            url = f"{FX_USD_PRICER}/simple/price?ids={coin_id}&vs_currencies=usd"
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            
            data = resp.json()
            price = data.get(coin_id, {}).get("usd", 0.0)
            _price_cache[cache_key] = (price, now)
            return price
            
        except Exception as e:
            print(f"⚠️  Price fetch failed for {asset}: {e}")
            # Return last known price if available
            if cache_key in _price_cache:
                return _price_cache[cache_key][0]
            return 0.0


class BitcoinReader(BlockchainReader):
    """Read Bitcoin transactions from block explorer API (NO KEYS)"""
    
    def __init__(self, address: str, api_base: str = BTC_DATA_PROVIDER):
        self.address = address
        self.api_base = api_base.rstrip('/')
        self.last_seen_tx = None
    
    def get_transactions(self, since_txid: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch all transactions for address
        Returns: List of tx dicts with {txid, block_height, value_btc, confirmations, status}
        """
        try:
            # Blockstream API: /api/address/{address}/txs
            url = f"{self.api_base}/address/{self.address}/txs"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            
            txs = resp.json()
            results = []
            
            for tx in txs:
                txid = tx.get('txid')
                
                # Stop if we've seen this before
                if since_txid and txid == since_txid:
                    break
                
                # Calculate value received to our address
                value_btc = 0.0
                for vout in tx.get('vout', []):
                    if vout.get('scriptpubkey_address') == self.address:
                        value_btc += vout.get('value', 0) / 100_000_000  # satoshis to BTC
                
                if value_btc == 0:
                    continue  # Not receiving to our address
                
                block_height = tx.get('status', {}).get('block_height')
                confirmed = tx.get('status', {}).get('confirmed', False)
                
                # Calculate confirmations from block height
                confirmations = 0
                if confirmed and block_height:
                    # Fetch latest block height
                    try:
                        tip_resp = requests.get(f"{self.api_base}/blocks/tip/height", timeout=5)
                        latest_height = int(tip_resp.text)
                        confirmations = latest_height - block_height + 1
                    except:
                        confirmations = 1 if confirmed else 0
                
                results.append({
                    'txid': txid,
                    'block_height': block_height,
                    'value_btc': value_btc,
                    'confirmations': confirmations,
                    'status': 'confirmed' if confirmations >= 3 else 'pending',
                    'timestamp': tx.get('status', {}).get('block_time')
                })
            
            return results
            
        except Exception as e:
            print(f"❌ Bitcoin API error: {e}")
            return []


class EVMReader(BlockchainReader):
    """Read EVM-compatible chains (Ethereum, Polygon, Arbitrum, etc.) - NO KEYS"""
    
    def __init__(self, chain: str, rpc_url: str, address: str):
        self.chain = chain
        self.rpc_url = rpc_url
        self.address = address.lower()
        self.request_id = 0
    
    def _rpc_call(self, method: str, params: List[Any]) -> Any:
        """Make JSON-RPC call to node"""
        self.request_id += 1
        payload = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params
        }
        
        resp = requests.post(self.rpc_url, json=payload, timeout=10)
        resp.raise_for_status()
        
        data = resp.json()
        if 'error' in data:
            raise Exception(f"RPC error: {data['error']}")
        
        return data.get('result')
    
    def get_native_transfers(self, from_block: int = 0, to_block: str = "latest") -> List[Dict[str, Any]]:
        """
        Get native token transfers (ETH, MATIC, etc.) TO our address
        Note: This requires scanning blocks or using a block explorer API
        For production, recommend using Etherscan/Polygonscan API
        """
        # This is complex without an indexer - recommend using Etherscan API for production
        # For now, return empty (implement with Etherscan API key if available)
        print(f"⚠️  Native transfers require block explorer API (not implemented with RPC only)")
        return []
    
    def get_erc20_transfers(self, token_contract: str, from_block: int = 0, 
                           to_block: str = "latest") -> List[Dict[str, Any]]:
        """
        Get ERC20 token transfers TO our address using eth_getLogs
        """
        try:
            # ERC20 Transfer event signature: Transfer(address,address,uint256)
            transfer_topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
            
            # Filter for transfers TO our address (topic2 = recipient)
            address_topic = "0x" + "0" * 24 + self.address[2:]  # Pad address to 32 bytes
            
            logs = self._rpc_call("eth_getLogs", [{
                "fromBlock": hex(from_block),
                "toBlock": to_block,
                "address": token_contract,
                "topics": [transfer_topic, None, address_topic]
            }])
            
            results = []
            for log in logs:
                tx_hash = log.get('transactionHash')
                block_num = int(log.get('blockNumber'), 16)
                
                # Decode value from data field (uint256)
                data = log.get('data', '0x0')
                value_wei = int(data, 16)
                
                # Most ERC20s use 6 decimals (USDC/USDT) or 18 decimals (others)
                # For USDC/USDT: divide by 10^6
                value = value_wei / 1_000_000  # Assuming 6 decimals for stablecoins
                
                results.append({
                    'txid': tx_hash,
                    'block_height': block_num,
                    'value': value,
                    'token_contract': token_contract,
                    'status': 'pending'  # Will update confirmations separately
                })
            
            return results
            
        except Exception as e:
            print(f"❌ ERC20 transfer fetch error: {e}")
            return []
    
    def get_confirmations(self, block_number: int) -> int:
        """Calculate number of confirmations for a block"""
        try:
            latest = self._rpc_call("eth_blockNumber", [])
            latest_num = int(latest, 16)
            return latest_num - block_number + 1
        except:
            return 0


def check_real_transactions() -> List[Dict[str, Any]]:
    """
    Check all configured wallets for REAL incoming transactions
    Returns: List of new transaction events
    """
    new_transactions = []
    
    # Bitcoin
    if WALLETS.get("bitcoin"):
        try:
            btc_reader = BitcoinReader(WALLETS["bitcoin"])
            btc_txs = btc_reader.get_transactions()
            
            for tx in btc_txs:
                btc_price = btc_reader.get_usd_price("BTC")
                
                new_transactions.append({
                    'source': 'bitcoin_onchain',
                    'chain': 'btc',
                    'asset': 'BTC',
                    'amount': tx['value_btc'],
                    'amount_usd': tx['value_btc'] * btc_price,
                    'from_addr': None,
                    'to_addr': WALLETS["bitcoin"],
                    'txid': tx['txid'],
                    'block_height': tx['block_height'],
                    'confirmations': tx['confirmations'],
                    'status': tx['status'],
                    'price_source': 'coingecko',
                    'metadata': json.dumps({'timestamp': tx.get('timestamp')})
                })
        except Exception as e:
            print(f"❌ Bitcoin check failed: {e}")
    
    # Ethereum + tokens
    if ETH_RPC_URL and WALLETS.get("ethereum"):
        try:
            eth_reader = EVMReader("ethereum", ETH_RPC_URL, WALLETS["ethereum"])
            
            # Check USDC
            if "ethereum" in TOKEN_CONTRACTS and "USDC" in TOKEN_CONTRACTS["ethereum"]:
                usdc_contract = TOKEN_CONTRACTS["ethereum"]["USDC"]
                usdc_txs = eth_reader.get_erc20_transfers(usdc_contract)
                
                for tx in usdc_txs:
                    confirmations = eth_reader.get_confirmations(tx['block_height'])
                    status = 'confirmed' if confirmations >= 12 else 'pending'
                    
                    new_transactions.append({
                        'source': 'ethereum_onchain',
                        'chain': 'eth',
                        'asset': 'USDC',
                        'amount': tx['value'],
                        'amount_usd': tx['value'],  # USDC = $1
                        'from_addr': None,
                        'to_addr': WALLETS["ethereum"],
                        'txid': tx['txid'],
                        'block_height': tx['block_height'],
                        'confirmations': confirmations,
                        'status': status,
                        'price_source': 'stable_peg',
                        'metadata': json.dumps({'contract': usdc_contract})
                    })
            
            # Check USDT (similar pattern)
            # ... repeat for USDT and other tokens
            
        except Exception as e:
            print(f"❌ Ethereum check failed: {e}")
    
    return new_transactions


if __name__ == "__main__":
    print("🔍 Real Blockchain Transaction Reader")
    print("="*80)
    print(f"BTC Address: {WALLETS.get('bitcoin', 'NOT CONFIGURED')}")
    print(f"ETH Address: {WALLETS.get('ethereum', 'NOT CONFIGURED')}")
    print(f"BTC API: {BTC_DATA_PROVIDER}")
    print(f"ETH RPC: {'CONFIGURED' if ETH_RPC_URL else 'MISSING'}")
    print("="*80)
    
    # Test transaction check
    print("\n📊 Checking for real transactions...")
    txs = check_real_transactions()
    print(f"Found {len(txs)} new transactions")
    
    for tx in txs[:5]:  # Show first 5
        print(f"\n  {tx['asset']} on {tx['chain']}:")
        print(f"    Amount: {tx['amount']:.6f} ({tx['amount_usd']:.2f} USD)")
        print(f"    TX: {tx['txid'][:16]}...")
        print(f"    Status: {tx['status']} ({tx['confirmations']} confirmations)")
