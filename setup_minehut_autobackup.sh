#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
# ═══════════════════════════════════════════════════════════════════════
#  MineHut Auto-Backup — Cron Setup Script
#  QuranChain + DarCloud Ecosystem
# ═══════════════════════════════════════════════════════════════════════
#
#  Usage:
#    ./setup_minehut_autobackup.sh           # Install cron (every 6 hours)
#    ./setup_minehut_autobackup.sh --remove  # Remove cron
#    ./setup_minehut_autobackup.sh --status  # Check cron status
#    ./setup_minehut_autobackup.sh --daemon  # Run as background daemon instead
#
# ═══════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/minehut_auto_backup.py"
LOG_DIR="$SCRIPT_DIR/logs"
CRON_LOG="$LOG_DIR/minehut_backup_cron.log"
PID_FILE="$SCRIPT_DIR/minehut_backup.pid"

mkdir -p "$LOG_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  MineHut Auto-Backup Setup — QuranChain + DarCloud${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"

# ─── Functions ──────────────────────────────────────────────────────

install_cron() {
    local CRON_CMD="0 */6 * * * cd $SCRIPT_DIR && /usr/bin/python3 $BACKUP_SCRIPT >> $CRON_LOG 2>&1"
    
    # Check if already installed
    if crontab -l 2>/dev/null | grep -q "minehut_auto_backup"; then
        echo -e "${YELLOW}⚠️  Cron job already exists. Updating...${NC}"
        # Remove old entry
        crontab -l 2>/dev/null | grep -v "minehut_auto_backup" | crontab -
    fi
    
    # Add new cron entry
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    
    echo -e "${GREEN}✅ Cron job installed!${NC}"
    echo -e "   Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00)"
    echo -e "   Script:   $BACKUP_SCRIPT"
    echo -e "   Log:      $CRON_LOG"
    echo ""
    echo -e "   Current cron jobs:"
    crontab -l 2>/dev/null | grep "minehut" | while read line; do
        echo -e "   ${GREEN}→ $line${NC}"
    done
}

remove_cron() {
    if crontab -l 2>/dev/null | grep -q "minehut_auto_backup"; then
        crontab -l 2>/dev/null | grep -v "minehut_auto_backup" | crontab -
        echo -e "${GREEN}✅ Cron job removed${NC}"
    else
        echo -e "${YELLOW}⚠️  No minehut backup cron job found${NC}"
    fi
    
    # Also kill daemon if running
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            echo -e "${GREEN}✅ Backup daemon (PID $pid) stopped${NC}"
        fi
        rm -f "$PID_FILE"
    fi
}

check_status() {
    echo -e "\n${CYAN}📊 Auto-Backup Status:${NC}"
    echo ""
    
    # Check cron
    if crontab -l 2>/dev/null | grep -q "minehut_auto_backup"; then
        echo -e "   Cron:     ${GREEN}✅ INSTALLED${NC}"
        crontab -l 2>/dev/null | grep "minehut" | while read line; do
            echo -e "             → $line"
        done
    else
        echo -e "   Cron:     ${RED}❌ NOT INSTALLED${NC}"
    fi
    
    # Check daemon
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "   Daemon:   ${GREEN}✅ RUNNING (PID $pid)${NC}"
        else
            echo -e "   Daemon:   ${RED}❌ DEAD (stale PID file)${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "   Daemon:   ${YELLOW}⚪ Not running${NC}"
    fi
    
    # Check tokens
    TOKEN_FILE="$HOME/.minehut_tokens"
    if [ -f "$TOKEN_FILE" ]; then
        local expires=$(python3 -c "import json; print(json.load(open('$TOKEN_FILE'))['expires'])" 2>/dev/null)
        echo -e "   Tokens:   ${GREEN}✅ CACHED${NC} (expires: $expires)"
    else
        echo -e "   Tokens:   ${RED}❌ NOT SET${NC}"
        echo -e "             Run: python3 $BACKUP_SCRIPT --set-tokens"
    fi
    
    # Check last backup
    local latest=$(ls -t "$SCRIPT_DIR/backups/minehut/"*.tar.gz 2>/dev/null | head -1)
    if [ -n "$latest" ]; then
        local age=$(python3 -c "import os,time; print(f'{(time.time()-os.path.getmtime(\"$latest\"))/3600:.1f}h ago')" 2>/dev/null)
        echo -e "   Last:     ${GREEN}✅ $(basename $latest)${NC} ($age)"
    else
        echo -e "   Last:     ${YELLOW}⚪ No backups yet${NC}"
    fi
    
    # Check servers
    echo ""
    echo -e "   ${CYAN}MineHut Servers:${NC}"
    python3 "$BACKUP_SCRIPT" --status 2>/dev/null
}

start_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Daemon already running (PID $pid)${NC}"
            return
        fi
    fi
    
    echo -e "${GREEN}🚀 Starting backup daemon (every 6 hours)...${NC}"
    cd "$SCRIPT_DIR"
    nohup python3 "$BACKUP_SCRIPT" --daemon >> "$CRON_LOG" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "$PID_FILE"
    echo -e "${GREEN}✅ Daemon started (PID $new_pid)${NC}"
    echo -e "   Log: $CRON_LOG"
    echo -e "   PID: $PID_FILE"
}

# ─── Main ───────────────────────────────────────────────────────────

case "${1:-}" in
    --remove)
        remove_cron
        ;;
    --status)
        check_status
        ;;
    --daemon)
        start_daemon
        ;;
    *)
        install_cron
        check_status
        ;;
esac

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Quick Commands:${NC}"
echo -e "   Set tokens:     python3 $BACKUP_SCRIPT --set-tokens"
echo -e "   Run now:        python3 $BACKUP_SCRIPT"
echo -e "   Check status:   $0 --status"
echo -e "   Start daemon:   $0 --daemon"
echo -e "   Remove cron:    $0 --remove"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
