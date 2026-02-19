#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
Automated Revenue Generation (REAL)
© QuranChain™ | Omar Mohammad Abunadi™

Uses REAL CRM + Stripe Invoice Engine:
- Pulls opted-in leads and runs outreach cycles
- Invoices qualified pipeline deals via Live Invoice Engine
- Records revenue metrics from CRM (no simulated numbers)
"""

import os
import time
import requests
from datetime import datetime
from typing import Dict, List, Optional

from organized.agents.sales_outreach_agent import SalesOutreachAgent

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')
INVOICE_API_BASE = os.getenv('INVOICE_API_BASE', 'http://localhost:3001')
API_KEY = os.getenv('API_KEY', '')


class RevenueAutomationEngine:
    def __init__(self):
        self.headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}
        self.sales_agent = SalesOutreachAgent()
        self.metrics = {
            'invoices_sent': 0,
            'invoice_errors': 0,
            'last_run': None,
        }

    def get_pipeline(self) -> Dict:
        response = requests.get(f'{API_BASE}/api/crm/pipeline', headers=self.headers, timeout=20)
        response.raise_for_status()
        return response.json()

    def get_lead(self, lead_id: int) -> Optional[Dict]:
        try:
            response = requests.get(f'{API_BASE}/api/crm/leads/{lead_id}', headers=self.headers, timeout=10)
            if response.status_code != 200:
                return None
            return response.json()
        except Exception:
            return None

    def get_or_create_customer(self, email: str, name: str) -> Optional[str]:
        try:
            lookup = requests.get(
                f'{API_BASE}/api/stripe/customer/lookup',
                params={'email': email},
                headers=self.headers,
                timeout=15
            )
            if lookup.status_code == 200:
                customer = lookup.json().get('customer')
                if customer and customer.get('id'):
                    return customer['id']

            create = requests.post(
                f'{INVOICE_API_BASE}/api/stripe/customer',
                json={'email': email, 'name': name},
                headers=self.headers,
                timeout=20
            )
            if create.status_code == 200:
                result = create.json()
                customer = result.get('customer')
                if customer and customer.get('id'):
                    return customer['id']
        except Exception:
            return None
        return None

    def send_invoice_for_deal(self, deal: Dict) -> bool:
        deal_value = deal.get('deal_value') or 0
        if deal_value <= 0:
            return False

        lead_id = deal.get('lead_id')
        lead = self.get_lead(lead_id) if lead_id else None
        if not lead or not lead.get('opted_in'):
            return False

        email = lead.get('email')
        name = lead.get('name') or lead.get('lead_name') or 'Customer'
        if not email:
            return False

        customer_id = self.get_or_create_customer(email, name)
        if not customer_id:
            return False

        payload = {
            'customerId': customer_id,
            'items': [{
                'amount': float(deal_value),
                'currency': 'usd',
                'description': deal.get('name') or 'QuranChain Services',
            }],
            'memo': f"Invoice for deal {deal.get('id')}",
            'metadata': {
                'deal_id': str(deal.get('id')),
                'lead_id': str(lead_id),
                'source': 'automated_revenue'
            }
        }

        response = requests.post(
            f'{INVOICE_API_BASE}/api/invoices/create',
            json=payload,
            headers=self.headers,
            timeout=30
        )

        if response.status_code != 200:
            return False

        invoice = response.json()
        self.metrics['invoices_sent'] += 1

        note = f"Invoice sent on {datetime.now().strftime('%Y-%m-%d')} | invoice_id={invoice.get('invoiceId')}"
        deal_id = deal.get('id')
        requests.put(
            f'{API_BASE}/api/crm/deals/{deal_id}/stage',
            json={'stage': 'negotiation', 'notes': note, 'probability': 50},
            headers=self.headers,
            timeout=10
        )
        return True

    def process_pipeline_invoices(self):
        pipeline = self.get_pipeline()
        stages = pipeline.get('pipeline', {})

        candidate_deals = []
        for stage in ['proposal', 'negotiation']:
            candidate_deals.extend(stages.get(stage, []))

        sent_count = 0
        for deal in candidate_deals:
            notes = (deal.get('notes') or '').lower()
            if 'invoice sent' in notes:
                continue
            if self.send_invoice_for_deal(deal):
                sent_count += 1
            else:
                self.metrics['invoice_errors'] += 1

        return sent_count

    def run_sales_outreach(self):
        self.sales_agent.run_outreach_cycle(campaign_type='product_intro', max_leads=25)
        self.sales_agent.run_follow_up_cycle(max_leads=20)

    def generate_revenue_report(self):
        response = requests.get(f'{API_BASE}/api/crm/revenue', headers=self.headers, timeout=10)
        if response.status_code != 200:
            return None
        return response.json()

    def run_revenue_cycle(self):
        print(f"\n🔄 Revenue cycle started: {datetime.now().isoformat()}")
        self.metrics['last_run'] = datetime.now().isoformat()

        self.run_sales_outreach()
        invoices_sent = self.process_pipeline_invoices()

        report = self.generate_revenue_report()
        if report:
            totals = report.get('totals', {})
            print(f"📄 Invoices sent this cycle: {invoices_sent}")
            print(f"💰 CRM revenue total: ${totals.get('total_revenue', 0)}")
            print(f"👑 Founder share: ${totals.get('total_founder_share', 0)}")

    def run_continuous(self):
        interval_minutes = int(os.getenv('REVENUE_CYCLE_MINUTES', '120'))
        while True:
            try:
                self.run_revenue_cycle()
            except Exception as exc:
                print(f"❌ Revenue cycle error: {exc}")
            time.sleep(interval_minutes * 60)


if __name__ == '__main__':
    engine = RevenueAutomationEngine()
    engine.run_continuous()
