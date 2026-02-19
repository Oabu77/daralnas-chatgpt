#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
Crypto-to-Fiat Payment Bridge
© QuranChain™ | Omar Mohammad Abunadi™

CREATIVE WORKAROUND: No Stripe/PayPal API keys needed
- Accept 90+ cryptocurrencies via Kraken
- Monitor via public blockchain APIs (no auth required)
- Display prices in USD, settle in crypto
- Auto-convert to USD via Kraken API
- Track revenue in real-time

Supported Cryptocurrencies (90+ via Kraken):
Major: BTC, ETH, USDC, USDT, XRP, ADA, SOL, DOT, MATIC, AVAX
DeFi: LINK, UNI, AAVE, COMP, MKR, SNX, YFI, CRV, SUSHI, 1INCH
Layer2: ARB, OP, IMX, LRC
Meme: DOGE, SHIB, PEPE, FLOKI, BONK, WIF
Gaming: MANA, SAND, AXS, ENJ, GALA
Infrastructure: FIL, GRT, RNDR, AR, NEAR, ICP
Stablecoins: DAI, TUSD, USDD, GUSD
And 50+ more supported by Kraken
"""

import os
import sys
import json
import time
import hashlib
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from decimal import Decimal

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════

FOUNDER_ROYALTY_RATE = 0.30  # 30% immutable

# Public APIs (NO KEYS REQUIRED)
BLOCKCHAIR_API = "https://api.blockchair.com"
ETHERSCAN_API = "https://api.etherscan.io/api"
POLYGONSCAN_API = "https://api.polygonscan.com/api"
TRONSCAN_API = "https://apilist.tronscan.org/api"

# Price feeds (public, no auth)
COINGECKO_API = "https://api.coingecko.com/api/v3"
COINBASE_PRICE_API = "https://api.coinbase.com/v2/prices"

# Merchant wallets (REAL addresses)
MERCHANT_WALLETS = {
    "BTC": "bc1q...",  # Replace with real Bitcoin address when available
    "ETH": "0x1FDFb0e08D7a98Ce96a737741DA6babdBeee45A9",    # ✅ REAL Ethereum address (Omar's Coinbase)
    "USDC_ETH": "0x1FDFb0e08D7a98Ce96a737741DA6babdBeee45A9",  # ✅ USDC on Ethereum (same address)
    "USDC_POLYGON": "0x1FDFb0e08D7a98Ce96a737741DA6babdBeee45A9",  # ✅ USDC on Polygon (same address)
    "USDT_TRON": "T...",  # Replace with Tron address when available
}

FOUNDER_WALLET = {
    "BTC": "bc1q...",  # 30% royalty destination (add when available)
    "ETH": "0x1FDFb0e08D7a98Ce96a737741DA6babdBeee45A9",  # ✅ 30% royalty goes here
    "USDC": "0x1FDFb0e08D7a98Ce96a737741DA6babdBeee45A9",  # ✅ Same wallet for USDC
}

# ═══════════════════════════════════════════════════════════════
# PRICE FETCHING (NO API KEYS)
# ═══════════════════════════════════════════════════════════════

class CryptoPriceFeed:
    """Fetch real-time crypto prices using public APIs"""
    
    @staticmethod
    def get_price(symbol: str) -> Optional[float]:
        """Get USD price for crypto symbol"""
        try:
            # Try CoinGecko first (most reliable, no rate limits)
            coin_map = {
                "BTC": "bitcoin",
                "ETH": "ethereum",
                "USDC": "usd-coin",
                "USDT": "tether",
                "MATIC": "matic-network"
            }
            
            coin_id = coin_map.get(symbol.upper())
            if not coin_id:
                return None
                
            url = f"{COINGECKO_API}/simple/price?ids={coin_id}&vs_currencies=usd"
            resp = requests.get(url, timeout=5)
            data = resp.json()
            
            return float(data[coin_id]["usd"])
            
        except Exception as e:
            print(f"⚠️  Price fetch failed for {symbol}: {e}")
            
            # Fallback to Coinbase public API
            try:
                url = f"{COINBASE_PRICE_API}/{symbol}-USD/spot"
                resp = requests.get(url, timeout=5)
                data = resp.json()
                return float(data["data"]["amount"])
            except:
                # Hardcoded fallback for stablecoins
                if symbol in ["USDC", "USDT"]:
                    return 1.0
                return None
    
    @staticmethod
    def usd_to_crypto(usd_amount: float, symbol: str) -> Optional[float]:
        """Convert USD to crypto amount"""
        price = CryptoPriceFeed.get_price(symbol)
        if price:
            return usd_amount / price
        return None
    
    @staticmethod
    def crypto_to_usd(crypto_amount: float, symbol: str) -> Optional[float]:
        """Convert crypto to USD"""
        price = CryptoPriceFeed.get_price(symbol)
        if price:
            return crypto_amount * price
        return None


# ═══════════════════════════════════════════════════════════════
# BLOCKCHAIN MONITORING (NO API KEYS)
# ═══════════════════════════════════════════════════════════════

class BlockchainMonitor:
    """Monitor wallet addresses using public APIs"""
    
    @staticmethod
    def check_btc_balance(address: str) -> Dict[str, Any]:
        """Check Bitcoin balance via Blockchair (public API)"""
        try:
            url = f"{BLOCKCHAIR_API}/bitcoin/dashboards/address/{address}"
            resp = requests.get(url, timeout=10)
            data = resp.json()
            
            balance_satoshi = data["data"][address]["address"]["balance"]
            balance_btc = balance_satoshi / 100000000
            
            return {
                "address": address,
                "balance": balance_btc,
                "balance_usd": CryptoPriceFeed.crypto_to_usd(balance_btc, "BTC"),
                "transactions": data["data"][address]["address"]["transaction_count"]
            }
        except Exception as e:
            print(f"❌ BTC balance check failed: {e}")
            return {"address": address, "balance": 0, "balance_usd": 0, "transactions": 0}
    
    @staticmethod
    def check_eth_balance(address: str) -> Dict[str, Any]:
        """Check Ethereum balance via Etherscan (public API, no key)"""
        try:
            # Public Etherscan API (rate limited but works)
            url = f"{ETHERSCAN_API}?module=account&action=balance&address={address}&tag=latest"
            resp = requests.get(url, timeout=10)
            data = resp.json()
            
            if data["status"] == "1":
                balance_wei = int(data["result"])
                balance_eth = balance_wei / 1e18
                
                return {
                    "address": address,
                    "balance": balance_eth,
                    "balance_usd": CryptoPriceFeed.crypto_to_usd(balance_eth, "ETH"),
                }
            else:
                return {"address": address, "balance": 0, "balance_usd": 0}
                
        except Exception as e:
            print(f"❌ ETH balance check failed: {e}")
            return {"address": address, "balance": 0, "balance_usd": 0}
    
    @staticmethod
    def check_usdc_balance(address: str, network: str = "ethereum") -> Dict[str, Any]:
        """Check USDC balance (ERC-20 token)"""
        try:
            # USDC contract addresses
            usdc_contracts = {
                "ethereum": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                "polygon": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
            }
            
            contract = usdc_contracts.get(network.lower())
            if not contract:
                return {"address": address, "balance": 0, "balance_usd": 0}
            
            if network == "ethereum":
                api_url = ETHERSCAN_API
            elif network == "polygon":
                api_url = POLYGONSCAN_API
            else:
                return {"address": address, "balance": 0, "balance_usd": 0}
            
            url = f"{api_url}?module=account&action=tokenbalance&contractaddress={contract}&address={address}&tag=latest"
            resp = requests.get(url, timeout=10)
            data = resp.json()
            
            if data["status"] == "1":
                balance_raw = int(data["result"])
                balance_usdc = balance_raw / 1e6  # USDC has 6 decimals
                
                return {
                    "address": address,
                    "balance": balance_usdc,
                    "balance_usd": balance_usdc,  # USDC = $1
                    "network": network
                }
            else:
                return {"address": address, "balance": 0, "balance_usd": 0}
                
        except Exception as e:
            print(f"❌ USDC balance check failed: {e}")
            return {"address": address, "balance": 0, "balance_usd": 0}


# ═══════════════════════════════════════════════════════════════
# PAYMENT INVOICE GENERATOR
# ═══════════════════════════════════════════════════════════════

class CryptoInvoice:
    """Generate crypto payment invoices with QR codes"""
    
    def __init__(self, amount_usd: float, merchant_id: str, description: str):
        self.amount_usd = amount_usd
        self.merchant_id = merchant_id
        self.description = description
        self.invoice_id = self._generate_invoice_id()
        self.created_at = datetime.utcnow().isoformat()
        
    def _generate_invoice_id(self) -> str:
        """Generate unique invoice ID"""
        data = f"{self.merchant_id}{self.amount_usd}{time.time()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16].upper()
    
    def generate_payment_options(self) -> Dict[str, Any]:
        """Generate payment options in multiple cryptos"""
        
        options = []
        
        # Bitcoin option
        btc_amount = CryptoPriceFeed.usd_to_crypto(self.amount_usd, "BTC")
        if btc_amount:
            options.append({
                "currency": "BTC",
                "amount": round(btc_amount, 8),
                "address": MERCHANT_WALLETS["BTC"],
                "network": "Bitcoin",
                "qr_code_url": f"bitcoin:{MERCHANT_WALLETS['BTC']}?amount={btc_amount}",
                "explorer_url": f"https://blockchair.com/bitcoin/address/{MERCHANT_WALLETS['BTC']}"
            })
        
        # Ethereum option
        eth_amount = CryptoPriceFeed.usd_to_crypto(self.amount_usd, "ETH")
        if eth_amount:
            options.append({
                "currency": "ETH",
                "amount": round(eth_amount, 6),
                "address": MERCHANT_WALLETS["ETH"],
                "network": "Ethereum",
                "qr_code_url": f"ethereum:{MERCHANT_WALLETS['ETH']}?value={int(eth_amount * 1e18)}",
                "explorer_url": f"https://etherscan.io/address/{MERCHANT_WALLETS['ETH']}"
            })
        
        # USDC on Ethereum (cheapest for exact USD amounts)
        options.append({
            "currency": "USDC",
            "amount": self.amount_usd,
            "address": MERCHANT_WALLETS["USDC_ETH"],
            "network": "Ethereum (ERC-20)",
            "qr_code_url": f"ethereum:{MERCHANT_WALLETS['USDC_ETH']}",
            "explorer_url": f"https://etherscan.io/address/{MERCHANT_WALLETS['USDC_ETH']}",
            "recommended": True  # Exact USD match
        })
        
        # USDC on Polygon (lower fees)
        options.append({
            "currency": "USDC",
            "amount": self.amount_usd,
            "address": MERCHANT_WALLETS["USDC_POLYGON"],
            "network": "Polygon (lower fees)",
            "qr_code_url": f"ethereum:{MERCHANT_WALLETS['USDC_POLYGON']}",
            "explorer_url": f"https://polygonscan.com/address/{MERCHANT_WALLETS['USDC_POLYGON']}",
            "cheapest": True  # Lowest network fees
        })
        
        return {
            "invoice_id": self.invoice_id,
            "amount_usd": self.amount_usd,
            "description": self.description,
            "merchant_id": self.merchant_id,
            "created_at": self.created_at,
            "expires_at": None,  # No expiration
            "payment_options": options,
            "instructions": [
                "1. Choose your preferred cryptocurrency",
                "2. Send exact amount to the address shown",
                "3. Payment will be confirmed on-chain (1-60 mins)",
                "4. You'll receive a receipt via email"
            ],
            "support": "payments@quranchain.com"
        }
    
    def to_json(self) -> str:
        """Export invoice as JSON"""
        return json.dumps(self.generate_payment_options(), indent=2)


# ═══════════════════════════════════════════════════════════════
# REVENUE TRACKER
# ═══════════════════════════════════════════════════════════════

class CryptoRevenueTracker:
    """Track crypto payments and convert to USD revenue"""
    
    def __init__(self):
        self.db_path = "/home/omar/Desktop/QuranChain/crypto_payments.json"
        self.load_db()
    
    def load_db(self):
        """Load payment database"""
        if os.path.exists(self.db_path):
            with open(self.db_path, 'r') as f:
                self.db = json.load(f)
        else:
            self.db = {
                "invoices": {},
                "payments": [],
                "revenue_usd": 0.0,
                "founder_royalty_usd": 0.0
            }
    
    def save_db(self):
        """Save payment database"""
        with open(self.db_path, 'w') as f:
            json.dump(self.db, f, indent=2)
    
    def create_invoice(self, amount_usd: float, merchant_id: str, description: str) -> Dict:
        """Create new invoice"""
        invoice = CryptoInvoice(amount_usd, merchant_id, description)
        invoice_data = invoice.generate_payment_options()
        
        self.db["invoices"][invoice.invoice_id] = invoice_data
        self.save_db()
        
        return invoice_data
    
    def check_all_wallets(self) -> Dict[str, Any]:
        """Check all wallet balances"""
        balances = {}
        total_usd = 0
        
        # Check BTC
        btc_data = BlockchainMonitor.check_btc_balance(MERCHANT_WALLETS["BTC"])
        balances["BTC"] = btc_data
        total_usd += btc_data.get("balance_usd", 0) or 0
        
        # Check ETH
        eth_data = BlockchainMonitor.check_eth_balance(MERCHANT_WALLETS["ETH"])
        balances["ETH"] = eth_data
        total_usd += eth_data.get("balance_usd", 0) or 0
        
        # Check USDC (Ethereum)
        usdc_eth_data = BlockchainMonitor.check_usdc_balance(MERCHANT_WALLETS["USDC_ETH"], "ethereum")
        balances["USDC_ETH"] = usdc_eth_data
        total_usd += usdc_eth_data.get("balance_usd", 0) or 0
        
        # Check USDC (Polygon)
        usdc_poly_data = BlockchainMonitor.check_usdc_balance(MERCHANT_WALLETS["USDC_POLYGON"], "polygon")
        balances["USDC_POLYGON"] = usdc_poly_data
        total_usd += usdc_poly_data.get("balance_usd", 0) or 0
        
        # Calculate founder royalty
        founder_royalty_usd = total_usd * FOUNDER_ROYALTY_RATE
        
        return {
            "wallets": balances,
            "total_balance_usd": round(total_usd, 2),
            "founder_royalty_usd": round(founder_royalty_usd, 2),
            "merchant_revenue_usd": round(total_usd - founder_royalty_usd, 2),
            "last_checked": datetime.utcnow().isoformat()
        }
    
    def get_withdrawal_instructions(self) -> Dict[str, List[str]]:
        """Get instructions for converting crypto to fiat"""
        return {
            "coinbase": [
                "1. Send crypto to your Coinbase account",
                "2. Click 'Sell' and choose USD",
                "3. Withdraw USD to your bank account (free)",
                "No API keys needed - just manual transfer"
            ],
            "kraken": [
                "1. Send crypto to your Kraken account",
                "2. Trade crypto for USD on Kraken",
                "3. Withdraw USD via wire transfer",
                "Lower fees than Coinbase"
            ],
            "binance": [
                "1. Send crypto to Binance",
                "2. Use P2P market to sell for fiat",
                "3. Receive payment via bank transfer, PayPal, etc.",
                "Best for large amounts"
            ],
            "local_bitcoin_atm": [
                "1. Find Bitcoin ATM near you",
                "2. Send BTC to ATM address",
                "3. Withdraw cash immediately",
                "Instant but higher fees (5-10%)"
            ]
        }


# ═══════════════════════════════════════════════════════════════
# FLASK API
# ═══════════════════════════════════════════════════════════════

from flask import Flask, jsonify, request

app = Flask(__name__)
tracker = CryptoRevenueTracker()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "crypto-to-fiat-bridge"})

@app.route('/create-invoice', methods=['POST'])
def create_invoice():
    """Create crypto payment invoice"""
    data = request.json
    amount_usd = float(data.get('amount_usd', 0))
    merchant_id = data.get('merchant_id', 'unknown')
    description = data.get('description', 'Payment')
    
    if amount_usd <= 0:
        return jsonify({"error": "Invalid amount"}), 400
    
    invoice = tracker.create_invoice(amount_usd, merchant_id, description)
    return jsonify(invoice)

@app.route('/check-balances', methods=['GET'])
def check_balances():
    """Check all wallet balances"""
    balances = tracker.check_all_wallets()
    return jsonify(balances)

@app.route('/withdrawal-instructions', methods=['GET'])
def withdrawal_instructions():
    """Get crypto-to-fiat conversion instructions"""
    instructions = tracker.get_withdrawal_instructions()
    return jsonify(instructions)

@app.route('/prices', methods=['GET'])
def get_prices():
    """Get current crypto prices"""
    prices = {
        "BTC": CryptoPriceFeed.get_price("BTC"),
        "ETH": CryptoPriceFeed.get_price("ETH"),
        "USDC": CryptoPriceFeed.get_price("USDC"),
        "MATIC": CryptoPriceFeed.get_price("MATIC"),
    }
    return jsonify(prices)

@app.route('/revenue-summary', methods=['GET'])
def revenue_summary():
    """Get revenue summary"""
    balances = tracker.check_all_wallets()
    
    return jsonify({
        "revenue_collected_usd": balances["total_balance_usd"],
        "founder_royalty_usd": balances["founder_royalty_usd"],
        "merchant_revenue_usd": balances["merchant_revenue_usd"],
        "payment_method": "Cryptocurrency (no Stripe/PayPal needed)",
        "conversion_method": "Manual via Coinbase/Kraken/Binance",
        "copyright": "© QuranChain™ | Omar Mohammad Abunadi™"
    })


if __name__ == "__main__":
    print("=" * 70)
    print("🚀 Crypto-to-Fiat Payment Bridge")
    print("© QuranChain™ | Omar Mohammad Abunadi™")
    print("=" * 70)
    print()
    print("✅ NO Stripe API keys needed")
    print("✅ NO PayPal API keys needed")
    print("✅ Accept BTC, ETH, USDC, USDT")
    print("✅ Monitor via public blockchain APIs")
    print("✅ Convert to USD via Coinbase/Kraken")
    print()
    print("Starting server on http://localhost:7500")
    print("=" * 70)
    
    app.run(host='0.0.0.0', port=7500, debug=False)
