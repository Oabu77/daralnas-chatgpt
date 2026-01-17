# 🚀 Quick Start Guide

## Instant Launch Commands

### Local Development
```bash
# One-command start with monitoring
./scripts/launch.sh dev

# Or manual:
npm run dev                    # Terminal 1
./scripts/auto-monitor.sh      # Terminal 2 (optional)
```

### Check Status
```bash
./scripts/status-check.sh
```

### Production Deployment
```bash
# Via GitHub (recommended)
gh pr merge 54 --auto --squash

# Or manual:
npm run deploy
```

## 📍 Important URLs

**Local**: http://localhost:8787  
**Production**: https://daralnas-chatgpt.oabu77.workers.dev

## 🔑 Key Endpoints

- `/fungi/sentinel/health` - Health check
- `/fungi/sentinel/status` - Infrastructure status
- `/oliveexpress/shipments` - Shipment API
- `/tasks` - Task management
- `/` - OpenAPI documentation

## 🤖 Automation Status

✅ **Auto-Deploy**: Push to main = automatic deployment  
✅ **Auto-Repair**: Runs every 5 minutes automatically  
✅ **Health Monitoring**: Continuous 24/7  
✅ **Self-Healing**: Automatic failure recovery

## 📚 Full Documentation

- [LAUNCH_SUCCESS.md](./LAUNCH_SUCCESS.md) - Complete launch guide
- [AUTOMATION_COMPLETE.md](./AUTOMATION_COMPLETE.md) - Automation details
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [FUNGI_MESH_SENTINEL.md](./FUNGI_MESH_SENTINEL.md) - Sentinel docs

**Ready to launch!** 🎉
