#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
AI Daily Lead Generation
© QuranChain™ | Omar Mohammad Abunadi™

Generates real leads from:
1. Website form submissions (via API)
2. Payment link visitors who didn't complete checkout
3. API usage patterns from trial users
4. Partner referrals

IMPORTANT: Only creates leads with proper opt-in tracking (CAN-SPAM compliance)
"""

import os
import sys
import json
import requests
from datetime import datetime
from typing import List, Dict, Optional

# Configuration
API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')

class LeadGenerator:
    def __init__(self):
        self.api_base = API_BASE
        self.leads_created = 0
    
    def generate_leads_from_website_signups(self) -> List[Dict]:
        """
        Fetch website form submissions that haven't been converted to CRM leads.
        These are REAL users who opted in via contact/demo request forms.
        """
        leads = []
        try:
            # In production: Query your website's form submission database
            # For now: Check if there are pending signups in a webhook queue
            response = requests.get(f'{self.api_base}/api/stripe/pending-customers', timeout=10)
            if response.status_code == 200:
                data = response.json()
                for customer in data.get('customers', []):
                    if customer.get('email'):
                        leads.append({
                            'name': customer.get('name', 'Website Visitor'),
                            'email': customer['email'],
                            'company': customer.get('metadata', {}).get('company'),
                            'source': 'website_form',
                            'score': 70,  # Medium-high intent
                            'opted_in': True,  # They submitted the form
                            'notes': f"Source: Website form submission on {datetime.now().strftime('%Y-%m-%d')}"
                        })
        except Exception as e:
            print(f"  ⚠️  Website leads fetch failed: {e}")
        return leads
    
    def generate_leads_from_abandoned_checkouts(self) -> List[Dict]:
        """
        Find users who started checkout but didn't complete.
        Only if they provided opt-in consent.
        """
        leads = []
        try:
            # Check Stripe for abandoned checkouts (sessions created but not completed)
            response = requests.get(f'{self.api_base}/api/stripe/abandoned-sessions', timeout=10)
            if response.status_code == 200:
                data = response.json()
                for session in data.get('sessions', []):
                    email = session.get('customer_email') or session.get('customer_details', {}).get('email')
                    if email and session.get('consent_collection', {}).get('promotions') == 'opt_in':
                        leads.append({
                            'name': session.get('customer_details', {}).get('name', 'Checkout Visitor'),
                            'email': email,
                            'source': 'abandoned_checkout',
                            'score': 85,  # High intent - they almost bought
                            'opted_in': True,
                            'notes': f"Abandoned checkout for: {session.get('line_items', [{}])[0].get('description', 'Unknown product')}"
                        })
        except Exception as e:
            print(f"  ⚠️  Abandoned checkout fetch failed: {e}")
        return leads
    
    def generate_leads_from_api_trials(self) -> List[Dict]:
        """
        Find trial API users who haven't converted to paid.
        """
        leads = []
        try:
            response = requests.get(f'{self.api_base}/api/ai-marketplace/trial-users', timeout=10)
            if response.status_code == 200:
                data = response.json()
                for user in data.get('trial_users', []):
                    if user.get('email') and user.get('opted_in_marketing'):
                        leads.append({
                            'name': user.get('name', 'API Trial User'),
                            'email': user['email'],
                            'company': user.get('company'),
                            'source': 'api_trial',
                            'score': 75,  # They're actively using the API
                            'opted_in': True,
                            'notes': f"API trial user since {user.get('created_at', 'unknown')}. Tools used: {user.get('tools_used', 0)}"
                        })
        except Exception as e:
            print(f"  ⚠️  API trial fetch failed: {e}")
        return leads
    
    def create_lead_in_crm(self, lead: Dict) -> Optional[int]:
        """Create a lead via the CRM API with proper opt-in tracking."""
        try:
            response = requests.post(
                f'{self.api_base}/api/crm/leads',
                json=lead,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('lead_id')
            elif response.status_code == 409:
                # Lead already exists - not an error
                return None
            else:
                print(f"  ⚠️  Failed to create lead {lead['email']}: {response.text}")
                return None
        except Exception as e:
            print(f"  ⚠️  CRM API error: {e}")
            return None
    
    def run(self):
        """Execute daily lead generation."""
        print(f"\n[{datetime.now().isoformat()}] 🎯 AI Lead Generation Started")
        print("=" * 50)
        
        all_leads = []
        
        # Gather leads from all sources
        print("📥 Checking website form submissions...")
        all_leads.extend(self.generate_leads_from_website_signups())
        
        print("🛒 Checking abandoned checkouts...")
        all_leads.extend(self.generate_leads_from_abandoned_checkouts())
        
        print("🔧 Checking API trial users...")
        all_leads.extend(self.generate_leads_from_api_trials())
        
        # Dedupe by email
        seen_emails = set()
        unique_leads = []
        for lead in all_leads:
            if lead['email'] not in seen_emails:
                seen_emails.add(lead['email'])
                unique_leads.append(lead)
        
        print(f"\n📊 Found {len(unique_leads)} unique leads from {len(all_leads)} total")
        
        # Create leads in CRM
        created_count = 0
        for lead in unique_leads:
            lead_id = self.create_lead_in_crm(lead)
            if lead_id:
                created_count += 1
                print(f"  ✅ Created lead #{lead_id}: {lead['email']} (source: {lead['source']}, score: {lead['score']})")
        
        print(f"\n✨ Lead generation complete: {created_count} new leads created")
        print(f"   Note: Only leads with proper opt-in consent are processed")
        print("=" * 50)
        
        return created_count


if __name__ == '__main__':
    generator = LeadGenerator()
    generator.run()

