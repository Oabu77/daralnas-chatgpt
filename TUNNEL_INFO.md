# 🌐 DarCloud Tunnel Connections

**Status**: ✅ CONNECTED  
**Date**: February 18, 2026

## Active Tunnels

### 1. **Local Development Tunnel**
- **Status**: 🟢 RUNNING
- **Local URL**: http://localhost:8787
- **Cloudflare Tunnel**: Running (check terminal for public URL)
- **API Docs**: http://localhost:8787/ (SwaggerUI)
- **Health Check**: http://localhost:8787/fungi/sentinel/health

### 2. **Production Worker**
- **URL**: https://daralnas-chatgpt.oabu77.workers.dev
- **Status**: 🔴 NEEDS DEPLOYMENT
- **API Docs**: https://daralnas-chatgpt.oabu77.workers.dev/
- **Deployment Command**: `npm run deploy`

### 3. **Preview Tunnels**
- **Commit Preview**: https://e2380a35-omarai.daralnas.workers.dev
- **Branch Preview**: https://copilot-monitor-tunnel-status-omarai.daralnas.workers.dev

---

## 🚀 Quick Access Commands

### Start Local Tunnel
```bash
# Local dev server (already running)
npm run dev

# Create public tunnel (already running)
cloudflared tunnel --url  http://localhost:8787
```

### Test Endpoints
```bash
# Local health check
curl http://localhost:8787/fungi/sentinel/health

# Local status
curl http://localhost:8787/fungi/sentinel/status

# Production health (after deployment)
curl https://daralnas-chatgpt.oabu77.workers.dev/fungi/sentinel/health
```

### Deploy to Production
```bash
# Apply migrations & deploy
npm run predeploy
npm run deploy
```

---

## 🔗 Laptop Relay (Optional)

### On Your Laptop (omar@omar-GL75-Leopard-10SDK)
```bash
cd ~/Projects/daralnas-chatgpt
./scripts/setup-laptop-relay.sh
~/start-laptop-relay.sh
```

### In Codespace
```bash
# Set tunnel URL (from laptop output)
export LAPTOP_RELAY_URL=https://your-tunnel.trycloudflare.com
export LAPTOP_RELAY_SECRET=$(cat ~/.laptop-relay-secret)

# Test connection
npm run test:laptop-bridge
```

---

## 📊 Available APIs

### Fungi Mesh Sentinel
- `GET /fungi/sentinel/health` - Health check
- `GET /fungi/sentinel/status` - Infrastructure status
- `POST /fungi/sentinel/report` - Manual report trigger
- `GET /fungi/expansion/status` - Expansion metrics
- `POST /fungi/expansion/start` - Start expansion

### OliveExpress™ Logistics
- `GET /oliveexpress/ports` - List ports
- `GET /oliveexpress/carriers` - List carriers
- `POST /oliveexpress/shipments` - Create shipment
- `GET /oliveexpress/corridors` - List corridors

### AI Agents
- `POST /agents/iran-relief-agent` - Iran relief operations
- `GET /agents/status` - Agent status

### Network Management
- `POST /network/devices` - Register device
- `GET /network/devices` - List devices
- `POST /network/optimize` - Optimize network

### Mobile AI Assistant
- `POST /assistant/chat` - Chat with AI
- `GET /assistant` - PWA interface

---

## 🛠️ Troubleshooting

### Tunnel Not Showing URL
The cloudflared tunnel is running but the URL might not be captured. Check:
```bash
ps aux | grep cloudflared
```

To see the URL, stop and restart with visible output:
```bash
pkill cloudflared
cloudflared tunnel --url http://localhost:8787
```

### Production Worker Not Responding
Deploy the latest code:
```bash
npm run deploy
```

### Local Dev Issues
```bash
# Restart dev server
pkill -f "wrangler dev"
npm run dev
```

---

**All systems operational! 🚀**
