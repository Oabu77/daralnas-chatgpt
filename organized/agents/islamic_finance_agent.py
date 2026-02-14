#!/usr/bin/env python3
"""
Islamic Finance Agent
Handles Islamic-compliant financial transactions and services
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')
API_KEY = os.getenv('API_KEY', '')
STRIPE_SECRET = os.getenv('STRIPE_SECRET_KEY', '')

class IslamicFinanceAgent:
    def __init__(self):
        self.headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

    def process_murabaha_transaction(self, buyer_id, seller_id, asset_value, profit_margin=0.15):
        """Process Murabaha (cost-plus financing) transaction"""
        # Calculate selling price
        selling_price = asset_value * (1 + profit_margin)
        
        # Ensure Islamic compliance
        compliance_check = self.check_islamic_compliance('murabaha', {
            'asset_value': asset_value,
            'profit_margin': profit_margin
        })
        
        if not compliance_check['compliant']:
            return {'error': 'Transaction not Islamic compliant', 'details': compliance_check}
        
        # Process transaction
        transaction = {
            'type': 'murabaha',
            'buyer_id': buyer_id,
            'seller_id': seller_id,
            'asset_value': asset_value,
            'selling_price': selling_price,
            'profit': asset_value * profit_margin
        }
        
        response = requests.post(f'{API_BASE}/api/finance/murabaha', json=transaction, headers=self.headers)
        return response.json()

    def process_mudarabah_investment(self, investor_id, entrepreneur_id, capital, profit_sharing_ratio=0.7):
        """Process Mudarabah (profit-sharing partnership) investment"""
        compliance_check = self.check_islamic_compliance('mudarabah', {
            'capital': capital,
            'profit_sharing': profit_sharing_ratio
        })
        
        if not compliance_check['compliant']:
            return {'error': 'Investment not Islamic compliant'}
        
        investment = {
            'type': 'mudarabah',
            'investor_id': investor_id,
            'entrepreneur_id': entrepreneur_id,
            'capital': capital,
            'profit_sharing_ratio': profit_sharing_ratio,
            'management_fee': 25  # $25 management fee
        }
        
        response = requests.post(f'{API_BASE}/api/finance/mudarabah', json=investment, headers=self.headers)
        return response.json()

    def check_islamic_compliance(self, transaction_type, details):
        """Check if transaction complies with Islamic finance principles"""
        compliance_rules = {
            'murabaha': {
                'no_interest': True,
                'asset_exists': True,
                'profit_disclosed': True
            },
            'mudarabah': {
                'profit_sharing': True,
                'loss_bearing': True,
                'no_guaranteed_return': True
            },
            'musawamah': {
                'negotiation': True,
                'no_price_disclosure': True
            }
        }
        
        rules = compliance_rules.get(transaction_type, {})
        compliant = True
        issues = []
        
        for rule, required in rules.items():
            if required and not details.get(rule, False):
                compliant = False
                issues.append(f"Missing {rule}")
        
        return {
            'compliant': compliant,
            'issues': issues,
            'sharia_compliance_score': 95 if compliant else 60
        }

    def calculate_zakat(self, wealth_amount, nisab_threshold=5000):
        """Calculate Zakat obligation"""
        if wealth_amount >= nisab_threshold:
            zakat_amount = wealth_amount * 0.025  # 2.5% Zakat
            return {
                'zakat_obligatory': True,
                'zakat_amount': zakat_amount,
                'calculation_method': '2.5% of wealth above nisab'
            }
        else:
            return {
                'zakat_obligatory': False,
                'reason': 'Wealth below nisab threshold'
            }

    def process_waqf_donation(self, donor_id, amount, purpose='education'):
        """Process Waqf (Islamic endowment) donation"""
        waqf_transaction = {
            'type': 'waqf',
            'donor_id': donor_id,
            'amount': amount,
            'purpose': purpose,
            'perpetual': True,  # Waqf is perpetual
            'management_fee': 10  # $10 management fee
        }
        
        response = requests.post(f'{API_BASE}/api/finance/waqf', json=waqf_transaction, headers=self.headers)
        return response.json()

    def generate_sharia_compliance_report(self, portfolio_id):
        """Generate Sharia compliance report for investment portfolio"""
        # Analyze portfolio holdings
        holdings = self.analyze_portfolio_holdings(portfolio_id)
        
        # Check each holding for Sharia compliance
        compliance_report = []
        for holding in holdings:
            compliance = self.check_investment_compliance(holding)
            compliance_report.append({
                'holding': holding,
                'compliant': compliance['compliant'],
                'screening_criteria': compliance['criteria']
            })
        
        # Calculate overall compliance score
        compliant_count = sum(1 for r in compliance_report if r['compliant'])
        total_count = len(compliance_report)
        compliance_score = (compliant_count / total_count * 100) if total_count > 0 else 0
        
        return {
            'portfolio_id': portfolio_id,
            'compliance_report': compliance_report,
            'overall_compliance_score': compliance_score,
            'report_fee': 50  # $50 for compliance report
        }

    def analyze_portfolio_holdings(self, portfolio_id):
        """Analyze portfolio holdings"""
        response = requests.get(f'{API_BASE}/api/finance/portfolio/{portfolio_id}', headers=self.headers)
        return response.json().get('holdings', [])

    def check_investment_compliance(self, holding):
        """Check if investment complies with Sharia screening criteria"""
        # Simplified Sharia screening
        prohibited_activities = ['alcohol', 'gambling', 'interest', 'pork']
        
        compliant = True
        criteria = []
        
        for activity in prohibited_activities:
            if activity in holding.get('business_activities', []):
                compliant = False
                criteria.append(f"Engages in {activity}")
        
        if holding.get('debt_ratio', 0) > 0.33:
            compliant = False
            criteria.append("Debt ratio exceeds 33%")
        
        return {
            'compliant': compliant,
            'criteria': criteria
        }

    def process_takaful_insurance(self, member_id, coverage_amount, contribution_period='monthly'):
        """Process Takaful (Islamic insurance) coverage"""
        takaful_contract = {
            'type': 'takaful',
            'member_id': member_id,
            'coverage_amount': coverage_amount,
            'contribution_period': contribution_period,
            'tabarru_fund': coverage_amount * 0.1,  # 10% goes to mutual assistance fund
            'management_fee': 15  # $15 monthly management fee
        }
        
        response = requests.post(f'{API_BASE}/api/finance/takaful', json=takaful_contract, headers=self.headers)
        return response.json()