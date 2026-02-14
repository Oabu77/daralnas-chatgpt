#!/usr/bin/env python3
"""
Revenue Analytics Agent
Provides financial insights and reporting for QuranChain
"""

import os
import requests
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Stripe Payment Catalog - All product/price IDs
try:
    from organized.revenue.stripe_payment_catalog import (
        PRODUCTS as STRIPE_CATALOG,
        REVENUE_TRACKING_PRODUCTS,
        get_catalog_summary, get_subscription_products,
        get_one_time_products, get_transaction_fee_products,
        get_products_by_platform, get_products_by_category,
        FOUNDER_ROYALTY_RATE as STRIPE_FOUNDER_RATE
    )
    STRIPE_CATALOG_LOADED = True
except ImportError:
    STRIPE_CATALOG_LOADED = False

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')
API_KEY = os.getenv('API_KEY', '')

class RevenueAnalyticsAgent:
    def __init__(self):
        self.headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

    def get_revenue_summary(self, days=30):
        """Get revenue summary for the last N days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        params = {
            'startDate': start_date.isoformat(),
            'endDate': end_date.isoformat()
        }

        response = requests.get(f'{API_BASE}/api/analytics/revenue', params=params, headers=self.headers)
        return response.json()

    def get_subscription_metrics(self):
        """Get subscription-related metrics"""
        response = requests.get(f'{API_BASE}/api/analytics/subscriptions', headers=self.headers)
        return response.json()

    def get_customer_lifetime_value(self, customer_id):
        """Calculate customer lifetime value"""
        response = requests.get(f'{API_BASE}/api/analytics/clv/{customer_id}', headers=self.headers)
        return response.json()

    def get_churn_rate(self, period='monthly'):
        """Calculate churn rate"""
        params = {'period': period}
        response = requests.get(f'{API_BASE}/api/analytics/churn', params=params, headers=self.headers)
        return response.json()

    def get_revenue_forecast(self, months=12):
        """Generate revenue forecast"""
        params = {'months': months}
        response = requests.get(f'{API_BASE}/api/analytics/forecast', params=params, headers=self.headers)
        return response.json()

    def generate_financial_report(self, report_type='monthly'):
        """Generate comprehensive financial report"""
        params = {'type': report_type}
        response = requests.get(f'{API_BASE}/api/analytics/report', params=params, headers=self.headers)
        return response.json()

if __name__ == '__main__':
    agent = RevenueAnalyticsAgent()
    print("Revenue Analytics Agent initialized")
    print("Available methods: get_revenue_summary, get_subscription_metrics, get_customer_lifetime_value, get_churn_rate, get_revenue_forecast, generate_financial_report")
