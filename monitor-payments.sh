#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
# Real-time payment monitoring dashboard
# Checks Stripe account for incoming payments

STRIPE_KEY="$STRIPE_SECRET_KEY"
UPDATE_LOG="/tmp/payment-monitor.log"

echo "⚡ QuranChain Payment Monitor - LIVE" 
echo "======================================"
echo "Monitoring Stripe account for real-time payments..."
echo ""

# Function to check Stripe charges
check_charges() {
  curl -s "https://api.stripe.com/v1/charges" \
    -u "$STRIPE_SECRET_KEY:" \
    -d "limit=10" \
    -d "expand[]=invoice" | jq '{
      charges: [.data[] | {
        id: .id,
        amount_usd: (.amount / 100),
        status: .status,
        customer: .customer,
        created: .created,
        payment_method: .payment_method_details.type,
        description: .description
      }],
      total_volume: ((.data | length) as $len | if $len > 0 then (.data[] | .amount | . / 100) | add else 0 end)
    }' 2>/dev/null
}

# Function to check Stripe balance
check_balance() {
  curl -s "https://api.stripe.com/v1/balance" \
    -u "$STRIPE_SECRET_KEY:" | jq '{
      available: (.available[0].amount / 100),
      currency: .available[0].currency,
      pending: (.pending[0].amount / 100 // 0)
    }' 2>/dev/null
}

echo "💰 STRIPE ACCOUNT BALANCE"
echo "========================================"
check_balance
echo ""

echo "💳 RECENT TRANSACTIONS (Last 10)"
echo "========================================"
check_charges
echo ""

echo "Monitor updated at: $(date)"
echo "Next check: 10 seconds"
