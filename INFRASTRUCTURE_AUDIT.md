# DarCloud Infrastructure Audit & Port Manifest

**Date**: January 2026  
**Purpose**: Document DarCloud Linux host network configuration, port allocation, and service topology  
**Status**: 🟡 PENDING - Awaiting port manifest data

---

## Overview

This document captures the complete network infrastructure of the DarCloud Linux host, including:
- TCP/UDP port allocations
- Process ownership of each port
- Service-to-hostname mappings
- Cloudflare Tunnel configuration
- Redundancy and failover architecture

---

## 1. Port Manifest (TCP + UDP Listeners)

### Instructions for Gathering Port Data

Run these commands on the **DarCloud Linux host** and paste the output below:

```bash
# Get complete TCP/UDP listener manifest
sudo ss -tulpen

# If output is very long, capture in chunks:
sudo ss -tulpen | sed -n '1,200p'
sudo ss -tulpen | sed -n '200,400p'
sudo ss -tulpen | sed -n '400,600p'
```

### TCP Listeners

```
[PASTE OUTPUT HERE]
```

### UDP Listeners

**Important**: UDP ports are critical for voice/TURN/RTP/WireGuard services.

```bash
# Capture UDP-specific listeners
sudo ss -ulpen
```

```
[PASTE OUTPUT HERE]
```

### Process-to-Port Mapping

```bash
# Extract process names and ports they own
sudo ss -tulpenH | awk '{print $5,$7}' | sed 's/users:(("//; s/".*//' | sort -u
```

```
[PASTE OUTPUT HERE]
```

---

## 2. Service Port Allocation Table

Once port manifest data is available, document the mapping:

| Port | Protocol | Process/Service | Purpose | Notes |
|------|----------|-----------------|---------|-------|
| 22   | TCP      | sshd            | SSH access | Standard |
| 80   | TCP      | nginx/cloudflared | HTTP → Tunnel | Redirects to HTTPS |
| 443  | TCP      | nginx/cloudflared | HTTPS → Tunnel | Main entry point |
| 8787 | TCP      | oliveexpress-api | OliveExpress API | Internal |
| 8000 | TCP      | daralnas-bot    | Telegram Bot | Internal |
| TBD  | UDP      | wireguard       | VPN tunnel | If used |
| TBD  | UDP      | turn-server     | WebRTC TURN | If used |
| TBD  | TCP      | postgres/mysql  | Database | If used |

**TODO**: Fill this table based on actual `ss -tulpen` output.

---

## 3. Hostname Configuration

### Internal Service Hostnames

The following internal hostnames should resolve to DarCloud services:

| Hostname | Target Service | IP/Port | Purpose |
|----------|---------------|---------|---------|
| **meshtalk.internal** | MeshTalk OS | TBD | P2P communication platform |
| **darcloud.internal** | DarCloud Identity | TBD | Digital identity service |
| **server.internal** | Main API Server | TBD | General backend APIs |
| **oliveexpress.internal** | OliveExpress API | localhost:8787 | Logistics platform |
| **bots.internal** | Telegram Bot | localhost:8000 | Bot webhook endpoint |

### Configuration Location

Hostname mappings are typically configured in:

- **DNS**: If using internal DNS server
- **/etc/hosts**: For local resolution
- **Cloudflare Tunnel**: Via ingress rules (see below)

```bash
# Example /etc/hosts entries
# 127.0.0.1  meshtalk.internal
# 127.0.0.1  darcloud.internal
# 127.0.0.1  server.internal
# 127.0.0.1  oliveexpress.internal
# 127.0.0.1  bots.internal
```

**TODO**: Document actual hostname resolution method used.

---

## 4. Cloudflare Tunnel Configuration

### Expected Configuration File Location

```
~/.cloudflared/config.yml
```

### Ingress Block Template

Based on the required hostnames, the Cloudflare Tunnel config should include:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/<user>/.cloudflared/<TUNNEL_ID>.json

ingress:
  # MeshTalk OS - P2P Communication
  - hostname: meshtalk.internal
    service: http://localhost:<PORT>
    
  # DarCloud Identity Service
  - hostname: darcloud.internal
    service: http://localhost:<PORT>
    
  # Main API Server
  - hostname: server.internal
    service: http://localhost:<PORT>
    
  # OliveExpress Logistics Platform
  - hostname: oliveexpress.internal
    service: http://localhost:8787
    
  # Telegram Bot Webhook
  - hostname: bots.internal
    service: http://localhost:8000
  
  # Catch-all rule (required)
  - service: http_status:404
```

### Current Configuration

**TODO**: Paste actual `~/.cloudflared/config.yml` ingress block here.

```yaml
[PASTE ACTUAL CONFIG.YML INGRESS BLOCK HERE]
```

---

## 5. Redundancy & Failover Architecture

### Primary Tunnel Configuration

- **Tunnel Name**: [TBD]
- **Tunnel ID**: [TBD]
- **Status**: [TBD]
- **Hosted Services**: All 5 internal hostnames
- **Health Check**: [TBD]

### Secondary Tunnel Configuration (Failover)

For high availability, configure a secondary tunnel:

- **Tunnel Name**: [TBD]
- **Tunnel ID**: [TBD]
- **Status**: [TBD]
- **Failover Trigger**: Primary tunnel down for >60 seconds
- **DNS TTL**: 60 seconds (for fast failover)

### Redundancy Strategy

1. **DNS Load Balancing**:
   - Configure Cloudflare DNS with multiple A/AAAA records
   - Enable Cloudflare Load Balancing with health checks
   - TTL: 60 seconds for rapid failover

2. **Active-Passive Tunnels**:
   - Primary tunnel handles all traffic
   - Secondary tunnel on standby
   - Automatic DNS failover if primary fails

3. **Service-Level Redundancy**:
   - Critical services (OliveExpress, DarCloud) run with process managers
   - Auto-restart on crash (systemd, PM2, supervisor)
   - Health monitoring endpoints

### Monitoring & Alerts

- **Uptime Monitoring**: Cloudflare analytics + external monitoring
- **Alert Channels**: [TBD - email, Slack, PagerDuty, etc.]
- **SLA Target**: 99.9% uptime

**TODO**: Document actual failover testing procedures and results.

---

## 6. Security Considerations

### Firewall Rules

Expected firewall configuration:

```bash
# Allow SSH (restricted to specific IPs if possible)
ufw allow 22/tcp

# Allow HTTP/HTTPS (for Cloudflare Tunnel)
ufw allow 80/tcp
ufw allow 443/tcp

# Allow Cloudflare Tunnel outbound
# (Cloudflare Tunnel makes outbound connections only)

# Block direct access to internal service ports
ufw deny 8787/tcp
ufw deny 8000/tcp

# Enable firewall
ufw enable
```

### Cloudflare Access

Recommended: Use Cloudflare Access to add authentication layer:
- Zero Trust application policies
- Service-specific access controls
- Audit logs for all access

**TODO**: Document current firewall rules with `sudo ufw status verbose` or `sudo iptables -L -n -v`

---

## 7. Process Management

### Recommended Service Managers

Each service should run under a process manager for auto-restart:

| Service | Manager | Config File | Command |
|---------|---------|-------------|---------|
| OliveExpress | systemd/PM2 | TBD | `npm start` or `wrangler dev` |
| Telegram Bot | systemd | TBD | `python -m daralnas_bot.server` |
| Cloudflared | systemd | `/etc/systemd/system/cloudflared.service` | `cloudflared tunnel run` |

### Systemd Service Example

```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=cloudflare
ExecStart=/usr/local/bin/cloudflared tunnel run --config /home/cloudflare/.cloudflared/config.yml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**TODO**: Document actual process manager configuration for each service.

---

## 8. Audit Checklist

### Data Collection

- [ ] TCP listener manifest captured (`sudo ss -tulpen`)
- [ ] UDP listener manifest captured (`sudo ss -ulpen`)
- [ ] Process-to-port mapping captured
- [ ] Hostname resolution method documented
- [ ] Cloudflare Tunnel config.yml obtained
- [ ] Firewall rules documented
- [ ] Process managers identified

### Configuration Validation

- [ ] All 5 hostnames route correctly through tunnel
- [ ] Internal services not exposed directly to internet
- [ ] Redundant tunnel configured and tested
- [ ] DNS failover tested and verified
- [ ] Health monitoring endpoints active
- [ ] Alert channels configured and tested
- [ ] SSL/TLS certificates valid

### Security Review

- [ ] Unnecessary ports closed
- [ ] SSH access restricted to key-based auth
- [ ] Service ports not exposed to public internet
- [ ] Cloudflare Access enabled (if applicable)
- [ ] Regular security updates enabled
- [ ] Logs being collected and retained

---

## 9. Next Steps

1. ✅ Create audit documentation template (this file)
2. 🟡 **PENDING**: Run port manifest commands on DarCloud host
3. 🟡 **PENDING**: Paste `ss -tulpen` output into Section 1
4. 🟡 **PENDING**: Paste `ss -ulpen` output into Section 1
5. 🟡 **PENDING**: Paste process mapping into Section 1
6. 🟡 **PENDING**: Document hostname resolution in Section 3
7. 🟡 **PENDING**: Paste `~/.cloudflared/config.yml` ingress block into Section 4
8. 🟡 **PENDING**: Document redundancy setup in Section 5
9. ⬜ Validate all services accessible through hostnames
10. ⬜ Test failover scenarios
11. ⬜ Complete security audit checklist

---

## Contact & Support

**Infrastructure Owner**: [TBD]  
**Platform**: DarCloud / Dar Al-Nas ecosystem  
**Documentation**: See DEPLOYMENT.md, LIVE_STATUS.md  
**Emergency Contact**: [TBD]

---

**Last Updated**: [TBD]  
**Next Audit**: [TBD]
