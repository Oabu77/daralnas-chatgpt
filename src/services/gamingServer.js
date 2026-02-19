#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * Gaming Server for FungiMesh Auto-Healing
 * ========================================
 * Provides backup and healing services for the FungiMesh network
 * using gaming infrastructure and cloud resources.
 *
 * Features:
 *  - Backup node provisioning
 *  - Network healing coordination
 *  - Gaming platform integration
 *  - Cloud resource allocation
 *
 * Founder: Omar Mohammad Abunadi™
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const os = require('os');

const MSG_TYPES = {
  MESH_HANDSHAKE: 'MESH_HANDSHAKE',
  BRIDGE_ENROLL_REQUEST: 'BRIDGE_ENROLL_REQUEST',
  BRIDGE_ENROLL_ACK: 'BRIDGE_ENROLL_ACK',
  GAMING_SERVER_CONNECT: 'GAMING_SERVER_CONNECT',
  GAMING_SERVER_HEARTBEAT: 'GAMING_SERVER_HEARTBEAT',
  GAMING_SERVER_BACKUP: 'GAMING_SERVER_BACKUP',
  NETWORK_HEAL: 'NETWORK_HEAL',
  HEALING_REQUEST: 'HEALING_REQUEST',
  HEALING_RESPONSE: 'HEALING_RESPONSE',
};

class GamingServer {
  constructor(port = 7002, serverName = 'gaming1') {
    this.port = port;
    this.serverName = serverName;
    this.serverId = crypto.randomBytes(16).toString('hex');
    this.server = null;
    this.clients = new Map(); // clientId → client info
    this.backupNodes = new Map(); // backupId → backup info
    this.healingRequests = new Map(); // requestId → healing data

    // Server capabilities (gaming-focused)
    this.capabilities = {
      serverName: serverName,
      serverId: this.serverId,
      cpuCores: os.cpus().length * 2, // Gaming servers often have more cores
      totalMemory: os.totalmem() * 2, // Virtualized/cloud memory
      platform: 'gaming-server',
      arch: os.arch(),
      hasGPU: true, // Gaming servers typically have GPUs
      version: '1.0.0',
      gamingPlatforms: ['unity', 'unreal', 'godot', 'webgl'],
      cloudProvider: 'gaming-cloud',
      region: 'us-east-1'
    };

    this.heartbeatInterval = null;
  }

  start() {
    this.server = new WebSocket.Server({ port: this.port }, () => {
      console.log(`🎮 Gaming Server "${this.serverName}" active on port ${this.port}`);
      console.log(`   Server ID: ${this.serverId.substring(0, 8)}...`);
      console.log(`   CPU Cores: ${this.capabilities.cpuCores}`);
      console.log(`   Memory: ${(this.capabilities.totalMemory / 1024 / 1024 / 1024).toFixed(1)}GB`);
      console.log(`   Gaming Platforms: ${this.capabilities.gamingPlatforms.join(', ')}`);
    });

    this.server.on('connection', (ws, req) => {
      const clientId = crypto.randomBytes(8).toString('hex');
      const address = req.socket.remoteAddress;

      console.log(`🎮 Gaming client connected from ${address} (ID: ${clientId})`);

      this.clients.set(clientId, {
        ws: ws,
        address: address,
        connectedAt: Date.now(),
        lastSeen: Date.now(),
        capabilities: null,
        purpose: null
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this._handleMessage(clientId, message);
        } catch (err) {
          console.error(`🎮 Invalid message from ${clientId}:`, err.message);
        }
      });

      ws.on('close', () => {
        console.log(`🎮 Gaming client ${clientId} disconnected`);
        this.clients.delete(clientId);
      });

      ws.on('error', (err) => {
        console.error(`🎮 Gaming client ${clientId} error:`, err.message);
      });
    });

    // Start heartbeat to connected clients
    this.heartbeatInterval = setInterval(() => this._sendHeartbeats(), 30000);

    // Initialize backup nodes
    this._initializeBackupNodes();

    console.log(`🎮 Gaming Server "${this.serverName}" ready for mesh healing operations`);
  }

  _handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastSeen = Date.now();

    switch (message.type) {
      case MSG_TYPES.MESH_HANDSHAKE:
        this._handleMeshHandshake(clientId, message.data);
        break;

      case MSG_TYPES.BRIDGE_ENROLL_REQUEST:
        this._handleBridgeEnroll(clientId, message.data);
        break;

      case MSG_TYPES.GAMING_SERVER_CONNECT:
        this._handleClientConnect(clientId, message.data);
        break;

      case MSG_TYPES.GAMING_SERVER_HEARTBEAT:
        // Client heartbeat - update status
        this._updateClientStatus(clientId, message.data);
        break;

      case MSG_TYPES.HEALING_REQUEST:
        this._handleHealingRequest(clientId, message.data);
        break;

      default:
        console.log(`🎮 Unknown message type from ${clientId}: ${message.type}`);
    }
  }

  _handleClientConnect(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.capabilities = data.capabilities;
    client.purpose = data.purpose;

    console.log(`🎮 Client ${clientId} registered for: ${data.purpose}`);

    // Send welcome message with server capabilities
    this._send(client.ws, {
      type: MSG_TYPES.GAMING_SERVER_BACKUP,
      data: {
        serverId: this.serverId,
        serverName: this.serverName,
        capabilities: this.capabilities,
        availableBackupNodes: Array.from(this.backupNodes.keys()),
        healingCapabilities: {
          maxConcurrentHealings: 10,
          supportedRegions: ['us-east', 'us-west', 'eu-central', 'asia-pacific'],
          backupNodeCapacity: this.backupNodes.size
        }
      }
    });
  }

  _handleMeshHandshake(clientId, data = {}) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.capabilities = data.capabilities || null;
    client.purpose = client.purpose || 'mesh_peer';

    console.log(`🎮 Mesh handshake from ${clientId}`);

    this._send(client.ws, {
      type: MSG_TYPES.MESH_HANDSHAKE,
      data: {
        nodeId: this.serverId,
        capabilities: this.capabilities,
        serverName: this.serverName,
      }
    });
  }

  _handleBridgeEnroll(clientId, data = {}) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.purpose = 'bridge_enrollment';

    console.log(`🎮 Bridge enroll request from ${clientId}`);

    this._send(client.ws, {
      type: MSG_TYPES.BRIDGE_ENROLL_ACK,
      data: {
        serverId: this.serverId,
        serverName: this.serverName,
        accepted: true,
        capabilities: this.capabilities,
        meshId: data.meshId,
      }
    });
  }

  _handleHealingRequest(clientId, data) {
    console.log(`🩹 Healing request from ${clientId} (health: ${data.networkHealth}%)`);

    const requestId = crypto.randomBytes(8).toString('hex');
    this.healingRequests.set(requestId, {
      clientId: clientId,
      data: data,
      timestamp: Date.now()
    });

    // Provide healing support
    const healingResponse = {
      healerServer: this.serverId,
      requestId: requestId,
      backupPeers: this._getAvailableBackupPeers(data.currentPeers),
      healingInstructions: {
        activateBackupNodes: true,
        redistributeLoad: data.networkHealth < 30,
        scaleNetwork: data.networkHealth < 20
      }
    };

    this._send(this.clients.get(clientId).ws, {
      type: MSG_TYPES.HEALING_RESPONSE,
      data: healingResponse
    });

    console.log(`🩹 Healing support sent to ${clientId} with ${healingResponse.backupPeers.length} backup peers`);
  }

  _getAvailableBackupPeers(currentPeers) {
    // Return backup peer addresses that aren't already connected
    const availableBackups = [];
    for (const [backupId, backup] of this.backupNodes) {
      if (backup.status === 'available' && !currentPeers.includes(backup.address)) {
        availableBackups.push(backup.address);
        if (availableBackups.length >= 3) break; // Max 3 backup peers
      }
    }
    return availableBackups;
  }

  _updateClientStatus(clientId, data) {
    // Update client network status for monitoring
    const client = this.clients.get(clientId);
    if (client) {
      client.networkHealth = data.networkHealth;
      client.peerCount = data.peerCount;
      client.lastStatusUpdate = Date.now();
    }
  }

  _sendHeartbeats() {
    const heartbeat = {
      type: MSG_TYPES.GAMING_SERVER_HEARTBEAT,
      data: {
        serverId: this.serverId,
        serverName: this.serverName,
        timestamp: Date.now(),
        activeClients: this.clients.size,
        availableBackups: Array.from(this.backupNodes.values()).filter(b => b.status === 'available').length,
        serverLoad: this._calculateServerLoad()
      }
    };

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        this._send(client.ws, heartbeat);
      }
    }
  }

  _calculateServerLoad() {
    // Calculate server load based on active clients and backup usage
    const activeClients = this.clients.size;
    const usedBackups = Array.from(this.backupNodes.values()).filter(b => b.status === 'active').length;
    return Math.min(100, (activeClients * 10) + (usedBackups * 20));
  }

  _initializeBackupNodes() {
    // Create virtual backup nodes that gaming servers can provide
    const backupAddresses = [
      `ws://gaming-backup-${this.serverName}-1.darcloud.host:7001`,
      `ws://gaming-backup-${this.serverName}-2.darcloud.host:7001`,
      `ws://gaming-backup-${this.serverName}-3.darcloud.host:7001`,
      `ws://gaming-backup-${this.serverName}-4.darcloud.host:7001`,
      `ws://gaming-backup-${this.serverName}-5.darcloud.host:7001`
    ];

    for (let i = 0; i < backupAddresses.length; i++) {
      const backupId = `gaming-backup-${this.serverName}-${i + 1}`;
      this.backupNodes.set(backupId, {
        id: backupId,
        address: backupAddresses[i],
        status: 'available',
        capabilities: {
          cpuCores: 8,
          totalMemory: 16 * 1024 * 1024 * 1024, // 16GB
          platform: 'gaming-cloud',
          hasGPU: true,
          gamingOptimized: true
        },
        serverId: this.serverId,
        createdAt: Date.now()
      });
    }

    console.log(`🎮 Initialized ${this.backupNodes.size} backup nodes for healing`);
  }

  _send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  getStats() {
    return {
      serverId: this.serverId.substring(0, 8),
      serverName: this.serverName,
      port: this.port,
      activeClients: this.clients.size,
      backupNodes: this.backupNodes.size,
      availableBackups: Array.from(this.backupNodes.values()).filter(b => b.status === 'available').length,
      activeBackups: Array.from(this.backupNodes.values()).filter(b => b.status === 'active').length,
      serverLoad: this._calculateServerLoad(),
      capabilities: this.capabilities,
      clients: Array.from(this.clients.values()).map(c => ({
        id: c.id || 'unknown',
        address: c.address,
        connectedFor: Math.floor((Date.now() - c.connectedAt) / 1000) + 's',
        purpose: c.purpose,
        networkHealth: c.networkHealth
      }))
    };
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.server) {
      this.server.close();
    }

    console.log(`🎮 Gaming Server "${this.serverName}" stopped`);
  }
}

// Start gaming server if run directly
if (require.main === module) {
  const port = parseInt(process.env.GAMING_PORT || process.argv[2]) || 7002;
  const serverName = process.env.GAMING_NAME || process.argv[3] || 'gaming1';

  const gamingServer = new GamingServer(port, serverName);
  gamingServer.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🎮 Shutting down gaming server...');
    gamingServer.stop();
    process.exit(0);
  });

  // Export for testing
  module.exports = { GamingServer };
}

module.exports = { GamingServer, MSG_TYPES };