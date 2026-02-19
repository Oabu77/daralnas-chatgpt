#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
Kraken Automated Crypto-to-USD Cashout
Automatically sell crypto and withdraw USD to bank
© QuranChain™ | Omar Mohammad Abunadi™
"""

import os
import time
import json
import logging
import hmac
import hashlib
import base64
import urllib.parse
import requests
from datetime import datetime
from typing import Dict, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('KrakenAutoCashout')

# Kraken API Configuration
KRAKEN_API_KEY = 'KmQ13F3JGTj+Zzv+qBFmYPVCkI+RzenYh3P9XjfuQJKeL3kwZb4OqtKx'
KRAKEN_API_SECRET = '3R+fRhuHeHsRMGu8PBOmj88JPQ/2V9D70hYuILUnsdbiXhT1raZEu09XCMJ6/aZ4WlJvK8lLkBUz7fCEtV6YVA=='

# Founder wallet (Kraken Ethereum deposit address)
FOUNDER_WALLET = '0x4e90944C093f7727ff89a30AF96A556deB95cCB8'

class KrakenAutoSeller:
    """Automated Crypto Selling via Kraken API"""
    
    def __init__(self, api_key: str = None, api_secret: str = None):
        self.api_key = api_key or KRAKEN_API_KEY
        self.api_secret = api_secret or KRAKEN_API_SECRET
        self.base_url = 'https://api.kraken.com'
        
        logger.info("🔑 Kraken Auto-Seller initialized")
        logger.info(f"   API Secret configured: {'✅' if self.api_secret else '❌'}")
        logger.info(f"   API Key configured: {'✅' if self.api_key else '⚠️  NEEDED'}")
    
    def _sign_request(self, url_path: str, data: dict) -> str:
        """Generate Kraken API signature"""
        postdata = urllib.parse.urlencode(data)
        encoded = (str(data['nonce']) + postdata).encode()
        message = url_path.encode() + hashlib.sha256(encoded).digest()
        signature = hmac.new(base64.b64decode(self.api_secret), message, hashlib.sha512)
        return base64.b64encode(signature.digest()).decode()
    
    def _api_request(self, endpoint: str, data: dict = None, private: bool = True) -> dict:
        """Make Kraken API request"""
        if private:
            if not self.api_key or not self.api_secret:
                return {"error": ["API credentials not fully configured. Need both API Key and Secret."]}
            
            url_path = f'/0/private/{endpoint}'
            url = self.base_url + url_path
            
            if data is None:
                data = {}
            data['nonce'] = str(int(time.time() * 1000))
            
            headers = {
                'API-Key': self.api_key,
                'API-Sign': self._sign_request(url_path, data)
            }
            
            try:
                resp = requests.post(url, headers=headers, data=data, timeout=10)
                result = resp.json()
                if result.get('error') and result['error']:
                    logger.error(f"Kraken API error: {result['error']}")
                return result
            except Exception as e:
                logger.error(f"Kraken request failed: {e}")
                return {"error": [str(e)]}
        else:
            # Public endpoint
            url = f"{self.base_url}/0/public/{endpoint}"
            try:
                resp = requests.get(url, params=data, timeout=10)
                return resp.json()
            except Exception as e:
                logger.error(f"Kraken public request failed: {e}")
                return {"error": [str(e)]}
    
    def get_ticker(self, pair: str = 'XETHZUSD') -> dict:
        """Get current price (public endpoint, no auth needed)"""
        return self._api_request('Ticker', {'pair': pair}, private=False)
    
    def get_supported_pairs(self) -> dict:
        """Get all supported trading pairs from Kraken"""
        return self._api_request('AssetPairs', private=False)
    
    def get_asset_info(self) -> dict:
        """Get information about all assets on Kraken"""
        return self._api_request('Assets', private=False)
    
    def get_balance(self) -> dict:
        """Get Kraken account balances"""
        result = self._api_request('Balance')
        
        if 'result' in result and not result.get('error'):
            logger.info("✅ Kraken balance retrieved")
            for currency, amount in result['result'].items():
                if float(amount) > 0:
                    logger.info(f"   {currency}: {amount}")
        
        return result
    
    def sell_crypto_to_usd(self, crypto: str, amount: float) -> dict:
        """
        Sell crypto for USD on Kraken
        crypto: 'BTC', 'ETH', 'USDC', etc.
        Returns order details
        """
        # Kraken trading pairs (exact names) - COMPLETE LIST
        pairs = {
            # Major Cryptocurrencies
            'BTC': 'XXBTZUSD',
            'ETH': 'XETHZUSD',
            'USDC': 'USDCUSD',
            'USDT': 'USDTZUSD',
            
            # Top Altcoins
            'XRP': 'XXRPZUSD',
            'ADA': 'ADAUSD',
            'SOL': 'SOLUSD',
            'DOT': 'DOTUSD',
            'MATIC': 'MATICUSD',
            'AVAX': 'AVAXUSD',
            'LINK': 'LINKUSD',
            'UNI': 'UNIUSD',
            'AAVE': 'AAVEUSD',
            'ALGO': 'ALGOUSD',
            'ATOM': 'ATOMUSD',
            
            # Legacy Coins
            'BCH': 'BCHUSD',
            'LTC': 'LTCUSD',
            'EOS': 'EOSUSD',
            'XLM': 'XXLMZUSD',
            'TRX': 'TRXUSD',
            'XTZ': 'XTZUSD',
            'ETC': 'XETCZUSD',
            'DASH': 'DASHUSD',
            'ZEC': 'XZECZUSD',
            
            # DeFi Tokens
            'COMP': 'COMPUSD',
            'MKR': 'MKRUSD',
            'SNX': 'SNXUSD',
            'YFI': 'YFIUSD',
            'CRV': 'CRVUSD',
            'BAL': 'BALUSD',
            'SUSHI': 'SUSHIUSD',
            '1INCH': '1INCHUSD',
            
            # Layer 2 & Scaling
            'ARB': 'ARBUSD',
            'OP': 'OPUSD',
            'IMX': 'IMXUSD',
            'LRC': 'LRCUSD',
            
            # Meme & Community
            'DOGE': 'XDGUSD',
            'SHIB': 'SHIBUSD',
            'PEPE': 'PEPEUSD',
            'FLOKI': 'FLOKIUSD',
            
            # Stablecoins
            'DAI': 'DAIUSD',
            'TUSD': 'TUSDUSD',
            'USDD': 'USDDUSD',
            'GUSD': 'USDGUSD',
            
            # Privacy Coins
            'XMR': 'XXMRZUSD',
            
            # Gaming & Metaverse
            'MANA': 'MANAUSD',
            'SAND': 'SANDUSD',
            'AXS': 'AXSUSD',
            'ENJ': 'ENJUSD',
            'GALA': 'GALAUSD',
            
            # Infrastructure
            'FIL': 'FILUSD',
            'GRT': 'GRTUSD',
            'RNDR': 'RNDRUSD',
            'AR': 'ARUSD',
            
            # Exchange Tokens
            'FTT': 'FTTUSD',
            'CRO': 'CROUSD',
            
            # Additional Top 100
            'NEAR': 'NEARUSD',
            'APT': 'APTUSD',
            'SUI': 'SUIUSD',
            'SEI': 'SEIUSD',
            'INJ': 'INJUSD',
            'RUNE': 'RUNEUSD',
            'FLOW': 'FLOWUSD',
            'ICP': 'ICPUSD',
            'FTM': 'FTMUSD',
            'HBAR': 'HBARUSD',
            'VET': 'VETUSD',
            'THETA': 'THETAUSD',
            'EGLD': 'EGLDUSD',
            'AXL': 'AXLUSD',
            'KSM': 'KSMUSD',
            'WAVES': 'WAVESUSD',
            'KAVA': 'KAVAUSD',
            'QTUM': 'QTUMUSD',
            'ZIL': 'ZILUSD',
            'BAT': 'BATUSD',
            'ZRX': 'ZRXUSD',
            'OMG': 'OMGUSD',
            'ICX': 'ICXUSD',
            'SC': 'SCUSD',
            'LSK': 'LSKUSD',
            'MINA': 'MINAUSD',
            'CHZ': 'CHZUSD',
            'ENS': 'ENSUSD',
            'LDO': 'LDOUSD',
            'APE': 'APEUSD',
            'BLUR': 'BLURUSD',
            'BONK': 'BONKUSD',
            'TIA': 'TIAUSD',
            'PYTH': 'PYTHUSD',
            'JUP': 'JUPUSD',
            'WLD': 'WLDUSD',
            'STRK': 'STRKUSD',
            'PENDLE': 'PENDLEUSD',
            'WIF': 'WIFUSD',
        }
        
        if crypto not in pairs:
            return {"error": [f"Unsupported crypto: {crypto}"], "success": False}
        
        # Check current price first
        ticker = self.get_ticker(pairs[crypto])
        if 'result' in ticker and not ticker.get('error'):
            current_price = float(list(ticker['result'].values())[0]['c'][0])
            usd_value = amount * current_price
            logger.info(f"💰 Selling {amount} {crypto} @ ${current_price:,.2f} = ${usd_value:,.2f}")
        
        order_data = {
            'pair': pairs[crypto],
            'type': 'sell',
            'ordertype': 'market',
            'volume': str(amount)
        }
        
        result = self._api_request('AddOrder', order_data)
        
        if 'result' in result and not result.get('error'):
            logger.info(f"✅ Sold {amount} {crypto} to USD on Kraken")
            return {
                "success": True,
                "order_id": result['result'].get('txid', [None])[0],
                "description": result['result'].get('descr', {}),
                "crypto": crypto,
                "amount": amount,
                "usd_value": usd_value if 'usd_value' in locals() else 0
            }
        else:
            logger.error(f"❌ Failed to sell {crypto}: {result.get('error')}")
            return {"success": False, "error": result.get('error')}
    
    def withdraw_usd(self, amount: float, bank_account: str = "Chase") -> dict:
        """
        Withdraw USD to bank account
        Note: Bank account must be pre-configured in Kraken settings
        """
        withdraw_data = {
            'asset': 'USD',
            'key': bank_account,  # Withdrawal key name from Kraken settings
            'amount': str(amount)
        }
        
        result = self._api_request('Withdraw', withdraw_data)
        
        if 'result' in result and not result.get('error'):
            logger.info(f"✅ Withdrew ${amount:,.2f} USD to {bank_account}")
            return {
                "success": True, 
                "withdrawal_id": result['result'].get('refid'),
                "amount": amount,
                "bank": bank_account
            }
        else:
            logger.error(f"❌ Withdrawal failed: {result.get('error')}")
            return {"success": False, "error": result.get('error')}
    
    def auto_cashout_flow(self, crypto: str, amount: float, withdraw: bool = False) -> dict:
        """
        Complete auto-cashout flow:
        1. Sell crypto to USD
        2. (Optional) Withdraw USD to bank
        """
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "crypto": crypto,
            "amount": amount,
            "steps": []
        }
        
        # Step 1: Sell crypto
        logger.info(f"\n{'='*60}")
        logger.info(f"🔄 AUTO-CASHOUT: {amount} {crypto} → USD")
        logger.info(f"{'='*60}\n")
        
        sell_result = self.sell_crypto_to_usd(crypto, amount)
        results['steps'].append({
            "step": "sell_crypto",
            "result": sell_result
        })
        
        if not sell_result.get('success'):
            logger.error("❌ Cashout failed at sell step")
            results['success'] = False
            return results
        
        usd_amount = sell_result.get('usd_value', 0)
        
        # Step 2: Withdraw (if requested)
        if withdraw and usd_amount > 0:
            logger.info(f"\n💸 Withdrawing ${usd_amount:,.2f} to bank...")
            withdraw_result = self.withdraw_usd(usd_amount)
            results['steps'].append({
                "step": "withdraw_usd",
                "result": withdraw_result
            })
            
            if withdraw_result.get('success'):
                logger.info("✅ Complete cashout successful!")
                results['success'] = True
            else:
                logger.warning("⚠️  Sold to USD but withdrawal failed")
                results['success'] = False
        else:
            logger.info(f"✅ Crypto sold to USD (${usd_amount:,.2f} now in Kraken)")
            results['success'] = True
        
        logger.info(f"\n{'='*60}\n")
        return results


def test_kraken_connection():
    """Test Kraken API connection"""
    print("\n" + "="*70)
    print("🔌 TESTING KRAKEN API CONNECTION")
    print("="*70 + "\n")
    
    seller = KrakenAutoSeller()
    
    # Test 1: Public endpoint (no auth)
    print("📊 Test 1: Get crypto prices (public)")
    test_pairs = [
        ('XETHZUSD', 'ETH'),
        ('XXBTZUSD', 'BTC'),
        ('SOLUSD', 'SOL'),
        ('ADAUSD', 'ADA'),
        ('MATICUSD', 'MATIC')
    ]
    
    for pair, name in test_pairs:
        ticker = seller.get_ticker(pair)
        if 'result' in ticker and not ticker.get('error'):
            price = float(list(ticker['result'].values())[0]['c'][0])
            print(f"   ✅ {name:6s} Price: ${price:,.2f}")
        else:
            print(f"   ⚠️  {name:6s} Failed: {ticker.get('error')}")
    print()
    print("📊 Test 1: Get ETH price (public)")
    ticker = seller.get_ticker('XETHZUSD')
    if 'result' in ticker and not ticker.get('error'):
        eth_price = float(list(ticker['result'].values())[0]['c'][0])
        print(f"   ✅ ETH Price: ${eth_price:,.2f}\n")
    else:
        print(f"   ❌ Failed: {ticker.get('error')}\n")
    
    # Test 2: Get balance (requires auth)
    print("💰 Test 2: Get account balance (requires API key)")
    balance = seller.get_balance()
    if 'result' in balance and not balance.get('error'):
        print("   ✅ Balance retrieved successfully")
        if balance['result']:
            for curr, amt in balance['result'].items():
                if float(amt) > 0:
                    print(f"      {curr}: {amt}")
        else:
            print("      (empty balance)")
    else:
        print(f"   ⚠️  {balance.get('error')}")
        print("   → Need to provide KRAKEN_API_KEY (public key)")
        print("   → Currently only have API Secret configured")
    
    print("\n" + "="*70)
    print("ℹ️  NEXT STEPS")
    print("="*70)
    print("\n1. Provide your Kraken API Key (public key)")
    print("2. Ensure API permissions include: 'Query Funds', 'Create & Modify Orders', 'Withdraw Funds'")
    print("3. Add bank account in Kraken settings for USD withdrawals")
    print("\n© QuranChain™ | Omar Mohammad Abunadi™\n")


if __name__ == '__main__':
    # Run test
    test_kraken_connection()
    
    # Example usage (once API key is provided):
    # seller = KrakenAutoSeller()
    # seller.auto_cashout_flow('ETH', 0.1, withdraw=True)
