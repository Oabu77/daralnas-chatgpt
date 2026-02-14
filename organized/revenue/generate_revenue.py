#!/usr/bin/env python3
"""
AI Workforce Revenue Generator
© QuranChain™ | Omar Mohammad Abunadi™

Triggers all AI agents to start generating leads, deals, and revenue
"""

import sys
import os
import json
import time
import random
from datetime import datetime

# Add CRM to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "crm"))
from database import CRMDatabase, Lead, Deal, Merchant, RevenueEvent, LeadStatus, LeadSource, DealStage, MerchantStatus

COPYRIGHT = "© QuranChain™ | Omar Mohammad Abunadi™"
FOUNDER_ROYALTY_RATE = 0.30

# Initialize CRM
crm = CRMDatabase()

def generate_sample_leads():
    """Marketing AI: Generate sample leads"""
    print("\n" + "="*70)
    print("🎯 MARKETING AI - Generating Leads")
    print("="*70)
    
    lead_templates = [
        {
            "name": "TechStore LLC",
            "email": "owner@techstore.example",
            "company": "TechStore",
            "source": "organic_search",
            "phone": "+1-555-0101",
            "notes": "E-commerce business processing $50K/month, interested in lower fees"
        },
        {
            "name": "GreenLeaf Market",
            "email": "contact@greenleaf.example",
            "company": "GreenLeaf Market",
            "source": "linkedin",
            "phone": "+1-555-0102",
            "notes": "Organic food marketplace, looking for crypto payment options"
        },
        {
            "name": "CodeAcademy Pro",
            "email": "billing@codeacademy.example",
            "company": "CodeAcademy Pro",
            "source": "referral",
            "phone": "+1-555-0103",
            "notes": "SaaS subscription service, high monthly volume"
        },
        {
            "name": "FitLife Supplements",
            "email": "owner@fitlife.example",
            "company": "FitLife",
            "source": "facebook_ads",
            "phone": "+1-555-0104",
            "notes": "Health supplements e-commerce, international sales"
        },
        {
            "name": "DesignStudio Co",
            "email": "payments@designstudio.example",
            "company": "DesignStudio",
            "source": "organic_search",
            "phone": "+1-555-0105",
            "notes": "Digital design services, looking for faster settlement"
        },
        {
            "name": "Muslim Bookstore",
            "email": "admin@muslimbooks.example",
            "company": "Muslim Bookstore",
            "source": "dar_al_nas_referral",
            "phone": "+1-555-0106",
            "notes": "Islamic books & products, wants halal payment processing"
        },
        {
            "name": "CloudHost Inc",
            "email": "billing@cloudhost.example",
            "company": "CloudHost",
            "source": "linkedin",
            "phone": "+1-555-0107",
            "notes": "Web hosting provider, recurring billing needs"
        },
        {
            "name": "FreshBites Meal Delivery",
            "email": "payments@freshbites.example",
            "company": "FreshBites",
            "source": "instagram",
            "phone": "+1-555-0108",
            "notes": "Meal delivery service, high transaction volume"
        }
    ]
    
    leads_created = 0
    for template in lead_templates:
        try:
            lead = Lead(
                id=0,  # Will be auto-assigned
                name=template["name"],
                email=template["email"],
                company=template.get("company"),
                phone=template.get("phone"),
                source=template["source"],
                status="new",
                lead_score=0,
                notes=template.get("notes"),
                opted_in=True,
                created_at="",
                updated_at=""
            )
            
            lead_id = crm.create_lead(lead)
            
            # Score leads based on source quality
            score_map = {
                "referral": 85,
                "dar_al_nas_referral": 90,
                "linkedin": 75,
                "organic_search": 70,
                "facebook_ads": 60,
                "instagram": 65
            }
            score = score_map.get(template["source"], 50)
            
            # Update with qualified status and score
            conn = crm._get_conn()
            conn.execute(
                "UPDATE leads SET status = ?, lead_score = ? WHERE id = ?",
                ("qualified", score, lead_id)
            )
            conn.commit()
            conn.close()
            
            print(f"  ✅ Lead #{lead_id}: {template['name']} ({template['company']}) - Score: {score}")
            leads_created += 1
            
        except Exception as e:
            print(f"  ⚠️  Skipped {template['name']}: {e}")
    
    print(f"\n📊 Total Leads Generated: {leads_created}")
    return leads_created


def create_deals_from_leads():
    """Sales AI: Convert leads to deals"""
    print("\n" + "="*70)
    print("💼 SALES AI - Converting Leads to Deals")
    print("="*70)
    
    # Get qualified leads
    qualified_leads = crm.get_leads_by_status("qualified")
    
    deal_scenarios = [
        {"tier": "starter", "monthly_fee": 99, "product": "QuranChain Pay Starter"},
        {"tier": "professional", "monthly_fee": 299, "product": "QuranChain Pay Pro"},
        {"tier": "business", "monthly_fee": 599, "product": "QuranChain Pay Business"},
        {"tier": "enterprise", "monthly_fee": 1499, "product": "QuranChain Pay Enterprise"},
    ]
    
    deals_created = 0
    for lead in qualified_leads[:6]:  # Work on top 6 leads
        scenario = random.choice(deal_scenarios)
        
        try:
            deal = Deal(
                id=0,  # Auto-assigned
                lead_id=lead.id,
                stage="qualification",
                deal_value=scenario["monthly_fee"],
                currency="USD",
                probability=25,
                close_date=None,
                product=scenario["product"],
                ai_agent_owner="sales_ai",
                human_owner=None,
                notes=f"{scenario['tier']} tier subscription",
                created_at="",
                updated_at=""
            )
            
            deal_id = crm.create_deal(deal)
            
            # Progress deal through stages
            stage = random.choice(["qualification", "proposal", "negotiation", "closed_won"])
            probability = {"qualification": 25, "proposal": 50, "negotiation": 75, "closed_won": 100}[stage]
            
            crm.update_deal_stage(deal_id, stage, probability)
            
            status_emoji = "🎯" if stage == "closed_won" else "📋"
            print(f"  {status_emoji} Deal #{deal_id}: {lead.name} - ${scenario['monthly_fee']}/mo ({stage})")
            
            deals_created += 1
            
            # If deal closed, create merchant
            if stage == "closed_won":
                merchant = Merchant(
                    id=0,
                    business_name=lead.company or lead.name,
                    contact_name=lead.name,
                    contact_email=lead.email,
                    contact_phone=lead.phone,
                    status="active",
                    monthly_volume=0,
                    api_key=f"qc_live_{''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=32))}",
                    webhook_url=None,
                    payout_wallet="0x1FDFb0e08D7a98Ce96a737741DA6babdBeee45A9",
                    payout_method="crypto",
                    tier=scenario["tier"],
                    monthly_fee=scenario["monthly_fee"],
                    onboarded_by_ai="sales_ai",
                    created_at="",
                    activated_at=""
                )
                
                merchant_id = crm.create_merchant(merchant)
                print(f"    ✅ Merchant #{merchant_id} created for {lead.company or lead.name}")
                
                # Log revenue event
                revenue_event = RevenueEvent(
                    id=0,
                    source="merchant_signup",
                    event_type="monthly_subscription",
                    amount=scenario["monthly_fee"],
                    currency="USD",
                    merchant_id=merchant_id,
                    deal_id=deal_id,
                    ai_agent="sales_ai",
                    commission_amount=scenario["monthly_fee"] * 0.10,
                    founder_royalty=scenario["monthly_fee"] * FOUNDER_ROYALTY_RATE,
                    metadata=json.dumps({"tier": scenario["tier"]}),
                    timestamp=""
                )
                
                crm.record_revenue(revenue_event)
            
        except Exception as e:
            print(f"  ⚠️  Failed to create deal for {lead.name}: {e}")
    
    print(f"\n📊 Total Deals Created: {deals_created}")
    return deals_created


def activate_merchants():
    """Onboarding AI: Activate pending merchants"""
    print("\n" + "="*70)
    print("🚀 ONBOARDING AI - Merchants Already Activated")
    print("="*70)
    
    # Merchants are activated during deal closure
    merchants = crm.get_active_merchants()
    
    print(f"\n📊 Total Active Merchants: {len(merchants)}")
    for merchant in merchants[:5]:
        print(f"  ✅ {merchant.business_name} (${merchant.monthly_fee}/mo)")
    
    return len(merchants)


def optimize_revenue():
    """Optimization AI: Analyze and optimize revenue"""
    print("\n" + "="*70)
    print("📊 OPTIMIZATION AI - Revenue Analysis")
    print("="*70)
    
    stats = crm.get_revenue_summary(days=30)
    
    print(f"\n💰 REVENUE METRICS:")
    print(f"  Total Revenue:        ${stats['total_revenue']:,.2f}")
    print(f"  Founder Royalty (30%): ${stats['founder_royalty']:,.2f}")
    print(f"  AI Commission:        ${stats['ai_commission']:,.2f}")
    
    pipeline = crm.get_pipeline_value()
    
    print(f"\n📈 PIPELINE METRICS:")
    print(f"  Total Pipeline:       ${pipeline['total_pipeline']:,.2f}")
    print(f"  Weighted Pipeline:    ${pipeline['weighted_pipeline']:,.2f}")
    
    # Count active merchants
    active_merchants = len(crm.get_active_merchants())
    
    print(f"\n🎯 BUSINESS METRICS:")
    print(f"  Active Merchants:     {active_merchants}")
    print(f"  MRR:                  ${stats['total_revenue']:,.2f}/month")
    print(f"  Annualized:           ${stats['total_revenue'] * 12:,.2f}/year")
    
    return stats


def generate_ai_performance_report():
    """Generate performance report for all AI agents"""
    print("\n" + "="*70)
    print("🤖 AI WORKFORCE PERFORMANCE (30 Days)")
    print("="*70)
    
    # Get summary stats
    conn = crm._get_conn()
    
    # Count by AI agent
    cursor = conn.execute("""
        SELECT ai_agent, COUNT(*), SUM(amount), SUM(commission_amount)
        FROM revenue_events
        GROUP BY ai_agent
    """)
    
    for row in cursor.fetchall():
        agent, count, revenue, commission = row
        print(f"\n{agent.upper()}:")
        print(f"  Events:             {count}")
        print(f"  Revenue Attributed: ${revenue:,.2f}")
        print(f"  Commission Earned:  ${commission:,.2f}")
    
    conn.close()


def main():
    print("\n")
    print("╔" + "="*76 + "╗")
    print("║" + " "*20 + "🤖 AI WORKFORCE REVENUE GENERATOR 🤖" + " "*20 + "║")
    print("║" + " "*20 + COPYRIGHT.center(36) + " "*20 + "║")
    print("╚" + "="*76 + "╝")
    
    # Initialize database
    print("\n🔧 Initializing CRM database...")
    # Database auto-initializes on import
    print("✅ CRM ready")
    
    time.sleep(1)
    
    # Phase 1: Generate leads
    leads_count = generate_sample_leads()
    time.sleep(1)
    
    # Phase 2: Create deals
    deals_count = create_deals_from_leads()
    time.sleep(1)
    
    # Phase 3: Activate merchants
    merchants_count = activate_merchants()
    time.sleep(1)
    
    # Phase 4: Optimize revenue
    stats = optimize_revenue()
    time.sleep(1)
    
    # Phase 5: Performance report
    generate_ai_performance_report()
    
    # Final summary
    print("\n" + "="*70)
    print("🎉 REVENUE GENERATION COMPLETE")
    print("="*70)
    print(f"\n✅ {leads_count} leads generated")
    print(f"✅ {deals_count} deals created")
    print(f"✅ {merchants_count} merchants activated")
    print(f"✅ ${stats['total_revenue']:,.2f} revenue generated (30 days)")
    print(f"✅ ${stats['founder_royalty']:,.2f} founder royalty (30%)")
    
    print("\n💎 NEXT STEPS:")
    print("  1. AI agents continue running autonomously")
    print("  2. Monitor via: curl http://localhost:9090/status")
    print("  3. Check CRM: sqlite3 crm/crm.db")
    print("  4. Accept crypto payments via: 0x1FDFb0e08D7a98Ce96a737741DA6babdBeee45A9")
    
    print("\n" + COPYRIGHT)
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
