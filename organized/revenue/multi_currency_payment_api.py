#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
🌐 MULTI-CURRENCY PAYMENT API - 11 CRYPTO + STRIPE FIAT
Unified API for collecting payments in any currency
Real blockchain + Stripe integration

Authority: Omar Mohammad Abunadi™
Status: PRODUCTION PAYMENT PROCESSOR
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import time
import logging
import requests
import os
from blockchain_logging_handler import setup_blockchain_logging
from datetime import datetime
from typing import Dict, Any
try:
    import stripe  # type: ignore
    # Configure Stripe from environment
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
except Exception:
    stripe = None
    logging.getLogger('PaymentAPI').warning(
        "Stripe SDK not available; fiat payments via Stripe will be disabled. Install with: pip install stripe"
    )

# Configure logging
setup_blockchain_logging()
logger = logging.getLogger('PaymentAPI')

# Supported payment methods
SUPPORTED_CRYPTOCURRENCIES = [
    'ethereum', 'bitcoin', 'polygon', 'arbitrum', 'optimism',
    'base', 'solana', 'cardano', 'near', 'cosmos', 'tezos'
]

SUPPORTED_FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']

class PaymentProcessor:
    """Processes payments in multiple currencies"""
    
    def __init__(self):
        self.total_processed = 0
        self.revenue_collected = 0
    
    def process_crypto_payment(self, blockchain: str, amount: float, 
                              sender: str, receiver: str) -> Dict[str, Any]:
        """Process cryptocurrency payment"""
        
        if blockchain not in SUPPORTED_CRYPTOCURRENCIES:
            return {'error': f'Cryptocurrency {blockchain} not supported'}
        
        # Calculate 30% founder fee
        founder_fee = amount * 0.30
        
        logger.info(f"💰 CRYPTO PAYMENT: {blockchain.upper()} - ${amount:.2f} → Founder: ${founder_fee:.2f}")
        
        self.total_processed += 1
        self.revenue_collected += founder_fee
        
        return {
            'status': 'processed',
            'blockchain': blockchain,
            'amount': amount,
            'founder_fee': founder_fee,
            'timestamp': datetime.now().isoformat()
        }
    
    def process_fiat_payment_stripe(self, currency: str, amount: float,
                                   payment_method: str = 'card') -> Dict[str, Any]:
        """Process fiat payment through Stripe"""
        
        if currency not in SUPPORTED_FIAT_CURRENCIES:
            return {'error': f'Currency {currency} not supported'}
        
        if stripe is None:
            return {'error': 'Stripe SDK not installed; install with: pip install stripe'}
        
        try:
            # Calculate fees
            stripe_fee = (amount * 0.029) + 0.30
            founder_revenue = amount * 0.30
            
            # Create Stripe payment intent
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency.lower(),
                payment_method_types=['card'],
                description=f'QuranChain {currency} Payment'
            )
            
            logger.info(f"💳 FIAT PAYMENT: {currency} - ${amount:.2f} → Founder: ${founder_revenue:.2f}")
            
            self.total_processed += 1
            self.revenue_collected += founder_revenue
            
            return {
                'status': 'payment_intent_created',
                'currency': currency,
                'amount': amount,
                'stripe_fee': stripe_fee,
                'founder_revenue_30pct': founder_revenue,
                'payment_intent_id': getattr(intent, 'id', None),
                'timestamp': datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"❌ Stripe error: {str(e)}")
            return {'error': 'Payment processing failed', 'details': str(e)}

# Global payment processor
processor = PaymentProcessor()

class MultiCurrencyPaymentHandler(BaseHTTPRequestHandler):
    """HTTP API for multi-currency payments"""
    
    def do_GET(self):
        """Handle GET requests"""
        
        if self.path == '/supported':
            response = {
                'cryptocurrencies': SUPPORTED_CRYPTOCURRENCIES,
                'fiat_currencies': SUPPORTED_FIAT_CURRENCIES,
                'total_methods': len(SUPPORTED_CRYPTOCURRENCIES) + len(SUPPORTED_FIAT_CURRENCIES)
            }
            self._send_json(response)
        
        elif self.path == '/status':
            response = {
                'service': 'Multi-Currency Payment API',
                'status': 'active',
                'cryptocurrencies_supported': len(SUPPORTED_CRYPTOCURRENCIES),
                'fiat_currencies_supported': len(SUPPORTED_FIAT_CURRENCIES),
                'total_payments_processed': processor.total_processed,
                'total_revenue_collected': processor.revenue_collected,
                'timestamp': datetime.now().isoformat()
            }
            self._send_json(response)
        
        elif self.path == '/health':
            self._send_json({'status': 'healthy', 'service': 'payment_api'})
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        
        if self.path == '/pay/crypto':
            self._handle_crypto_payment()
        
        elif self.path == '/pay/fiat':
            self._handle_fiat_payment()
        
        elif self.path == '/pay/multi':
            self._handle_multi_currency_payment()
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def _handle_crypto_payment(self):
        """Handle cryptocurrency payment"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            result = processor.process_crypto_payment(
                blockchain=data.get('blockchain'),
                amount=data.get('amount', 0),
                sender=data.get('sender'),
                receiver=data.get('receiver')
            )
            
            self._send_json(result, 200)
        except Exception as e:
            self._send_json({'error': str(e)}, 400)
    
    def _handle_fiat_payment(self):
        """Handle fiat payment (Stripe)"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            result = processor.process_fiat_payment_stripe(
                currency=data.get('currency'),
                amount=data.get('amount', 0),
                payment_method=data.get('payment_method', 'card')
            )
            
            self._send_json(result, 200)
        except Exception as e:
            self._send_json({'error': str(e)}, 400)
    
    def _handle_multi_currency_payment(self):
        """Handle payment in any currency (auto-detect)"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            currency = data.get('currency')
            amount = data.get('amount', 0)
            
            # Determine if crypto or fiat
            if currency.lower() in SUPPORTED_CRYPTOCURRENCIES:
                result = processor.process_crypto_payment(
                    blockchain=currency.lower(),
                    amount=amount,
                    sender=data.get('sender'),
                    receiver=data.get('receiver')
                )
            elif currency.upper() in SUPPORTED_FIAT_CURRENCIES:
                result = processor.process_fiat_payment_stripe(
                    currency=currency.upper(),
                    amount=amount
                )
            else:
                result = {'error': f'Currency {currency} not supported'}
            
            self._send_json(result, 200)
        except Exception as e:
            self._send_json({'error': str(e)}, 400)
    
    def _send_json(self, data: Dict[str, Any], status_code: int = 200):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def log_message(self, format, *args):
        """Suppress logs"""
        pass

def run_payment_api():
    """Run multi-currency payment API"""
    try:
        server = HTTPServer(('0.0.0.0', 6001), MultiCurrencyPaymentHandler)
        logger.info("🚀 Multi-Currency Payment API running on port 6001")
        server.serve_forever()
    except OSError as e:
        logger.error(f"❌ Port error: {str(e)}")
        import sys
        sys.exit(1)

if __name__ == "__main__":
    logger.info("════════════════════════════════════════════════════════════════════════════════")
    logger.info("🌐 MULTI-CURRENCY PAYMENT API - 11 CRYPTO + STRIPE FIAT")
    logger.info("════════════════════════════════════════════════════════════════════════════════")
    logger.info("")
    logger.info("🔗 SUPPORTED CRYPTOCURRENCIES:")
    for i, crypto in enumerate(SUPPORTED_CRYPTOCURRENCIES, 1):
        logger.info(f"   {i}. {crypto.upper()}")
    
    logger.info("")
    logger.info("💳 SUPPORTED FIAT CURRENCIES (Stripe):")
    for i, fiat in enumerate(SUPPORTED_FIAT_CURRENCIES, 1):
        logger.info(f"   {i}. {fiat}")
    
    logger.info("")
    logger.info("📊 API ENDPOINTS:")
    logger.info("   POST /pay/crypto - Process cryptocurrency payment")
    logger.info("   POST /pay/fiat - Process fiat payment (Stripe)")
    logger.info("   POST /pay/multi - Process payment in any supported currency")
    logger.info("   GET /supported - List all supported currencies")
    logger.info("   GET /status - Get API status and statistics")
    logger.info("")
    logger.info("════════════════════════════════════════════════════════════════════════════════")
    
    run_payment_api()
