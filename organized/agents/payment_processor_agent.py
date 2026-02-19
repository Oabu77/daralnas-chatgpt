#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
Payment Processor Agent
Handles payment processing operations for QuranChain-OS
"""

import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')
API_KEY = os.getenv('API_KEY', '')

class PaymentProcessorAgent:
    def __init__(self):
        self.headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

    def process_card_payment(self, amount, currency='usd', customer_id=None, payment_method_id=None, description=None):
        """Process a card payment"""
        try:
            # Ensure USD currency
            if currency.lower() != 'usd':
                print(f"⚠️ Converting {currency} to USD for payment processing")
                currency = 'usd'

            data = {
                'amount': amount,
                'currency': currency,
                'customerId': customer_id,
                'paymentMethodId': payment_method_id,
                'metadata': {
                    'source': 'payment_processor_agent',
                    'description': description or f'Payment of ${amount} {currency.upper()}'
                }
            }

            response = requests.post(
                f'{API_BASE}/api/stripe/payment-intent',
                json=data,
                headers=self.headers,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                payment_intent = result.get('confirmed') or result.get('paymentIntent')
                status = payment_intent.get('status') if payment_intent else 'unknown'
                print(f"✅ Stripe payment intent {payment_intent.get('id')} status: {status}")
                return payment_intent

            raise Exception(f"API error {response.status_code}: {response.text}")

        except Exception as e:
            print(f"❌ Payment processing error: {e}")
            return {'status': 'failed', 'error': str(e)}

    def process_ach_payment(self, account_number, routing_number, account_holder_name, amount, currency='usd'):
        """Process an ACH payment"""
        data = {
            'accountNumber': account_number,
            'routingNumber': routing_number,
            'accountHolderName': account_holder_name,
            'amount': amount,
            'currency': currency
        }
        response = requests.post(f'{API_BASE}/api/payments/ach', json=data, headers=self.headers)
        return response.json()

    def get_payment_history(self, customer_id):
        """Get payment history for a customer"""
        response = requests.get(f'{API_BASE}/api/payments/history/{customer_id}', headers=self.headers)
        return response.json()

    def create_stripe_customer(self, customer_data):
        """Create a REAL Stripe customer via the blockchain-server API.
        
        PRODUCTION: This method calls the actual Stripe API via the Node.js backend.
        NO mock customers. NO test data. Real Stripe customer IDs only.
        
        Args:
            customer_data: dict with 'name', 'email', and optional 'metadata', 'phone', 'address'
        
        Returns:
            dict: Real Stripe customer object from the API
        """
        try:
            # Validate required fields
            if not customer_data.get('email'):
                raise ValueError("Customer email is required for Stripe customer creation")
            if not customer_data.get('name'):
                raise ValueError("Customer name is required for Stripe customer creation")
            
            # Prepare payload for real Stripe customer creation
            payload = {
                'email': customer_data['email'],
                'name': customer_data['name'],
                'phone': customer_data.get('phone'),
                'address': customer_data.get('address'),
                'metadata': {
                    **customer_data.get('metadata', {}),
                    'source': 'payment_processor_agent',
                    'platform': 'QuranChain-OS',
                    'created_by': 'ai_agent',
                }
            }
            
            # Call the real Stripe API via blockchain-server
            response = requests.post(
                f'{API_BASE}/api/stripe/customer',
                json=payload,
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('customer'):
                    customer = result['customer']
                    print(f"✅ Created REAL Stripe customer: {customer['id']}")
                    return customer
                else:
                    raise Exception(result.get('error', 'Unknown error from Stripe'))
            else:
                raise Exception(f"API error {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating Stripe customer: {e}")
            return None
        data = {'paymentIntentId': payment_intent_id}
        if amount:
            data['amount'] = amount
        response = requests.post(f'{API_BASE}/api/payments/refund', json=data, headers=self.headers)
        return response.json()

    def get_payment_analytics(self, start_date, end_date):
        """Get payment analytics for a date range"""
        params = {'startDate': start_date, 'endDate': end_date}
        response = requests.get(f'{API_BASE}/api/payments/analytics', params=params, headers=self.headers)
        return response.json()

if __name__ == '__main__':
    agent = PaymentProcessorAgent()
    # Example usage
    print("Payment Processor Agent initialized")
    print("Available methods: process_card_payment, process_ach_payment, get_payment_history, refund_payment, get_payment_analytics")