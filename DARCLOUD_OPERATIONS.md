# DarCloud Host Operations Guide

This guide provides step-by-step instructions for running health checks, setting up tunnels, and configuring DarCloud host infrastructure.

## Overview

DarCloud hosts run the qc-agent service on port 7444, providing health monitoring and service orchestration for the Dar Al-Nas ecosystem. This guide covers:

- Health checks and port manifest verification
- Cloudflared tunnel setup for public access
- Troubleshooting and fallback procedures
- MeshTalk TCP/UDP routing configuration
- Persistent tunnel configuration with systemd

## Prerequisites

- Root or sudo access to DarCloud host
- `jq` installed for JSON parsing
- `cloudflared` installed for tunnel setup
- `systemd` for service management

## Quick Start

### Step 1: Health Check and Port Manifest

Run these commands in **Terminal A**:

```bash
# Check qc-agent health endpoint
curl -sS http://127.0.0.1:7444/health | jq .

# Check port manifest and listening services
sudo ss -tulpen
```

**Expected Health Response:**
```json
{
  "status": "ok",
  "service": "qc-agent",
  "version": "1.0.0",
  "timestamp": "2026-01-17T11:17:44Z"
}
```

**Port Manifest Notes:**
- Look for `127.0.0.1:7444` in the listening ports
- Verify qc-agent process is running
- Check for any port conflicts

### Step 2: Start Cloudflared Tunnel

Run this command in **Terminal B** (keep it running):

```bash
cloudflared tunnel --url http://127.0.0.1:7444
```

**Expected Output:**
```
2026-01-17T11:17:44Z INF +--------------------------------------------------------------------------------------------+
2026-01-17T11:17:44Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
2026-01-17T11:17:44Z INF |  https://xxxxx.trycloudflare.com                                                           |
2026-01-17T11:17:44Z INF +--------------------------------------------------------------------------------------------+
```

**Important:** 
- Copy the public URL (e.g., `https://xxxxx.trycloudflare.com`)
- Keep Terminal B running to maintain the tunnel
- The URL is temporary and will change on restart

### Step 3: Verify Tunnel Access

From another terminal or browser, test the tunnel:

```bash
# Test health endpoint through tunnel
curl -sS https://xxxxx.trycloudflare.com/health | jq .
```

## Troubleshooting

### If Health Check Fails

Check qc-agent service status:

```bash
sudo systemctl status qc-agent --no-pager
```

View recent logs (last 120 lines):

```bash
sudo journalctl -u qc-agent -n 120 --no-pager
```

### Common Issues

#### Port 7444 Not Listening

```bash
# Check if service is running
sudo systemctl status qc-agent

# Restart the service
sudo systemctl restart qc-agent

# Verify port is now listening
sudo ss -tulpen | grep 7444
```

#### Cloudflared Not Found

```bash
# Install cloudflared on Debian/Ubuntu
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Or using package manager
sudo apt-get update
sudo apt-get install cloudflared
```

#### Tunnel Connection Issues

```bash
# Check network connectivity
ping -c 3 cloudflare.com

# Check DNS resolution
nslookup trycloudflare.com

# Restart tunnel with verbose logging
cloudflared tunnel --url http://127.0.0.1:7444 --loglevel debug
```

## DarCloud Ports → Services Map

| Port | Service | Protocol | Purpose |
|------|---------|----------|---------|
| 7444 | qc-agent | HTTP | Health monitoring and service orchestration |
| 8000 | telegram-bot | HTTP | Telegram bot webhook server |
| 8787 | oliveexpress-dev | HTTP | OliveExpress development server |
| 51820 | wireguard | UDP | MeshTalk VPN plane |
| 443 | nginx/caddy | HTTPS | Reverse proxy (if configured) |

## MeshTalk TCP/UDP Routing

MeshTalk provides WireGuard-based mesh networking for the DarCloud infrastructure.

### WireGuard Configuration

```bash
# Check WireGuard status
sudo wg show

# View MeshTalk peers
sudo wg show wg0 peers

# Check routing table
ip route show table all | grep wg0
```

### UDP Port Forwarding

MeshTalk uses UDP port 51820 by default for WireGuard traffic:

```bash
# Allow UDP traffic through firewall
sudo ufw allow 51820/udp

# Verify firewall rule
sudo ufw status
```

### TCP Routing for Agent Communication

```bash
# Route agent traffic through MeshTalk tunnel
# Example: Route qc-agent traffic to remote DarCloud nodes
sudo iptables -t nat -A PREROUTING -p tcp --dport 7444 -j DNAT --to-destination <meshtalk-peer-ip>:7444
```

## Persistent Named Tunnel + Systemd Config

For production deployments, you have two options: persistent quick tunnel or named tunnel with custom domain.

### Option 1: Persistent Quick Tunnel (Recommended for Testing)

This converts the temporary quick tunnel into a persistent systemd service that auto-restarts on failure or reboot.

**Advantages:**
- No Cloudflare account setup required
- Automatic restart on crashes/reboots
- Simple one-command setup

**Disadvantages:**
- URL changes on service restart (trycloudflare.com)
- Not suitable for long-term production

#### Setup

```bash
# Install the service file
sudo cp scripts/cloudflared-quickagent.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable cloudflared-quickagent
sudo systemctl start cloudflared-quickagent

# Check status and get URL
sudo systemctl status cloudflared-quickagent --no-pager | sed -n '1,60p'
```

The service will automatically:
- Start on boot
- Restart after crashes (3 second delay)
- Maintain tunnel to `http://127.0.0.1:7444`

**View tunnel URL:**

```bash
# Get the current trycloudflare.com URL from logs
sudo journalctl -u cloudflared-quickagent --no-pager | grep "https://"
```

**Service management:**

```bash
# View live logs (to see tunnel URL)
sudo journalctl -u cloudflared-quickagent -f

# Restart service (generates new URL)
sudo systemctl restart cloudflared-quickagent

# Stop service
sudo systemctl stop cloudflared-quickagent

# Disable auto-start
sudo systemctl disable cloudflared-quickagent
```

### Option 2: Named Tunnel with Custom Domain (Production)

For production deployments with stable URLs, configure a named tunnel with your own domain.

**Advantages:**
- Stable URL that never changes
- Custom domain (e.g., qc-agent.daralnas.com)
- Better for monitoring and integrations

**Disadvantages:**
- Requires Cloudflare account
- Must own/control a domain
- More complex setup

#### 1. Create Named Tunnel

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create a named tunnel
cloudflared tunnel create darcloud-qc-agent

# Note the tunnel ID from output
# Example: Created tunnel darcloud-qc-agent with id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### 2. Configure Tunnel

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: darcloud-qc-agent
credentials-file: /root/.cloudflared/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.json

ingress:
  - hostname: qc-agent.daralnas.com
    service: http://127.0.0.1:7444
  - service: http_status:404
```

#### 3. Route DNS to Tunnel

```bash
# Create DNS record pointing to tunnel
cloudflared tunnel route dns darcloud-qc-agent qc-agent.daralnas.com
```

#### 4. Create Systemd Service

Create `/etc/systemd/system/cloudflared-tunnel.service`:

```ini
[Unit]
Description=Cloudflared Tunnel for DarCloud QC Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel run darcloud-qc-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### 5. Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable tunnel on boot
sudo systemctl enable cloudflared-tunnel

# Start tunnel
sudo systemctl start cloudflared-tunnel

# Check status
sudo systemctl status cloudflared-tunnel

# View logs
sudo journalctl -u cloudflared-tunnel -f
```

## Agent/Worker Access Policy

The QC Agent implements a role-based access control system with two distinct roles:

### Quick Setup

Run the automated setup script to generate tokens and configure the agent:

```bash
cd /path/to/daralnas-chatgpt
sudo ./scripts/setup-qc-agent.sh
```

This will:
- Generate secure Founder and Worker tokens
- Create `/etc/quranchain/qc-agent.env` with token configuration
- Install `qc_agent.py` to `~/quranchain_fee/agent/`
- Set up systemd service for automatic startup
- Display test commands for verification

### Manual Setup

If you prefer manual setup, follow these steps:

#### 1. Generate Tokens

```bash
sudo mkdir -p /etc/quranchain
sudo chmod 700 /etc/quranchain

FOUNDER_TOKEN="$(openssl rand -hex 32)"
WORKER_TOKEN="$(openssl rand -hex 32)"

sudo tee /etc/quranchain/qc-agent.env >/dev/null <<EOF
QC_AGENT_TOKEN_FOUNDER=$FOUNDER_TOKEN
QC_AGENT_TOKEN_WORKER=$WORKER_TOKEN
QC_AGENT_ROLE_DEFAULT=worker
QC_AGENT_RATE_LIMIT_PER_MIN=30
EOF

sudo chmod 600 /etc/quranchain/qc-agent.env

echo "QC_AGENT_TOKEN_FOUNDER=$FOUNDER_TOKEN"
echo "QC_AGENT_TOKEN_WORKER=$WORKER_TOKEN"
```

**Important:** Save these tokens securely. You'll need them for API calls.

#### 2. Install Agent Script

```bash
AGENT_USER="${SUDO_USER:-$USER}"
AGENT_HOME="$(getent passwd "$AGENT_USER" | cut -d: -f6)"
AGENT_DIR="$AGENT_HOME/quranchain_fee/agent"
LOG_DIR="$AGENT_HOME/quranchain_fee/logs"

sudo -u "$AGENT_USER" mkdir -p "$LOG_DIR"
sudo -u "$AGENT_USER" cp scripts/qc_agent.py "$AGENT_DIR/"
```

#### 3. Install Systemd Service

```bash
sudo cp scripts/qc-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable qc-agent
sudo systemctl start qc-agent
```

#### 4. Verify Installation

```bash
# Check service status
sudo systemctl status qc-agent --no-pager | sed -n '1,40p'

# Test health endpoint
curl -sS http://127.0.0.1:7444/health | jq .
```

### Access Control Matrix

| Role | Health Endpoint | Command Execution | Allowed Commands | Service Control | Rate Limit |
|------|----------------|-------------------|------------------|-----------------|------------|
| **Worker** | ✅ Read-only | ✅ Telemetry only | `ss`, `lsof`, `ps`, `netstat`, `ip`, `ping`, `uname`, `uptime`, `df`, `du`, `free`, `whoami`, `pwd` | ❌ | 30/min |
| **Founder** | ✅ Read-only | ✅ Operational | Worker commands + `systemctl`, `journalctl`, `docker`, `git`, `cloudflared`, `curl`, `jq` | ✅ Limited | 30/min |

### Command Guards

The agent enforces additional restrictions on powerful commands:

#### systemctl Restrictions
- **Allowed actions:** `status`, `is-active`, `restart`, `start`, `stop`
- **Allowed units:** `qc-agent`, `cloudflared-tunnel`, `wg-quick@wg0`
- **Example:** `systemctl status qc-agent` ✅ | `systemctl stop nginx` ❌

#### journalctl Restrictions
- **Required flag:** `-u <unit>` (must specify unit)
- **Allowed units:** `qc-agent`, `cloudflared-tunnel`
- **Max lines:** 200 (auto-limited to 120 if not specified)
- **Example:** `journalctl -u qc-agent -n 100` ✅ | `journalctl -u nginx` ❌

### Testing Token Access

Once the agent is running, test both token types:

#### Test Worker Token (Allowed)

```bash
TUNNEL_URL="http://127.0.0.1:7444"  # or use your cloudflare tunnel URL
WORKER_TOKEN="<your-worker-token>"

curl -sS -X POST "$TUNNEL_URL/run" \
  -H "X-QC-Token: $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"cmd":"uptime"}' | jq .
```

**Expected response:**
```json
{
  "role": "worker",
  "ok": true,
  "returncode": 0,
  "stdout": "...",
  "stderr": "",
  "elapsed_s": 0.023
}
```

#### Test Worker Token (Denied)

```bash
curl -sS -X POST "$TUNNEL_URL/run" \
  -H "X-QC-Token: $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"cmd":"systemctl status qc-agent"}' | jq .
```

**Expected response:**
```json
{
  "detail": "Command not allowed for role=worker: systemctl"
}
```

#### Test Founder Token (Allowed)

```bash
FOUNDER_TOKEN="<your-founder-token>"

curl -sS -X POST "$TUNNEL_URL/run" \
  -H "X-QC-Token: $FOUNDER_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"cmd":"systemctl status qc-agent"}' | jq .
```

**Expected response:**
```json
{
  "role": "founder",
  "ok": true,
  "returncode": 0,
  "stdout": "● qc-agent.service...",
  "stderr": "",
  "elapsed_s": 0.145
}
```

### Rate Limiting

Both roles are subject to rate limiting:
- **Default:** 30 requests per minute
- **Configuration:** Set `QC_AGENT_RATE_LIMIT_PER_MIN` in `/etc/quranchain/qc-agent.env`
- **Enforcement:** Per-token (tracked separately for each token)

If rate limit is exceeded:
```json
{
  "detail": "Rate limit exceeded (30/min)"
}
```

### Audit Logging

All commands executed through the agent are logged to `~/quranchain_fee/logs/agent_audit.log`:

```
2026-01-17 11:17:44 role=worker ok=true rc=0 elapsed=0.023s cmd=uptime
2026-01-17 11:18:01 role=founder ok=true rc=0 elapsed=0.145s cmd=systemctl status qc-agent
2026-01-17 11:18:15 role=worker ok=false rc=1 elapsed=0.012s cmd=systemctl restart qc-agent
```

View audit logs:
```bash
tail -f ~/quranchain_fee/logs/agent_audit.log
```

### Security Best Practices

1. **Token Storage:** Keep tokens in `/etc/quranchain/qc-agent.env` with 600 permissions
2. **Token Distribution:** Only share Worker tokens with monitoring systems
3. **Founder Token:** Keep Founder token secret, use only for operational tasks
4. **Tunnel Security:** Always use Cloudflare tunnel, never expose port 7444 directly
5. **Audit Review:** Regularly review audit logs for suspicious activity
6. **Token Rotation:** Regenerate tokens periodically (quarterly recommended)

### IP Allowlist (Example)

Configure in `/etc/cloudflared/config.yml`:

```yaml
ingress:
  - hostname: qc-agent.daralnas.com
    service: http://127.0.0.1:7444
    originRequest:
      access:
        required: true
        teamName: daralnas
        policies:
          - name: internal-only
            decision: allow
            include:
              - ip:
                  ip: 10.0.0.0/8
              - ip:
                  ip: 172.16.0.0/12
```

## Redundancy Plan

The redundancy plan protects against:
- cloudflared process crashes
- Network hiccups
- Host reboots
- Tunnel URL rotation (for quick tunnels)

### Minimum Redundancy (Same Host)

This is the recommended baseline redundancy configuration:

1. **qc-agent runs under systemd** (auto-restart on failure)
2. **cloudflared runs under systemd** (persistent tunnel)
3. **Optional: watchdog to monitor tunnel health**

Both services are already configured for automatic restart:
- `qc-agent.service`: Restarts after 5 seconds on failure
- `cloudflared-quickagent.service`: Restarts after 3 seconds on failure

**Verify redundancy:**

```bash
# Check both services are enabled for auto-start
sudo systemctl is-enabled qc-agent
sudo systemctl is-enabled cloudflared-quickagent

# Simulate a crash (service will auto-restart)
sudo systemctl kill qc-agent
sleep 6
sudo systemctl status qc-agent  # Should be running again

# Check auto-restart count
sudo systemctl show qc-agent | grep NRestarts
```

**What happens on reboot:**

1. System boots
2. `network-online.target` reached
3. `qc-agent.service` starts automatically
4. `cloudflared-quickagent.service` starts automatically
5. New tunnel URL generated (logged in journalctl)

**Get tunnel URL after reboot:**

```bash
sudo journalctl -u cloudflared-quickagent --no-pager | grep "https://" | tail -1
```

### Production Redundancy (Multi-Host)

For production deployments requiring stable URLs and zero downtime:

#### Architecture

Deploy across two or more hosts:

```
┌─────────────────────────────────┐
│   Cloudflare Load Balancer      │
│   (Health-checked failover)     │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼──────────┐  ┌──▼──────────┐
│ DarCloud-1   │  │ DarCloud-2  │
│ (Primary)    │  │ (Failover)  │
├──────────────┤  ├─────────────┤
│ qc-agent     │  │ qc-agent    │
│ + tunnel     │  │ + tunnel    │
└──────────────┘  └─────────────┘
```

#### Setup Steps

**1. Install on both hosts:**

On DarCloud-1 and DarCloud-2:

```bash
# Run setup on each host
sudo ./scripts/setup-qc-agent.sh

# Use named tunnels (Option 2) for stable URLs
# Example:
# - DarCloud-1: qc-agent-1.daralnas.com
# - DarCloud-2: qc-agent-2.daralnas.com
```

**2. Configure Cloudflare Load Balancer:**

In Cloudflare dashboard:

- Go to Traffic → Load Balancing
- Create a new pool named "qc-agent-pool"
- Add origins:
  - `qc-agent-1.daralnas.com`
  - `qc-agent-2.daralnas.com`
- Configure health check:
  - Type: HTTP
  - Path: `/health`
  - Interval: 60 seconds
  - Timeout: 5 seconds
  - Retries: 2
  - Expected codes: 200

**3. Create Load Balancer:**

- Go to Traffic → Load Balancing → Create Load Balancer
- Hostname: `qc-agent.daralnas.com`
- Add pool: `qc-agent-pool`
- Failover policy: Auto (unhealthy origins excluded)

Now `qc-agent.daralnas.com` will automatically route to healthy host.

#### Testing Failover

```bash
# 1. Test primary (DarCloud-1)
curl -sS https://qc-agent.daralnas.com/health | jq .

# 2. Stop qc-agent on DarCloud-1
ssh darcloud-1 'sudo systemctl stop qc-agent'

# 3. Wait for health check to detect failure (60-120 seconds)
sleep 120

# 4. Test again - should now route to DarCloud-2
curl -sS https://qc-agent.daralnas.com/health | jq .

# 5. Restart primary
ssh darcloud-1 'sudo systemctl start qc-agent'

# 6. Traffic will rebalance once health check passes
```

### Data-Plane Redundancy (MeshTalk)

For inter-node communication redundancy using WireGuard:

**Setup WireGuard on both hosts:**

```bash
# On DarCloud-1
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0

# On DarCloud-2
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

**Configure peer failover:**

Clients can have multiple WireGuard peers for automatic failover:

```ini
# Client wg0.conf
[Interface]
PrivateKey = <client-private-key>
Address = 10.0.0.3/24

# Primary peer (DarCloud-1)
[Peer]
PublicKey = <darcloud-1-public-key>
Endpoint = darcloud-1.daralnas.com:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25

# Failover peer (DarCloud-2)
[Peer]
PublicKey = <darcloud-2-public-key>
Endpoint = darcloud-2.daralnas.com:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

WireGuard automatically routes through available peers.

### Monitoring Redundancy Status

**Check all services across hosts:**

```bash
# Create a monitoring script
cat > /tmp/check-redundancy.sh << 'SCRIPT'
#!/bin/bash
HOSTS=("qc-agent-1.daralnas.com" "qc-agent-2.daralnas.com")

for host in "${HOSTS[@]}"; do
  echo "=== $host ==="
  if curl -sf "https://$host/health" >/dev/null 2>&1; then
    echo "✅ HEALTHY"
  else
    echo "❌ DOWN"
  fi
done
SCRIPT

chmod +x /tmp/check-redundancy.sh
/tmp/check-redundancy.sh
```

**Set up automated monitoring:**

```bash
# Add to crontab for periodic checks
# Runs every 5 minutes, alerts on failure
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-redundancy.sh || /usr/local/bin/alert-ops.sh") | crontab -
```

### Health Check Failover

Configure Cloudflare Load Balancer to check health:

```yaml
# Cloudflare Load Balancer Config
pools:
  - name: qc-agent-pool
    origins:
      - name: node-1
        address: qc-agent-1.daralnas.com
      - name: node-2
        address: qc-agent-2.daralnas.com
    monitor:
      type: http
      path: /health
      interval: 60
      timeout: 5
      retries: 2
```

### Automatic Failover

```bash
# Install keepalived for VRRP failover
sudo apt-get install keepalived

# Configure in /etc/keepalived/keepalived.conf
vrrp_script check_qc_agent {
    script "/usr/bin/curl -sf http://127.0.0.1:7444/health || exit 1"
    interval 5
    weight -20
}
```

## Monitoring and Alerts

### Prometheus Metrics

If qc-agent exposes metrics:

```bash
# Scrape metrics
curl http://127.0.0.1:7444/metrics

# Add to Prometheus config
scrape_configs:
  - job_name: 'qc-agent'
    static_configs:
      - targets: ['qc-agent.daralnas.com']
```

### Alerting Rules

```yaml
groups:
  - name: qc-agent
    rules:
      - alert: QCAgentDown
        expr: up{job="qc-agent"} == 0
        for: 5m
        annotations:
          summary: "QC Agent is down"
```

## Security Best Practices

1. **Never expose qc-agent directly to internet** - Always use Cloudflare tunnel
2. **Use named tunnels in production** - Avoid quick tunnels for stability
3. **Enable Cloudflare Access** - Add authentication layer
4. **Rotate credentials regularly** - Update tunnel credentials quarterly
5. **Monitor access logs** - Review Cloudflare analytics
6. **Use MeshTalk for inter-node** - Keep internal traffic encrypted
7. **Firewall configuration** - Only allow necessary ports

## Summary

This guide provides complete DarCloud host operations setup:

✅ Health check verification on port 7444  
✅ Port manifest inspection with `ss -tulpen`  
✅ Quick tunnel setup with cloudflared  
✅ Troubleshooting procedures  
✅ MeshTalk TCP/UDP routing  
✅ Persistent tunnel configuration  
✅ Systemd service setup  
✅ Access control policies  
✅ Redundancy and failover  
✅ Monitoring integration  

For additional support, contact: ops@daralnas.com
