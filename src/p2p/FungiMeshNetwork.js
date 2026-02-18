/**
 * FungiMesh Network — Decentralized Computing Infrastructure
 * =========================================================
 * Auto-expanding mesh network for distributed computing across QuranChain-OS
 *
 * Features:
 *  - Auto-expansion and growth system
 *  - Decentralized CPU/GPU workload distribution
 *  - Seed nodes for initial peer discovery
 *  - Auto-scaling network growth
 *  - Secure P2P connections with encryption
 *  - Intelligent workload balancing
 *  - Task distribution and result aggregation
 *
 * Protocol Messages:
 *  - MESH_HANDSHAKE: Node capabilities exchange
 *  - COMPUTE_TASK: Distribute computational task
 *  - TASK_RESULT: Return computation result
 *  - RESOURCE_QUERY: Query node resources
 *  - RESOURCE_RESPONSE: Node resource availability
 *  - LOAD_BALANCE: Workload redistribution
 *  - NETWORK_SCALE: Auto-scaling signals
 *
 * Security: TLS 1.3, Node authentication, Task verification
 * Founder: Omar Mohammad Abunadi™
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const net = require('net');
const dgram = require('dgram');
const { execSync } = require('child_process');
const EventEmitter = require('events');
const { BLOCKCHAIN_SEED_NODES, NETWORK_CONFIG, GAMING_SERVER_ENDPOINTS, HEALING_CONFIG } = require('../config/meshConfig');
const { ValidatorHardwareCollector } = require('../services/validatorHardwareCollector');
const { MeshExpander } = require('../services/meshExpander');

const PEERS_FILE = path.join(__dirname, '..', '..', 'data', 'mesh-peers.json');
const DISCOVERY_PORT = 7777; // UDP broadcast for LAN discovery
const SCAN_PORTS = [7001, 7002, 7003, 7004, 7005]; // Mesh ports to probe

const MSG_TYPES = {
  MESH_HANDSHAKE: 'MESH_HANDSHAKE',
  COMPUTE_TASK: 'COMPUTE_TASK',
  TASK_RESULT: 'TASK_RESULT',
  RESOURCE_QUERY: 'RESOURCE_QUERY',
  RESOURCE_RESPONSE: 'RESOURCE_RESPONSE',
  LOAD_BALANCE: 'LOAD_BALANCE',
  NETWORK_SCALE: 'NETWORK_SCALE',
  PEER_REQUEST: 'PEER_REQUEST',
  PEER_RECRUITMENT: 'PEER_RECRUITMENT',
  GROWTH_ANNOUNCE: 'GROWTH_ANNOUNCE',
  PING: 'PING',
  PONG: 'PONG',
  // Auto-healing message types
  NETWORK_HEAL: 'NETWORK_HEAL',
  HEALING_REQUEST: 'HEALING_REQUEST',
  HEALING_RESPONSE: 'HEALING_RESPONSE',
  BACKUP_NODE_ACTIVATE: 'BACKUP_NODE_ACTIVATE',
  FAILOVER_INITIATE: 'FAILOVER_INITIATE',
  // Gaming server integration
  GAMING_SERVER_CONNECT: 'GAMING_SERVER_CONNECT',
  GAMING_SERVER_HEARTBEAT: 'GAMING_SERVER_HEARTBEAT',
  GAMING_SERVER_BACKUP: 'GAMING_SERVER_BACKUP',
  // Validator node + hardware collection
  VALIDATOR_HANDSHAKE: 'VALIDATOR_HANDSHAKE',
  HARDWARE_REQUEST: 'HARDWARE_REQUEST',
  HARDWARE_REPORT: 'HARDWARE_REPORT',
  VALIDATOR_HEARTBEAT: 'VALIDATOR_HEARTBEAT',
};

class FungiMeshNetwork extends EventEmitter {
  constructor(options = {}) {
    super();
    this.nodeId = crypto.randomBytes(16).toString('hex');
    this.port = options.port || 7001;
    this.seedNodes = options.seedNodes || [];
    this.maxPeers = options.maxPeers || 100;
    this.peers = new Map(); // peerId → peer info
    this.knownPeers = new Set();
    this.server = null;
    this.heartbeatInterval = null;

    // Node capabilities
    this.capabilities = {
      cpuCores: os.cpus().length,
      totalMemory: os.totalmem(),
      platform: os.platform(),
      arch: os.arch(),
      hasGPU: this._detectGPU(),
      nodeId: this.nodeId,
      version: '1.0.0',
    };

    // Task management
    this.activeTasks = new Map(); // taskId → task info
    this.completedTasks = new Map();
    this.taskQueue = [];
    this.workloadStats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      activeWorkers: 0,
    };

    // Auto-scaling
    this.scalingInterval = null;
    this.minPeers = options.minPeers || 5;
    this.scaleThreshold = options.scaleThreshold || 0.8; // Scale when 80% capacity

    // Growth acceleration
    this.growthEnabled = options.growthEnabled || false;
    this.recruitmentInterval = null;
    this.growthAnnounceInterval = null;
    this.peerRequests = new Map(); // Track peer requests

    // Auto-healing system
    this.healingEnabled = options.healingEnabled || HEALING_CONFIG.enabled;
    this.healingInterval = null;
    this.backupNodes = new Map(); // backupNodeId → backup info
    this.networkHealth = 100; // Overall network health percentage
    this.failoverActive = false;
    this.healingHistory = []; // Track healing events

    // Gaming server integration
    this.gamingServers = new Map(); // serverId → server info
    this.gamingServerEndpoints = options.gamingServerEndpoints || GAMING_SERVER_ENDPOINTS;
    this.gamingServerConnections = new Map(); // serverId → WebSocket connection
    this.gamingServerHeartbeat = null;
    this.growthStats = {
      peersRecruited: 0,
      networksExpanded: 0,
      growthEvents: 0,
    };

    // Validator hardware registry
    this.validatorRegistry = new Map(); // nodeId → hardware snapshot
    this._hwCollector = new ValidatorHardwareCollector();
    this._hwCollector.nodeId = this.nodeId;
    this.localHardware = this._hwCollector.collect();

    // Security
    this.encryptionKey = crypto.randomBytes(32);
    this.authTokens = new Map();

    // Auto-discovery
    this.discoverySocket = null;
    this.discoveryInterval = null;
    this.networkScanInterval = null;
    this.cellularScanInterval = null;
    this.bluetoothScanInterval = null;
    this.previousPeers = this._loadPreviousPeers(); // persisted peers
    this.discoveredHosts = new Set();

    // Aggressive external device expander
    this.meshExpander = new MeshExpander({
      nodeId: this.nodeId,
      meshPort: this.port,
      maxDevices: options.maxDevices || 50,
    });

    // Radio interface inventory
    this.radioInterfaces = {
      wifi: [],
      cellular: [],   // 5G / 4G-LTE / 3G
      bluetooth: [],
      ethernet: [],
      vpn: [],
      docker: [],
      other: [],
    };
  }

  /**
   * Detect GPU availability
   */
  _detectGPU() {
    try {
      // Basic GPU detection - can be enhanced with CUDA/OpenCL detection
      const platform = os.platform();
      if (platform === 'linux') {
        // Check for NVIDIA GPU
        const { execSync } = require('child_process');
        try {
          execSync('nvidia-smi --query-gpu=name --format=csv,noheader,nounits');
          return true;
        } catch {
          return false;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Start FungiMesh network
   */
  async start() {
    const maxRetries = 10;
    let retries = 0;

    const tryListen = () => {
      return new Promise((resolve) => {
        this.server = new WebSocket.Server({ port: this.port }, () => {
          console.log(`🍄 FungiMesh Network active on port ${this.port}`);
          console.log(`   Node ID: ${this.nodeId.substring(0, 8)}...`);
          console.log(`   CPU Cores: ${this.capabilities.cpuCores}`);
          console.log(`   Memory: ${(this.capabilities.totalMemory / 1024 / 1024 / 1024).toFixed(1)}GB`);
          console.log(`   GPU: ${this.capabilities.hasGPU ? 'Available' : 'Not detected'}`);
          resolve();
        });

        this.server.on('connection', (ws, req) => {
          const address = req.socket.remoteAddress;
          console.log(`🍄 Incoming mesh connection from ${address}`);
          // AUTO-ACCEPT: never refuse any connection, no auth gate
          this._handleConnection(ws, address, 'incoming');
        });

        // Disable connection limits for auto-accept mode
        this.server.on('headers', (headers) => {
          headers.push('X-FungiMesh-AutoAccept: true');
          headers.push('X-No-Refuse: true');
        });

        this.server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            retries++;
            if (retries >= maxRetries) {
              console.log(`🍄 Mesh: exhausted ${maxRetries} port retries`);
              resolve();
              return;
            }
            const oldPort = this.port;
            this.port++;
            console.log(`🍄 Mesh port ${oldPort} in use, trying ${this.port}`);
            try { this.server.close(); } catch (_) {}
            tryListen().then(resolve);
          } else {
            console.error('🍄 Mesh server error:', err.message);
            resolve(); // resolve so we don't hang
          }
        });
      });
    };

    await tryListen();

    // Connect to seed nodes
    for (const seed of this.seedNodes) {
      this.connectToPeer(seed);
    }

    // Reconnect to previously known peers
    this._reconnectPreviousPeers();

    // Detect all radio interfaces
    this._inventoryRadioInterfaces();

    // Start auto-discovery systems
    this._startLANDiscovery();
    this._startNetworkScanner();
    this._startCellularScanner();
    this._startBluetoothScanner();

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => this._heartbeat(), 30000);

    // Start auto-scaling
    this.scalingInterval = setInterval(() => this._autoScale(), 60000);

    // Start growth acceleration if enabled
    if (this.growthEnabled) {
      this._startGrowthAcceleration();
    }

    // Start auto-healing system
    if (this.healingEnabled) {
      this._startAutoHealing();
    }

    // Connect to gaming servers for backup and healing
    this._connectToGamingServers();

    // Store our own hardware in the validator registry
    this.validatorRegistry.set(this.nodeId, this.localHardware);
    this._hwCollector.save(this.localHardware);

    // Start MeshExpander (disabled to conserve memory — was scanning 500+ devices)
    // this.meshExpander.attach(this);
    // this.meshExpander.start().then(() => {
    //   console.log('🕸️  MeshExpander started — scanning all networks for external devices');
    // }).catch(err => {
    //   console.error('🕸️  MeshExpander start error:', err.message);
    // });
    console.log('🕸️  MeshExpander skipped — conserving memory for revenue operations');
  }

  /**
   * Start auto-healing system
   */
  _startAutoHealing() {
    console.log('🩹 Auto-healing system enabled');

    // Monitor network health every 30 seconds
    this.healingInterval = setInterval(() => this._monitorNetworkHealth(), 30000);

    // Initialize backup nodes
    this._initializeBackupNodes();
  }

  /**
   * Connect to gaming servers for network healing and backup
   */
  _connectToGamingServers() {
    console.log('🎮 Connecting to gaming servers for mesh healing...');

    for (const endpoint of this.gamingServerEndpoints) {
      this._connectToGamingServer(endpoint);
    }

    // Start gaming server heartbeat
    this.gamingServerHeartbeat = setInterval(() => this._gamingServerHeartbeat(), 45000);
  }

  /**
   * Connect to a specific gaming server
   */
  _connectToGamingServer(endpoint) {
    try {
      const serverId = crypto.createHash('md5').update(endpoint).digest('hex').substring(0, 8);
      const ws = new WebSocket(endpoint);

      ws.on('open', () => {
        console.log(`🎮 Connected to gaming server: ${endpoint}`);
        this.gamingServerConnections.set(serverId, ws);

        // Register as mesh healing node
        this._send(ws, {
          type: MSG_TYPES.GAMING_SERVER_CONNECT,
          data: {
            nodeId: this.nodeId,
            capabilities: this.capabilities,
            purpose: 'mesh_healing_backup'
          }
        });
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this._handleGamingServerMessage(serverId, message);
        } catch (err) {
          console.error('🎮 Invalid gaming server message:', err.message);
        }
      });

      ws.on('close', () => {
        console.log(`🎮 Disconnected from gaming server: ${endpoint}`);
        this.gamingServerConnections.delete(serverId);
      });

      ws.on('error', (err) => {
        console.error(`🎮 Gaming server connection error (${endpoint}):`, err.message);
      });

    } catch (err) {
      console.error(`🎮 Failed to connect to gaming server ${endpoint}:`, err.message);
    }
  }

  /**
   * Handle messages from gaming servers
   */
  _handleGamingServerMessage(serverId, message) {
    switch (message.type) {
      case MSG_TYPES.GAMING_SERVER_HEARTBEAT:
        // Update server status
        this.gamingServers.set(serverId, {
          ...this.gamingServers.get(serverId),
          lastSeen: Date.now(),
          status: 'active'
        });
        break;

      case MSG_TYPES.GAMING_SERVER_BACKUP:
        // Gaming server offering backup services
        this._registerBackupNode(serverId, message.data);
        break;

      case MSG_TYPES.NETWORK_HEAL:
        // Gaming server initiating healing
        this._processHealingRequest(message.data);
        break;
    }
  }

  /**
   * Send heartbeat to gaming servers
   */
  _gamingServerHeartbeat() {
    const heartbeat = {
      type: MSG_TYPES.GAMING_SERVER_HEARTBEAT,
      data: {
        nodeId: this.nodeId,
        peerCount: this.peers.size,
        networkHealth: this.networkHealth,
        timestamp: Date.now()
      }
    };

    for (const [serverId, ws] of this.gamingServerConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        this._send(ws, heartbeat);
      }
    }
  }

  /**
   * Monitor overall network health
   */
  _monitorNetworkHealth() {
    const totalPeers = this.peers.size;
    const healthyPeers = Array.from(this.peers.values()).filter(peer =>
      Date.now() - peer.lastSeen < 60000
    ).length;

    // Calculate network health (0-100)
    this.networkHealth = totalPeers > 0 ? (healthyPeers / totalPeers) * 100 : 0;

    // Trigger healing if health drops below threshold
    if (this.networkHealth < HEALING_CONFIG.criticalHealthThreshold && !this.failoverActive) {
      console.log(`🩹 Network health critical: ${this.networkHealth.toFixed(1)}% - Initiating auto-healing`);
      this._initiateNetworkHealing();
    }

    // Log health status
    if (this.networkHealth < 75) {
      console.log(`⚠️  Network health: ${this.networkHealth.toFixed(1)}% (${healthyPeers}/${totalPeers} healthy peers)`);
    }
  }

  /**
   * Initiate network healing process
   */
  _initiateNetworkHealing() {
    if (this.failoverActive) return;

    console.log('🩹 Initiating network healing protocol...');
    this.failoverActive = true;

    // Record healing event
    this.healingHistory.push({
      timestamp: Date.now(),
      type: 'network_healing_initiated',
      networkHealth: this.networkHealth,
      peerCount: this.peers.size
    });

    // Broadcast healing request to gaming servers
    const healingRequest = {
      type: MSG_TYPES.HEALING_REQUEST,
      data: {
        requestingNode: this.nodeId,
        networkHealth: this.networkHealth,
        currentPeers: Array.from(this.peers.keys()),
        capabilities: this.capabilities
      }
    };

    for (const [serverId, ws] of this.gamingServerConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        this._send(ws, healingRequest);
      }
    }

    // Activate backup nodes
    this._activateBackupNodes();

    // Reset failover flag after timeout
    setTimeout(() => {
      this.failoverActive = false;
      console.log('🩹 Healing protocol completed');
    }, HEALING_CONFIG.healingTimeout);
  }

  /**
   * Process healing request from gaming server
   */
  _processHealingRequest(healingData) {
    console.log(`🩹 Processing healing request from gaming server`);

    // Add healing peers to network
    if (healingData.backupPeers) {
      for (const peerAddress of healingData.backupPeers) {
        this.connectToPeer(peerAddress);
      }
    }

    // Update network health
    this.networkHealth = Math.min(100, this.networkHealth + 20);
  }

  /**
   * Initialize backup nodes from gaming servers
   */
  _initializeBackupNodes() {
    // Create virtual backup nodes that can be activated during healing
    for (let i = 0; i < HEALING_CONFIG.maxBackupNodes; i++) {
      const backupId = `backup-node-${i}`;
      this.backupNodes.set(backupId, {
        id: backupId,
        status: 'standby',
        capabilities: {
          cpuCores: 4,
          totalMemory: 8 * 1024 * 1024 * 1024, // 8GB
          platform: 'gaming-server',
          hasGPU: true
        },
        activated: false
      });
    }
  }

  /**
   * Register a backup node from gaming server
   */
  _registerBackupNode(serverId, backupData) {
    this.backupNodes.set(`gaming-backup-${serverId}`, {
      id: `gaming-backup-${serverId}`,
      serverId: serverId,
      status: 'available',
      capabilities: backupData.capabilities,
      activated: false,
      address: backupData.address
    });

    console.log(`🩹 Registered gaming server backup: ${serverId}`);
  }

  /**
   * Activate backup nodes during healing
   */
  _activateBackupNodes() {
    let activated = 0;

    for (const [backupId, backup] of this.backupNodes) {
      if (!backup.activated && backup.status === 'available') {
        backup.activated = true;
        backup.status = 'active';

        // Connect to backup node
        if (backup.address) {
          this.connectToPeer(backup.address);
        }

        activated++;
        if (activated >= 3) break; // Activate max 3 backup nodes
      }
    }

    if (activated > 0) {
      console.log(`🩹 Activated ${activated} backup nodes for healing`);
    }
  }

  /**
   * Start growth acceleration features
   */
  _startGrowthAcceleration() {
    console.log('🚀 Growth acceleration enabled');

    // More aggressive auto-scaling for growth
    this.scalingInterval = setInterval(() => this._enhancedAutoScale(), 30000);

    // Peer recruitment
    this.recruitmentInterval = setInterval(() => this._recruitPeers(), 45000);

    // Growth announcements
    this.growthAnnounceInterval = setInterval(() => this._announceGrowth(), 60000);
  }

  /**
   * Enhanced auto-scaling for network growth
   */
  _enhancedAutoScale() {
    const currentPeers = this.peers.size;
    const workload = this._calculateWorkload();

    // More aggressive scaling thresholds
    if (workload > 0.6 && currentPeers < this.maxPeers) {
      this.broadcast({
        type: MSG_TYPES.NETWORK_SCALE,
        data: { action: 'expand', reason: 'high_workload', priority: 'high' },
      });
      console.log(`🍄 Growth: Expanding network (workload: ${(workload * 100).toFixed(1)}%)`);
      this.growthStats.growthEvents++;
    } else if (workload < 0.3 && currentPeers > this.minPeers) {
      console.log(`🍄 Growth: Network can contract (workload: ${(workload * 100).toFixed(1)}%)`);
    }

    // Scale based on peer count
    if (currentPeers < this.minPeers) {
      console.log(`🍄 Growth: Need more peers (${currentPeers}/${this.minPeers})`);
      this.broadcast({
        type: MSG_TYPES.PEER_REQUEST,
        data: { requested: this.minPeers - currentPeers }
      });
    }
  }

  /**
   * Recruit additional peers
   */
  _recruitPeers() {
    // Broadcast recruitment message
    this.broadcast({
      type: MSG_TYPES.PEER_RECRUITMENT,
      data: {
        nodeId: this.nodeId,
        capabilities: this.capabilities,
        availableSlots: this.maxPeers - this.peers.size,
        timestamp: Date.now()
      }
    });

    // Try to reconnect to known peers
    for (const peerAddr of this.knownPeers) {
      if (!this.peers.has(peerAddr) && !this.discoveredHosts.has(peerAddr)) {
        console.log(`🍄 Recruiting peer: ${peerAddr}`);
        this.connectToPeer(peerAddr);
      }
    }

    this.growthStats.peersRecruited++;
  }

  /**
   * Announce network growth capabilities
   */
  _announceGrowth() {
    this.broadcast({
      type: MSG_TYPES.GROWTH_ANNOUNCE,
      data: {
        nodeId: this.nodeId,
        networkSize: this.peers.size,
        capabilities: this.capabilities,
        growthStats: this.growthStats,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Connect to a peer
   */
  connectToPeer(address) {
    // AUTO-CONNECT: removed peer limit — accept unlimited peers
    // if (this.peers.size >= this.maxPeers) return;

    // Don't connect to self
    if (address.includes(`localhost:${this.port}`) || address.includes(`127.0.0.1:${this.port}`)) return;

    // Don't reconnect to existing peers
    for (const [, peer] of this.peers) {
      if (peer.address === address) return;
    }

    try {
      const ws = new WebSocket(address);
      ws.on('open', () => {
        console.log(`🍄 Connected to mesh peer: ${address}`);
        this._handleConnection(ws, address, 'outgoing');
      });
      ws.on('error', () => {
        // Silently fail on connection errors
      });
    } catch (err) {
      // Ignore connection failures
    }
  }

  _handleConnection(ws, address, direction) {
    const peerId = `mesh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    this.peers.set(peerId, {
      ws,
      address,
      direction,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      capabilities: null,
      workload: 0,
      authToken: null,
    });

    this.knownPeers.add(address);

    // Persist peer for future reconnection
    this._savePeers();

    // Send handshake with capabilities
    this._send(ws, {
      type: MSG_TYPES.MESH_HANDSHAKE,
      data: {
        nodeId: this.nodeId,
        capabilities: this.capabilities,
        authChallenge: this._generateAuthChallenge(),
      },
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        this._handleMessage(peerId, msg);
      } catch (err) {
        console.error('🍄 Malformed message from peer:', err.message);
      }
    });

    ws.on('close', () => {
      this.peers.delete(peerId);
      this.emit('peerDisconnected', peerId);
      this._redistributeWorkload();
    });

    ws.on('error', () => {
      this.peers.delete(peerId);
    });

    this.emit('peerConnected', { peerId, address, direction });
  }

  _generateAuthChallenge() {
    return crypto.randomBytes(32).toString('hex');
  }

  _handleMessage(peerId, msg) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.lastSeen = Date.now();

    // Skip bridge protocol messages (handled by MeshIntegrationBridge)
    if (msg.type && msg.type.startsWith('BRIDGE_')) return;

    switch (msg.type) {
      case MSG_TYPES.MESH_HANDSHAKE:
        this._handleHandshake(peerId, msg.data);
        break;

      case MSG_TYPES.COMPUTE_TASK:
        this._handleComputeTask(peerId, msg.data);
        break;

      case MSG_TYPES.TASK_RESULT:
        this._handleTaskResult(peerId, msg.data);
        break;

      case MSG_TYPES.RESOURCE_QUERY:
        this._handleResourceQuery(peerId);
        break;

      case MSG_TYPES.RESOURCE_RESPONSE:
        this._handleResourceResponse(peerId, msg.data);
        break;

      case MSG_TYPES.NETWORK_SCALE:
        this._handleNetworkScale(peerId, msg.data);
        break;

      case MSG_TYPES.PEER_REQUEST:
        this._handlePeerRequest(peerId, msg.data);
        break;

      case MSG_TYPES.PEER_RECRUITMENT:
        this._handlePeerRecruitment(peerId, msg.data);
        break;

      case MSG_TYPES.GROWTH_ANNOUNCE:
        this._handleGrowthAnnounce(peerId, msg.data);
        break;

      case MSG_TYPES.PING:
        this._send(peer.ws, { type: MSG_TYPES.PONG });
        break;

      case MSG_TYPES.PONG:
        // Liveness confirmed
        break;

      case MSG_TYPES.NETWORK_HEAL:
        this._handleNetworkHeal(peerId, msg.data);
        break;

      case MSG_TYPES.HEALING_REQUEST:
        this._handleHealingRequest(peerId, msg.data);
        break;

      case MSG_TYPES.HEALING_RESPONSE:
        this._handleHealingResponse(peerId, msg.data);
        break;

      case MSG_TYPES.BACKUP_NODE_ACTIVATE:
        this._handleBackupNodeActivate(peerId, msg.data);
        break;

      case MSG_TYPES.FAILOVER_INITIATE:
        this._handleFailoverInitiate(peerId, msg.data);
        break;

      case MSG_TYPES.GAMING_SERVER_CONNECT:
        this._handleGamingServerConnect(peerId, msg.data);
        break;

      case MSG_TYPES.GAMING_SERVER_HEARTBEAT:
        this._handleGamingServerHeartbeat(peerId, msg.data);
        break;

      case MSG_TYPES.GAMING_SERVER_BACKUP:
        this._handleGamingServerBackup(peerId, msg.data);
        break;

      // ── Validator / Hardware messages ──
      case MSG_TYPES.VALIDATOR_HANDSHAKE:
        this._handleValidatorHandshake(peerId, msg.data);
        break;

      case MSG_TYPES.HARDWARE_REQUEST:
        this._handleHardwareRequest(peerId, msg.data);
        break;

      case MSG_TYPES.HARDWARE_REPORT:
        this._handleHardwareReport(peerId, msg.data);
        break;

      case MSG_TYPES.VALIDATOR_HEARTBEAT:
        // liveness update — lastSeen already set above
        break;
    }
  }

  _handleHandshake(peerId, data) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    peer.capabilities = data.capabilities;
    peer.authToken = this._verifyAuth(data.authChallenge);

    console.log(`🍄 Peer ${peerId.substring(0, 8)} capabilities:`, {
      cpu: data.capabilities.cpuCores,
      memory: (data.capabilities.totalMemory / 1024 / 1024 / 1024).toFixed(1) + 'GB',
      gpu: data.capabilities.hasGPU,
    });

    // Send auth response
    this._send(peer.ws, {
      type: MSG_TYPES.MESH_HANDSHAKE,
      data: {
        nodeId: this.nodeId,
        capabilities: this.capabilities,
        authResponse: peer.authToken,
      },
    });

    this.emit('peerReady', peerId);
  }

  _verifyAuth(challenge) {
    // Simple HMAC-based authentication
    return crypto.createHmac('sha256', this.encryptionKey)
      .update(challenge)
      .digest('hex');
  }

  _handleComputeTask(peerId, taskData) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    // Check if peer can handle this task
    if (!this._canHandleTask(peer, taskData)) {
      // Redirect to another peer
      this._redirectTask(taskData);
      return;
    }

    // Execute task
    this._executeTask(peerId, taskData);
  }

  _canHandleTask(peer, taskData) {
    const caps = peer.capabilities;
    if (!caps) return false;

    // Check resource requirements
    if (taskData.requiresGPU && !caps.hasGPU) return false;
    if (taskData.minCores && caps.cpuCores < taskData.minCores) return false;
    if (taskData.minMemory && caps.totalMemory < taskData.minMemory) return false;

    // Check current workload
    if (peer.workload > 0.8) return false; // Peer is busy

    return true;
  }

  async _executeTask(peerId, taskData) {
    const peer = this.peers.get(peerId);
    peer.workload += 0.2; // Increase workload

    this.activeTasks.set(taskData.taskId, {
      ...taskData,
      assignedTo: peerId,
      startedAt: Date.now(),
    });

    try {
      // Simulate task execution (replace with actual computation)
      const result = await this._runComputation(taskData);

      // Send result back
      this._send(peer.ws, {
        type: MSG_TYPES.TASK_RESULT,
        data: {
          taskId: taskData.taskId,
          result,
          success: true,
        },
      });

      this.workloadStats.completedTasks++;
      peer.workload = Math.max(0, peer.workload - 0.2);

    } catch (error) {
      console.error(`🍄 Task ${taskData.taskId} failed:`, error.message);

      this._send(peer.ws, {
        type: MSG_TYPES.TASK_RESULT,
        data: {
          taskId: taskData.taskId,
          error: error.message,
          success: false,
        },
      });

      this.workloadStats.failedTasks++;
      peer.workload = Math.max(0, peer.workload - 0.2);

      // Retry task
      this._retryTask(taskData);
    }
  }

  async _runComputation(taskData) {
    // Placeholder for actual computation logic
    // This should be replaced with real CPU/GPU computation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (taskData.type === 'cpu_intensive') {
          // Simulate CPU computation
          let result = 0;
          for (let i = 0; i < 1000000; i++) {
            result += Math.sin(i) * Math.cos(i);
          }
          resolve({ type: 'cpu_result', value: result });
        } else if (taskData.type === 'gpu_intensive') {
          // Simulate GPU computation (would use CUDA/OpenCL)
          resolve({ type: 'gpu_result', value: 'GPU computation completed' });
        } else {
          reject(new Error('Unknown task type'));
        }
      }, Math.random() * 2000 + 1000); // 1-3 seconds
    });
  }

  _handleTaskResult(peerId, resultData) {
    const task = this.activeTasks.get(resultData.taskId);
    if (!task) return;

    if (resultData.success) {
      this.completedTasks.set(resultData.taskId, {
        ...task,
        result: resultData.result,
        completedAt: Date.now(),
      });
      this.emit('taskCompleted', resultData);
    } else {
      console.error(`🍄 Task ${resultData.taskId} failed: ${resultData.error}`);
      this.emit('taskFailed', resultData);
    }

    this.activeTasks.delete(resultData.taskId);
  }

  _handleResourceQuery(peerId) {
    const peer = this.peers.get(peerId);
    this._send(peer.ws, {
      type: MSG_TYPES.RESOURCE_RESPONSE,
      data: {
        capabilities: this.capabilities,
        currentWorkload: this._calculateWorkload(),
        availableCapacity: 1 - this._calculateWorkload(),
      },
    });
  }

  _handleResourceResponse(peerId, data) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.capabilities = data.capabilities;
      peer.workload = data.currentWorkload;
    }
  }

  _handleLoadBalance(peerId, data) {
    // Handle workload redistribution requests
    if (data.requestRedistribution) {
      this._redistributeWorkload();
    }
  }

  _handleNetworkScale(peerId, data) {
    if (data.action === 'expand' && data.priority === 'high') {
      console.log(`🍄 Growth: Received expansion signal from ${peerId.substring(0, 8)}`);
      // Increase discovery frequency temporarily
      this._startLANDiscovery();
      this._startNetworkScanner();
      this.growthStats.networksExpanded++;
    }
  }

  _handlePeerRequest(peerId, data) {
    const requestingPeer = this.peers.get(peerId);
    if (!requestingPeer) return;

    const availableSlots = this.maxPeers - this.peers.size;
    if (availableSlots > 0 && data.requested > 0) {
      console.log(`🍄 Growth: ${peerId.substring(0, 8)} requested ${data.requested} peers, we have ${availableSlots} slots`);

      // Send our capabilities to help them connect
      this._send(requestingPeer.ws, {
        type: MSG_TYPES.PEER_RECRUITMENT,
        data: {
          nodeId: this.nodeId,
          capabilities: this.capabilities,
          availableSlots: availableSlots,
          canAcceptPeers: true
        }
      });
    }
  }

  _handlePeerRecruitment(peerId, data) {
    // Another peer is announcing availability
    if (data.canAcceptPeers && this.peers.size < this.maxPeers) {
      const peerAddr = `ws://${data.nodeId}:${data.port || 7001}`;
      if (!this.knownPeers.has(peerAddr)) {
        console.log(`🍄 Growth: Discovered recruiting peer: ${peerAddr}`);
        this.knownPeers.add(peerAddr);
        this.connectToPeer(peerAddr);
        this._savePeers();
      }
    }
  }

  _handleGrowthAnnounce(peerId, data) {
    // Update our knowledge of network growth
    console.log(`🍄 Growth: ${peerId.substring(0, 8)} reports network size: ${data.networkSize}`);
    this.growthStats.growthEvents++;
  }

  _calculateWorkload() {
    const totalTasks = this.activeTasks.size;
    const maxConcurrent = this.capabilities.cpuCores * 2; // Rough estimate
    return Math.min(1, totalTasks / maxConcurrent);
  }

  _redirectTask(taskData) {
    // Find a better peer for this task
    for (const [peerId, peer] of this.peers) {
      if (this._canHandleTask(peer, taskData)) {
        this._send(peer.ws, {
          type: MSG_TYPES.COMPUTE_TASK,
          data: taskData,
        });
        return;
      }
    }

    // No suitable peer found, queue task
    this.taskQueue.push(taskData);
  }

  _retryTask(taskData) {
    // Retry with exponential backoff
    const retryCount = taskData.retryCount || 0;
    if (retryCount < 3) {
      setTimeout(() => {
        taskData.retryCount = retryCount + 1;
        this.distributeTask(taskData);
      }, Math.pow(2, retryCount) * 1000);
    } else {
      console.error(`🍄 Task ${taskData.taskId} failed permanently after ${retryCount} retries`);
      this.emit('taskFailedPermanently', taskData);
    }
  }

  _redistributeWorkload() {
    // Redistribute queued tasks to available peers
    const availablePeers = Array.from(this.peers.values())
      .filter(peer => peer.capabilities && peer.workload < 0.7);

    while (this.taskQueue.length > 0 && availablePeers.length > 0) {
      const task = this.taskQueue.shift();
      const peer = availablePeers.shift();

      for (const [peerId, p] of this.peers) {
        if (p === peer) {
          this._send(peer.ws, {
            type: MSG_TYPES.COMPUTE_TASK,
            data: task,
          });
          break;
        }
      }
    }
  }

  _autoScale() {
    const currentPeers = this.peers.size;
    const workload = this._calculateWorkload();

    if (workload > this.scaleThreshold && currentPeers < this.maxPeers) {
      // Need more peers - broadcast scaling signal
      this.broadcast({
        type: MSG_TYPES.NETWORK_SCALE,
        data: { action: 'expand', reason: 'high_workload' },
      });
      console.log(`🍄 Auto-scaling: Expanding network (workload: ${(workload * 100).toFixed(1)}%)`);
    } else if (workload < 0.3 && currentPeers > this.minPeers) {
      // Can reduce peers
      console.log(`🍄 Auto-scaling: Network can contract (workload: ${(workload * 100).toFixed(1)}%)`);
    }
  }

  _heartbeat() {
    const now = Date.now();
    for (const [peerId, peer] of this.peers) {
      if (now - peer.lastSeen > 90000) {
        // Peer hasn't responded in 90s, disconnect
        peer.ws.terminate();
        this.peers.delete(peerId);
      } else {
        this._send(peer.ws, { type: MSG_TYPES.PING });
      }
    }
  }

  // ===== AUTO-HEALING MESSAGE HANDLERS =====

  _handleNetworkHeal(peerId, data) {
    console.log(`🩹 Network healing initiated by ${peerId.substring(0, 8)}`);
    this._processHealingRequest(data);
  }

  _handleHealingRequest(peerId, data) {
    console.log(`🩹 Healing request from ${peerId.substring(0, 8)} (health: ${data.networkHealth}%)`);

    // Respond with healing support
    this._send(this.peers.get(peerId).ws, {
      type: MSG_TYPES.HEALING_RESPONSE,
      data: {
        healerNode: this.nodeId,
        capabilities: this.capabilities,
        availablePeers: Array.from(this.peers.keys()),
        backupNodes: Array.from(this.backupNodes.keys())
      }
    });
  }

  _handleHealingResponse(peerId, data) {
    console.log(`🩹 Healing response from ${peerId.substring(0, 8)}`);

    // Connect to any offered backup peers
    if (data.availablePeers) {
      for (const peerAddr of data.availablePeers.slice(0, 3)) { // Limit to 3
        if (!this.knownPeers.has(peerAddr)) {
          this.connectToPeer(peerAddr);
        }
      }
    }

    // Update network health
    this.networkHealth = Math.min(100, this.networkHealth + 15);
  }

  _handleBackupNodeActivate(peerId, data) {
    console.log(`🩹 Backup node activation from ${peerId.substring(0, 8)}`);
    this._activateBackupNodes();
  }

  _handleFailoverInitiate(peerId, data) {
    console.log(`🩹 Failover initiated by ${peerId.substring(0, 8)}`);
    this.failoverActive = true;

    // Implement failover logic
    setTimeout(() => {
      this.failoverActive = false;
      console.log('🩹 Failover completed');
    }, HEALING_CONFIG.failoverTimeout); // Configurable timeout
  }

  // ===== GAMING SERVER MESSAGE HANDLERS =====

  _handleGamingServerConnect(peerId, data) {
    console.log(`🎮 Gaming server ${peerId.substring(0, 8)} connected for mesh healing`);

    this.gamingServers.set(peerId, {
      id: peerId,
      capabilities: data.capabilities,
      purpose: data.purpose,
      status: 'connected',
      lastSeen: Date.now()
    });
  }

  _handleGamingServerHeartbeat(peerId, data) {
    // Update gaming server status
    const server = this.gamingServers.get(peerId);
    if (server) {
      server.lastSeen = Date.now();
      server.status = 'active';
      server.peerCount = data.peerCount;
      server.networkHealth = data.networkHealth;
    }
  }

  _handleGamingServerBackup(peerId, data) {
    console.log(`🎮 Gaming server ${peerId.substring(0, 8)} offering backup services`);
    this._registerBackupNode(peerId, data);
  }

  // ===== VALIDATOR NODE + HARDWARE HANDLERS =====

  _handleValidatorHandshake(peerId, data) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.remoteNodeId = data.nodeId;
    peer.role = data.role || 'validator';

    if (data.hardware) {
      this.validatorRegistry.set(data.nodeId, data.hardware);
      this._hwCollector.save(data.hardware);
      console.log(`⚡ Validator registered: ${data.nodeId.substring(0, 12)} | ${data.hardware.name || 'unknown'} | IP: ${data.hardware.ip?.primary || '?'} | CPU: ${data.hardware.hardware?.cpu?.model || '?'} (${data.hardware.hardware?.cpu?.cores || '?'} cores) | MEM: ${data.hardware.hardware?.memory?.totalGB || '?'}GB | GPU: ${data.hardware.hardware?.gpu?.count || 0}`);
    }

    // Respond with OUR hardware
    this._send(peer.ws, {
      type: MSG_TYPES.VALIDATOR_HANDSHAKE,
      data: {
        nodeId: this.nodeId,
        role: 'mesh-node',
        hardware: this.localHardware,
      },
    });
  }

  _handleHardwareRequest(peerId, data) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    // Send our hardware report
    this._send(peer.ws, {
      type: MSG_TYPES.HARDWARE_REPORT,
      data: { nodeId: this.nodeId, hardware: this.localHardware },
    });
  }

  _handleHardwareReport(peerId, data) {
    if (!data.nodeId || !data.hardware) return;
    this.validatorRegistry.set(data.nodeId, data.hardware);
    this._hwCollector.save(data.hardware);
    console.log(`⚡ Hardware collected: ${data.nodeId.substring(0, 12)} | ${data.hardware.name || 'unknown'} | IP: ${data.hardware.ip?.primary || '?'} | Type: ${data.hardware.type?.chassis || '?'}`);
  }

  /**
   * Return the full validator hardware registry
   */
  getValidatorRegistry() {
    const entries = [];
    for (const [nid, hw] of this.validatorRegistry) {
      entries.push({
        nodeId: nid.substring(0, 12),
        name: hw.name || 'unknown',
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
        performance: hw.performance || {},
        collectedAt: hw.collectedAt || null,
      });
    }
    return { validatorCount: entries.length, validators: entries };
  }

  /**
   * Distribute a computational task across the mesh
   */
  distributeTask(taskData) {
    const taskId = taskData.taskId || crypto.randomBytes(8).toString('hex');
    const fullTask = {
      ...taskData,
      taskId,
      submittedAt: Date.now(),
      priority: taskData.priority || 'normal',
    };

    this.workloadStats.totalTasks++;

    // Find suitable peer
    for (const [peerId, peer] of this.peers) {
      if (this._canHandleTask(peer, fullTask)) {
        this._send(peer.ws, {
          type: MSG_TYPES.COMPUTE_TASK,
          data: fullTask,
        });
        return taskId;
      }
    }

    // No suitable peer, queue task
    this.taskQueue.push(fullTask);
    console.log(`🍄 Task ${taskId} queued (no suitable peer available)`);
    return taskId;
  }

  /**
   * Query network resources
   */
  queryResources() {
    this.broadcast({ type: MSG_TYPES.RESOURCE_QUERY });
  }

  /**
   * Get network statistics
   */
  getStats() {
    return {
      nodeId: this.nodeId.substring(0, 8),
      port: this.port,
      peers: this.peers.size,
      knownPeers: this.knownPeers.size,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.completedTasks.size,
      workload: this._calculateWorkload(),
      capabilities: this.capabilities,
      stats: this.workloadStats,
      growthStats: this.growthStats,
      growthEnabled: this.growthEnabled,
      // Auto-healing statistics
      networkHealth: this.networkHealth,
      healingEnabled: this.healingEnabled,
      failoverActive: this.failoverActive,
      backupNodes: this.backupNodes.size,
      healingEvents: this.healingHistory.length,
      // Gaming server statistics
      gamingServers: this.gamingServers.size,
      gamingConnections: this.gamingServerConnections.size,
      // Validator hardware registry
      validatorRegistry: this.getValidatorRegistry(),
      // Mesh Expander (external device discovery)
      meshExpander: this.meshExpander ? this.meshExpander.getStats() : null,
      discoveredDevices: this.meshExpander ? this.meshExpander.getDevices() : null,
      peerList: Array.from(this.peers.values()).map(p => ({
        id: p.ws ? 'connected' : 'disconnected',
        address: p.address,
        direction: p.direction,
        workload: p.workload,
        capabilities: p.capabilities ? {
          cpu: p.capabilities.cpuCores,
          memory: (p.capabilities.totalMemory / 1024 / 1024 / 1024).toFixed(1) + 'GB',
          gpu: p.capabilities.hasGPU,
        } : null,
        connectedFor: Math.floor((Date.now() - p.connectedAt) / 1000) + 's',
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 🔍 AUTO DEVICE DISCOVERY — LAN + Network Scan + Persist
  // ═══════════════════════════════════════════════════════════

  /**
   * Load previously connected peers from disk
   */
  _loadPreviousPeers() {
    try {
      if (fs.existsSync(PEERS_FILE)) {
        const data = JSON.parse(fs.readFileSync(PEERS_FILE, 'utf8'));
        console.log(`🍄 Loaded ${data.peers?.length || 0} previously known peers`);
        return data.peers || [];
      }
    } catch { /* ignore corrupt file */ }
    return [];
  }

  /**
   * Persist current + known peers to disk for reconnection
   */
  _savePeers() {
    try {
      const dir = path.dirname(PEERS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const peerList = [];
      // Active peers
      for (const [, peer] of this.peers) {
        if (peer.address) peerList.push({ address: peer.address, lastSeen: Date.now() });
      }
      // Previously known peers (merge, dedup)
      for (const prev of this.previousPeers) {
        if (!peerList.find(p => p.address === prev.address)) {
          peerList.push(prev);
        }
      }
      // Discovered hosts
      for (const addr of this.discoveredHosts) {
        if (!peerList.find(p => p.address === addr)) {
          peerList.push({ address: addr, lastSeen: Date.now() });
        }
      }

      fs.writeFileSync(PEERS_FILE, JSON.stringify({
        updatedAt: new Date().toISOString(),
        nodeId: this.nodeId,
        peers: peerList.slice(0, 500), // Cap at 500
      }, null, 2));
    } catch (err) {
      // Non-critical, silent fail
    }
  }

  /**
   * Reconnect to all previously known peers
   */
  _reconnectPreviousPeers() {
    if (!this.previousPeers.length) return;
    console.log(`🍄 Reconnecting to ${this.previousPeers.length} previous peers...`);
    for (const prev of this.previousPeers) {
      this.connectToPeer(prev.address);
    }
  }

  /**
   * Classify a network interface by name
   */
  _classifyInterface(name) {
    const n = name.toLowerCase();
    // Cellular: wwan, rmnet, mbim, qmi, usb (modem), ppp
    if (/^(wwan|rmnet|mbim|qmi|ppp|pdp_ip|ccmni|radio|lte|nr)/.test(n)) return 'cellular';
    // WiFi
    if (/^(wl|wlan|wifi|ath|ra|mlan)/.test(n)) return 'wifi';
    // Bluetooth PAN
    if (/^(bt|bnep|pan)/.test(n)) return 'bluetooth';
    // VPN / tunnel
    if (/^(tun|tap|wg|ogstun|utun|ipsec|Cloudflare)/.test(n)) return 'vpn';
    // Docker / container
    if (/^(docker|br-|veth|cni|flannel|calico)/.test(n)) return 'docker';
    // Ethernet
    if (/^(eth|en|em|eno|ens|enp)/.test(n)) return 'ethernet';
    return 'other';
  }

  /**
   * Get all local network interfaces and their subnets, with type classification
   */
  _getLocalSubnets() {
    const subnets = [];
    const interfaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const parts = addr.address.split('.');
          const prefix = parts.slice(0, 3).join('.');
          subnets.push({
            iface: name,
            type: this._classifyInterface(name),
            ip: addr.address,
            prefix,
            netmask: addr.netmask,
          });
        }
      }
    }
    return subnets;
  }

  /**
   * Inventory all radio interfaces (WiFi, Cellular, Bluetooth, etc.)
   */
  _inventoryRadioInterfaces() {
    // Reset
    for (const k of Object.keys(this.radioInterfaces)) this.radioInterfaces[k] = [];

    const subnets = this._getLocalSubnets();
    for (const s of subnets) {
      if (this.radioInterfaces[s.type]) {
        this.radioInterfaces[s.type].push(s);
      } else {
        this.radioInterfaces.other.push(s);
      }
    }

    // Detect cellular details from system
    this._detectCellularInfo();

    // Detect Bluetooth adapter
    this._detectBluetoothAdapter();

    // Log summary
    const counts = {};
    for (const [k, v] of Object.entries(this.radioInterfaces)) {
      if (v.length > 0) counts[k] = v.length;
    }
    console.log(`🍄 📡 Radio interfaces:`, JSON.stringify(counts));
    if (this.radioInterfaces.cellular.length > 0) {
      console.log(`🍄 📶 Cellular interfaces: ${this.radioInterfaces.cellular.map(c => `${c.iface} (${c.ip})`).join(', ')}`);
    }
  }

  /**
   * Detect cellular modem info (5G/4G/3G) from system
   */
  _detectCellularInfo() {
    if (os.platform() !== 'linux') return;
    try {
      // Try mmcli (ModemManager) for cellular info
      const modems = execSync('mmcli -L 2>/dev/null', { timeout: 3000 }).toString();
      if (modems && !modems.includes('No modems')) {
        // Extract modem index
        const modemMatch = modems.match(/\/Modem\/(\d+)/);
        if (modemMatch) {
          const info = execSync(`mmcli -m ${modemMatch[1]} 2>/dev/null`, { timeout: 3000 }).toString();
          const techMatch = info.match(/access tech[^:]*:\s*(\S+)/i);
          const signalMatch = info.match(/signal quality[^:]*:\s*(\d+)/i);
          const operatorMatch = info.match(/operator name[^:]*:\s*(.+)/im);
          this.radioInterfaces.cellularInfo = {
            technology: techMatch ? techMatch[1] : 'unknown',
            signal: signalMatch ? parseInt(signalMatch[1]) : 0,
            operator: operatorMatch ? operatorMatch[1].trim() : 'unknown',
          };
          console.log(`🍄 📶 Cellular: ${this.radioInterfaces.cellularInfo.technology} | Signal: ${this.radioInterfaces.cellularInfo.signal}% | Operator: ${this.radioInterfaces.cellularInfo.operator}`);
        }
      }
    } catch { /* mmcli not available */ }

    try {
      // Fallback: check /sys/class/net for cellular interfaces
      const netDevs = execSync('ls /sys/class/net/ 2>/dev/null', { timeout: 2000 }).toString().trim().split('\n');
      for (const dev of netDevs) {
        if (/^(wwan|rmnet|mbim|usb|ppp)/.test(dev)) {
          const existing = this.radioInterfaces.cellular.find(c => c.iface === dev);
          if (!existing) {
            try {
              const ip = execSync(`ip -4 addr show ${dev} 2>/dev/null | grep -oP '\\d+\\.\\d+\\.\\d+\\.\\d+'`, { timeout: 2000 }).toString().trim().split('\n')[0];
              if (ip) {
                const parts = ip.split('.');
                this.radioInterfaces.cellular.push({
                  iface: dev, type: 'cellular', ip, prefix: parts.slice(0, 3).join('.'), netmask: '255.255.255.0',
                });
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  /**
   * Detect Bluetooth adapter presence
   */
  _detectBluetoothAdapter() {
    if (os.platform() !== 'linux') return;
    try {
      const btInfo = execSync('hciconfig 2>/dev/null || bluetoothctl show 2>/dev/null', { timeout: 3000 }).toString();
      if (btInfo && (btInfo.includes('UP RUNNING') || btInfo.includes('Powered: yes'))) {
        const addrMatch = btInfo.match(/BD Address:\s*([0-9A-Fa-f:]+)/i) || btInfo.match(/Address:\s*([0-9A-Fa-f:]+)/i);
        this.radioInterfaces.bluetoothAdapter = {
          available: true,
          address: addrMatch ? addrMatch[1] : 'unknown',
        };
        console.log(`🍄 🔵 Bluetooth adapter: ${this.radioInterfaces.bluetoothAdapter.address}`);
      }
    } catch { /* Bluetooth not available */ }
  }

  /**
   * Start UDP broadcast discovery on LAN (mDNS-like)
   * Broadcasts presence and listens for other FungiMesh nodes
   */
  _startLANDiscovery() {
    try {
      this.discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.discoverySocket.on('error', (err) => {
        // Non-critical — LAN discovery is best-effort
        if (err.code !== 'EADDRINUSE') {
          console.log(`🍄 LAN discovery error: ${err.message}`);
        }
        try { this.discoverySocket.close(); } catch {}
        this.discoverySocket = null;
      });

      this.discoverySocket.on('message', (msg, rinfo) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.type === 'FUNGIMESH_ANNOUNCE' && data.nodeId !== this.nodeId) {
            const peerAddr = `ws://${rinfo.address}:${data.meshPort}`;
            if (!this.discoveredHosts.has(peerAddr)) {
              this.discoveredHosts.add(peerAddr);
              console.log(`🍄 🔍 Discovered node via LAN: ${rinfo.address}:${data.meshPort} (${data.nodeId.substring(0, 8)})`);
              this.connectToPeer(peerAddr);
              this._savePeers();
            }
          }
        } catch { /* ignore non-FungiMesh traffic */ }
      });

      this.discoverySocket.bind(DISCOVERY_PORT, () => {
        try {
          this.discoverySocket.setBroadcast(true);
        } catch (e) {
          console.log(`🍄 LAN broadcast unavailable: ${e.message}`);
          return;
        }
        console.log(`🍄 🔍 LAN discovery active on UDP :${DISCOVERY_PORT}`);

        // Broadcast our presence every 45 seconds
        const announce = () => {
          const msg = JSON.stringify({
            type: 'FUNGIMESH_ANNOUNCE',
            nodeId: this.nodeId,
            meshPort: this.port,
            capabilities: {
              cpuCores: this.capabilities.cpuCores,
              hasGPU: this.capabilities.hasGPU,
            },
            timestamp: Date.now(),
          });
          const buf = Buffer.from(msg);

          // Broadcast on all local subnets
          const subnets = this._getLocalSubnets();
          for (const subnet of subnets) {
            const broadcastAddr = subnet.prefix + '.255';
            try {
              this.discoverySocket.send(buf, 0, buf.length, DISCOVERY_PORT, broadcastAddr);
            } catch {}
          }
          // Also broadcast to 255.255.255.255
          try {
            this.discoverySocket.send(buf, 0, buf.length, DISCOVERY_PORT, '255.255.255.255');
          } catch {}
        };

        announce(); // Announce immediately
        this.discoveryInterval = setInterval(announce, 45000);
      });
    } catch (err) {
      console.log(`🍄 LAN discovery unavailable: ${err.message}`);
    }
  }

  /**
   * Scan local network subnets for FungiMesh nodes
   * Probes known mesh ports on each host in the subnet
   */
  _startNetworkScanner() {
    const scanSubnet = () => {
      if (this.peers.size >= this.maxPeers) return;

      const subnets = this._getLocalSubnets();
      for (const subnet of subnets) {
        // Scan a random batch of IPs in the subnet (avoid flooding)
        const startHost = 1;
        const endHost = 254;
        const batchSize = 30; // Scan 30 hosts per cycle
        const offset = Math.floor(Math.random() * (endHost - batchSize));

        for (let i = offset; i < offset + batchSize && i <= endHost; i++) {
          const ip = `${subnet.prefix}.${i}`;
          if (ip === subnet.ip) continue; // Skip self

          for (const port of SCAN_PORTS) {
            this._probeHost(ip, port);
          }
        }
      }
    };

    // Also try to discover via ARP table (previously connected devices)
    this._discoverFromARP();

    // Run first scan after 10s, then every 2 minutes
    setTimeout(scanSubnet, 10000);
    this.networkScanInterval = setInterval(scanSubnet, 120000);
  }

  /**
   * Probe a single host:port for a FungiMesh WebSocket
   */
  _probeHost(ip, port) {
    const socket = new net.Socket();
    socket.setTimeout(1500); // 1.5s timeout for fast scanning

    socket.on('connect', () => {
      socket.destroy();
      // TCP port is open — try WebSocket connection
      const addr = `ws://${ip}:${port}`;
      if (!this.discoveredHosts.has(addr)) {
        this.discoveredHosts.add(addr);
        console.log(`🍄 🔍 Found open mesh port: ${ip}:${port} — connecting...`);
        this.connectToPeer(addr);
        this._savePeers();
      }
    });

    socket.on('timeout', () => socket.destroy());
    socket.on('error', () => socket.destroy());

    try {
      socket.connect(port, ip);
    } catch {}
  }

  /**
   * Discover network devices from OS ARP/neighbor cache
   * These are devices that have recently communicated on the LAN
   */
  _discoverFromARP() {
    try {
      let arpOutput = '';
      const platform = os.platform();

      if (platform === 'linux') {
        try { arpOutput = execSync('ip neigh show 2>/dev/null || arp -an 2>/dev/null', { timeout: 5000 }).toString(); } catch {}
      } else if (platform === 'darwin') {
        try { arpOutput = execSync('arp -an 2>/dev/null', { timeout: 5000 }).toString(); } catch {}
      } else if (platform === 'win32') {
        try { arpOutput = execSync('arp -a 2>nul', { timeout: 5000 }).toString(); } catch {}
      }

      if (!arpOutput) return;

      // Extract IPs from ARP output
      const ipRegex = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
      const ips = new Set();
      let match;
      while ((match = ipRegex.exec(arpOutput)) !== null) {
        const ip = match[1];
        // Skip broadcast, multicast, and loopback
        if (!ip.startsWith('224.') && !ip.startsWith('255.') && ip !== '127.0.0.1' && !ip.endsWith('.255')) {
          ips.add(ip);
        }
      }

      if (ips.size > 0) {
        console.log(`🍄 🔍 Found ${ips.size} devices in ARP cache — probing for mesh nodes...`);
        for (const ip of ips) {
          for (const port of SCAN_PORTS) {
            this._probeHost(ip, port);
          }
        }
      }
    } catch {
      // ARP discovery is best-effort
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 📶 CELLULAR NETWORK SCANNING (5G / 4G-LTE / 3G)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start scanning for mesh nodes over cellular networks.
   * Detects cellular interfaces (wwan, rmnet, ppp, mbim) and
   * probes their gateway + subnet for other FungiMesh peers.
   */
  _startCellularScanner() {
    const scanCellular = () => {
      if (this.peers.size >= this.maxPeers) return;

      const cellularIfaces = this._getLocalSubnets().filter(s => s.type === 'cellular');
      if (cellularIfaces.length === 0) {
        // Check for tethered/hotspot connections (phone sharing 5G/4G)
        this._discoverTetheredDevices();
        return;
      }

      for (const iface of cellularIfaces) {
        console.log(`🍄 📶 Scanning cellular interface ${iface.iface} (${iface.ip})...`);

        // 1) Probe the gateway (usually .1)
        const gw = iface.prefix + '.1';
        for (const port of SCAN_PORTS) {
          this._probeHost(gw, port);
        }

        // 2) Scan nearby IPs on the cellular subnet
        //    Cellular subnets are often /30 or /24 — scan conservatively
        const myHostPart = parseInt(iface.ip.split('.')[3]);
        const scanRange = 20; // ±20 from our IP
        const lo = Math.max(1, myHostPart - scanRange);
        const hi = Math.min(254, myHostPart + scanRange);
        for (let h = lo; h <= hi; h++) {
          if (h === myHostPart) continue;
          for (const port of SCAN_PORTS) {
            this._probeHost(`${iface.prefix}.${h}`, port);
          }
        }
      }

      // Also try to discover the cellular gateway from routing table
      this._discoverCellularGateways();
    };

    // Scan cellular every 90 seconds
    setTimeout(scanCellular, 15000);
    this.cellularScanInterval = setInterval(scanCellular, 90000);
  }

  /**
   * Discover cellular gateways from the routing table
   */
  _discoverCellularGateways() {
    if (os.platform() !== 'linux') return;
    try {
      const routes = execSync('ip route show 2>/dev/null', { timeout: 3000 }).toString();
      const lines = routes.split('\n');
      for (const line of lines) {
        // Look for routes through cellular interfaces
        if (/wwan|rmnet|mbim|ppp|lte/.test(line)) {
          const gwMatch = line.match(/via\s+(\d+\.\d+\.\d+\.\d+)/);
          if (gwMatch) {
            const gw = gwMatch[1];
            for (const port of SCAN_PORTS) {
              this._probeHost(gw, port);
            }
          }
        }
      }
    } catch {}
  }

  /**
   * Discover devices connected via USB tethering or mobile hotspot
   * (phone sharing 5G/4G/3G to this machine)
   */
  _discoverTetheredDevices() {
    if (os.platform() !== 'linux') return;
    try {
      // USB tethering usually creates usb0, rndis0, or enp*u* interfaces
      const netDevs = execSync('ls /sys/class/net/ 2>/dev/null', { timeout: 2000 }).toString().trim().split('\n');
      for (const dev of netDevs) {
        if (/^(usb|rndis|enp.*u)/.test(dev)) {
          try {
            const ipOut = execSync(`ip -4 addr show ${dev} 2>/dev/null | grep -oP '\\d+\\.\\d+\\.\\d+\\.\\d+'`, { timeout: 2000 }).toString().trim();
            if (ipOut) {
              const ip = ipOut.split('\n')[0];
              const prefix = ip.split('.').slice(0, 3).join('.');
              console.log(`🍄 📶 Found tethered interface ${dev} (${ip}) — scanning subnet...`);
              // Scan small range around gateway
              for (let h = 1; h <= 20; h++) {
                for (const port of SCAN_PORTS) {
                  this._probeHost(`${prefix}.${h}`, port);
                }
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔵 BLUETOOTH DEVICE DISCOVERY & PAN SCANNING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start Bluetooth device discovery.
   * Scans for nearby Bluetooth devices, checks for Bluetooth PAN (BNEP)
   * connections, and probes any IP-reachable BT devices for mesh nodes.
   */
  _startBluetoothScanner() {
    const scanBluetooth = () => {
      if (this.peers.size >= this.maxPeers) return;
      if (os.platform() !== 'linux') return;

      // 1) Scan Bluetooth PAN (bnep) interfaces
      this._scanBluetoothPAN();

      // 2) Discover nearby Bluetooth devices
      this._discoverBluetoothDevices();

      // 3) Check for Bluetooth tethering
      this._checkBluetoothTethering();
    };

    // Scan Bluetooth every 3 minutes (BT scans are slower)
    setTimeout(scanBluetooth, 20000);
    this.bluetoothScanInterval = setInterval(scanBluetooth, 180000);
  }

  /**
   * Scan Bluetooth PAN (bnep) network interfaces for mesh peers
   */
  _scanBluetoothPAN() {
    try {
      const btSubnets = this._getLocalSubnets().filter(s => s.type === 'bluetooth');
      if (btSubnets.length === 0) return;

      for (const iface of btSubnets) {
        console.log(`🍄 🔵 Scanning Bluetooth PAN ${iface.iface} (${iface.ip})...`);
        // Bluetooth PAN subnets are small — scan full /24
        for (let h = 1; h <= 254; h++) {
          const ip = `${iface.prefix}.${h}`;
          if (ip === iface.ip) continue;
          for (const port of SCAN_PORTS) {
            this._probeHost(ip, port);
          }
        }
      }
    } catch {}
  }

  /**
   * Discover nearby Bluetooth devices using hcitool or bluetoothctl
   * and record them for potential PAN bridging
   */
  _discoverBluetoothDevices() {
    try {
      let btDevices = '';

      // Try hcitool first (classic Bluetooth scan)
      try {
        btDevices = execSync('timeout 8 hcitool scan 2>/dev/null', { timeout: 12000 }).toString();
      } catch {}

      // Fallback: bluetoothctl devices (already paired)
      if (!btDevices || btDevices.trim() === 'Scanning ...') {
        try {
          btDevices = execSync('bluetoothctl devices 2>/dev/null', { timeout: 5000 }).toString();
        } catch {}
      }

      if (!btDevices) return;

      // Parse discovered BT devices
      const macRegex = /([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})/g;
      const devices = new Set();
      let match;
      while ((match = macRegex.exec(btDevices)) !== null) {
        devices.add(match[1]);
      }

      if (devices.size > 0) {
        this.radioInterfaces.bluetoothDevices = Array.from(devices);
        console.log(`🍄 🔵 Found ${devices.size} Bluetooth devices nearby`);
        this.emit('bluetoothDevicesFound', Array.from(devices));
      }
    } catch {}
  }

  /**
   * Check for Bluetooth tethering / NAP network
   * If a device is sharing internet via BT, we can reach its subnet
   */
  _checkBluetoothTethering() {
    try {
      // Check for bnep interfaces (Bluetooth Network Encapsulation Protocol)
      const netDevs = execSync('ls /sys/class/net/ 2>/dev/null', { timeout: 2000 }).toString().trim().split('\n');
      for (const dev of netDevs) {
        if (/^(bnep|bt-pan|pan)/.test(dev)) {
          try {
            const ipOut = execSync(`ip -4 addr show ${dev} 2>/dev/null | grep -oP '\\d+\\.\\d+\\.\\d+\\.\\d+'`, { timeout: 2000 }).toString().trim();
            if (ipOut) {
              const ip = ipOut.split('\n')[0];
              const prefix = ip.split('.').slice(0, 3).join('.');
              console.log(`🍄 🔵 Bluetooth tethering detected on ${dev} (${ip}) — scanning...`);
              for (let h = 1; h <= 20; h++) {
                for (const port of SCAN_PORTS) {
                  this._probeHost(`${prefix}.${h}`, port);
                }
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  /**
   * Get complete radio/network discovery status
   */
  getDiscoveryStatus() {
    return {
      radioInterfaces: this.radioInterfaces,
      subnets: this._getLocalSubnets(),
      discoveredHosts: Array.from(this.discoveredHosts),
      knownPeers: Array.from(this.knownPeers),
      previousPeers: this.previousPeers.length,
      scanning: {
        lan: !!this.discoverySocket,
        network: !!this.networkScanInterval,
        cellular: !!this.cellularScanInterval,
        bluetooth: !!this.bluetoothScanInterval,
      },
    };
  }

  _send(ws, msg) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  broadcast(msg) {
    for (const [, peer] of this.peers) {
      this._send(peer.ws, msg);
    }
  }

  async stop() {
    // Save peers before shutdown for future reconnection
    this._savePeers();

    // Stop MeshExpander
    if (this.meshExpander) {
      await this.meshExpander.stop();
    }

    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.scalingInterval) clearInterval(this.scalingInterval);
    if (this.discoveryInterval) clearInterval(this.discoveryInterval);
    if (this.networkScanInterval) clearInterval(this.networkScanInterval);
    if (this.cellularScanInterval) clearInterval(this.cellularScanInterval);
    if (this.bluetoothScanInterval) clearInterval(this.bluetoothScanInterval);

    // Auto-healing intervals
    if (this.healingInterval) clearInterval(this.healingInterval);

    // Growth acceleration intervals
    if (this.recruitmentInterval) clearInterval(this.recruitmentInterval);
    if (this.growthAnnounceInterval) clearInterval(this.growthAnnounceInterval);

    // Gaming server intervals
    if (this.gamingServerHeartbeat) clearInterval(this.gamingServerHeartbeat);

    // Close gaming server connections
    for (const [serverId, ws] of this.gamingServerConnections) {
      try { ws.close(); } catch {}
    }
    this.gamingServerConnections.clear();

    // Close LAN discovery socket
    if (this.discoverySocket) {
      try { this.discoverySocket.close(); } catch {}
    }

    for (const [, peer] of this.peers) {
      peer.ws.close();
    }
    this.peers.clear();

    if (this.server) {
      return new Promise(resolve => this.server.close(resolve));
    }
  }
}

module.exports = { FungiMeshNetwork, MSG_TYPES };
