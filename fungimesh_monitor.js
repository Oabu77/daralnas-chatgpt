#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * FungiMesh Live Monitor — Real-time Network Growth & Message Viewer
 * Shows live peer communications, growth events, and message traffic
 */

const WebSocket = require('ws');
const http = require('http');

class FungiMeshMonitor {
  constructor() {
    this.messageLog = [];
    this.maxLogSize = 100;
    this.connections = new Map();
    this.stats = {
      totalMessages: 0,
      messagesByType: {},
      peerConnections: 0,
      growthEvents: 0
    };
  }

  start(port = 8080) {
    // Create HTTP server for monitoring interface
    const server = http.createServer((req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.generateHTML());
      } else if (req.url === '/api/messages') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          messages: this.messageLog.slice(-20),
          stats: this.stats
        }, null, 2));
      } else if (req.url === '/api/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.stats, null, 2));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(port, () => {
      console.log(`🍄 FungiMesh Monitor running on http://localhost:${port}`);
      console.log(`📊 View live messages at http://localhost:${port}`);
    });

    // Connect to mesh nodes for monitoring
    this.connectToMeshNodes();
  }

  connectToMeshNodes() {
    const meshPorts = [7001, 7002, 7003, 7004, 7005, 7010, 7011, 7012, 7013];

    for (const port of meshPorts) {
      this.connectToNode(port);
    }

    // Also try to connect to blockchain server mesh API
    this.monitorBlockchainServer();
  }

  connectToNode(port) {
    try {
      const ws = new WebSocket(`ws://localhost:${port}`);

      ws.on('open', () => {
        console.log(`🔗 Connected to mesh node on port ${port}`);
        this.connections.set(port, ws);
        this.stats.peerConnections++;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.logMessage(message, `localhost:${port}`, 'received');
        } catch (e) {
          this.logMessage({ raw: data.toString() }, `localhost:${port}`, 'raw');
        }
      });

      ws.on('close', () => {
        console.log(`❌ Disconnected from mesh node on port ${port}`);
        this.connections.delete(port);
        this.stats.peerConnections = Math.max(0, this.stats.peerConnections - 1);
      });

      ws.on('error', (err) => {
        // Silently ignore connection errors - nodes may not be running
      });

    } catch (e) {
      // Node not available
    }
  }

  monitorBlockchainServer() {
    // Poll the blockchain server for mesh status
    setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/mesh/status');
        if (response.ok) {
          const status = await response.json();
          this.logMessage({
            type: 'STATUS_UPDATE',
            data: status
          }, 'blockchain-server', 'status');
        }
      } catch (e) {
        // Server not available
      }
    }, 5000);

    // Poll MeshExpander for device discovery stats
    setInterval(async () => {
      try {
        const response = await fetch('http://localhost:7100/expander/stats');
        if (response.ok) {
          const stats = await response.json();
          this.logMessage({
            type: 'EXPANDER_STATS',
            data: stats
          }, 'mesh-expander', 'status');
        }
      } catch (e) {
        // MeshExpander not available
      }
    }, 10000);

    // Poll DarCloud storage health
    setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8086/health');
        if (response.ok) {
          const health = await response.json();
          this.logMessage({
            type: 'DARCLOUD_HEALTH',
            data: health
          }, 'darcloud-storage', 'status');
        }
      } catch (e) {
        // DarCloud not available
      }
    }, 15000);

    // Poll MeshTalk OS integration status
    setInterval(async () => {
      try {
        const response = await fetch('http://localhost:9001/mesh-integration');
        if (response.ok) {
          const integration = await response.json();
          this.logMessage({
            type: 'MESHTALK_INTEGRATION',
            data: integration
          }, 'meshtalk-os', 'status');
        }
      } catch (e) {
        // MeshTalk OS not available
      }
    }, 15000);

    // Poll Agent coordination status
    setInterval(async () => {
      try {
        const response = await fetch('http://localhost:7100/agents/status');
        if (response.ok) {
          const agentStatus = await response.json();
          this.logMessage({
            type: 'AGENT_COORDINATION',
            data: agentStatus
          }, 'agent-coordinator', 'status');
        }
      } catch (e) {
        // Agent coordinator not available
      }
    }, 20000);
  }

  logMessage(message, source, direction) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      source,
      direction,
      message
    };

    this.messageLog.push(logEntry);
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.shift();
    }

    this.stats.totalMessages++;

    // Count by message type
    const msgType = message.type || 'unknown';
    this.stats.messagesByType[msgType] = (this.stats.messagesByType[msgType] || 0) + 1;

    // Detect growth events
    if (['NETWORK_SCALE', 'PEER_REQUEST', 'PEER_RECRUITMENT', 'GROWTH_ANNOUNCE',
         'EXPANDER_STATS', 'AGENT_COORDINATION'].includes(msgType)) {
      this.stats.growthEvents++;
    }

    // Log to console
    console.log(`📨 [${source}] ${direction.toUpperCase()}: ${msgType}`);
    if (message.data) {
      console.log(`   └─ ${JSON.stringify(message.data).substring(0, 100)}...`);
    }
  }

  formatMessageHTMLServer(msg) {
    const classes = ['message'];, 'EXPANDER_STATS'].includes(msg.message.type)) {
      classes.push('growth');
    } else if (msg.message && (msg.message.type === 'COMPUTE_TASK' || msg.message.type === 'TASK_RESULT')) {
      classes.push('task');
    } else if (msg.message && msg.message.type === 'MESH_HANDSHAKE') {
      classes.push('handshake');
    } else if (msg.message && ['DARCLOUD_HEALTH', 'MESHTALK_INTEGRATION', 'AGENT_COORDINATION'].includes(msg.message.type)) {
      classes.push('task msg.message.type === 'MESH_HANDSHAKE') {
      classes.push('handshake');
    }
    const type = (msg.message && msg.message.type) || 'UNKNOWN';
    const data = (msg.message && msg.message.data) ? `<pre>${JSON.stringify(msg.message.data, null, 2)}</pre>` : '';
    return `<div class="${classes.join(' ')}"><div class="timestamp">${msg.timestamp}</div><div><span class="source">${msg.source}</span> <span class="type">${type}</span></div>${data}</div>`;
  }

  generateHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>🍄 FungiMesh Live Monitor</title>
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #00ff00; margin: 20px; }
        .header { background: #333; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat-box { background: #222; padding: 10px; border-radius: 5px; min-width: 150px; }
        .messages { background: #111; padding: 10px; border-radius: 5px; max-height: 600px; overflow-y: auto; }
        .message { margin: 5px 0; padding: 5px; background: #000; border-left: 3px solid #00ff00; }
        .message.growth { border-left-color: #ff6b35; }
        .message.task { border-left-color: #4ecdc4; }
        .message.handshake { border-left-color: #45b7d1; }
        .timestamp { color: #888; font-size: 0.8em; }
        .type { font-weight: bold; color: #00ff00; }
        .source { color: #ff6b35; }
        pre { margin: 5px 0; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍄 FungiMesh Live Network Monitor</h1>
        <p>Real-time peer communications and growth tracking</p>
    </div>

    <div class="stats">
        <div class="stat-box">
            <h3>Total Messages</h3>
            <div id="totalMessages">${this.stats.totalMessages}</div>
        </div>
        <div class="stat-box">
            <h3>Active Connections</h3>
            <div id="connections">${this.stats.peerConnections}</div>
        </div>
        <div class="stat-box">
            <h3>Growth Events</h3>
            <div id="growthEvents">${this.stats.growthEvents}</div>
        </div>
        <div class="stat-box">
            <h3>Message Types</h3>
            <div id="messageTypes">${Object.keys(this.stats.messagesByType).length}</div>
        </div>
    </div>

    <div class="messages">
        <h3>📨 Live Message Stream</h3>
        <div id="messageList">
            ${this.messageLog.slice(-20).map(msg => this.formatMessageHTMLServer(msg)).join('')}
        </div>
    </div>

    <script>
        function updateStats() {
            fetch('/api/stats')
                .then(r => r.json())
                .then(stats => {
                    document.getElementById('totalMessages').textContent = stats.totalMessages;
                    document.getElementById('connections').textContent = stats.peerConnections;
                    document.getElementById('growthEvents').textContent = stats.growthEvents;
                    document.getElementById('messageTypes').textContent = Object.keys(stats.messagesByType).length;
                });
        }

        function updateMessages() {
            fetch('/api/messages')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('messageList').innerHTML =
                        data.messages.map(msg => formatMessageHTML(msg)).join('');
                });
        }

        function formatMessageHTML(msg) {
            const classes = ['message'];
            if (['NETWORK_SCALE', 'PEER_REQUEST', 'PEER_RECRUITMENT', 'GROWTH_ANNOUNCE'].includes(msg.message.type)) {
                classes.push('growth');
            } else if (msg.message.type === 'COMPUTE_TASK' || msg.message.type === 'TASK_RESULT') {
                classes.push('task');
            } else if (msg.message.type === 'MESH_HANDSHAKE') {
                classes.push('handshake');
            }

            return \`
                <div class="\${classes.join(' ')}">
                    <div class="timestamp">\${msg.timestamp}</div>
                    <div><span class="source">\${msg.source}</span> <span class="type">\${msg.message.type || 'UNKNOWN'}</span></div>
                    \${msg.message.data ? \`<pre>\${JSON.stringify(msg.message.data, null, 2)}</pre>\` : ''}
                </div>
            \`;
        }

        // Update every 2 seconds
        setInterval(() => {
            updateStats();
            updateMessages();
        }, 2000);

        // Initial load
        updateStats();
        updateMessages();
    </script>
</body>
</html>`;
  }
}

// Start the monitor
const monitor = new FungiMeshMonitor();
monitor.start(process.env.FM_MONITOR_PORT || 8085);