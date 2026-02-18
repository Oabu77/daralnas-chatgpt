/**
 * Validator Node for FungiMesh Network
 * =====================================
 * Connects as a Validator Node to the FungiMesh P2P network,
 * collects real hardware info from this machine and every peer
 * it connects to, and stores the data in a hardware registry.
 *
 * Run directly:  node src/services/validatorNode.js [port]
 *
 * Founder: Omar Mohammad Abunadi™
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { ValidatorHardwareCollector } = require('./validatorHardwareCollector');

const REGISTRY_FILE = path.join(__dirname, '..', '..', 'data', 'validator-hardware.json');

const MSG = {
  VALIDATOR_HANDSHAKE: 'VALIDATOR_HANDSHAKE',
  HARDWARE_REQUEST:    'HARDWARE_REQUEST',
  HARDWARE_REPORT:     'HARDWARE_REPORT',
  VALIDATOR_HEARTBEAT: 'VALIDATOR_HEARTBEAT',
  MESH_HANDSHAKE:      'MESH_HANDSHAKE',
  PING:                'PING',
  PONG:                'PONG',
};

class ValidatorNode {
  constructor(options = {}) {
    this.nodeId = crypto.randomBytes(16).toString('hex');
    this.port = options.port || 8001;
    this.role = 'validator';
    this.server = null;

    // Peers this validator is connected to
    this.peers = new Map();        // peerId → { ws, address, hardware, … }
    this.hardwareRegistry = new Map(); // nodeId → hardware snapshot

    // Collect OUR hardware immediately
    this.collector = new ValidatorHardwareCollector();
    this.collector.nodeId = this.nodeId;
    this.localHardware = this.collector.collect();

    // Mesh seed endpoints to connect to
    this.meshEndpoints = options.meshEndpoints || [
      'ws://localhost:7001',  // FungiMesh primary
    ];

    // Blockchain endpoints
    this.blockchainEndpoints = options.blockchainEndpoints || [
      'ws://localhost:6001',  // Blockchain P2P
    ];

    this.heartbeatInterval = null;
    this.hwRequestInterval = null;
  }

  // ═══════════════════════════════════════════════════════════
  //  START — listen for incoming connections + join mesh
  // ═══════════════════════════════════════════════════════════
  async start() {
    return new Promise((resolve) => {
      // 1. Open a WebSocket server so other validators / mesh nodes can connect to US
      this.server = new WebSocket.Server({ port: this.port }, () => {
        console.log(`⚡ Validator Node active on port ${this.port}`);
        console.log(`   Node ID : ${this.nodeId.substring(0, 12)}…`);
        console.log(`   Role    : ${this.role}`);
        console.log(`   Host    : ${this.localHardware.name}`);
        console.log(`   IP      : ${this.localHardware.ip.primary}`);
        console.log(`   CPU     : ${this.localHardware.hardware.cpu.model} (${this.localHardware.hardware.cpu.cores} cores)`);
        console.log(`   Memory  : ${this.localHardware.hardware.memory.totalGB} GB`);
        console.log(`   GPU     : ${this.localHardware.hardware.gpu.count > 0 ? this.localHardware.hardware.gpu.devices.map(g => g.name).join(', ') : 'None detected'}`);
        console.log(`   OS      : ${this.localHardware.os.distro || this.localHardware.os.type}`);
        console.log(`   Uptime  : ${this.localHardware.uptime.human}`);
        resolve();
      });

      this.server.on('connection', (ws, req) => {
        const addr = req.socket.remoteAddress;
        console.log(`⚡ Incoming validator connection from ${addr}`);
        this._registerPeer(ws, addr, 'incoming');
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚡ Port ${this.port} in use — trying ${this.port + 1}`);
          this.port++;
          this.server.close();
          this.start().then(resolve);
        } else {
          console.error('⚡ Validator server error:', err.message);
        }
      });

      // 2. Connect to FungiMesh nodes
      for (const ep of this.meshEndpoints) {
        this._connectTo(ep);
      }

      // 3. Connect to Blockchain P2P nodes
      for (const ep of this.blockchainEndpoints) {
        this._connectTo(ep);
      }

      // 4. Store our own hardware in the registry
      this.hardwareRegistry.set(this.nodeId, this.localHardware);
      this._persistRegistry();

      // 5. Heartbeat + periodic hardware requests every 60 s
      this.heartbeatInterval = setInterval(() => this._heartbeat(), 30000);
      this.hwRequestInterval = setInterval(() => this._requestAllHardware(), 60000);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  OUTBOUND CONNECTION
  // ═══════════════════════════════════════════════════════════
  _connectTo(address) {
    try {
      const ws = new WebSocket(address);
      ws.on('open', () => {
        console.log(`⚡ Connected to ${address}`);
        this._registerPeer(ws, address, 'outgoing');
      });
      ws.on('error', () => { /* silent */ });
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════
  //  PEER MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  _registerPeer(ws, address, direction) {
    const peerId = `val_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    this.peers.set(peerId, {
      ws,
      address,
      direction,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      remoteNodeId: null,
      hardware: null,
    });

    // Send our validator handshake (includes hardware)
    this._send(ws, {
      type: MSG.VALIDATOR_HANDSHAKE,
      data: {
        nodeId: this.nodeId,
        role: this.role,
        port: this.port,
        hardware: this.localHardware,
      },
    });

    // Also send a MESH_HANDSHAKE so FungiMesh peers recognise us
    this._send(ws, {
      type: MSG.MESH_HANDSHAKE,
      data: {
        nodeId: this.nodeId,
        capabilities: {
          cpuCores: this.localHardware.hardware.cpu.cores,
          totalMemory: os.totalmem(),
          platform: os.platform(),
          arch: os.arch(),
          hasGPU: this.localHardware.hardware.gpu.count > 0,
          nodeId: this.nodeId,
          version: '1.0.0',
          role: 'validator',
        },
        authChallenge: crypto.randomBytes(32).toString('hex'),
      },
    });

    // Request hardware from the other side
    this._send(ws, { type: MSG.HARDWARE_REQUEST, data: { requestedBy: this.nodeId } });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        this._handleMessage(peerId, msg);
      } catch {}
    });

    ws.on('close', () => {
      this.peers.delete(peerId);
      console.log(`⚡ Peer ${peerId.substring(0, 12)} disconnected`);
    });
    ws.on('error', () => this.peers.delete(peerId));
  }

  // ═══════════════════════════════════════════════════════════
  //  MESSAGE HANDLING
  // ═══════════════════════════════════════════════════════════
  _handleMessage(peerId, msg) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.lastSeen = Date.now();

    switch (msg.type) {
      case MSG.VALIDATOR_HANDSHAKE:
        this._onValidatorHandshake(peerId, msg.data);
        break;

      case MSG.MESH_HANDSHAKE:
        this._onMeshHandshake(peerId, msg.data);
        break;

      case MSG.HARDWARE_REQUEST:
        // Peer is asking for our hardware — send it
        this._send(peer.ws, {
          type: MSG.HARDWARE_REPORT,
          data: { nodeId: this.nodeId, hardware: this.localHardware },
        });
        break;

      case MSG.HARDWARE_REPORT:
        this._onHardwareReport(peerId, msg.data);
        break;

      case MSG.VALIDATOR_HEARTBEAT:
        // Liveness — update lastSeen (already done above)
        break;

      case MSG.PING:
        this._send(peer.ws, { type: MSG.PONG });
        break;

      case MSG.PONG:
        break;

      default:
        // Forward-compatible: ignore unknown types
        break;
    }
  }

  _onValidatorHandshake(peerId, data) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.remoteNodeId = data.nodeId;
    peer.hardware = data.hardware;
    this.hardwareRegistry.set(data.nodeId, data.hardware);
    this._persistRegistry();

    console.log(`⚡ Validator peer registered:`);
    console.log(`   Node    : ${data.nodeId.substring(0, 12)}…`);
    console.log(`   Name    : ${data.hardware?.name || 'unknown'}`);
    console.log(`   IP      : ${data.hardware?.ip?.primary || 'unknown'}`);
    console.log(`   CPU     : ${data.hardware?.hardware?.cpu?.model || 'unknown'} (${data.hardware?.hardware?.cpu?.cores || '?'} cores)`);
    console.log(`   Memory  : ${data.hardware?.hardware?.memory?.totalGB || '?'} GB`);
    console.log(`   GPU     : ${data.hardware?.hardware?.gpu?.count > 0 ? data.hardware.hardware.gpu.devices.map(g => g.name || g.vendor).join(', ') : 'None'}`);
    console.log(`   Type    : ${data.hardware?.type?.chassis || 'unknown'} / ${data.hardware?.type?.virtualization || 'unknown'}`);
  }

  _onMeshHandshake(peerId, data) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.remoteNodeId = data.nodeId;
    // Log mesh capabilities
    if (data.capabilities) {
      console.log(`⚡ Mesh peer capabilities: CPU=${data.capabilities.cpuCores} MEM=${((data.capabilities.totalMemory || 0) / 1024 / 1024 / 1024).toFixed(1)}GB GPU=${data.capabilities.hasGPU}`);
    }
  }

  _onHardwareReport(peerId, data) {
    if (!data.nodeId || !data.hardware) return;
    const peer = this.peers.get(peerId);
    if (peer) peer.hardware = data.hardware;

    this.hardwareRegistry.set(data.nodeId, data.hardware);
    this._persistRegistry();

    console.log(`⚡ Hardware collected from ${data.nodeId.substring(0, 12)}:`);
    console.log(`   Name : ${data.hardware.name || 'unknown'}`);
    console.log(`   IP   : ${data.hardware.ip?.primary || 'unknown'}`);
    console.log(`   CPU  : ${data.hardware.hardware?.cpu?.model || 'unknown'}`);
    console.log(`   Type : ${data.hardware.type?.chassis || 'unknown'}`);
  }

  // ═══════════════════════════════════════════════════════════
  //  PERIODIC OPERATIONS
  // ═══════════════════════════════════════════════════════════
  _heartbeat() {
    for (const [, peer] of this.peers) {
      if (peer.ws.readyState === WebSocket.OPEN) {
        this._send(peer.ws, {
          type: MSG.VALIDATOR_HEARTBEAT,
          data: { nodeId: this.nodeId, timestamp: Date.now(), registrySize: this.hardwareRegistry.size },
        });
      }
    }
  }

  _requestAllHardware() {
    for (const [, peer] of this.peers) {
      if (peer.ws.readyState === WebSocket.OPEN) {
        this._send(peer.ws, { type: MSG.HARDWARE_REQUEST, data: { requestedBy: this.nodeId } });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PERSISTENCE — save registry to disk (JSON)
  // ═══════════════════════════════════════════════════════════
  _persistRegistry() {
    try {
      const dir = path.dirname(REGISTRY_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const entries = [];
      for (const [nid, hw] of this.hardwareRegistry) {
        entries.push({ nodeId: nid, ...hw });
      }

      fs.writeFileSync(REGISTRY_FILE, JSON.stringify({
        updatedAt: new Date().toISOString(),
        validatorCount: entries.length,
        validators: entries,
      }, null, 2));
    } catch (err) {
      console.error('⚡ Registry save error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════
  getRegistry() {
    const entries = [];
    for (const [nid, hw] of this.hardwareRegistry) {
      entries.push({
        nodeId: nid.substring(0, 12),
        name: hw.name || hw?.hardware?.name || 'unknown',
        ip: hw.ip?.primary || 'unknown',
        publicIP: hw.ip?.publicIP || null,
        type: hw.type || {},
        cpu: hw.hardware?.cpu || {},
        gpu: hw.hardware?.gpu || {},
        memory: hw.hardware?.memory || {},
        disk: hw.hardware?.disk || {},
        network: hw.network || [],
        os: hw.os || {},
        uptime: hw.uptime || {},
        collectedAt: hw.collectedAt || null,
      });
    }
    return { validatorCount: entries.length, validators: entries };
  }

  getLocalHardware() {
    return this.localHardware;
  }

  getPeerCount() {
    return this.peers.size;
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITY
  // ═══════════════════════════════════════════════════════════
  _send(ws, msg) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  async stop() {
    this._persistRegistry();
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.hwRequestInterval) clearInterval(this.hwRequestInterval);
    for (const [, peer] of this.peers) {
      try { peer.ws.close(); } catch {}
    }
    this.peers.clear();
    if (this.server) return new Promise(r => this.server.close(r));
  }
}

// ═══════════════════════════════════════════════════════════════
// Run directly: node src/services/validatorNode.js [port]
// ═══════════════════════════════════════════════════════════════
if (require.main === module) {
  const port = parseInt(process.argv[2]) || 8001;
  const node = new ValidatorNode({ port });
  node.start().then(() => {
    console.log(`\n⚡ Validator Node LIVE — listening on port ${port}`);
    console.log('   Press Ctrl+C to stop\n');
  });

  process.on('SIGINT', async () => {
    console.log('\n⚡ Shutting down validator node...');
    await node.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await node.stop();
    process.exit(0);
  });
}

module.exports = { ValidatorNode };
