# DarCloud Quick Reference

Quick reference for running the diagnostic commands requested in the problem statement.

## Terminal A: Health Check + Port Manifest

Run these commands and paste the output:

```bash
# 1. Health check with formatted JSON output
curl -sS http://127.0.0.1:7444/health | jq .

# 2. Port manifest - show all listening TCP/UDP ports
sudo ss -tulpen
```

### Expected Health Check Output

```json
{
  "status": "ok",
  "service": "qc-agent",
  "version": "1.0.0",
  "timestamp": "2026-01-17T11:17:44Z"
}
```

### Port Manifest Notes

Look for these key ports in the `ss` output:

- `127.0.0.1:7444` - qc-agent service (should be LISTEN)
- `0.0.0.0:8000` - Telegram bot (if running)
- `0.0.0.0:51820` - WireGuard/MeshTalk (UDP)

## Terminal B: Start Cloudflared Tunnel

Run this command and keep the terminal open:

```bash
cloudflared tunnel --url http://127.0.0.1:7444
```

### Expected Tunnel Output

```
2026-01-17T11:17:44Z INF +--------------------------------------------------------------------------------------------+
2026-01-17T11:17:44Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
2026-01-17T11:17:44Z INF |  https://xxxxx.trycloudflare.com                                                           |
2026-01-17T11:17:44Z INF +--------------------------------------------------------------------------------------------+
```

**Important:** Copy the `https://xxxxx.trycloudflare.com` URL and share it.

## Troubleshooting: If Anything Fails

Run these commands to diagnose issues:

```bash
# Check qc-agent service status
sudo systemctl status qc-agent --no-pager

# View recent logs (last 120 lines)
sudo journalctl -u qc-agent -n 120 --no-pager
```

## Automated Diagnostics Script

For convenience, use the diagnostics script:

```bash
# Run all diagnostics
./scripts/darcloud-diagnostics.sh

# Or run specific checks
./scripts/darcloud-diagnostics.sh health
./scripts/darcloud-diagnostics.sh ports
./scripts/darcloud-diagnostics.sh service
./scripts/darcloud-diagnostics.sh logs
./scripts/darcloud-diagnostics.sh tunnel-help
```

## Automated Tunnel Setup

Use the setup script for easy tunnel installation:

```bash
# Interactive tunnel setup
sudo ./scripts/setup-tunnel.sh
```

Choose option 1 for quick testing or option 2 for production setup.

## What to Share

After running the commands above, share:

1. ✅ **Health JSON** - Output from `curl -sS http://127.0.0.1:7444/health | jq .`
2. ✅ **Port manifest** - Output from `sudo ss -tulpen`
3. ✅ **Tunnel URL** - The `https://xxxxx.trycloudflare.com` URL from cloudflared

This will enable configuration of:

- 🔌 DarCloud ports → services map
- 🌐 MeshTalk TCP/UDP routing (WireGuard plane)
- 🧠 Agent/worker access policy + redundancy plan
- 📡 Persistent named tunnel + systemd config

## Next Steps

Once the outputs are shared, you'll receive:

1. **Exact port mapping** - Which ports map to which services
2. **MeshTalk routing config** - TCP/UDP routing through WireGuard
3. **Access policies** - Who can access what
4. **Redundancy plan** - High availability configuration
5. **Persistent tunnel config** - Named tunnel with systemd service

## Reference Documentation

For detailed information, see:

- [DARCLOUD_OPERATIONS.md](./DARCLOUD_OPERATIONS.md) - Complete operations guide
- [README.md](./README.md) - Platform overview
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions

## Common Issues

### Health check returns connection refused

```bash
# Service is not running - start it
sudo systemctl start qc-agent

# Check if it started successfully
sudo systemctl status qc-agent
```

### Port 7444 not in ss output

```bash
# Check if service is configured to listen on 7444
sudo journalctl -u qc-agent -n 50

# Verify service configuration
sudo cat /etc/systemd/system/qc-agent.service
```

### Cloudflared command not found

```bash
# Install cloudflared on Debian/Ubuntu
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify installation
cloudflared --version
```

### Tunnel fails to start

```bash
# Check network connectivity
ping -c 3 cloudflare.com

# Try with verbose logging
cloudflared tunnel --url http://127.0.0.1:7444 --loglevel debug
```

## Support

For additional assistance:

- Email: ops@daralnas.com
- Documentation: See DARCLOUD_OPERATIONS.md
- Scripts: Check ./scripts/ directory
