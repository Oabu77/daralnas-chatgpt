#!/usr/bin/env python3
"""
Sales & Outreach Agent
© QuranChain™ | Omar Mohammad Abunadi™

Handles sales operations using REAL CRM data:
- Fetches opted-in leads from CRM API
- Sends personalized campaigns via email API
- Tracks deal progression through pipeline
- Uses real Stripe payment links

COMPLIANCE: Only contacts leads who have opted_in=true (CAN-SPAM)
"""

import os
import json
import requests
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:3000')
API_KEY = os.getenv('API_KEY', '')

class SalesOutreachAgent:
    def __init__(self):
        self.headers = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}
        self.payment_links = self._load_payment_links()
        self.campaigns_sent = 0
        self.deals_created = 0
    
    def _load_payment_links(self) -> Dict:
        """Load real Stripe payment links for use in campaigns."""
        try:
            response = requests.get(f'{API_BASE}/api/payment-links', timeout=10)
            if response.status_code == 200:
                data = response.json()
                # Index by product category for easy lookup
                links = {}
                for link in data.get('payment_links', []):
                    product = link.get('product', '').lower()
                    links[product] = link.get('payment_link_url') or link.get('url')
                print(f"  📎 Loaded {len(links)} payment links")
                return links
        except Exception as e:
            print(f"  ⚠️  Failed to load payment links: {e}")
        return {}
    
    def get_opted_in_leads(self, status: str = 'new', limit: int = 50, min_score: int = 60) -> List[Dict]:
        """
        Fetch leads from CRM who have OPTED IN for communications.
        This is critical for CAN-SPAM compliance.
        """
        try:
            response = requests.get(
                f'{API_BASE}/api/crm/leads',
                params={'status': status, 'opted_in': 'true', 'limit': limit, 'score_min': min_score},
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                leads = data.get('leads', [])
                print(f"  📋 Found {len(leads)} opted-in leads (status: {status}, min_score: {min_score})")
                return leads
            else:
                print(f"  ⚠️  CRM API error: {response.status_code}")
                return []
        except Exception as e:
            print(f"  ⚠️  Failed to fetch leads: {e}")
            return []
    
    def create_personalized_campaign(self, lead: Dict, campaign_type: str = 'product_intro') -> Dict:
        """
        Create a personalized, professional campaign email.
        Includes relevant payment link based on lead's industry/interests.
        """
        name = lead.get('name', 'Valued Professional')
        company = lead.get('company', 'your organization')
        industry = lead.get('industry', 'technology')
        
        # Find relevant payment link
        payment_link = self._get_relevant_payment_link(industry, campaign_type)
        
        templates = {
            'product_intro': {
                'subject': f"{name}, Discover QuranChain's AI-Powered Solutions",
                'content': f"""Assalamu Alaikum {name},

I hope this message finds you well. I'm reaching out because {company} could benefit from QuranChain's innovative AI and blockchain solutions.

Our platform offers:
• 550+ AI agents for workflow automation
• Sharia-compliant payment processing
• Enterprise-grade cloud infrastructure
• Blockchain-verified data integrity

I'd love to schedule a brief call to discuss how we can help {company} achieve its goals.

{f'Get started here: {payment_link}' if payment_link else 'Reply to schedule a demo.'}

Best regards,
QuranChain AI Sales Team
Omar Mohammad Abunadi™, Founder

---
You're receiving this because you opted in for communications.
Unsubscribe: {API_BASE}/unsubscribe?email={lead.get('email')}"""
            },
            'follow_up': {
                'subject': f"Following up: AI Solutions for {company}",
                'content': f"""Assalamu Alaikum {name},

I wanted to follow up on my previous message about QuranChain's solutions for {company}.

Many organizations in {industry} are already using our platform to:
• Reduce operational costs by 40%
• Automate customer service with AI
• Process payments compliantly

Would you have 15 minutes this week for a quick call?

{f'Or explore our offerings here: {payment_link}' if payment_link else ''}

Best regards,
QuranChain AI Sales Team

---
You're receiving this because you opted in for communications.
Unsubscribe: {API_BASE}/unsubscribe?email={lead.get('email')}"""
            },
            'demo_offer': {
                'subject': f"Free Demo: See QuranChain in Action",
                'content': f"""Assalamu Alaikum {name},

Based on your interest, I'd like to offer you a personalized demo of QuranChain's platform.

In just 30 minutes, you'll see how our AI agents can transform {company}'s operations.

Schedule your demo: {API_BASE}/demo?email={lead.get('email')}

{f'Or start with our self-service plan: {payment_link}' if payment_link else ''}

Looking forward to connecting,
QuranChain AI Sales Team

---
Unsubscribe: {API_BASE}/unsubscribe?email={lead.get('email')}"""
            }
        }
        
        template = templates.get(campaign_type, templates['product_intro'])
        
        return {
            'lead': lead,
            'to': lead.get('email'),
            'subject': template['subject'],
            'content': template['content'],
            'campaign_type': campaign_type,
            'payment_link': payment_link,
            'lead_id': lead.get('id')
        }
    
    def _get_relevant_payment_link(self, industry: str, campaign_type: str) -> Optional[str]:
        """Find the most relevant payment link for the lead."""
        # Priority order based on industry
        link_priorities = {
            'finance': ['islamic finance', 'payment processing', 'api access'],
            'logistics': ['logistics', 'api gateway', 'tracking'],
            'ecommerce': ['payment processing', 'api access', 'hosting'],
            'technology': ['ai agents', 'api access', 'cloud compute'],
            'blockchain': ['blockchain node', 'api access', 'storage'],
        }
        
        priorities = link_priorities.get(industry.lower(), ['ai agents', 'api access'])
        
        for keyword in priorities:
            for product, url in self.payment_links.items():
                if keyword in product:
                    return url
        
        # Default to first available link
        if self.payment_links:
            return list(self.payment_links.values())[0]
        return None
    
    def send_campaign(self, campaign: Dict) -> bool:
        """Send campaign email via the email API."""
        try:
            response = requests.post(
                f'{API_BASE}/api/email/campaign',
                json={
                    'to': campaign['to'],
                    'subject': campaign['subject'],
                    'content': campaign['content'],
                    'campaign_type': campaign['campaign_type'],
                    'lead_id': campaign.get('lead_id')
                },
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                self.campaigns_sent += 1
                return True
            else:
                print(f"    ⚠️  Failed to send to {campaign['to']}: {response.text}")
                return False
        except Exception as e:
            print(f"    ⚠️  Email API error: {e}")
            return False
    
    def update_lead_status(self, lead_id: int, status: str, notes: str = None) -> bool:
        """Update lead status in CRM after outreach."""
        try:
            response = requests.put(
                f'{API_BASE}/api/crm/leads/{lead_id}/status',
                json={'status': status, 'notes': notes, 'assigned_to': 'sales_outreach_ai'},
                headers=self.headers,
                timeout=10
            )
            return response.status_code == 200
        except:
            return False
    
    def create_deal(self, lead: Dict, deal_value: float = 150.0) -> Optional[int]:
        """Create a deal in CRM for qualified lead."""
        try:
            response = requests.post(
                f'{API_BASE}/api/crm/deals',
                json={
                    'lead_id': lead.get('id'),
                    'name': f"Sales: {lead.get('company', lead.get('name'))}",
                    'deal_value': deal_value,
                    'product': 'quranchain_ai_services',
                    'probability': 25,
                    'assigned_to': 'sales_outreach_ai',
                    'notes': f"Created by AI outreach on {datetime.now().strftime('%Y-%m-%d')}"
                },
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                self.deals_created += 1
                return data.get('deal_id')
        except:
            pass
        return None
    
    def run_outreach_cycle(self, campaign_type: str = 'product_intro', max_leads: int = 25):
        """
        Execute a full outreach cycle:
        1. Fetch opted-in leads
        2. Send personalized campaigns
        3. Update lead statuses
        4. Create deals for high-score leads
        """
        print(f"\n[{datetime.now().isoformat()}] 🚀 Sales Outreach Cycle Started")
        print("=" * 50)
        
        # Fetch leads
        leads = self.get_opted_in_leads(status='new', limit=max_leads)
        
        if not leads:
            print("  ℹ️  No new opted-in leads to contact")
            return {'campaigns_sent': 0, 'deals_created': 0}
        
        successful_sends = 0
        deals_created = 0
        
        for lead in leads:
            print(f"\n  📧 Processing: {lead.get('name')} ({lead.get('email')})")
            
            # Create and send campaign
            campaign = self.create_personalized_campaign(lead, campaign_type)
            if self.send_campaign(campaign):
                successful_sends += 1
                print(f"    ✅ Campaign sent ({campaign_type})")
                
                # Update lead status to 'contacted'
                self.update_lead_status(
                    lead['id'], 
                    'contacted',
                    f"Sent {campaign_type} campaign on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                )
                
                # Create deal for high-score leads
                if lead.get('score', 0) >= 75:
                    deal_id = self.create_deal(lead, deal_value=150.0)
                    if deal_id:
                        deals_created += 1
                        print(f"    💼 Deal #{deal_id} created (high score: {lead.get('score')})")
            else:
                print(f"    ❌ Failed to send campaign")
        
        print(f"\n{'=' * 50}")
        print(f"✨ Outreach cycle complete:")
        print(f"   📧 Campaigns sent: {successful_sends}/{len(leads)}")
        print(f"   💼 Deals created: {deals_created}")
        print(f"   📎 Payment links included: {sum(1 for l in leads if self._get_relevant_payment_link(l.get('industry', ''), campaign_type))}")
        
        return {
            'campaigns_sent': successful_sends,
            'deals_created': deals_created,
            'total_leads_processed': len(leads)
        }
    
    def run_follow_up_cycle(self, max_leads: int = 20):
        """
        Follow up with leads who were contacted but haven't responded.
        Only contacts leads who opted in.
        """
        print(f"\n[{datetime.now().isoformat()}] 🔄 Follow-up Cycle Started")
        
        # Get leads that were contacted but not yet qualified
        leads = self.get_opted_in_leads(status='contacted', limit=max_leads, min_score=50)
        
        successful_sends = 0
        for lead in leads:
            campaign = self.create_personalized_campaign(lead, 'follow_up')
            if self.send_campaign(campaign):
                successful_sends += 1
                self.update_lead_status(
                    lead['id'],
                    'contacted',
                    f"Follow-up sent on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                )
        
        print(f"✨ Follow-up complete: {successful_sends}/{len(leads)} sent")
        return {'follow_ups_sent': successful_sends}


if __name__ == '__main__':
    agent = SalesOutreachAgent()
    
    # Run initial outreach to new leads
    result = agent.run_outreach_cycle(campaign_type='product_intro', max_leads=25)
    
    # Run follow-ups to contacted leads
    follow_up_result = agent.run_follow_up_cycle(max_leads=20)
    
    print(f"\n📊 Total Results:")
    print(f"   New campaigns: {result['campaigns_sent']}")
    print(f"   Follow-ups: {follow_up_result['follow_ups_sent']}")
    print(f"   Deals created: {result['deals_created']}")
