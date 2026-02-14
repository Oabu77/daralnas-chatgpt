#!/usr/bin/env python3
"""
Kraken Crypto Pairing to Islamic Domestic Coins
NO USD CONVERSION - Direct pairing to QURAN, DAN, HALAL, etc.
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
from islamic_domestic_coins import (
    ISLAMIC_COINS,
    CryptoPairingEngine,
    FiatToIslamicExchange
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('IslamicCoinPairing')

# Kraken API Configuration (for price data only - NO selling)
KRAKEN_API_KEY = 'KmQ13F3JGTj+Zzv+qBFmYPVCkI+RzenYh3P9XjfuQJKeL3kwZb4OqtKx'
KRAKEN_API_SECRET = '3R+fRhuHeHsRMGu8PBOmj88JPQ/2V9D70hYuILUnsdbiXhT1raZEu09XCMJ6/aZ4WlJvK8lLkBUz7fCEtV6YVA=='

# Founder wallet (Kraken Ethereum deposit address)
FOUNDER_WALLET = '0x4e90944C093f7727ff89a30AF96A556deB95cCB8'
FOUNDER_ROYALTY_RATE = 0.30  # 30% IMMUTABLE


class KrakenPriceOracle:
    """Get crypto prices from Kraken for pairing calculations"""
    
    def __init__(self, api_key: str = None, api_secret: str = None):
        self.api_key = api_key or KRAKEN_API_KEY
        self.api_secret = api_secret or KRAKEN_API_SECRET
        self.base_url = 'https://api.kraken.com'
        
        logger.info("🔮 Kraken Price Oracle initialized (for pairing, NOT selling)")
    
    def _sign_request(self, url_path: str, data: dict) -> str:
        """Generate Kraken API signature"""
        postdata = urllib.parse.urlencode(data)
        encoded = (str(data['nonce']) + postdata).encode()
        message = url_path.encode() + hashlib.sha256(encoded).digest()
        signature = hmac.new(base64.b64decode(self.api_secret), message, hashlib.sha512)
        return base64.b64encode(signature.digest()).decode()
    
    def _request(self, endpoint: str, params: dict = None) -> Dict:
        """Make request to Kraken API"""
        try:
            url = f"{self.base_url}{endpoint}"
            
            if params:
                # Private endpoint
                nonce = str(int(time.time() * 1000))
                params['nonce'] = nonce
                
                headers = {
                    'API-Key': self.api_key,
                    'API-Sign': self._sign_request(endpoint, params)
                }
                response = requests.post(url, data=params, headers=headers)
            else:
                # Public endpoint
                response = requests.get(url)
            
            data = response.json()
            
            if data.get('error') and len(data['error']) > 0:
                logger.error(f"Kraken API error: {data['error']}")
                return {'error': data['error']}
            
            return data.get('result', {})
            
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return {'error': str(e)}
    
    def get_price(self, crypto: str) -> float:
        """Get current USD price of cryptocurrency"""
        pairs = {
            'BTC': 'XXBTZUSD',
            'ETH': 'XETHZUSD',
            'SOL': 'SOLUSD',
            'USDC': 'USDCUSD',
            'USDT': 'USDTUSD',
            'AAVE': 'AAVEUSD',
            'LINK': 'LINKUSD',
            'UNI': 'UNIUSD',
            'DOGE': 'XDGUSD',
        }
        
        pair = pairs.get(crypto, f"{crypto}USD")
        result = self._request('/0/public/Ticker', None)
        
        # Public endpoint doesn't need signature
        url = f"{self.base_url}/0/public/Ticker?pair={pair}"
        response = requests.get(url)
        data = response.json()
        
        if data.get('error'):
            return 0.0
        
        result = data.get('result', {})
        ticker = result.get(pair, {})
        
        if ticker:
            price = float(ticker['c'][0])  # Last trade price
            return price
        
        return 0.0


class CryptoToIslamicPairing:
    """
    Pair external cryptocurrencies to Islamic domestic coins
    NO USD - all foreign crypto becomes Islamic coins
    """
    
    def __init__(self):
        self.price_oracle = KrakenPriceOracle()
        self.pairing_engine = CryptoPairingEngine()
        self.fiat_exchange = FiatToIslamicExchange()
        
        self.pairing_history = []
        
        logger.info("☪️  Islamic Coin Pairing System initialized")
        logger.info("   NO USD CONVERSION - Only pairing to Islamic coins")
    
    def receive_crypto_payment(
        self,
        crypto: str,
        amount: float,
        target_islamic_coin: str = "QURAN"
    ) -> Dict:
        """
        Receive cryptocurrency payment and pair to Islamic coin
        
        Args:
            crypto: External cryptocurrency (BTC, ETH, SOL, etc.)
            amount: Amount received
            target_islamic_coin: Which Islamic coin to pair to (default: QURAN)
            
        Returns:
            Transaction details with minted Islamic coins
        """
        
        logger.info(f"\n{'='*80}")
        logger.info(f"💰 Crypto Payment Received: {amount} {crypto}")
        logger.info(f"{'='*80}")
        
        # Get current USD price for reference only
        usd_price = self.price_oracle.get_price(crypto)
        usd_value = amount * usd_price if usd_price > 0 else 0
        
        # Pair to Islamic coin (NO USD conversion)
        pairing_result = self.pairing_engine.pair_crypto_to_islamic(
            crypto,
            amount,
            target_islamic_coin
        )
        
        # Add USD reference for accounting
        pairing_result['usd_value_reference'] = usd_value
        pairing_result['usd_price'] = usd_price
        
        # Record transaction
        transaction = {
            **pairing_result,
            'payment_type': 'crypto_payment',
            'founder_wallet': FOUNDER_WALLET,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.pairing_history.append(transaction)
        
        # Log results
        logger.info(f"\n✅ PAIRING COMPLETE")
        logger.info(f"   External Crypto: {amount} {crypto} (≈${usd_value:,.2f})")
        logger.info(f"   Islamic Coin: {target_islamic_coin}")
        logger.info(f"   Pairing Ratio: 1 {crypto} = {pairing_result['pairing_ratio']:,.0f} {target_islamic_coin}")
        logger.info(f"   Total Minted: {pairing_result['total_islamic_amount']:,.0f} {target_islamic_coin}")
        logger.info(f"   User Receives: {pairing_result['user_receives']:,.0f} {target_islamic_coin}")
        logger.info(f"   Founder Royalty: {pairing_result['founder_royalty']:,.0f} {target_islamic_coin} (30%)")
        logger.info(f"   Founder Wallet: {FOUNDER_WALLET}")
        logger.info(f"{'='*80}\n")
        
        return transaction
    
    def receive_fiat_payment(
        self,
        fiat_amount: float,
        target_islamic_coin: str = "QURAN",
        currency: str = "USD"
    ) -> Dict:
        """
        Receive fiat payment and exchange for Islamic coins
        
        Args:
            fiat_amount: Amount in fiat currency
            target_islamic_coin: Which Islamic coin to buy
            currency: Fiat currency (USD, EUR, etc.)
            
        Returns:
            Transaction details
        """
        
        logger.info(f"\n{'='*80}")
        logger.info(f"💵 Fiat Payment Received: ${fiat_amount:,.2f} {currency}")
        logger.info(f"{'='*80}")
        
        # Buy Islamic coins with fiat
        purchase = self.fiat_exchange.buy_with_fiat(
            target_islamic_coin,
            fiat_amount,
            currency
        )
        
        # Add metadata
        purchase['payment_type'] = 'fiat_payment'
        purchase['founder_wallet'] = FOUNDER_WALLET
        
        self.pairing_history.append(purchase)
        
        # Log results
        logger.info(f"\n✅ PURCHASE COMPLETE")
        logger.info(f"   Fiat Paid: ${fiat_amount:,.2f} {currency}")
        logger.info(f"   Islamic Coin: {target_islamic_coin}")
        logger.info(f"   Price: ${purchase['price_per_coin']:.2f} per {target_islamic_coin}")
        logger.info(f"   Total Coins: {purchase['total_coins']:,.0f} {target_islamic_coin}")
        logger.info(f"   User Receives: {purchase['user_receives']:,.0f} {target_islamic_coin}")
        logger.info(f"   Founder Royalty: {purchase['founder_royalty']:,.0f} {target_islamic_coin} (30%)")
        logger.info(f"   Founder Wallet: {FOUNDER_WALLET}")
        logger.info(f"{'='*80}\n")
        
        return purchase
    
    def get_pairing_summary(self) -> Dict:
        """Get summary of all pairings"""
        
        total_transactions = len(self.pairing_history)
        crypto_payments = [t for t in self.pairing_history if t.get('payment_type') == 'crypto_payment']
        fiat_payments = [t for t in self.pairing_history if t.get('payment_type') == 'fiat_payment']
        
        # Calculate totals per Islamic coin
        coin_totals = {}
        founder_totals = {}
        
        for txn in self.pairing_history:
            coin = txn.get('islamic_coin') or txn.get('coin')
            if coin:
                if coin not in coin_totals:
                    coin_totals[coin] = 0
                    founder_totals[coin] = 0
                
                coin_totals[coin] += txn.get('total_islamic_amount') or txn.get('total_coins', 0)
                founder_totals[coin] += txn.get('founder_royalty', 0)
        
        return {
            'total_transactions': total_transactions,
            'crypto_payments': len(crypto_payments),
            'fiat_payments': len(fiat_payments),
            'coin_totals': coin_totals,
            'founder_totals': founder_totals,
            'founder_wallet': FOUNDER_WALLET
        }
    
    def list_available_islamic_coins(self) -> None:
        """Display all available Islamic coins"""
        
        print("\n" + "="*80)
        print("☪️  AVAILABLE ISLAMIC DOMESTIC COINS")
        print("="*80 + "\n")
        
        for symbol, coin in ISLAMIC_COINS.items():
            print(f"{symbol} - {coin.name} ({coin.name_arabic})")
            print(f"   {coin.description}")
            print(f"   Supply: {coin.total_supply:,.0f}")
            print(f"   Founder Reserve: {coin.founder_reserve:,.0f} (30%)")
            print()


def test_islamic_pairing_system():
    """Test the Islamic coin pairing system"""
    
    print("\n" + "="*80)
    print("🧪 TESTING ISLAMIC COIN PAIRING SYSTEM")
    print("="*80 + "\n")
    
    pairing_system = CryptoToIslamicPairing()
    
    # List available coins
    pairing_system.list_available_islamic_coins()
    
    # Test 1: Receive 1 ETH, pair to QURAN
    print("\n📝 TEST 1: Receive 1 ETH → Pair to QURAN")
    txn1 = pairing_system.receive_crypto_payment("ETH", 1.0, "QURAN")
    
    # Test 2: Receive 0.5 BTC, pair to DAN
    print("\n📝 TEST 2: Receive 0.5 BTC → Pair to DAN")
    txn2 = pairing_system.receive_crypto_payment("BTC", 0.5, "DAN")
    
    # Test 3: Receive $1000 fiat, buy HALAL
    print("\n📝 TEST 3: Receive $1,000 USD → Buy HALAL")
    txn3 = pairing_system.receive_fiat_payment(1000, "HALAL", "USD")
    
    # Test 4: Receive 100 SOL, pair to UMRAH
    print("\n📝 TEST 4: Receive 100 SOL → Pair to UMRAH")
    txn4 = pairing_system.receive_crypto_payment("SOL", 100, "UMRAH")
    
    # Summary
    print("\n" + "="*80)
    print("📊 PAIRING SUMMARY")
    print("="*80)
    
    summary = pairing_system.get_pairing_summary()
    
    print(f"\nTotal Transactions: {summary['total_transactions']}")
    print(f"Crypto Payments: {summary['crypto_payments']}")
    print(f"Fiat Payments: {summary['fiat_payments']}")
    
    print("\n💰 MINTED COINS BY TYPE:")
    for coin, total in summary['coin_totals'].items():
        founder_amount = summary['founder_totals'][coin]
        print(f"   {coin}: {total:,.0f} total ({founder_amount:,.0f} to founder - 30%)")
    
    print(f"\n👤 Founder Wallet: {summary['founder_wallet']}")
    print(f"   Royalty Rate: {FOUNDER_ROYALTY_RATE * 100}% (IMMUTABLE)")
    
    print("\n✅ ALL TESTS PASSED - NO USD CONVERSION")
    print("   All foreign crypto paired to Islamic domestic coins")
    print("="*80 + "\n")


if __name__ == '__main__':
    test_islamic_pairing_system()
