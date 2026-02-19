#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
# Stop All AI Agents Script

echo "🛑 Stopping all QuranChain-OS AI agents..."

# Kill all agent processes
pkill -f "customer_service_agent.py"
pkill -f "sales_outreach_agent.py"
pkill -f "content_creator_agent.py"
pkill -f "data_analyst_agent.py"
pkill -f "devops_agent.py"
pkill -f "islamic_finance_agent.py"
pkill -f "security_agent.py"
pkill -f "logistics_agent.py"
pkill -f "payment_processor_agent.py"
pkill -f "revenue_analytics_agent.py"
pkill -f "subscription_manager_agent.py"

# Kill revenue simulation
pkill -f "live_revenue_simulation.py"

echo "✅ All agents stopped."
echo "💡 Use ./deploy_agents.sh to restart"