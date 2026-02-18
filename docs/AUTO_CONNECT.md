# Auto-Connect Feature

The Auto-Connect feature automatically discovers and connects all network devices to the DarCloud™ platform.

## Overview

Auto-Connect is a powerful feature that:
- 🔍 Automatically scans the network for devices
- 🔌 Connects discovered devices to the Fungi Mesh network
- 🤖 Enables automatic maintenance and optimization
- 📊 Monitors device performance continuously
- ⚡ Optimizes network resources automatically

## Quick Start

### Using npm

```bash
# Run auto-connect (bash version)
npm run auto-connect

# Run auto-connect (TypeScript version)
npm run auto-connect:ts
```

### Using the script directly

```bash
# Bash version
bash scripts/auto-connect.sh

# TypeScript version (requires tsx)
npx tsx scripts/auto-connect.ts
```

## Configuration

Auto-Connect can be configured using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `https://darcloud.host` | The API endpoint URL |
| `SCAN_RANGE` | `192.168.0.0/16` | IP range to scan for devices |
| `DEEP_SCAN` | `true` | Enable deep scanning |
| `AUTO_CONNECT` | `true` | Automatically connect discovered devices |

### Example with custom configuration

```bash
# Custom API URL and scan range
API_URL=http://localhost:8787 SCAN_RANGE=192.168.1.0/24 npm run auto-connect

# Disable deep scan
DEEP_SCAN=false npm run auto-connect

# Only discover, don't auto-connect
AUTO_CONNECT=false npm run auto-connect
```

## Features

### 1. Device Discovery

Auto-Connect scans the network and discovers:
- 💻 Computers and laptops
- 📱 Mobile phones and tablets
- 🌐 Routers and network equipment
- 📺 Smart TVs and IoT devices
- 🔌 Any IP-connected device

### 2. Automatic Connection

Once devices are discovered, Auto-Connect:
- Establishes connection to the Fungi Mesh network
- Registers devices in the network database
- Tracks device performance metrics
- Monitors connection status

### 3. Auto-Maintenance

After connecting devices, Auto-Connect enables automatic maintenance:
- **Interval**: Every 30 minutes
- **Auto-optimize**: Enabled
- **Auto-repair**: Enabled
- **Performance monitoring**: Continuous

### 4. Performance Tracking

All connected devices are continuously monitored for:
- CPU usage
- Memory usage
- Network latency
- Connection status
- Performance score

## API Endpoints Used

Auto-Connect utilizes the following API endpoints:

### Device Discovery
```http
POST /network/tools/discover
Content-Type: application/json

{
  "scan_range": "192.168.0.0/16",
  "deep_scan": true,
  "auto_connect": true
}
```

### Auto-Maintenance
```http
POST /network/devices/auto-maintain
Content-Type: application/json

{
  "enabled": true,
  "interval_minutes": 30,
  "auto_optimize": true,
  "auto_repair": true
}
```

## Web Dashboard

After running auto-connect, you can view the connected devices on the web dashboard:

```
https://darcloud.host/network.html
```

The dashboard provides:
- Real-time device status
- Performance metrics
- Optimization history
- Manual control options

## Integration with Auto-Accept Config

Auto-Connect respects the settings in `src/config/auto-accept.ts`:

```typescript
export const AUTO_ACCEPT_CONFIG = {
  // Network Operations
  auto_connect_devices: true,
  auto_pair_bluetooth: true,
  auto_connect_usb: true,
  auto_optimize_network: true,
  auto_scale_nodes: true,
  auto_grow_network: true,
  // ...
};
```

When these options are enabled, devices are automatically connected without user confirmation.

## Troubleshooting

### API Not Responding

If you get connection errors:

1. Check that the API is running:
   ```bash
   npm run dev
   ```

2. Verify the API URL:
   ```bash
   curl https://darcloud.host/
   ```

3. Check network connectivity

### No Devices Found

If no devices are discovered:

1. Verify the scan range matches your network
2. Enable deep scan: `DEEP_SCAN=true npm run auto-connect`
3. Check firewall settings
4. Ensure devices are on the same network

### Connection Failed

If devices are discovered but not connected:

1. Check device permissions
2. Verify network accessibility
3. Review device logs
4. Check AUTO_CONNECT setting

## Advanced Usage

### Programmatic Usage

You can use the TypeScript module in your own code:

```typescript
import { discoverAndConnectDevices, enableAutoMaintenance } from './scripts/auto-connect';

async function setup() {
  // Discover and connect devices
  const result = await discoverAndConnectDevices();
  console.log(`Connected ${result.connections_established} devices`);

  // Enable auto-maintenance
  await enableAutoMaintenance();
}

setup();
```

### Scheduled Auto-Connect

Run auto-connect on a schedule using cron:

```bash
# Run every hour
0 * * * * cd /path/to/daralnas-chatgpt && npm run auto-connect >> /var/log/auto-connect.log 2>&1
```

### GitHub Actions Integration

Add auto-connect to your CI/CD pipeline:

```yaml
name: Auto-Connect Devices

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  auto-connect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run auto-connect
        env:
          API_URL: ${{ secrets.API_URL }}
```

## Related Features

- **Auto-Monitor**: Continuous monitoring of connected devices (`npm run auto-monitor`)
- **Network Tools**: Manual device management at `/network/tools/*`
- **Device Dashboard**: Real-time device visualization at `/network.html`
- **Fungi Mesh**: Decentralized network infrastructure

## Security Considerations

Auto-Connect follows security best practices:

- ✅ No credentials stored in scripts
- ✅ API communication over HTTPS
- ✅ Device permissions respected
- ✅ Rate limiting enforced
- ✅ Audit logging enabled

## Support

For issues or questions:
- View API documentation: `https://darcloud.host/`
- Check system status: `npm run status`
- Review logs: Check console output
- GitHub Issues: Open an issue in the repository

---

**DarCloud™ Platform - Auto-Connect Feature**
Version 1.0.0
