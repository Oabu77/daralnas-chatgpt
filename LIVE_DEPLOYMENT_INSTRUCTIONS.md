# 🚀 LIVE PRODUCTION DEPLOYMENT INSTRUCTIONS

## QuranChain-OS Production Services

**Date:** February 16, 2026 (Updated)
**Status:** ✅ DEPLOYED & OPERATIONAL

---

## ✅ Current Deployment Status

All core services are running and operational:
- ✅ Gaming Servers 1-4 (ports 7002-7005)
- ✅ Blockchain Server (port 3001)
- ✅ Revenue API (port 3000)
- ✅ Nginx Reverse Proxy (ports 80/443)
- ✅ Health Monitoring (every 5 minutes)

---

## 📊 System Service Management

All services are managed via **systemd** with automatic restart on failure:

### View Service Status
```bash
# Check all quranchain services
systemctl status quranchain-*

# Check specific service
systemctl status quranchain-blockchain.service
systemctl status quranchain-gaming-7002.service

# View service logs
journalctl -u quranchain-blockchain.service -n 50
journalctl -u quranchain-blockchain.service -f  # Follow logs

# View all recent logs
tail -f logs/production/*.log
```

### Manage Services
```bash
# Restart a service
systemctl restart quranchain-app.service
systemctl restart quranchain-blockchain.service
systemctl restart quranchain-gaming-7002.service

# Stop all services
systemctl stop quranchain-*

# Start all services
systemctl start quranchain-*

# Check if service is enabled (auto-start on boot)
systemctl is-enabled quranchain-app.service
```

---

## 🔍 Check Deployment Status

```bash
# Run status dashboard
bash deployment-status-dashboard.sh

# Or check manually
curl http://localhost:3000/health | jq .
curl http://localhost:3001/health | jq .
curl http://localhost:7002/health | jq .

# Check nginx
curl http://localhost/health

# Check specific subdomains (after DNS is live)
curl -k https://api.darcloud.host/health
curl -k https://blockchain.darcloud.host/health
```

---

## 🎯 Service Details

| Service | Port | Purpose |
|---------|------|---------|
| Gaming Server 1 | 7002 | Backup nodes & healing |
| Gaming Server 2 | 7003 | Backup nodes & healing |
| Gaming Server 3 | 7004 | Backup nodes & healing |
| Gaming Server 4 | 7005 | Backup nodes & healing |
| FungiMesh Network | 3001 | Core P2P network with auto-healing |
| Revenue Server | 3000 | Revenue generation & analytics |
| FungiMesh Python | 5006 | Python-based mesh operations |
| Cloudflare Tunnel | N/A | DarCloud hosting access |

---

## 🩹 Auto-Healing Features Active

- **Health Monitoring**: Network health checked every 30 seconds
- **Automatic Recovery**: Healing triggers when health < 50%
- **Gaming Backup**: Uses gaming servers for node recovery
- **Failover Protection**: Automatic failover during critical failures
- **Load Balancing**: Redistributes load across healthy nodes

---

## 📊 Monitoring Commands

```bash
# Network health
curl http://localhost:3001/mesh/status

# Healing statistics
curl http://localhost:3001/mesh/stats

# Manual healing test
curl -X POST http://localhost:3001/mesh/heal

# View logs
tail -f logs/blockchain-server.log
tail -f logs/gaming-server-*.log
```

---

## 🔧 Troubleshooting

### If services don't start:
1. Check Node.js: `node --version`
2. Check Python: `python3 --version`
3. Check ports: `ss -tlnp | grep -E '3000|3001|5006|7002'`
4. Check logs: `tail -20 logs/*.log`

### If healing doesn't work:
1. Verify gaming servers: `curl http://localhost:7002/health`
2. Check mesh config: `grep HEALING src/config/meshConfig.js`
3. Test healing: `curl -X POST http://localhost:3001/mesh/heal`

---

## 🎉 Deployment Complete Checklist

- [ ] Gaming servers running (4/4)
- [ ] FungiMesh network operational
- [ ] Revenue services active
- [ ] Cloudflare tunnel connected
- [ ] Auto-healing enabled
- [ ] Network health > 75%
- [ ] Logs showing normal operation

---

**Founder: Omar Mohammad Abunadi™**
**System: QuranChain-OS FungiMesh Network**
**Deployment: LIVE PRODUCTION**