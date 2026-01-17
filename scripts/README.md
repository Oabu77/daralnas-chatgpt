# DarCloud Scripts

This directory contains scripts for setting up and managing DarCloud infrastructure.

## Agent Scripts

### qc_agent.py

The QuranChain Founder Execution Agent - a FastAPI-based service that provides role-based command execution with audit logging and rate limiting.

**Features:**
- Two-tier access control (Founder vs Worker tokens)
- Rate limiting (30 requests/min by default)
- Command allowlists for security
- Audit logging
- Guards against dangerous system operations

**Usage:**

```bash
# Installed to: ~/quranchain_fee/agent/qc_agent.py
# Runs on: http://127.0.0.1:7444
# Service: qc-agent.service
```

See `DARCLOUD_OPERATIONS.md` for complete documentation.

### qc-agent.service

Systemd service file for the qc-agent. Configures automatic startup and restart on failure.

**Installation:**

```bash
sudo cp qc-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable qc-agent
sudo systemctl start qc-agent
```

### setup-qc-agent.sh

Automated setup script that:
1. Generates secure Founder and Worker tokens
2. Creates `/etc/quranchain/qc-agent.env` with configuration
3. Installs qc_agent.py to proper location
4. Sets up systemd service
5. Displays test commands

**Usage:**

```bash
sudo ./setup-qc-agent.sh
```

## Tunnel Scripts

### cloudflared-quickagent.service

Systemd service file for a persistent quick tunnel (trycloudflare.com) to qc-agent.

**Features:**
- Automatic restart on failure (3 second delay)
- Auto-start on boot
- Self-healing after crashes/reboots

**Installation:**

```bash
sudo cp cloudflared-quickagent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cloudflared-quickagent
sudo systemctl start cloudflared-quickagent

# Get tunnel URL
sudo journalctl -u cloudflared-quickagent --no-pager | grep "https://"
```

### setup-tunnel.sh

Interactive tunnel setup script with two modes:

1. **Quick Tunnel** - Fast setup with rotating URL
2. **Named Tunnel** - Production setup with custom domain

**Usage:**

```bash
sudo ./setup-tunnel.sh
```

### cloudflared-tunnel.service

Systemd service template for named tunnels (production use).

**Note:** This is a template. The `setup-tunnel.sh` script will customize it based on your tunnel configuration.

### cloudflared-config.yml

Template configuration file for Cloudflare tunnels.

## Diagnostic Scripts

### darcloud-diagnostics.sh

Comprehensive diagnostics script that checks:
- Service status (qc-agent, cloudflared)
- Port availability
- Network connectivity
- WireGuard status
- System resources

**Usage:**

```bash
./darcloud-diagnostics.sh
```

## General Setup

### setup.sh

General setup script for the project (Cloudflare Workers, D1 database, etc).

**Usage:**

```bash
./setup.sh
```

## Quick Reference

### Start Everything

```bash
# Setup qc-agent
sudo ./setup-qc-agent.sh

# Setup persistent quick tunnel
sudo cp cloudflared-quickagent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-quickagent

# Get tunnel URL
sudo journalctl -u cloudflared-quickagent --no-pager | grep "https://" | tail -1
```

### Check Status

```bash
# Check qc-agent
sudo systemctl status qc-agent

# Check tunnel
sudo systemctl status cloudflared-quickagent

# Test health
curl -sS http://127.0.0.1:7444/health | jq .
```

### View Logs

```bash
# qc-agent logs
sudo journalctl -u qc-agent -f

# Tunnel logs
sudo journalctl -u cloudflared-quickagent -f

# Audit log
tail -f ~/quranchain_fee/logs/agent_audit.log
```

## Security Notes

1. **Token Storage:** Tokens are stored in `/etc/quranchain/qc-agent.env` with 600 permissions
2. **Never expose port 7444 directly** - Always use Cloudflare tunnel
3. **Audit logs:** Review `~/quranchain_fee/logs/agent_audit.log` regularly
4. **Token rotation:** Regenerate tokens periodically (quarterly recommended)

## Documentation

For complete documentation, see:
- [DARCLOUD_OPERATIONS.md](../DARCLOUD_OPERATIONS.md) - Complete operations guide
- [DARCLOUD_QUICKREF.md](../DARCLOUD_QUICKREF.md) - Quick reference guide

## Support

For issues or questions, contact: ops@daralnas.com
