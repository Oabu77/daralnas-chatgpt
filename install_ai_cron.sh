#!/bin/bash
# Install AI Agent Cron Jobs
# © QuranChain™ | Omar Mohammad Abunadi™

echo "🤖 QuranChain-OS AI Agent Scheduler Installer"
echo "=============================================="

# Create logs directory
LOGDIR="/home/omar/Desktop/QuranChain-OS/logs/ai_agents"
mkdir -p "$LOGDIR"
echo "✅ Created log directory: $LOGDIR"

# Backup existing crontab
crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null
echo "✅ Backed up existing crontab"

# Merge new jobs with existing crontab
# First, remove any existing QuranChain AI agent jobs
crontab -l 2>/dev/null | grep -v "ai_daily_lead_generation\|sales_outreach_agent\|ai_lead_scoring\|ai_revenue_optimization\|ai_response_monitor\|api/crm/pipeline" > /tmp/crontab_clean.txt

# Append new jobs
cat /home/omar/Desktop/QuranChain-OS/organized/ai_agents/ai_agent_crontab_v2.txt >> /tmp/crontab_clean.txt

# Add QuranChain autonomous services
cat << 'EOF' >> /tmp/crontab_clean.txt

# QuranChain-OS Autonomous Services
@reboot cd /home/omar/Desktop/QuranChain-OS && nohup node ai-bot-manager.js > logs/production/ai-bot-manager.out.log 2>&1 &
@reboot cd /home/omar/Desktop/QuranChain-OS && DRY_RUN=0 nohup node marketing-bots.js > logs/production/marketing-bots.out.log 2>&1 &
*/15 * * * * cd /home/omar/Desktop/QuranChain-OS && curl -s http://localhost:9010/health >/dev/null 2>&1 || nohup node ai-bot-manager.js > logs/production/ai-bot-manager.out.log 2>&1 &
*/30 * * * * cd /home/omar/Desktop/QuranChain-OS && curl -s http://localhost:3100/api/marketing/health >/dev/null 2>&1 || nohup node marketing-dashboard.js > logs/production/marketing-dashboard.log 2>&1 &

EOF

# Install the merged crontab
crontab /tmp/crontab_clean.txt
echo "✅ Installed AI agent cron jobs"

# Verify installation
echo ""
echo "📋 Installed cron jobs:"
echo "------------------------"
crontab -l | grep -E "QuranChain|ai_|sales_outreach|api/crm" | head -20

echo ""
echo "🎯 AI Agent Schedule:"
echo "  • Lead Generation:    Every 2 hours"
echo "  • Sales Outreach:     8am, 12pm, 4pm, 8pm"
echo "  • Follow-ups:         10am, 3pm"
echo "  • Lead Scoring:       9am daily"
echo "  • Revenue Opt:        5pm daily"
echo "  • Response Monitor:   Every 30 minutes"
echo "  • Pipeline Summary:   6pm daily"
echo "  • Campaign Report:    8pm Sunday"
echo "  • Bot Manager:        On boot + health check every 15 min"
echo "  • Marketing Bots:      On boot (live mode)"
echo "  • Marketing Dashboard: On boot + health check every 30 min"

echo ""
echo "📂 Logs will be written to: $LOGDIR"
echo ""
echo "✅ Installation complete!"
echo ""
echo "To test immediately:"
echo "  python3 organized/ai_agents/ai_daily_lead_generation.py"
echo "  python3 organized/ai_agents/sales_outreach_agent.py"
