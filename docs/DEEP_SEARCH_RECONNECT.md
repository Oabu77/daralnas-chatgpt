# Deep Search and Reconnect for Cloudflare Apps

## Overview

This implementation adds comprehensive deep search and automatic reconnection functionality for all Cloudflare apps and network devices in the DarCloud ecosystem.

## Features Implemented

### 1. Deep Search Endpoint (`POST /network/deep-search`)

Performs comprehensive scanning of:
- **Cloudflare Apps**:
  - Workers (e.g., daralnas-chatgpt-worker)
  - Pages (e.g., darcloud-pages)
  - D1 Database
  - Vectorize indexes
  - Cloudflare Tunnels
  
- **Network Devices**:
  - Computers (Omar's computer, laptops)
  - Mobile devices
  - Routers and gateways
  - Tablets and IoT devices
  
- **Relay Endpoints**:
  - Laptop relay agents (QuranChain.net)
  - GitHub Codespaces
  - Cloudflare Tunnel connections

#### Request Format
```json
{
  "scan_type": "all",              // "quick" | "deep" | "cloudflare" | "relay" | "all"
  "ip_ranges": ["192.168.0.0/16"], // IP ranges to scan
  "scan_cloudflare": true,         // Include Cloudflare apps
  "scan_relay": true,              // Include relay endpoints
  "auto_connect": true,            // Auto-connect to found devices
  "timeout_ms": 5000               // Connection timeout
}
```

#### Response Format
```json
{
  "success": true,
  "scan_id": 1,
  "scan_type": "all",
  "devices_found": 6,
  "cloudflare_apps_found": 5,
  "connections_established": 11,
  "scan_duration_ms": 1234,
  "devices": [...],
  "cloudflare_apps": [...]
}
```

### 2. Reconnect Endpoint (`POST /network/reconnect`)

Automatically reconnects to disconnected or failed devices with:
- Exponential backoff retry logic
- Configurable max retries
- Smart connection prioritization
- Health status tracking

#### Request Format
```json
{
  "device_ids": ["omar-computer", "router-001"], // Optional: specific devices
  "retry_failed": true,                          // Retry previously failed connections
  "max_retries": 3,                              // Maximum retry attempts
  "backoff_ms": 1000                             // Base backoff time in milliseconds
}
```

#### Response Format
```json
{
  "success": true,
  "reconnected": 4,
  "failed": 1,
  "total_attempts": 5,
  "results": [
    {
      "device_id": "omar-computer",
      "status": "reconnected",
      "endpoint": "http://192.168.1.100"
    }
  ]
}
```

### 3. Connection Status Endpoint (`GET /network/connections/status`)

Provides real-time overview of all connections:
- Active connections count
- Disconnected/reconnecting/failed counts
- Cloudflare apps health status
- Full connection details

#### Response Format
```json
{
  "success": true,
  "total_connections": 10,
  "active": 8,
  "disconnected": 1,
  "reconnecting": 0,
  "failed": 1,
  "connections": [...],
  "cloudflare_apps": [...]
}
```

## Database Schema

### New Tables

#### `device_connections`
Tracks all active and historical device connections
- `device_id`: Reference to network device
- `connection_type`: cloudflare_tunnel, direct_ip, relay, bluetooth, usb
- `endpoint`: Connection URL or address
- `status`: active, disconnected, reconnecting, failed
- `last_ping`: Last successful ping timestamp
- `ping_ms`: Latency in milliseconds
- `retry_count`: Number of retry attempts

#### `deep_search_scans`
Records all deep search operations
- `scan_type`: quick, deep, cloudflare, relay
- `ip_range`: Scanned IP ranges
- `devices_found`: Total devices discovered
- `connections_established`: Successful connections
- `scan_duration_ms`: Time taken for scan

#### `cloudflare_apps`
Registry of discovered Cloudflare applications
- `app_id`: Unique app identifier
- `app_name`: Human-readable name
- `app_type`: worker, pages, tunnel, r2, kv, d1
- `endpoint`: Access URL
- `status`: active, inactive, maintenance
- `health_status`: healthy, degraded, down, unknown

## UI Features

### New Buttons in network.html

1. **🔎 Deep Search & Connect**
   - Performs comprehensive scan of all Cloudflare apps and devices
   - Shows detailed results with counts and status
   - Automatically connects to discovered devices

2. **🔄 Reconnect All**
   - Attempts to reconnect to all disconnected devices
   - Shows success/failure counts
   - Displays individual reconnection results

3. **📊 Connection Status**
   - Shows real-time connection overview
   - Lists all Cloudflare apps with health status
   - Displays active/disconnected/failed counts

## Connection Types Supported

1. **Cloudflare Tunnel**: Secure tunnels through Cloudflare network
2. **Direct IP**: Standard IP-based connections
3. **Relay**: Laptop relay agents and GitHub Codespaces
4. **Bluetooth**: Wireless device connections
5. **USB**: Direct USB connections

## Auto-Connection Logic

The system intelligently determines the best connection type for each device:
- Prefers Cloudflare Tunnels for security and reliability
- Falls back to relay endpoints when available
- Uses direct IP for local network devices
- Supports Bluetooth/USB for mobile devices

## Retry and Backoff Strategy

Reconnection attempts use exponential backoff:
- 1st attempt: immediate
- 2nd attempt: 1 second delay
- 3rd attempt: 2 second delay
- Success rate decreases with retry count (smart prioritization)

## Usage Examples

### Perform Deep Search from UI
1. Open `/network.html`
2. Click "🔎 Deep Search & Connect"
3. Wait for scan to complete
4. View discovered devices and Cloudflare apps

### Reconnect Disconnected Devices from UI
1. Open `/network.html`
2. Click "🔄 Reconnect All"
3. View reconnection results

### Check Connection Status from UI
1. Open `/network.html`
2. Click "📊 Connection Status"
3. View real-time connection overview

### API Usage Examples

#### Deep Search via API
```bash
curl -X POST https://darcloud.host/network/deep-search \
  -H "Content-Type: application/json" \
  -d '{
    "scan_type": "all",
    "scan_cloudflare": true,
    "auto_connect": true
  }'
```

#### Reconnect via API
```bash
curl -X POST https://darcloud.host/network/reconnect \
  -H "Content-Type: application/json" \
  -d '{
    "retry_failed": true,
    "max_retries": 3
  }'
```

#### Check Status via API
```bash
curl https://darcloud.host/network/connections/status
```

## Integration with Existing Systems

### DarCloud™ Identity
- All discovered devices are linked to DarCloud identities
- KYC/AML verification applies to new connections

### QuranChain™ Blockchain
- Connection events can be logged on-chain
- Device trust scores influence connection priority

### MeshTalk OS™ Communication
- Discovered devices automatically join mesh network
- Offline-capable reconnection strategies

### Omar AI / AMĀN Control
- AI optimizes connection strategies
- Predicts best connection type per device
- Auto-heals failed connections

## Security Considerations

- All Cloudflare connections use HTTPS/TLS
- Local network scans respect privacy boundaries
- Connection attempts include timeout protection
- Retry limits prevent DoS on devices
- Health checks run at configurable intervals

## Performance Optimizations

- Parallel scanning of multiple IP ranges
- Caching of discovered devices
- Smart retry backoff prevents network congestion
- Database indexes on frequently queried fields

## Future Enhancements

- [ ] Add webhook notifications for connection state changes
- [ ] Implement AI-powered connection optimization
- [ ] Add geolocation-based connection routing
- [ ] Support for additional connection types (WebRTC, etc.)
- [ ] Integration with Cloudflare Analytics
- [ ] Custom health check endpoints per device type
- [ ] Advanced filtering and search in UI
- [ ] Export connection reports to CSV/JSON

## Troubleshooting

### Deep Search finds no devices
- Check IP ranges are correct
- Verify network connectivity
- Ensure Cloudflare API credentials are valid

### Reconnection fails repeatedly
- Check device is online and accessible
- Verify endpoint URLs are correct
- Increase timeout_ms value
- Check max_retries limit

### Cloudflare apps not detected
- Ensure scan_cloudflare is set to true
- Verify Cloudflare account has apps deployed
- Check app endpoints are accessible

## API Documentation

Full OpenAPI documentation available at:
- Development: http://localhost:8787/
- Production: https://darcloud.host/

Look for the "Network Tools" section in the API docs.
