# Quick Start Guide: Deep Search and Reconnect

## 🚀 Quick Access

**UI**: https://darcloud.host/network.html
**API Docs**: https://darcloud.host/

## 📖 Usage Examples

### From UI

#### 1. Run Deep Search
1. Open https://darcloud.host/network.html
2. Click "🔎 Deep Search & Connect"
3. Wait for results popup showing:
   - Network devices found
   - Cloudflare apps found
   - Connections established

#### 2. Reconnect Disconnected Devices
1. Open https://darcloud.host/network.html
2. Click "🔄 Reconnect All"
3. View reconnection results:
   - ✅ Reconnected count
   - ❌ Failed count
   - Device-by-device status

#### 3. Check Connection Status
1. Open https://darcloud.host/network.html
2. Click "📊 Connection Status"
3. See real-time overview:
   - Active connections
   - Disconnected/reconnecting/failed
   - Cloudflare apps health

### From API

#### Deep Search (cURL)
```bash
curl -X POST https://darcloud.host/network/deep-search \
  -H "Content-Type: application/json" \
  -d '{
    "scan_type": "all",
    "scan_cloudflare": true,
    "scan_relay": true,
    "auto_connect": true
  }'
```

#### Reconnect All (cURL)
```bash
curl -X POST https://darcloud.host/network/reconnect \
  -H "Content-Type: application/json" \
  -d '{
    "retry_failed": true,
    "max_retries": 3,
    "backoff_ms": 1000
  }'
```

#### Connection Status (cURL)
```bash
curl https://darcloud.host/network/connections/status
```

### From JavaScript

#### Deep Search
```javascript
const response = await fetch('https://darcloud.host/network/deep-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scan_type: 'all',
    scan_cloudflare: true,
    auto_connect: true
  })
});
const data = await response.json();
console.log(`Found ${data.devices_found} devices, ${data.cloudflare_apps_found} apps`);
```

#### Reconnect
```javascript
const response = await fetch('https://darcloud.host/network/reconnect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    retry_failed: true,
    max_retries: 3
  })
});
const data = await response.json();
console.log(`Reconnected: ${data.reconnected}, Failed: ${data.failed}`);
```

## 🎯 Common Tasks

### Task: Find All Cloudflare Apps
```bash
curl -X POST https://darcloud.host/network/deep-search \
  -H "Content-Type: application/json" \
  -d '{"scan_type": "cloudflare"}'
```

### Task: Scan Network Only
```bash
curl -X POST https://darcloud.host/network/deep-search \
  -H "Content-Type: application/json" \
  -d '{"scan_type": "deep", "scan_cloudflare": false}'
```

### Task: Reconnect Specific Devices
```bash
curl -X POST https://darcloud.host/network/reconnect \
  -H "Content-Type: application/json" \
  -d '{
    "device_ids": ["omar-computer", "router-001"],
    "max_retries": 5
  }'
```

### Task: Check Health of Cloudflare Apps
```bash
curl https://darcloud.host/network/connections/status | \
  jq '.cloudflare_apps[] | {name: .app_name, health: .health_status}'
```

## 📊 Response Formats

### Deep Search Response
```json
{
  "success": true,
  "scan_id": 1,
  "devices_found": 6,
  "cloudflare_apps_found": 5,
  "connections_established": 11,
  "devices": [...],
  "cloudflare_apps": [
    {
      "app_name": "DarCloud API Worker",
      "app_type": "worker",
      "health_status": "healthy"
    }
  ]
}
```

### Reconnect Response
```json
{
  "success": true,
  "reconnected": 4,
  "failed": 1,
  "results": [
    {
      "device_id": "omar-computer",
      "status": "reconnected"
    }
  ]
}
```

### Status Response
```json
{
  "success": true,
  "total_connections": 10,
  "active": 8,
  "disconnected": 1,
  "reconnecting": 0,
  "failed": 1
}
```

## 🔧 Troubleshooting

### No devices found
- Check IP ranges in request
- Verify network connectivity
- Try scan_type: "all"

### Reconnection keeps failing
- Increase max_retries
- Increase backoff_ms
- Check device is online

### Cloudflare apps not showing
- Ensure scan_cloudflare: true
- Check Cloudflare deployment
- Verify app endpoints

## 📚 More Information

- **Full Documentation**: docs/DEEP_SEARCH_RECONNECT.md
- **Implementation Details**: IMPLEMENTATION_SUMMARY.md
- **API Reference**: https://darcloud.host/ (OpenAPI docs)

## 🆘 Support

For issues or questions:
1. Check troubleshooting section above
2. Review full documentation
3. Check API response for error details
4. Contact support with scan_id for tracking
