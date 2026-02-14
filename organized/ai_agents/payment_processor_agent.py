#!/usr/bin/env python3
"""
Payment Processor Agent
Handles payment processing operations for QuranChain
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

# Stripe Payment Catalog - All product/price IDs
try:
    from organized.revenue.stripe_payment_catalog import (
        PRODUCTS as STRIPE_CATALOG, PAYMENT_PRODUCTS, BANKING_PRODUCTS,
        EXCHANGE_PRODUCTS, DARPAY_PRODUCTS, DAR_AL_NAS_PRODUCTS,
        create_checkout_session, create_payment_link,
        get_products_by_platform, get_subscription_products,
        FOUNDER_ROYALTY_RATE as STRIPE_FOUNDER_RATE
    )
    STRIPE_CATALOG_LOADED = True
except ImportError:
    STRIPE_CATALOG_LOADED = False

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')
API_KEY = os.getenv('API_KEY', '')

class PaymentProcessorAgent:
    def __init__(self):
        self.headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

    def process_card_payment(self, amount, currency='usd', customer_id=None, payment_method_id=None):
        """Process a card payment"""
        data = {
            'amount': amount,
            'currency': currency,
            'customerId': customer_id,
            'paymentMethodId': payment_method_id
        }
        response = requests.post(f'{API_BASE}/api/payments/card', json=data, headers=self.headers)
        return response.json()

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

    def refund_payment(self, payment_intent_id, amount=None):
        """Process a refund"""
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
    print("Payment Processor Agent initialized")
    print("Available methods: process_card_payment, process_ach_payment, get_payment_history, refund_payment, get_payment_analytics")
