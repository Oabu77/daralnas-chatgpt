#!/usr/bin/env python3
"""
Subscription Manager Agent
Handles all subscription-related operations for QuranChain-OS
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')
API_KEY = os.getenv('API_KEY', '')

class SubscriptionManagerAgent:
    def __init__(self):
        self.headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

    def create_subscription(self, customer_id, price_id, quantity=1):
        """Create a new subscription for a customer"""
        data = {
            'customerId': customer_id,
            'priceId': price_id,
            'quantity': quantity
        }
        response = requests.post(f'{API_BASE}/api/subscriptions/subscription', json=data, headers=self.headers)
        return response.json()

    def get_customer_subscriptions(self, customer_id):
        """Get all subscriptions for a customer"""
        response = requests.get(f'{API_BASE}/api/subscriptions/customer/{customer_id}', headers=self.headers)
        return response.json()

    def cancel_subscription(self, subscription_id):
        """Cancel a subscription"""
        response = requests.delete(f'{API_BASE}/api/subscriptions/subscription/{subscription_id}', headers=self.headers)
        return response.json()

    def update_subscription(self, subscription_id, updates):
        """Update subscription details"""
        response = requests.put(f'{API_BASE}/api/subscriptions/subscription/{subscription_id}', json=updates, headers=self.headers)
        return response.json()

    def get_subscription_analytics(self):
        """Get subscription analytics"""
        response = requests.get(f'{API_BASE}/api/subscriptions/analytics', headers=self.headers)
        return response.json()

if __name__ == '__main__':
    agent = SubscriptionManagerAgent()
    # Example usage
    print("Subscription Manager Agent initialized")
    print("Available methods: create_subscription, get_customer_subscriptions, cancel_subscription, update_subscription, get_subscription_analytics")