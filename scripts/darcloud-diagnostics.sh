#!/usr/bin/env bash
#
# DarCloud Host Diagnostics Script
# Runs health checks, port manifest, and provides tunnel setup guidance
#
# Usage:
#   ./darcloud-diagnostics.sh [command]
#
# Commands:
#   health      - Check qc-agent health endpoint
#   ports       - Show port manifest
#   all         - Run all diagnostics
#   tunnel-help - Show tunnel setup instructions
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
QC_AGENT_PORT="${QC_AGENT_PORT:-7444}"
QC_AGENT_HOST="${QC_AGENT_HOST:-127.0.0.1}"
HEALTH_ENDPOINT="http://${QC_AGENT_HOST}:${QC_AGENT_PORT}/health"

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check health endpoint
check_health() {
    print_header "QC-Agent Health Check"
    
    if ! command_exists curl; then
        print_error "curl is not installed. Please install it first."
        return 1
    fi
    
    if ! command_exists jq; then
        print_warning "jq is not installed. JSON output will not be formatted."
        echo ""
        print_info "Running health check without jq..."
        echo ""
        if curl -sS -f "${HEALTH_ENDPOINT}"; then
            echo ""
            print_success "Health check succeeded"
            return 0
        else
            echo ""
            print_error "Health check failed"
            return 1
        fi
    fi
    
    print_info "Endpoint: ${HEALTH_ENDPOINT}"
    echo ""
    
    if response=$(curl -sS -f "${HEALTH_ENDPOINT}"); then
        echo "$response" | jq .
        print_success "Health check succeeded"
        
        # Extract status if available
        if status=$(echo "$response" | jq -r '.status // empty'); then
            if [ -n "$status" ] && [ "$status" = "ok" ]; then
                print_success "Service status: OK"
            elif [ -n "$status" ]; then
                print_warning "Service status: $status"
            fi
        else
            print_warning "Could not parse status from response (invalid JSON or missing .status field)"
        fi
        
        return 0
    else
        print_error "Health check failed - service may be down"
        print_info "Checking if qc-agent service is running..."
        
        if command_exists systemctl; then
            echo ""
            if systemctl is-active --quiet qc-agent 2>/dev/null; then
                print_warning "qc-agent service is active but not responding on port ${QC_AGENT_PORT}"
            else
                print_error "qc-agent service is not running"
                print_info "Try: sudo systemctl status qc-agent --no-pager"
            fi
        fi
        
        return 1
    fi
}

# Show port manifest
check_ports() {
    print_header "Port Manifest"
    
    if ! command_exists ss; then
        print_error "ss command not found. Please install iproute2 package."
        return 1
    fi
    
    print_info "Checking all listening TCP/UDP ports..."
    echo ""
    
    if [ "$EUID" -eq 0 ]; then
        ss -tulpen
    else
        print_warning "Not running as root. Some information may be limited."
        print_info "For full details, run: sudo ss -tulpen"
        echo ""
        ss -tuln
    fi
    
    echo ""
    print_info "Checking for qc-agent on port ${QC_AGENT_PORT}..."
    
    if ss -tuln | grep -q ":${QC_AGENT_PORT}"; then
        print_success "Port ${QC_AGENT_PORT} is listening"
    else
        print_error "Port ${QC_AGENT_PORT} is NOT listening"
        print_info "Service may not be started or configured incorrectly"
    fi
}

# Show service status
check_service() {
    print_header "QC-Agent Service Status"
    
    if ! command_exists systemctl; then
        print_warning "systemctl not found - cannot check service status"
        return 1
    fi
    
    if [ "$EUID" -eq 0 ]; then
        systemctl status qc-agent --no-pager || true
    else
        print_info "Run with sudo for full service details"
        echo ""
        sudo systemctl status qc-agent --no-pager || true
    fi
}

# Show recent logs
show_logs() {
    print_header "QC-Agent Recent Logs"
    
    if ! command_exists journalctl; then
        print_warning "journalctl not found - cannot show logs"
        return 1
    fi
    
    print_info "Last 120 lines from qc-agent service..."
    echo ""
    
    if [ "$EUID" -eq 0 ]; then
        journalctl -u qc-agent -n 120 --no-pager
    else
        print_info "Run with sudo for logs"
        echo ""
        sudo journalctl -u qc-agent -n 120 --no-pager
    fi
}

# Show tunnel setup instructions
tunnel_help() {
    print_header "Cloudflared Tunnel Setup"
    
    cat << 'EOF'

📡 QUICK TUNNEL (for testing)
────────────────────────────────────────────────────────

Run in a separate terminal window:

    cloudflared tunnel --url http://127.0.0.1:7444

This will output a public URL like:
    https://xxxxx.trycloudflare.com

Keep the terminal running to maintain the tunnel.

⚠️  Quick tunnels are temporary and the URL changes on restart!


📡 PERSISTENT TUNNEL (for production)
────────────────────────────────────────────────────────

1. Login to Cloudflare:
    cloudflared tunnel login

2. Create named tunnel:
    cloudflared tunnel create darcloud-qc-agent

3. Configure tunnel (/etc/cloudflared/config.yml):
    tunnel: darcloud-qc-agent
    credentials-file: /root/.cloudflared/xxxxxxxx.json
    
    ingress:
      - hostname: qc-agent.daralnas.com
        service: http://127.0.0.1:7444
      - service: http_status:404

4. Route DNS:
    cloudflared tunnel route dns darcloud-qc-agent qc-agent.daralnas.com

5. Install systemd service:
    sudo cloudflared service install

6. Start service:
    sudo systemctl start cloudflared
    sudo systemctl enable cloudflared


📋 VERIFY TUNNEL
────────────────────────────────────────────────────────

Test the tunnel from another machine:

    curl -sS https://xxxxx.trycloudflare.com/health | jq .

Or open in browser:
    https://xxxxx.trycloudflare.com/health


🔧 TROUBLESHOOTING
────────────────────────────────────────────────────────

If cloudflared is not installed:

    # Debian/Ubuntu
    wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb

    # Or via package manager
    sudo apt-get update && sudo apt-get install cloudflared

For more details, see: DARCLOUD_OPERATIONS.md

EOF
}

# Run all diagnostics
run_all() {
    check_health
    echo ""
    check_ports
    echo ""
    check_service
    echo ""
    
    print_header "Summary"
    print_info "To view logs, run: $0 logs"
    print_info "To setup tunnel, run: $0 tunnel-help"
    echo ""
}

# Show usage
show_usage() {
    cat << EOF
DarCloud Host Diagnostics Script

Usage: $0 [command]

Commands:
    health       Check qc-agent health endpoint
    ports        Show port manifest (listening services)
    service      Show qc-agent service status
    logs         Show recent qc-agent logs (last 120 lines)
    tunnel-help  Show cloudflared tunnel setup instructions
    all          Run all diagnostics (default)
    help         Show this help message

Environment Variables:
    QC_AGENT_PORT    Port number (default: 7444)
    QC_AGENT_HOST    Host address (default: 127.0.0.1)

Examples:
    $0                          # Run all diagnostics
    $0 health                   # Check health only
    $0 ports                    # Show port manifest
    QC_AGENT_PORT=8080 $0 health  # Check different port

For detailed documentation, see: DARCLOUD_OPERATIONS.md

EOF
}

# Main
main() {
    local command="${1:-all}"
    
    case "$command" in
        health)
            check_health
            ;;
        ports)
            check_ports
            ;;
        service)
            check_service
            ;;
        logs)
            show_logs
            ;;
        tunnel-help|tunnel)
            tunnel_help
            ;;
        all)
            run_all
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
