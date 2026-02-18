# Auto-Connect Quick Reference

## Quick Start
```bash
npm run auto-connect
```

## All Commands
| Command | Description |
|---------|-------------|
| `npm run auto-connect` | Run bash version (recommended) |
| `npm run auto-connect:ts` | Run TypeScript version |
| `npm run auto-connect:test` | Test/validate implementation |

## Environment Variables
```bash
# Custom API endpoint
API_URL=http://localhost:8787 npm run auto-connect

# Custom network range
SCAN_RANGE=192.168.1.0/24 npm run auto-connect

# Disable deep scan
DEEP_SCAN=false npm run auto-connect

# Only discover (don't connect)
AUTO_CONNECT=false npm run auto-connect
```

## What It Does
1. 🔍 Scans network for devices
2. 🔌 Connects devices to Fungi Mesh
3. 🤖 Enables auto-maintenance (every 30 min)
4. 📊 Monitors device performance
5. ⚡ Optimizes network resources

## Expected Output
```
🔌 AUTO-CONNECT - Device Discovery & Connection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 Configuration:
   API URL: https://darcloud.host
   Scan Range: 192.168.0.0/16
   Deep Scan: true
   Auto Connect: true

🔍 Starting device discovery...

✅ Device Discovery Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Results:
   Devices Found: 6
   Connections Established: 6
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 Enabling auto-maintenance...
✅ Auto-maintenance enabled!

📱 Connected Devices:
   • Omar's Computer
   • Main Router
   • Primary Phone
   • Dev Laptop
   • Tablet
   • Smart TV

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ AUTO-CONNECT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## View Dashboard
```
https://darcloud.host/network.html
```

## Troubleshooting

### No devices found
```bash
# Try wider scan range
SCAN_RANGE=10.0.0.0/8 npm run auto-connect

# Enable deep scan
DEEP_SCAN=true npm run auto-connect
```

### API not responding
```bash
# Start dev server
npm run dev

# Or verify production
curl https://darcloud.host/
```

### Connection errors
- Check network connectivity
- Verify API is running
- Review firewall settings

## Related Commands
```bash
npm run dev                 # Start development server
npm run auto-monitor        # Monitor devices
npm run status              # Check system status
```

## Documentation
- Full docs: [docs/AUTO_CONNECT.md](./AUTO_CONNECT.md)
- API docs: https://darcloud.host/
- Network dashboard: https://darcloud.host/network.html

## Features Used
- `/network/tools/discover` - Device discovery API
- `/network/devices/auto-maintain` - Auto-maintenance API
- `src/config/auto-accept.ts` - Auto-connect configuration
- `public/network.html` - Web dashboard

## Integration
Auto-connect respects the auto-accept configuration:
```typescript
// src/config/auto-accept.ts
auto_connect_devices: true,
auto_pair_bluetooth: true,
auto_connect_usb: true,
auto_optimize_network: true
```

## Scheduling
Run auto-connect on a schedule:
```bash
# Cron (every hour)
0 * * * * cd /path/to/project && npm run auto-connect

# systemd timer
# Create /etc/systemd/system/auto-connect.timer
```

## CI/CD
```yaml
# .github/workflows/auto-connect.yml
on:
  schedule:
    - cron: '0 */6 * * *'
jobs:
  auto-connect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run auto-connect
```

## Support
- GitHub Issues
- API Documentation: https://darcloud.host/
- System Status: `npm run status`
