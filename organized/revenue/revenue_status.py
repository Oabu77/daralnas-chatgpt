#!/usr/bin/env python3
"""Complete Revenue Status"""
import sys, json, requests
sys.path.insert(0, "crm")
from database import CRMDatabase

print("\n" + "="*80)
print("💰 QURANCHAIN COMPLETE REVENUE STATUS")
print("="*80)

# 1. CRM Revenue
crm = CRMDatabase()
crm_stats = crm.get_revenue_summary(30)
print("\n📊 CRM REVENUE (Last 30 Days)")
print("-" * 80)
print(f"Total Revenue:      ${crm_stats['total_revenue']:,.2f}")
print(f"Founder Royalty:    ${crm_stats['founder_royalty']:,.2f} (30%)")
print(f"Monthly Recurring:  ${crm_stats['total_revenue']:,.2f}/mo")
print(f"Annual Recurring:   ${crm_stats['total_revenue'] * 12:,.2f}/yr")

# 2. Crypto Payment Bridge
try:
    resp = requests.get("http://localhost:7500/revenue-summary", timeout=2)
    crypto_rev = resp.json()
    print("\n💳 CRYPTO PAYMENT BRIDGE")
    print("-" * 80)
    print(f"Revenue Collected:  ${crypto_rev['revenue_collected_usd']:,.2f}")
    print(f"Founder Royalty:    ${crypto_rev['founder_royalty_usd']:,.2f} (30%)")
    print(f"Status:             ✅ READY (no Stripe/PayPal needed)")
except:
    print("\n�� CRYPTO PAYMENT BRIDGE: ⚠️  Not running")

# 3. Blockchain Gas Tolls
from blockchain_gas_toll_system import gas_toll_engine
toll_summary = gas_toll_engine.get_toll_summary()
print("\n⛓️  BLOCKCHAIN GAS TOLLS")
print("-" * 80)
print(f"Total Collected:    ${toll_summary['total_collected_usd']:,.2f}")
print(f"Founder Share:      ${toll_summary['founder_share_usd']:,.2f} (30%)")
print(f"Transactions:       {toll_summary['transaction_count']}")

# 4. Fiat Payments (if available)
try:
    from fiat_payment_collection import fiat_payment_engine
    fiat_summary = fiat_payment_engine.get_revenue_summary()
    print("\n💵 FIAT PAYMENT COLLECTION")
    print("-" * 80)
    print(f"Total Revenue:      ${fiat_summary['total_revenue_usd']:,.2f}")
    print(f"Founder Royalty:    ${fiat_summary['founder_revenue_usd']:,.2f} (30%)")
except:
    print("\n�� FIAT PAYMENT COLLECTION: ⚠️  No API keys configured")

# TOTAL
total_revenue = crm_stats['total_revenue'] + toll_summary['total_collected_usd']
founder_total = crm_stats['founder_royalty'] + toll_summary['founder_share_usd']

print("\n" + "="*80)
print("🎯 TOTAL REVENUE (ALL STREAMS)")
print("="*80)
print(f"Total Revenue:      ${total_revenue:,.2f}")
print(f"Founder Royalty:    ${founder_total:,.2f} (30% IMMUTABLE)")
print(f"MRR:                ${crm_stats['total_revenue']:,.2f}/mo")
print(f"ARR:                ${crm_stats['total_revenue'] * 12:,.2f}/yr")
print(f"\n💰 Payout Wallet:   0x1FDFb0e08D7a98Ce96a737741DA6babdBeee45A9")
print("\n© QuranChain™ | Omar Mohammad Abunadi™")
print("="*80 + "\n")
