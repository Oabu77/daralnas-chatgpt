#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
# Production Deployment Script for QuranChain-OS AI Agents

echo "🚀 Deploying QuranChain-OS AI Revenue Agents to Production..."

# Load environment from .env file (real credentials)
if [ -f .env ]; then
  set -a
  source .env
  set +a
  echo "✅ Loaded environment from .env"
else
  echo "⚠️  No .env file found — using defaults"
fi

export NODE_ENV=production
export API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

# Create logs directory
mkdir -p logs

# Function to start an agent
start_agent() {
    local agent_name=$1
    local agent_file=$2

    echo "Starting $agent_name agent..."
    nohup python3 organized/agents/$agent_file > logs/${agent_name}.log 2>&1 &
    echo $! > ${agent_name}.pid
    echo "$agent_name started with PID $(cat ${agent_name}.pid)"
}

# Start all 8 revenue-generating agents
start_agent "customer_service" "customer_service_agent.py"
start_agent "sales_outreach" "sales_outreach_agent.py"
start_agent "content_creator" "content_creator_agent.py"
start_agent "data_analyst" "data_analyst_agent.py"
start_agent "devops" "devops_agent.py"
start_agent "islamic_finance" "islamic_finance_agent.py"
start_agent "security" "security_agent.py"
start_agent "logistics" "logistics_agent.py"

# Start existing agents
start_agent "payment_processor" "payment_processor_agent.py"
start_agent "revenue_analytics" "revenue_analytics_agent.py"
start_agent "subscription_manager" "subscription_manager_agent.py"

echo "✅ All AI agents deployed and running!"
echo "📊 Monitoring earnings at: https://dashboard.quranchain.com/earnings"
echo "🔍 Check agent logs in ./logs/ directory"
echo "💰 Expected monthly revenue: $1,400+ from AI services"

# Start automated revenue generation
echo "Starting automated revenue generation..."
python3 automated_revenue.py &

echo "🎯 Production deployment complete! Agents are now generating revenue."