# DarCloud Host Setup - Complete Package

This package provides everything needed to run health checks, set up tunnels, and configure DarCloud host infrastructure as requested in the problem statement.

## Quick Start (TL;DR)

### 1️⃣ Run Diagnostics (Terminal A)

```bash
# Automated approach
./scripts/darcloud-diagnostics.sh

# Or manual commands
curl -sS http://127.0.0.1:7444/health | jq .
sudo ss -tulpen
```

### 2️⃣ Start Tunnel (Terminal B)

```bash
# Automated approach
sudo ./scripts/setup-tunnel.sh

# Or manual quick tunnel
cloudflared tunnel --url http://127.0.0.1:7444
```

### 3️⃣ Share Results

Copy and paste:
- ✅ Health JSON output
- ✅ Port manifest from `ss -tulpen`
- ✅ Tunnel URL (https://xxxxx.trycloudflare.com)

## 📚 Documentation Files

### Primary Documentation

1. **[DARCLOUD_QUICKREF.md](./DARCLOUD_QUICKREF.md)** - Quick reference guide
   - Exact commands to run
   - Expected outputs
   - Troubleshooting steps
   - What to share

2. **[DARCLOUD_OPERATIONS.md](./DARCLOUD_OPERATIONS.md)** - Complete operations guide
   - Detailed health check procedures
   - MeshTalk TCP/UDP routing configuration
   - Persistent named tunnel setup
   - Systemd service configuration
   - Agent/worker access policies
   - Redundancy and failover plans
   - Monitoring and alerting

### Supporting Documentation

- **[README.md](./README.md)** - Platform overview
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - OliveExpress deployment guide
- **[LIVE_STATUS.md](./LIVE_STATUS.md)** - Live system status
- **[API_TESTS.md](./API_TESTS.md)** - API testing guide

## 🔧 Scripts and Tools

### Automation Scripts

Located in `./scripts/`:

1. **`darcloud-diagnostics.sh`** - Diagnostic automation
   ```bash
   ./scripts/darcloud-diagnostics.sh           # Run all checks
   ./scripts/darcloud-diagnostics.sh health    # Health check only
   ./scripts/darcloud-diagnostics.sh ports     # Port manifest only
   ./scripts/darcloud-diagnostics.sh service   # Service status
   ./scripts/darcloud-diagnostics.sh logs      # View logs
   ./scripts/darcloud-diagnostics.sh tunnel-help  # Tunnel instructions
   ```

2. **`setup-tunnel.sh`** - Interactive tunnel setup
   ```bash
   sudo ./scripts/setup-tunnel.sh
   # Choose: 1) Quick tunnel (testing) or 2) Named tunnel (production)
   ```

### Configuration Templates

Located in `./scripts/`:

1. **`cloudflared-config.yml`** - Cloudflare tunnel configuration
   - Template for persistent named tunnels
   - Pre-configured for qc-agent on port 7444
   - Install to: `/etc/cloudflared/config.yml`

2. **`cloudflared-tunnel.service`** - Systemd service unit
   - Enables tunnel on boot
   - Automatic restart on failure
   - Install to: `/etc/systemd/system/cloudflared-tunnel.service`

## 📋 Problem Statement Requirements

All requirements from the problem statement are implemented:

### ✅ Terminal A Commands
- `curl -sS http://127.0.0.1:7444/health | jq .` - ✅ Documented and automated
- `sudo ss -tulpen` - ✅ Documented and automated

### ✅ Terminal B Command
- `cloudflared tunnel --url http://127.0.0.1:7444` - ✅ Documented and automated

### ✅ Troubleshooting Commands
- `sudo systemctl status qc-agent --no-pager` - ✅ Documented and automated
- `sudo journalctl -u qc-agent -n 120 --no-pager` - ✅ Documented and automated

### ✅ Deliverables
- 🔌 **DarCloud ports → services map** - See DARCLOUD_OPERATIONS.md, Section "DarCloud Ports → Services Map"
- 🌐 **MeshTalk TCP/UDP routing** - See DARCLOUD_OPERATIONS.md, Section "MeshTalk TCP/UDP Routing"
- 🧠 **Agent/worker access policy** - See DARCLOUD_OPERATIONS.md, Section "Agent/Worker Access Policy"
- 🧠 **Redundancy plan** - See DARCLOUD_OPERATIONS.md, Section "Redundancy Plan"
- 📡 **Persistent named tunnel** - See DARCLOUD_OPERATIONS.md, Section "Persistent Named Tunnel + Systemd Config"
- 📡 **Systemd config** - See scripts/cloudflared-tunnel.service

## 🚀 Usage Scenarios

### Scenario 1: Quick Diagnostic Check

```bash
# Run automated diagnostics
./scripts/darcloud-diagnostics.sh

# Review output and share with ops team
```

### Scenario 2: First-Time Setup

```bash
# Step 1: Run diagnostics to verify qc-agent is running
./scripts/darcloud-diagnostics.sh health

# Step 2: Set up tunnel interactively
sudo ./scripts/setup-tunnel.sh

# Step 3: Choose option 1 for testing or 2 for production
```

### Scenario 3: Production Deployment

```bash
# Step 1: Verify service health
./scripts/darcloud-diagnostics.sh all

# Step 2: Install cloudflared if needed
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Step 3: Run setup script and choose option 2
sudo ./scripts/setup-tunnel.sh
# Follow prompts for named tunnel setup

# Step 4: Verify tunnel is running
sudo systemctl status cloudflared-tunnel

# Step 5: Test public access
curl -sS https://your-hostname.daralnas.com/health | jq .
```

### Scenario 4: Troubleshooting

```bash
# Check service status
./scripts/darcloud-diagnostics.sh service

# View recent logs
./scripts/darcloud-diagnostics.sh logs

# Check port binding
./scripts/darcloud-diagnostics.sh ports

# Get tunnel setup help
./scripts/darcloud-diagnostics.sh tunnel-help
```

## 🔑 Key Features

### Automation
- ✅ Fully automated health checks
- ✅ Interactive tunnel setup
- ✅ Systemd service integration
- ✅ Error handling and diagnostics

### Documentation
- ✅ Quick reference for operators
- ✅ Comprehensive operations guide
- ✅ Step-by-step troubleshooting
- ✅ Configuration examples

### Security
- ✅ No direct internet exposure
- ✅ Cloudflare tunnel protection
- ✅ Access control policies
- ✅ Systemd hardening options

### Reliability
- ✅ Automatic service restart
- ✅ Health monitoring
- ✅ Redundancy planning
- ✅ Failover procedures

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────┐
│                  DarCloud Host                      │
│                                                     │
│  ┌──────────────┐         ┌──────────────┐        │
│  │  qc-agent    │◄────────┤ cloudflared  │        │
│  │  :7444       │         │  tunnel      │        │
│  └──────────────┘         └──────┬───────┘        │
│                                   │                 │
│  ┌──────────────┐                │                 │
│  │ telegram-bot │                │                 │
│  │  :8000       │                │                 │
│  └──────────────┘                │                 │
│                                   │                 │
│  ┌──────────────┐                │                 │
│  │  WireGuard   │                │                 │
│  │  :51820 UDP  │                │                 │
│  └──────────────┘                │                 │
└───────────────────────────────────┼─────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
                        ┌───────────────────┐
                        │  Cloudflare Edge  │
                        └─────────┬─────────┘
                                  │
                                  ▼
                        https://qc-agent.daralnas.com
```

## 🎯 Next Steps After Setup

Once you've run the commands and shared the outputs, you will receive:

1. **Finalized port mapping** - Exact mapping of all DarCloud services to ports
2. **MeshTalk routing config** - WireGuard configuration for inter-node communication
3. **Access policies** - Role-based access control for agents, workers, and admins
4. **Redundancy configuration** - Multi-node setup with health check failover
5. **Monitoring integration** - Prometheus metrics and alerting rules

## 📞 Support

- **Email**: ops@daralnas.com
- **Documentation**: See DARCLOUD_OPERATIONS.md
- **Quick Reference**: See DARCLOUD_QUICKREF.md
- **Scripts**: Check ./scripts/ directory

## 🔐 Security Best Practices

1. ✅ Always use cloudflared tunnel - never expose services directly
2. ✅ Use named tunnels in production - avoid quick tunnels
3. ✅ Enable systemd service - automatic restart on failure
4. ✅ Configure access policies - limit who can access services
5. ✅ Monitor health endpoints - detect issues early
6. ✅ Use MeshTalk for internal - encrypted inter-node communication
7. ✅ Regular credential rotation - update tunnel credentials quarterly

## 📝 Summary

This package provides:

- ✅ Complete documentation (2 guides + quick reference)
- ✅ Automated diagnostic script (1 script with 6 commands)
- ✅ Interactive setup script (1 script for tunnel installation)
- ✅ Configuration templates (systemd service + cloudflared config)
- ✅ All requirements from problem statement implemented
- ✅ Production-ready with security best practices
- ✅ Troubleshooting and fallback procedures
- ✅ Redundancy and monitoring guidance

**Total Files Created:**
- 📄 3 documentation files (DARCLOUD_OPERATIONS.md, DARCLOUD_QUICKREF.md, this file)
- 🔧 2 executable scripts (darcloud-diagnostics.sh, setup-tunnel.sh)
- ⚙️ 2 configuration templates (cloudflared-config.yml, cloudflared-tunnel.service)
- ✏️ 1 README update

**Ready for immediate use!** 🚀
