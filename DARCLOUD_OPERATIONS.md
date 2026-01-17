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

For production deployments, configure a persistent named tunnel instead of temporary quick tunnels.

### 1. Create Named Tunnel

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create a named tunnel
cloudflared tunnel create darcloud-qc-agent

# Note the tunnel ID from output
# Example: Created tunnel darcloud-qc-agent with id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 2. Configure Tunnel

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: darcloud-qc-agent
credentials-file: /root/.cloudflared/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.json

ingress:
  - hostname: qc-agent.daralnas.com
    service: http://127.0.0.1:7444
  - service: http_status:404
```

### 3. Route DNS to Tunnel

```bash
# Create DNS record pointing to tunnel
cloudflared tunnel route dns darcloud-qc-agent qc-agent.daralnas.com
```

### 4. Create Systemd Service

Create `/etc/systemd/system/cloudflared-tunnel.service`:

```ini
[Unit]
Description=Cloudflared Tunnel for DarCloud QC Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/cloudflared tunnel run darcloud-qc-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 5. Enable and Start Service

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

### Access Control Matrix

| Role | Health Endpoint | Admin Endpoints | Logs Access | Service Control |
|------|----------------|-----------------|-------------|-----------------|
| Public | ✅ Read-only | ❌ | ❌ | ❌ |
| Worker | ✅ | ❌ | ✅ Read-only | ❌ |
| Agent | ✅ | ✅ | ✅ | ✅ Limited |
| Admin | ✅ | ✅ | ✅ | ✅ Full |

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

### Multi-Node Setup

Deploy qc-agent across multiple DarCloud hosts for high availability:

```
┌─────────────────┐
│  Load Balancer  │
│  (Cloudflare)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ Node │  │ Node │
│  #1  │  │  #2  │
└──────┘  └──────┘
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
