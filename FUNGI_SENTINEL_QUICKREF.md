# Fungi Mesh Sentinel - Quick Reference

## API Endpoints

### 1. Health Check
Check if the sentinel is operational.

**Request:**
```bash
curl https://your-worker.workers.dev/fungi/sentinel/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-17T11:45:00.000Z",
  "sentinel": {
    "operational": true,
    "version": "1.0.0"
  }
}
```

---

### 2. Get Current Status (Full Report)
Get the current infrastructure status in full text format.

**Request:**
```bash
curl https://your-worker.workers.dev/fungi/sentinel/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OFFLINE",
    "timestamp": "2026-01-17T11:45:00.000Z",
    "host": "cloudflare-worker",
    "environment": "DarCloud",
    "report": "🔔 DARCloud Tunnel Status Update\n\nStatus: OFFLINE\n..."
  }
}
```

---

### 3. Get Current Status (JSON Format)
Get machine-readable JSON report.

**Request:**
```bash
curl "https://your-worker.workers.dev/fungi/sentinel/status?format=json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OFFLINE",
    "timestamp": "2026-01-17T11:45:00.000Z",
    "host": "cloudflare-worker",
    "environment": "DarCloud",
    "report": {
      "status": "OFFLINE",
      "timestamp": "2026-01-17T11:45:00.000Z",
      "host": "cloudflare-worker",
      "environment": "DarCloud",
      "controlPlane": {
        "qcAgent": "OFFLINE",
        "healthCheck": "FAIL"
      },
      "tunnel": {
        "type": "Cloudflare (trycloudflare)",
        "processState": "STOPPED"
      },
      "ports": ["7444/tcp → qc-agent (NOT LISTENING)"],
      "meshTalkDataPlane": {
        "overlay": "none",
        "status": "NOT_READY"
      },
      "redundancy": {
        "primaryTunnel": "DOWN",
        "secondaryTunnel": "NOT_PRESENT"
      },
      "notes": [
        "qc-agent service is not running",
        "Tunnel process is not running",
        "MeshTalk data plane is not ready",
        "No secondary tunnel configured"
      ]
    }
  }
}
```

---

### 4. Get Current Status (Worker Format)
Get minimal one-line status for resource-constrained workers.

**Request:**
```bash
curl "https://your-worker.workers.dev/fungi/sentinel/status?format=worker"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OFFLINE",
    "timestamp": "2026-01-17T11:45:00.000Z",
    "host": "cloudflare-worker",
    "environment": "DarCloud",
    "report": "🔴 OFFLINE | DarCloud | 2026-01-17T11:45:00.000Z\nCP: OFFLINE | Tunnel: STOPPED | Mesh: NOT_READY"
  }
}
```

---

### 5. Get Current Status (Heartbeat Format)
Get compact JSON for cron/scheduled monitoring.

**Request:**
```bash
curl "https://your-worker.workers.dev/fungi/sentinel/status?format=heartbeat"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OFFLINE",
    "timestamp": "2026-01-17T11:45:00.000Z",
    "host": "cloudflare-worker",
    "environment": "DarCloud",
    "report": "{\"ts\":\"2026-01-17T11:45:00.000Z\",\"env\":\"DarCloud\",\"status\":\"OFFLINE\",\"cp\":false,\"tunnel\":false,\"url\":null}"
  }
}
```

---

### 6. Get Current Status (MeshTalk Format)
Get MeshTalk-native broadcast message.

**Request:**
```bash
curl "https://your-worker.workers.dev/fungi/sentinel/status?format=meshtalk"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OFFLINE",
    "timestamp": "2026-01-17T11:45:00.000Z",
    "host": "cloudflare-worker",
    "environment": "DarCloud",
    "report": {
      "type": "infrastructure.status",
      "version": "1.0",
      "timestamp": "2026-01-17T11:45:00.000Z",
      "source": "cloudflare-worker",
      "environment": "DarCloud",
      "payload": {
        "status": "OFFLINE",
        "services": {
          "controlPlane": "OFFLINE",
          "tunnel": "STOPPED",
          "meshTalk": "NOT_READY"
        },
        "endpoints": {
          "tunnelUrl": null,
          "tunnelHostname": null
        },
        "redundancy": {
          "primaryTunnel": "DOWN",
          "secondaryTunnel": "NOT_PRESENT"
        }
      },
      "alerts": [
        "qc-agent service is not running",
        "Tunnel process is not running",
        "MeshTalk data plane is not ready",
        "No secondary tunnel configured"
      ]
    }
  }
}
```

---

### 7. Trigger Manual Report
Manually trigger a status report. Reports are only generated when state changes are detected unless `force: true`.

**Request:**
```bash
curl -X POST https://your-worker.workers.dev/fungi/sentinel/report \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "DarCloud",
    "format": "full",
    "force": false
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reported": true,
    "stateChanges": [
      "Tunnel came online"
    ],
    "report": "🔔 DARCloud Tunnel Status Update\n\nStatus: LIVE\n..."
  }
}
```

---

### 8. Force Report Generation
Generate a report even if no state changes occurred.

**Request:**
```bash
curl -X POST https://your-worker.workers.dev/fungi/sentinel/report \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "DarCloud",
    "format": "json",
    "force": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reported": true,
    "stateChanges": [],
    "report": {
      "status": "OFFLINE",
      "timestamp": "2026-01-17T11:45:00.000Z",
      ...
    }
  }
}
```

---

## Infrastructure States

The sentinel can report the following infrastructure states:

- **LIVE**: All conditions met (tunnel running, URL available, health check passing, service listening)
- **DEGRADED**: Some conditions failing but core services running
- **OFFLINE**: Critical services not running
- **RECOVERED**: Services recovered from a previous failure
- **INCOMPLETE_STATE**: Unable to complete verification

---

## State Change Types

The sentinel detects and reports the following state changes:

1. `tunnel_online` - Tunnel came online
2. `tunnel_offline` - Tunnel went offline
3. `tunnel_url_change` - Tunnel URL changed or rotated
4. `service_restart` - Service restarted
5. `service_crash` - Service crashed
6. `port_change` - Port listener configuration changed
7. `meshtalk_change` - MeshTalk status changed
8. `redundancy_change` - Redundancy state changed

---

## Monitored Components

### Control Plane
- **qc-agent** on 127.0.0.1:7444
- Health endpoint at `/health`
- Service listener state

### Tunnels
- Cloudflare tunnel processes (trycloudflare or named)
- Public URL or hostname availability
- Process state (RUNNING/STOPPED)

### Ports
- Active TCP/UDP listeners
- Process-to-port mapping
- Service identification

### MeshTalk Data Plane
- Overlay network (WireGuard/Tailscale)
- UDP/TCP readiness
- Interface availability

### Redundancy
- Primary tunnel state
- Secondary/failover tunnel state

---

## Example Cron Job Setup

Set up a Cloudflare Worker cron trigger to monitor infrastructure periodically:

```javascript
export default {
  async scheduled(event, env, ctx) {
    // Trigger sentinel report every 5 minutes
    const response = await fetch('https://your-worker.workers.dev/fungi/sentinel/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        environment: 'DarCloud',
        format: 'full',
        force: false 
      })
    });
    
    const result = await response.json();
    
    // If state changes detected, forward to notification system
    if (result.data.reported) {
      console.log('Infrastructure state change detected:', result.data.stateChanges);
      // Forward report to ChatGPT, Slack, email, etc.
      await notifyFounder(result.data.report);
    }
  }
};
```

Add to `wrangler.jsonc`:
```json
{
  "triggers": {
    "crons": ["*/5 * * * *"]
  }
}
```

---

## Database Tables

The sentinel persists state in the following D1 tables:

- `sentinel_state` - Infrastructure state snapshots
- `tunnel_status` - Tunnel status history
- `sentinel_reports` - Generated reports
- `port_listeners` - Port listener tracking
- `state_changes` - State change events
- `sentinel_config` - Sentinel configuration per environment

Query recent states:
```sql
SELECT * FROM sentinel_state 
WHERE environment = 'DarCloud' 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

For complete documentation, see [FUNGI_MESH_SENTINEL.md](./FUNGI_MESH_SENTINEL.md)
