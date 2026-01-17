#!/usr/bin/env bash
set -euo pipefail

# ChatGPT Self-Upgrade Script
# Analyzes system performance and suggests/implements improvements

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UPGRADE_LOG="/opt/daralnas/logs/self-upgrade-$(date +%Y%m%d).log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$UPGRADE_LOG"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$UPGRADE_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$UPGRADE_LOG"
}

# Create log directory
mkdir -p "$(dirname "$UPGRADE_LOG")"

log "========================================="
log "ChatGPT Self-Upgrade Analysis"
log "========================================="

cd "$PROJECT_ROOT"

# 1. Check for outdated dependencies
log "Checking for dependency updates..."

if [ -f "package.json" ]; then
    info "Analyzing npm dependencies..."
    npm outdated --json > /tmp/npm-outdated.json 2>/dev/null || echo '{}' > /tmp/npm-outdated.json
    OUTDATED_COUNT=$(jq 'keys | length' /tmp/npm-outdated.json 2>/dev/null || echo "0")
    log "Found $OUTDATED_COUNT outdated npm packages"
    
    if [ "$OUTDATED_COUNT" -gt 0 ]; then
        echo "Outdated packages:" | tee -a "$UPGRADE_LOG"
        jq -r 'to_entries[] | "  - \(.key): \(.value.current) → \(.value.latest)"' /tmp/npm-outdated.json | tee -a "$UPGRADE_LOG"
    fi
fi

if [ -f "requirements.txt" ]; then
    info "Checking Python dependencies..."
    if command -v pip &> /dev/null; then
        pip list --outdated --format=json > /tmp/pip-outdated.json 2>/dev/null || echo '[]' > /tmp/pip-outdated.json
        PIP_OUTDATED=$(jq 'length' /tmp/pip-outdated.json 2>/dev/null || echo "0")
        log "Found $PIP_OUTDATED outdated Python packages"
    fi
fi

# 2. Security audit
log "Running security audit..."

if [ -f "package.json" ]; then
    npm audit --json > /tmp/npm-audit.json 2>/dev/null || echo '{"metadata":{"vulnerabilities":{}}}' > /tmp/npm-audit.json
    
    CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' /tmp/npm-audit.json)
    HIGH=$(jq '.metadata.vulnerabilities.high // 0' /tmp/npm-audit.json)
    MODERATE=$(jq '.metadata.vulnerabilities.moderate // 0' /tmp/npm-audit.json)
    LOW=$(jq '.metadata.vulnerabilities.low // 0' /tmp/npm-audit.json)
    
    log "Security vulnerabilities found:"
    echo "  - Critical: $CRITICAL" | tee -a "$UPGRADE_LOG"
    echo "  - High: $HIGH" | tee -a "$UPGRADE_LOG"
    echo "  - Moderate: $MODERATE" | tee -a "$UPGRADE_LOG"
    echo "  - Low: $LOW" | tee -a "$UPGRADE_LOG"
    
    if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
        warning "Critical or high severity vulnerabilities detected!"
    fi
fi

# 3. Analyze system performance
log "Analyzing system performance..."

cat > /tmp/performance-report.txt << EOF
System Performance Report - $(date)
====================================

CPU Usage:
$(top -bn1 | grep "Cpu(s)" 2>/dev/null | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}' || echo 'N/A')

Memory Usage:
$(free -h 2>/dev/null | grep Mem | awk '{print $3 "/" $2 " (" int($3/$2 * 100) "%)"}' || echo 'N/A')

Disk Usage:
$(df -h / 2>/dev/null | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}' || echo 'N/A')

Docker Container Status:
$(docker ps --format "{{.Names}}: {{.Status}}" 2>/dev/null || echo 'Docker not available')

Recent Errors (last 24 hours):
$(journalctl --since "24 hours ago" --priority err 2>/dev/null | wc -l || echo 'N/A') error entries

Load Average:
$(uptime | awk -F'load average:' '{print $2}' || echo 'N/A')

EOF

cat /tmp/performance-report.txt | tee -a "$UPGRADE_LOG"

# 4. Docker resource analysis
if command -v docker &> /dev/null; then
    log "Docker resource usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null | tee -a "$UPGRADE_LOG" || true
fi

# 5. Check disk space
log "Checking disk space..."
DISK_USAGE=$(df -h / 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//' || echo "0")
if [ "$DISK_USAGE" -gt 80 ]; then
    warning "Disk usage is high: ${DISK_USAGE}%"
    
    # Find large directories
    info "Largest directories in /opt/daralnas:"
    du -h /opt/daralnas/* 2>/dev/null | sort -rh | head -10 | tee -a "$UPGRADE_LOG" || true
fi

# 6. Generate improvement recommendations
log "Generating improvement recommendations..."

cat > /tmp/recommendations.txt << EOF
ChatGPT Self-Upgrade Recommendations
====================================
Generated: $(date)

1. Dependency Updates:
EOF

if [ "$OUTDATED_COUNT" -gt 0 ]; then
    cat >> /tmp/recommendations.txt << EOF
   ✅ ACTION: Update $OUTDATED_COUNT outdated npm packages
   - Run: npm update (for compatible updates)
   - Review: Check changelogs for breaking changes
   - Test: Run test suite after updates
EOF
else
    cat >> /tmp/recommendations.txt << EOF
   ✓ All npm dependencies are up to date
EOF
fi

cat >> /tmp/recommendations.txt << EOF

2. Security Improvements:
EOF

if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
    cat >> /tmp/recommendations.txt << EOF
   ⚠️  URGENT: Fix $CRITICAL critical and $HIGH high severity vulnerabilities
   - Run: npm audit fix
   - Review: Manual intervention may be needed
   - Priority: Address critical issues immediately
EOF
else
    cat >> /tmp/recommendations.txt << EOF
   ✓ No critical or high severity vulnerabilities found
EOF
fi

cat >> /tmp/recommendations.txt << EOF

3. Performance Optimizations:
EOF

# CPU check
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" 2>/dev/null | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}' || echo "0")
if (( $(echo "$CPU_USAGE > 80" | bc -l 2>/dev/null || echo 0) )); then
    cat >> /tmp/recommendations.txt << EOF
   ⚠️  High CPU usage detected (${CPU_USAGE}%)
   - Monitor sustained high usage
   - Consider scaling resources
   - Review application performance
EOF
else
    cat >> /tmp/recommendations.txt << EOF
   ✓ CPU usage is normal
EOF
fi

# Memory check
MEM_PERCENT=$(free 2>/dev/null | grep Mem | awk '{print int($3/$2 * 100)}' || echo "0")
if [ "$MEM_PERCENT" -gt 80 ]; then
    cat >> /tmp/recommendations.txt << EOF
   ⚠️  High memory usage detected (${MEM_PERCENT}%)
   - Check for memory leaks
   - Review Docker container limits
   - Consider increasing available memory
EOF
else
    cat >> /tmp/recommendations.txt << EOF
   ✓ Memory usage is normal
EOF
fi

cat >> /tmp/recommendations.txt << EOF

4. Configuration Updates:
   - Review Docker resource limits
   - Optimize cache settings
   - Update environment variables as needed
   - Check log rotation configuration

5. Maintenance Tasks:
   - Clean old Docker images: docker image prune -a
   - Clean old logs older than 30 days
   - Review and archive old backups
   - Rotate API keys if older than 90 days

Next Actions:
- Create GitHub PR for automated updates
- Schedule maintenance window for manual changes
- Update monitoring dashboards
- Document any configuration changes

EOF

cat /tmp/recommendations.txt | tee -a "$UPGRADE_LOG"

# 7. Generate summary for GitHub issue/PR
log "Generating summary..."

cat > /tmp/upgrade-summary.md << EOF
# Self-Upgrade Analysis Summary

**Date:** $(date)
**System:** DarCloud Production Server

## Findings

### Dependencies
- Outdated npm packages: $OUTDATED_COUNT
- Security vulnerabilities: Critical=$CRITICAL, High=$HIGH, Moderate=$MODERATE, Low=$LOW

### System Health
- CPU Usage: ${CPU_USAGE}%
- Memory Usage: ${MEM_PERCENT}%
- Disk Usage: ${DISK_USAGE}%

### Recommendations
See detailed recommendations in the log file: \`$UPGRADE_LOG\`

## Automated Actions Available
- [ ] Update npm dependencies (safe)
- [ ] Fix security vulnerabilities
- [ ] Clean up Docker images
- [ ] Optimize configuration

## Manual Review Required
- [ ] Review breaking changes in dependency updates
- [ ] Validate security patches
- [ ] Monitor system performance post-upgrade

---
*Generated by ChatGPT Self-Upgrade System*
EOF

cat /tmp/upgrade-summary.md | tee -a "$UPGRADE_LOG"

log "========================================="
log "Self-upgrade analysis complete!"
log "Full report saved to: $UPGRADE_LOG"
log "Summary saved to: /tmp/upgrade-summary.md"
log "========================================="

# Exit with appropriate code
if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
    warning "Critical security issues found - immediate action required!"
    exit 1
else
    log "Analysis completed successfully"
    exit 0
fi
