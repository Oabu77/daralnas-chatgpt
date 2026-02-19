#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
QuranChain Pay™ - Stripe Payment Processor
© QuranChain™ | Omar Mohammad Abunadi™

Ready for production - just add your Stripe API keys.
"""

import os
from flask import Flask, jsonify, request
from datetime import datetime
from decimal import Decimal

app = Flask(__name__)

# Configuration - Load from environment
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FOUNDER_ROYALTY_PERCENT = Decimal(os.getenv("FOUNDER_ROYALTY_PERCENT", "0.30"))
FOUNDER_WALLET = os.getenv("FOUNDER_WALLET", "0x4e90944C093f7727ff89a30AF96A556deB95cCB8")  # Kraken

# In-memory storage
payments = {}
merchants = {}

def calculate_founder_royalty(amount: Decimal) -> Decimal:
    """Calculate 30% founder royalty (IMMUTABLE)"""
    return amount * FOUNDER_ROYALTY_PERCENT

@app.route('/')
def index():
    return jsonify({
        "service": "QuranChain Pay™ - Stripe Integration",
        "version": "1.0.0",
        "founder": "Omar Mohammad Abunadi™",
        "status": "ready" if STRIPE_SECRET_KEY else "awaiting_api_keys",
        "founder_royalty": f"{FOUNDER_ROYALTY_PERCENT * 100}%",
        "endpoints": [
            "POST /create-payment-intent",
            "POST /webhook",
            "GET /payment/{id}",
            "GET /health"
        ]
    })

@app.route('/health')
def health():
    return jsonify({
        "status": "healthy",
        "stripe_configured": bool(STRIPE_SECRET_KEY),
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    """Create a payment intent"""
    if not STRIPE_SECRET_KEY:
        return jsonify({
            "error": "Stripe not configured",
            "message": "Please add STRIPE_SECRET_KEY to environment"
        }), 503
    
    data = request.get_json() or {}
    amount = Decimal(str(data.get("amount", 0)))
    currency = data.get("currency", "usd").lower()
    merchant_id = data.get("merchant_id", "default")
    
    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400
    
    # Calculate fees
    founder_royalty = calculate_founder_royalty(amount)
    merchant_amount = amount - founder_royalty
    
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Stripe uses cents
            currency=currency,
            metadata={
                "merchant_id": merchant_id,
                "founder_royalty": str(founder_royalty),
                "merchant_amount": str(merchant_amount),
                "quranchain_payment": "true"
            }
        )
        
        payment_id = f"qcp_{intent.id}"
        payments[payment_id] = {
            "id": payment_id,
            "stripe_id": intent.id,
            "amount": float(amount),
            "currency": currency,
            "founder_royalty": float(founder_royalty),
            "merchant_amount": float(merchant_amount),
            "status": intent.status,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return jsonify({
            "payment_id": payment_id,
            "client_secret": intent.client_secret,
            "amount": float(amount),
            "currency": currency,
            "founder_royalty": float(founder_royalty),
            "merchant_receives": float(merchant_amount)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/payment/<payment_id>')
def get_payment(payment_id):
    """Get payment status"""
    payment = payments.get(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    return jsonify(payment)

@app.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhooks - REQUIRES signature validation"""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    if not STRIPE_WEBHOOK_SECRET:
        print("⚠️  STRIPE_WEBHOOK_SECRET not configured - webhook rejected")
        return jsonify({"error": "Webhook secret not configured"}), 500
    
    if not sig_header:
        print("❌ Webhook rejected: missing Stripe-Signature header")
        return jsonify({"error": "Missing Stripe-Signature header"}), 400
    
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        
        # Validate signature and construct event
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        
        # Handle invoice.paid events
        if event['type'] == 'invoice.paid':
            invoice = event['data']['object']
            print(f"✅ Invoice paid: {invoice['id']} (${invoice['amount_paid']/100:.2f})")
            
            # Extract metadata
            metadata = invoice.get('metadata', {})
            merchant_id = metadata.get('merchant_id', 'unknown')
            
            # Log payment completion
            print(f"   Merchant: {merchant_id}")
            print(f"   Customer: {invoice.get('customer', 'unknown')}")
            
            # In production, trigger:
            # - CRM lead mark-won
            # - Invoice Engine creation
            # - Revenue ledger entry
            # This is handled by blockchain-server.js webhook, not here
        
        elif event['type'] == 'charge.failed':
            charge = event['data']['object']
            print(f"❌ Charge failed: {charge['id']}")
        
        else:
            print(f"⚠️  Unhandled event type: {event['type']}")
        
        # Success - Stripe expects 200 OK
        return jsonify({"received": True, "event_id": event['id']})
    
    except ValueError as e:
        # Invalid signature
        print(f"❌ Invalid webhook signature: {str(e)}")
        return jsonify({"error": "Invalid signature"}), 403
    
    except Exception as e:
        print(f"❌ Webhook error: {str(e)}")
        return jsonify({"error": str(e)}), 400

@app.route('/config')
def get_config():
    """Get public configuration"""
    return jsonify({
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "founder_royalty_percent": float(FOUNDER_ROYALTY_PERCENT) * 100,
        "supported_currencies": ["usd", "eur", "gbp", "sar", "aed"]
    })

if __name__ == '__main__':
    print("═══════════════════════════════════════════════════════════════")
    print("  💳 QuranChain Pay™ - Stripe Integration")
    print("  © QuranChain™ | Omar Mohammad Abunadi™")
    print("═══════════════════════════════════════════════════════════════")
    
    if STRIPE_SECRET_KEY:
        print("  ✅ Stripe API Key: Configured")
    else:
        print("  ⚠️  Stripe API Key: NOT CONFIGURED")
        print("  → Set STRIPE_SECRET_KEY environment variable")
    
    if STRIPE_WEBHOOK_SECRET:
        print("  ✅ Webhook Secret: Configured (signatures validated)")
    else:
        print("  ⚠️  Webhook Secret: NOT CONFIGURED (webhooks rejected)")
        print("  → Set STRIPE_WEBHOOK_SECRET environment variable")
    
    print(f"  💰 Founder Royalty: {FOUNDER_ROYALTY_PERCENT * 100}%")
    print("  🚀 Starting on port 7200...")
    print("═══════════════════════════════════════════════════════════════")
    
    app.run(host='0.0.0.0', port=7200, debug=False)
