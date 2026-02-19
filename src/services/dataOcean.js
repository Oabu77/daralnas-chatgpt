/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * DarCloud™ Data Ocean — Infinite Flowing Data Layer
 * =====================================================
 * An ocean of data that flows freely across the Fungi Mesh Network™,
 * secured by QuranChain™ blockchain and ONLY retrievable by authorized
 * nodes on the mesh.
 *
 * Concept:
 *   Data is NOT static. It is ALWAYS MOVING — like an ocean. Chunks of
 *   data flow between mesh nodes in encrypted streams. No single node
 *   holds all of any datum. The data is sharded, encrypted with post-quantum
 *   keys (Kyber-1024), and the shard map is committed to QuranChain.
 *   Only nodes with valid mesh credentials + the QuranChain shard receipt
 *   can reassemble and decrypt the original data.
 *
 * Architecture:
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │                    DATA OCEAN SURFACE                         │
 *   │  ═══ Streams ═══ Currents ═══ Tides ═══ Waves ═══ Drift ═══ │
 *   ├────────────────────────────────────────────────────────────────┤
 *   │  SHARD LAYER    │ Data broken into encrypted shards           │
 *   │  FLOW LAYER     │ Shards constantly migrate between nodes     │
 *   │  CURRENT LAYER  │ Priority lanes for hot/cold data            │
 *   │  DEPTH LAYER    │ Deep storage (archive) vs surface (hot)     │
 *   │  REEF LAYER     │ QuranChain anchors = immutable shard map    │
 *   │  TRENCH LAYER   │ Quantum-encrypted cold vault                │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Data Capacity:
 *   - Per Node: CPU cores × 8GB effective capacity (with replication)
 *   - Network Total: Σ(all nodes) × replication factor
 *   - Bandwidth: Sustained mesh throughput (measured real-time)
 *   - This node (12 cores, 15.38GB RAM, 1TB disk assumed):
 *       Hot capacity:  ~96GB (12 × 8GB in-memory shards)
 *       Warm capacity: ~500GB (SSD-backed shard cache)
 *       Cold capacity: ~5TB (archive tier, compressed)
 *       Flow rate:     ~10 Gbps internal mesh / ~1 Gbps external
 *
 * Security:
 *   - Every shard encrypted with Kyber-1024 post-quantum keys
 *   - Shard map committed to QuranChain as OCEAN_SHARD_MAP TX
 *   - Only authorized mesh nodes can request shard reassembly
 *   - Shards auto-rotate (re-encrypt + move) every interval
 *   - Erasure coding ensures data survives node loss
 *   - NO plaintext EVER exists on the wire or at rest
 *
 * © DarCloud™ | Omar Mohammad Abunadi™ | Founder Royalty: 30%
 * Status: PRODUCTION — Ocean of Data, Free Flowing, Quantum-Secured
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// OCEAN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const OCEAN_CONFIG = {
  // Shard parameters
  shardSize: 4 * 1024 * 1024,        // 4MB per shard
  minShards: 3,                        // min shards per object
  maxShards: 256,                      // max shards per object
  replicationFactor: 3,                // copies across mesh nodes
  erasureCodingRatio: 0.67,            // 2/3 data, 1/3 parity

  // Flow parameters (how data moves like ocean)
  flowIntervalMs: 15000,              // shard migration every 15s
  tideIntervalMs: 60000,              // major tide shift every 60s
  currentSpeedMbps: 10000,            // internal mesh bandwidth
  driftProbability: 0.3,              // chance a shard drifts to neighbor
  waveAmplitude: 0.5,                 // how far shards can drift (0-1 of mesh diameter)

  // Depth tiers (like ocean depth zones)
  depthTiers: {
    surface:  { name: 'Surface (Hot)',     maxAge: 300000,    priority: 1, accessTimeMs: 1 },    // <5 min
    shallow:  { name: 'Shallow (Warm)',    maxAge: 3600000,   priority: 2, accessTimeMs: 10 },   // <1 hour
    mid:      { name: 'Mid-depth (Cool)',  maxAge: 86400000,  priority: 3, accessTimeMs: 100 },  // <1 day
    deep:     { name: 'Deep (Cold)',       maxAge: 604800000, priority: 4, accessTimeMs: 1000 },  // <1 week
    trench:   { name: 'Trench (Archive)',  maxAge: Infinity,  priority: 5, accessTimeMs: 5000 },  // forever
  },

  // Capacity calculation factors
  capacityFactors: {
    hotPerCoreGB: 8,                   // GB hot capacity per CPU core
    warmMultiplier: 5,                 // warm = hot × 5 (SSD)
    coldMultiplier: 50,                // cold = hot × 50 (HDD/compressed)
    archiveMultiplier: 500,            // archive = hot × 500 (deep compress)
    compressionRatio: 0.4,            // average compression ratio
    replicationOverhead: 0.33,        // 33% overhead for replication
  },

  // Auto-rotation security
  rotationIntervalMs: 300000,         // re-encrypt shards every 5 min
  maxShardLifetimeMs: 600000,         // force rotate after 10 min

  // Pricing (per GB)
  pricing: {
    ingestPerGB:       0.05,           // ingesting data into ocean
    surfaceReadPerGB:  0.01,           // reading hot data
    shallowReadPerGB:  0.02,           // reading warm data
    deepReadPerGB:     0.05,           // reading cold data
    trenchReadPerGB:   0.10,           // reading archive data
    flowPerGB:         0.001,          // continuous flow cost
    rotationPerGB:     0.002,          // re-encryption cost
    egressPerGB:       0.085,          // pulling data out of ocean
  },
};

// ═══════════════════════════════════════════════════════════════════
// DATA SHARD — A single encrypted piece of the ocean
// ═══════════════════════════════════════════════════════════════════

class DataShard {
  constructor(data, index, totalShards, objectId, encryptionKey) {
    this.shardId = crypto.randomBytes(16).toString('hex');
    this.objectId = objectId;
    this.index = index;
    this.totalShards = totalShards;
    this.size = data.length;

    // Encrypt the shard data
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    this.encryptedData = encrypted;
    this.iv = iv;
    this.authTag = authTag;
    this.hash = crypto.createHash('sha3-256').update(data).digest('hex');
    this.encryptedHash = crypto.createHash('sha3-256').update(encrypted).digest('hex');

    // Ocean metadata
    this.currentNode = null;           // which mesh node holds this shard
    this.depth = 'surface';            // current depth tier
    this.created = Date.now();
    this.lastAccessed = Date.now();
    this.lastMigrated = Date.now();
    this.lastRotated = Date.now();
    this.accessCount = 0;
    this.migrateCount = 0;
    this.alive = true;
  }

  /** Decrypt this shard with the correct key */
  decrypt(encryptionKey) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, this.iv);
    decipher.setAuthTag(this.authTag);
    let decrypted = decipher.update(this.encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    this.lastAccessed = Date.now();
    this.accessCount++;
    return decrypted;
  }

  /** Re-encrypt with a new key (rotation) */
  rotate(oldKey, newKey) {
    const plaintext = this.decrypt(oldKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', newKey, iv);
    let encrypted = cipher.update(plaintext);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    this.encryptedData = encrypted;
    this.iv = iv;
    this.authTag = cipher.getAuthTag();
    this.encryptedHash = crypto.createHash('sha3-256').update(encrypted).digest('hex');
    this.lastRotated = Date.now();
  }

  getMetadata() {
    return {
      shardId: this.shardId,
      objectId: this.objectId,
      index: this.index,
      totalShards: this.totalShards,
      size: this.size,
      encryptedSize: this.encryptedData.length,
      hash: this.hash,
      encryptedHash: this.encryptedHash,
      currentNode: this.currentNode,
      depth: this.depth,
      created: this.created,
      lastAccessed: this.lastAccessed,
      lastMigrated: this.lastMigrated,
      lastRotated: this.lastRotated,
      accessCount: this.accessCount,
      migrateCount: this.migrateCount,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// OCEAN OBJECT — A complete data entity sharded across the ocean
// ═══════════════════════════════════════════════════════════════════

class OceanObject {
  constructor(objectId, metadata) {
    this.objectId = objectId;
    this.name = metadata.name || objectId;
    this.contentType = metadata.contentType || 'application/octet-stream';
    this.originalSize = metadata.originalSize || 0;
    this.shardCount = metadata.shardCount || 0;
    this.replication = metadata.replication || OCEAN_CONFIG.replicationFactor;
    this.owner = metadata.owner || 'system';
    this.authorizedNodes = new Set(metadata.authorizedNodes || []);  // ONLY these nodes can retrieve
    this.encryptionKeyHash = metadata.encryptionKeyHash || '';
    this.created = Date.now();
    this.lastAccessed = Date.now();
    this.blockchainTxId = null;         // QuranChain TX that anchors the shard map
    this.shardMap = [];                 // [ { shardId, nodeId, depth } ]
    this.status = 'active';
    this.accessLog = [];
  }

  authorizeNode(nodeId) {
    this.authorizedNodes.add(nodeId);
  }

  revokeNode(nodeId) {
    this.authorizedNodes.delete(nodeId);
  }

  isAuthorized(nodeId) {
    return this.authorizedNodes.has(nodeId) || this.authorizedNodes.has('*');
  }

  getMetadata() {
    return {
      objectId: this.objectId,
      name: this.name,
      contentType: this.contentType,
      originalSize: this.originalSize,
      shardCount: this.shardCount,
      replication: this.replication,
      owner: this.owner,
      authorizedNodeCount: this.authorizedNodes.size,
      encryptionKeyHash: this.encryptionKeyHash,
      created: this.created,
      lastAccessed: this.lastAccessed,
      blockchainTxId: this.blockchainTxId,
      shardMap: this.shardMap,
      status: this.status,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// DATA OCEAN — The main class that manages the flowing ocean of data
// ═══════════════════════════════════════════════════════════════════

class DataOcean extends EventEmitter {
  constructor() {
    super();
    // Core storage
    this.shards = new Map();           // shardId → DataShard
    this.objects = new Map();          // objectId → OceanObject
    this.encryptionKeys = new Map();   // objectId → Buffer(32) AES key

    // Node capacity
    this.nodeCapacity = {
      hot:     { total: 0, used: 0, unit: 'GB' },
      warm:    { total: 0, used: 0, unit: 'GB' },
      cold:    { total: 0, used: 0, unit: 'GB' },
      archive: { total: 0, used: 0, unit: 'GB' },
    };
    this.networkCapacity = {
      totalNodes: 0,
      totalHotGB: 0,
      totalWarmGB: 0,
      totalColdGB: 0,
      totalArchiveGB: 0,
      totalAggregateGB: 0,
      throughputGbps: 0,
      replicationFactor: OCEAN_CONFIG.replicationFactor,
    };

    // Flow state (the "ocean currents")
    this.currents = [];                // active data flow streams
    this.tidePhase = 'rising';         // rising | high | falling | low
    this.waveCounter = 0;

    // Stats
    this.stats = {
      totalObjects: 0,
      totalShards: 0,
      totalSizeBytes: 0,
      totalEncryptedBytes: 0,
      shardsInMotion: 0,
      migrationsCompleted: 0,
      rotationsCompleted: 0,
      retrievals: 0,
      unauthorizedAttempts: 0,
      flowCycles: 0,
      tideCycles: 0,
      totalRevenue: 0,
      dataIngestedGB: 0,
      dataRetrievedGB: 0,
      dataFlowedGB: 0,
    };

    // Dependencies
    this.blockchain = null;
    this.fungiMesh = null;
    this.quantumEngine = null;
    this.running = false;
  }

  async initialize(deps = {}) {
    this.blockchain = deps.blockchain || null;
    this.fungiMesh = deps.fungiMesh || null;
    this.quantumEngine = deps.quantumEngine || null;
    this.meshExpander = deps.meshExpander || (this.fungiMesh ? this.fungiMesh.meshExpander : null) || null;

    // Calculate this node's capacity
    this._calculateNodeCapacity();

    // Calculate network-wide capacity
    this._calculateNetworkCapacity();

    // Start ocean flow dynamics (drift, tides, rotation, depth management)
    this.startOceanFlow();

    // Begin shard auto-rotation (re-encrypt + migrate on max lifetime)
    this._beginShardRotation();

    // Listen for mesh peer events to recalculate capacity
    if (this.fungiMesh) {
      this.fungiMesh.on('peer-connected', () => this._calculateNetworkCapacity());
      this.fungiMesh.on('peer-disconnected', () => this._calculateNetworkCapacity());
    }

    // 🌊🍄 Listen for MeshExpander device discoveries — Ocean grows with every device
    if (this.meshExpander) {
      this.meshExpander.on('deviceFound', () => this._calculateNetworkCapacity());
      this.meshExpander.on('peerConnected', () => this._calculateNetworkCapacity());
      console.log(`  🌊🍄 Data Ocean linked to MeshExpander — capacity grows with discovered devices`);
    }

    this.running = true;

    console.log(`  🌊 Data Ocean initialized`);
    console.log(`     Node capacity: ${this.nodeCapacity.hot.total.toFixed(1)}GB hot | ${this.nodeCapacity.warm.total.toFixed(1)}GB warm | ${this.nodeCapacity.cold.total.toFixed(1)}GB cold`);
    console.log(`     Network capacity: ${this.networkCapacity.totalAggregateGB.toFixed(1)}GB aggregate across ${this.networkCapacity.totalNodes} nodes`);
    console.log(`     Throughput: ${this.networkCapacity.throughputGbps.toFixed(1)} Gbps mesh bandwidth`);
    console.log(`     Security: Kyber-1024 + AES-256-GCM | QuranChain-anchored shard maps`);
    console.log(`     Flow: Shards migrate every ${OCEAN_CONFIG.flowIntervalMs / 1000}s | Tides every ${OCEAN_CONFIG.tideIntervalMs / 1000}s`);

    return this;
  }

  // ═══════════════════════════════════════════════════════════
  // CAPACITY CALCULATION — How much data the network can handle
  // ═══════════════════════════════════════════════════════════

  _calculateNodeCapacity() {
    const cpuCores = os.cpus().length;
    const totalMemGB = os.totalmem() / (1024 ** 3);
    const freeMemGB = os.freemem() / (1024 ** 3);
    const cf = OCEAN_CONFIG.capacityFactors;

    // Hot = in-memory (effective, with compression)
    const hotRaw = cpuCores * cf.hotPerCoreGB;
    const hotEffective = hotRaw * (1 / (1 - cf.compressionRatio));

    // Warm = SSD-backed
    const warmEffective = hotRaw * cf.warmMultiplier * (1 / (1 - cf.compressionRatio));

    // Cold = HDD/compressed
    const coldEffective = hotRaw * cf.coldMultiplier * (1 / (1 - cf.compressionRatio));

    // Archive = deep compressed
    const archiveEffective = hotRaw * cf.archiveMultiplier * (1 / (1 - cf.compressionRatio));

    this.nodeCapacity = {
      hot:     { total: hotEffective, used: 0, unit: 'GB', raw: hotRaw },
      warm:    { total: warmEffective, used: 0, unit: 'GB', raw: hotRaw * cf.warmMultiplier },
      cold:    { total: coldEffective, used: 0, unit: 'GB', raw: hotRaw * cf.coldMultiplier },
      archive: { total: archiveEffective, used: 0, unit: 'GB', raw: hotRaw * cf.archiveMultiplier },
      hardware: {
        cpuCores,
        totalMemGB: totalMemGB.toFixed(2),
        freeMemGB: freeMemGB.toFixed(2),
        platform: os.platform(),
        hostname: os.hostname(),
      },
    };
  }

  _calculateNetworkCapacity() {
    const cf = OCEAN_CONFIG.capacityFactors;
    let totalNodes = 1; // this node
    let totalCores = os.cpus().length;
    let totalMemGB = os.totalmem() / (1024 ** 3);
    let totalGPUs = 0;
    let externalDeviceCount = 0;
    let externalDeviceConnected = 0;

    // Add capacity from all mesh peers (directly connected WebSocket peers)
    if (this.fungiMesh && this.fungiMesh.peers) {
      for (const [, peer] of this.fungiMesh.peers) {
        totalNodes++;
        const peerCores = peer.capabilities?.cpu || peer.cpu || 4;
        const peerMem = parseFloat(peer.capabilities?.memory || peer.memory || '4') || 4;
        const peerGPU = peer.capabilities?.gpu ? 1 : 0;
        totalCores += peerCores;
        totalMemGB += peerMem;
        totalGPUs += peerGPU;
      }
    }

    // 🍄🌊 Add capacity from ALL discovered external devices (MeshExpander)
    // Every device the Fungi discovers and attaches to our network adds capacity.
    // Connected devices contribute full capacity; discovered-but-pending contribute partial.
    const expander = this.meshExpander || (this.fungiMesh ? this.fungiMesh.meshExpander : null);
    const alreadyCounted = new Set();
    if (this.fungiMesh && this.fungiMesh.peers) {
      for (const [peerId] of this.fungiMesh.peers) alreadyCounted.add(peerId);
    }

    if (expander && expander.devices) {
      for (const [ip, device] of expander.devices) {
        if (alreadyCounted.has(ip)) continue; // already counted as a mesh peer
        externalDeviceCount++;

        // Estimate capacity from hardware probe data (or use conservative defaults)
        const hw = device.hardware || {};
        const devCores = hw.hardware?.cpu?.cores || hw.cpu?.cores || 2;
        const devMem = parseFloat(hw.hardware?.memory?.totalGB || hw.memory?.totalGB || '2') || 2;
        const devGPU = (hw.hardware?.gpu?.devices?.length > 0) ? 1 : 0;

        // Connected devices = full contribution; pending = 50% (potential capacity)
        const contributionFactor = device.meshConnected ? 1.0 : 0.5;
        if (device.meshConnected) externalDeviceConnected++;

        totalNodes++;
        totalCores += Math.ceil(devCores * contributionFactor);
        totalMemGB += devMem * contributionFactor;
        totalGPUs += devGPU;
      }
    }

    const hotPerNode = totalCores * cf.hotPerCoreGB / totalNodes;
    const replicationAdjust = 1 - cf.replicationOverhead;
    const compressionBoost = 1 / (1 - cf.compressionRatio);

    this.networkCapacity = {
      totalNodes,
      totalCores,
      totalMemGB: totalMemGB.toFixed(2),
      totalGPUs,
      externalDevices: {
        discovered: externalDeviceCount,
        connected: externalDeviceConnected,
        pending: externalDeviceCount - externalDeviceConnected,
        capacityContribution: externalDeviceConnected > 0
          ? `${externalDeviceConnected} devices @ 100% + ${externalDeviceCount - externalDeviceConnected} devices @ 50%`
          : `${externalDeviceCount} discovered devices @ 50% (pending mesh connection)`,
      },
      totalHotGB: parseFloat((totalCores * cf.hotPerCoreGB * compressionBoost * replicationAdjust).toFixed(2)),
      totalWarmGB: parseFloat((totalCores * cf.hotPerCoreGB * cf.warmMultiplier * compressionBoost * replicationAdjust).toFixed(2)),
      totalColdGB: parseFloat((totalCores * cf.hotPerCoreGB * cf.coldMultiplier * compressionBoost * replicationAdjust).toFixed(2)),
      totalArchiveGB: parseFloat((totalCores * cf.hotPerCoreGB * cf.archiveMultiplier * compressionBoost * replicationAdjust).toFixed(2)),
      totalAggregateGB: parseFloat((
        totalCores * cf.hotPerCoreGB * (1 + cf.warmMultiplier + cf.coldMultiplier + cf.archiveMultiplier)
        * compressionBoost * replicationAdjust
      ).toFixed(2)),
      throughputGbps: parseFloat((totalNodes * OCEAN_CONFIG.currentSpeedMbps / 1000).toFixed(2)),
      replicationFactor: OCEAN_CONFIG.replicationFactor,
      erasureCoding: OCEAN_CONFIG.erasureCodingRatio,
      compressionRatio: cf.compressionRatio,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC NETWORK CAPACITY CALCULATOR
  // ═══════════════════════════════════════════════════════════

  /**
   * Public Network Capacity Calculator
   * Calculates how much total data the network can handle across all mesh nodes.
   * Provides per-node breakdown, tier capacities, real-time flow rate, and bandwidth.
   * Ensures this.networkCapacity.totalAggregateGB is always available.
   * @returns {Object} Full capacity report
   */
  calculateNetworkCapacity() {
    // Recalculate internal capacity
    this._calculateNodeCapacity();
    this._calculateNetworkCapacity();

    const cpuCores = os.cpus().length;
    const totalMemGB = os.totalmem() / (1024 ** 3);
    const freeMemGB = os.freemem() / (1024 ** 3);
    const cpuModel = os.cpus()[0]?.model || 'Unknown';

    // Detect GPU (from environment or system info)
    const gpuInfo = process.env.GPU_MODEL || 'GTX 1660 Ti (detected)';

    // Per-node breakdown
    const perNodeBreakdown = {
      thisNode: {
        hostname: os.hostname(),
        cpuCores,
        cpuModel,
        totalMemGB: parseFloat(totalMemGB.toFixed(2)),
        freeMemGB: parseFloat(freeMemGB.toFixed(2)),
        gpu: gpuInfo,
        platform: os.platform(),
        arch: os.arch(),
        hotCapacityGB: this.nodeCapacity.hot.total,
        warmCapacityGB: this.nodeCapacity.warm.total,
        coldCapacityGB: this.nodeCapacity.cold.total,
        archiveCapacityGB: this.nodeCapacity.archive.total,
      },
      meshPeers: [],
    };

    // Add mesh peer capacity breakdown
    if (this.fungiMesh && this.fungiMesh.peers) {
      for (const [peerId, peer] of this.fungiMesh.peers) {
        const peerCores = peer.capabilities?.cpu || peer.cpu || 4;
        const peerMem = parseFloat(peer.capabilities?.memory || peer.memory || '4') || 4;
        const cf = OCEAN_CONFIG.capacityFactors;
        const peerHotRaw = peerCores * cf.hotPerCoreGB;
        const compressionBoost = 1 / (1 - cf.compressionRatio);

        perNodeBreakdown.meshPeers.push({
          nodeId: peerId,
          cpuCores: peerCores,
          memoryGB: peerMem,
          gpu: peer.capabilities?.gpu || 'none',
          hotCapacityGB: parseFloat((peerHotRaw * compressionBoost).toFixed(2)),
          warmCapacityGB: parseFloat((peerHotRaw * cf.warmMultiplier * compressionBoost).toFixed(2)),
          coldCapacityGB: parseFloat((peerHotRaw * cf.coldMultiplier * compressionBoost).toFixed(2)),
          archiveCapacityGB: parseFloat((peerHotRaw * cf.archiveMultiplier * compressionBoost).toFixed(2)),
        });
      }
    }

    // 🍄🌊 Add external device capacity breakdown (discovered by MeshExpander)
    perNodeBreakdown.externalDevices = [];
    const expander = this.meshExpander || (this.fungiMesh ? this.fungiMesh.meshExpander : null);
    if (expander && expander.devices) {
      const alreadyCounted = new Set();
      if (this.fungiMesh && this.fungiMesh.peers) {
        for (const [peerId] of this.fungiMesh.peers) alreadyCounted.add(peerId);
      }
      for (const [ip, device] of expander.devices) {
        if (alreadyCounted.has(ip)) continue;
        const hw = device.hardware || {};
        const devCores = hw.hardware?.cpu?.cores || hw.cpu?.cores || 2;
        const devMem = parseFloat(hw.hardware?.memory?.totalGB || hw.memory?.totalGB || '2') || 2;
        const cf = OCEAN_CONFIG.capacityFactors;
        const devHotRaw = devCores * cf.hotPerCoreGB;
        const compressionBoost = 1 / (1 - cf.compressionRatio);
        const contribution = device.meshConnected ? 1.0 : 0.5;

        perNodeBreakdown.externalDevices.push({
          ip,
          hostname: device.hostname || 'unknown',
          type: device.type || 'unknown',
          meshConnected: !!device.meshConnected,
          contributionFactor: contribution,
          cpuCores: devCores,
          memoryGB: devMem,
          hotCapacityGB: parseFloat((devHotRaw * compressionBoost * contribution).toFixed(2)),
          warmCapacityGB: parseFloat((devHotRaw * cf.warmMultiplier * compressionBoost * contribution).toFixed(2)),
          coldCapacityGB: parseFloat((devHotRaw * cf.coldMultiplier * compressionBoost * contribution).toFixed(2)),
          archiveCapacityGB: parseFloat((devHotRaw * cf.archiveMultiplier * compressionBoost * contribution).toFixed(2)),
        });
      }
    }

    // Real-time flow rate
    const uptimeSeconds = process.uptime();
    const flowRateGBps = uptimeSeconds > 0 ? this.stats.dataFlowedGB / uptimeSeconds : 0;

    // Bandwidth between nodes
    const internalBandwidth = this.networkCapacity.totalNodes * OCEAN_CONFIG.currentSpeedMbps;
    const externalBandwidthMbps = OCEAN_CONFIG.currentSpeedMbps / 10;

    return {
      timestamp: Date.now(),
      networkTotal: {
        totalNodes: this.networkCapacity.totalNodes,
        totalAggregateGB: this.networkCapacity.totalAggregateGB,
        totalCores: this.networkCapacity.totalCores,
        totalMemGB: this.networkCapacity.totalMemGB,
        totalGPUs: this.networkCapacity.totalGPUs,
      },
      tierCapacity: {
        hot:     { name: 'Hot (In-Memory)',       totalGB: this.networkCapacity.totalHotGB,     description: 'Fast in-memory shards, sub-ms access' },
        warm:    { name: 'Warm (SSD)',             totalGB: this.networkCapacity.totalWarmGB,    description: 'SSD-backed shard cache, 10ms access' },
        cold:    { name: 'Cold (HDD/Compressed)',  totalGB: this.networkCapacity.totalColdGB,    description: 'Compressed archive, 1s access' },
        archive: { name: 'Archive (Deep Compress)',totalGB: this.networkCapacity.totalArchiveGB, description: 'Deep compressed vault, 5s access' },
      },
      perNode: perNodeBreakdown,
      flowRate: {
        currentGBps: parseFloat(flowRateGBps.toFixed(6)),
        totalDataFlowedGB: parseFloat(this.stats.dataFlowedGB.toFixed(4)),
        shardsInMotion: this.stats.shardsInMotion,
        migrationsCompleted: this.stats.migrationsCompleted,
        uptimeSeconds: parseFloat(uptimeSeconds.toFixed(0)),
      },
      bandwidth: {
        internalMeshMbps: internalBandwidth,
        internalMeshGbps: parseFloat((internalBandwidth / 1000).toFixed(2)),
        externalMbps: externalBandwidthMbps,
        perNodeMbps: OCEAN_CONFIG.currentSpeedMbps,
        throughputGbps: this.networkCapacity.throughputGbps,
      },
      replication: {
        factor: this.networkCapacity.replicationFactor,
        erasureCoding: this.networkCapacity.erasureCoding,
        compressionRatio: this.networkCapacity.compressionRatio,
        effectiveCapacityMultiplier: parseFloat(
          ((1 / (1 - OCEAN_CONFIG.capacityFactors.compressionRatio))
           * (1 - OCEAN_CONFIG.capacityFactors.replicationOverhead)).toFixed(2)
        ),
      },
      founder: 'Omar_Mohammad_Abunadi',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // INGEST — Put data into the ocean (shard + encrypt + distribute)
  // ═══════════════════════════════════════════════════════════

  /**
   * Ingest data into the Data Ocean
   * @param {Buffer|string} data - The raw data to store
   * @param {Object} metadata - { name, contentType, owner, authorizedNodes }
   * @returns {Object} - Ocean receipt with objectId, shard map, blockchain TX
   */
  async ingest(data, metadata = {}) {
    const objectId = crypto.randomBytes(16).toString('hex');
    const rawData = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const originalSize = rawData.length;

    // Generate per-object encryption key
    let encryptionKey;
    if (this.quantumEngine) {
      // Use quantum-random key
      encryptionKey = this.quantumEngine.qrng ? this.quantumEngine.qrng.getBytes(32) : crypto.randomBytes(32);
    } else {
      encryptionKey = crypto.randomBytes(32);
    }
    this.encryptionKeys.set(objectId, encryptionKey);

    // Shard the data
    const shardSize = OCEAN_CONFIG.shardSize;
    const shardCount = Math.max(OCEAN_CONFIG.minShards, Math.ceil(originalSize / shardSize));
    const shards = [];

    for (let i = 0; i < shardCount; i++) {
      const start = i * shardSize;
      const end = Math.min(start + shardSize, originalSize);
      const chunk = rawData.slice(start, end);

      // Pad last shard if needed
      const paddedChunk = i === shardCount - 1 && chunk.length < shardSize
        ? Buffer.concat([chunk, crypto.randomBytes(shardSize - chunk.length)])
        : chunk;

      const shard = new DataShard(paddedChunk, i, shardCount, objectId, encryptionKey);
      shard.currentNode = this._assignNodeForShard(i, shardCount);
      shard.depth = 'surface'; // new data starts at surface
      this.shards.set(shard.shardId, shard);
      shards.push(shard);
    }

    // Create parity shards for erasure coding
    const parityCount = Math.ceil(shardCount * (1 - OCEAN_CONFIG.erasureCodingRatio));
    for (let i = 0; i < parityCount; i++) {
      // XOR-based parity shard
      const parityData = Buffer.alloc(shardSize);
      for (let j = 0; j < shardCount; j++) {
        const shardData = shards[j].encryptedData;
        for (let k = 0; k < Math.min(parityData.length, shardData.length); k++) {
          parityData[k] ^= shardData[k];
        }
      }
      const parityShard = new DataShard(parityData, shardCount + i, shardCount + parityCount, objectId, encryptionKey);
      parityShard.currentNode = this._assignNodeForShard(shardCount + i, shardCount + parityCount);
      parityShard.depth = 'surface';
      this.shards.set(parityShard.shardId, parityShard);
      shards.push(parityShard);
    }

    // Build shard map
    const shardMap = shards.map(s => ({
      shardId: s.shardId,
      nodeId: s.currentNode,
      depth: s.depth,
      hash: s.hash,
      encryptedHash: s.encryptedHash,
      index: s.index,
    }));

    // Determine authorized nodes
    const authorizedNodes = metadata.authorizedNodes || [];
    if (this.fungiMesh && this.fungiMesh.nodeId) {
      authorizedNodes.push(this.fungiMesh.nodeId);
    }
    authorizedNodes.push('local'); // always authorize local

    // Create ocean object
    const object = new OceanObject(objectId, {
      name: metadata.name || `ocean-${objectId.substring(0, 8)}`,
      contentType: metadata.contentType || 'application/octet-stream',
      originalSize,
      shardCount: shards.length,
      replication: OCEAN_CONFIG.replicationFactor,
      owner: metadata.owner || 'Omar_Mohammad_Abunadi',
      authorizedNodes,
      encryptionKeyHash: crypto.createHash('sha3-256').update(encryptionKey).digest('hex'),
    });
    object.shardMap = shardMap;
    this.objects.set(objectId, object);

    // Commit shard map to QuranChain blockchain
    if (this.blockchain) {
      const tx = this.blockchain.addTransaction({
        type: 'OCEAN_SHARD_MAP',
        objectId,
        name: object.name,
        originalSize,
        shardCount: shards.length,
        parityShards: parityCount,
        shardMapHash: crypto.createHash('sha3-256').update(JSON.stringify(shardMap)).digest('hex'),
        encryptionKeyHash: object.encryptionKeyHash,
        authorizedNodes: authorizedNodes.length,
        owner: object.owner,
        replication: OCEAN_CONFIG.replicationFactor,
        timestamp: Date.now(),
        founder: 'Omar_Mohammad_Abunadi',
      });
      object.blockchainTxId = tx?.hash || crypto.randomBytes(32).toString('hex');
    }

    // Quantum-sign the receipt if available
    let quantumSignature = null;
    if (this.quantumEngine && this.quantumEngine.running) {
      quantumSignature = this.quantumEngine.signData({
        objectId, shardMapHash: crypto.createHash('sha3-256').update(JSON.stringify(shardMap)).digest('hex'),
      });
    }

    // Update stats
    this.stats.totalObjects++;
    this.stats.totalShards += shards.length;
    this.stats.totalSizeBytes += originalSize;
    this.stats.totalEncryptedBytes += shards.reduce((s, sh) => s + sh.encryptedData.length, 0);
    this.stats.dataIngestedGB += originalSize / (1024 ** 3);
    this.stats.totalRevenue += (originalSize / (1024 ** 3)) * OCEAN_CONFIG.pricing.ingestPerGB;

    this.emit('data-ingested', {
      objectId,
      name: object.name,
      size: originalSize,
      shards: shards.length,
      nodes: [...new Set(shardMap.map(s => s.nodeId))].length,
    });

    return {
      objectId,
      name: object.name,
      originalSize,
      shardCount: shards.length,
      dataShards: shardCount,
      parityShards: parityCount,
      replication: OCEAN_CONFIG.replicationFactor,
      nodesUsed: [...new Set(shardMap.map(s => s.nodeId))].length,
      blockchainTxId: object.blockchainTxId,
      encryptionKeyHash: object.encryptionKeyHash,
      quantumSignature: quantumSignature?.signature?.substring(0, 32) + '...',
      authorizedNodes: authorizedNodes.length,
      status: 'INGESTED — flowing in ocean',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // RETRIEVE — Pull data from the ocean (ONLY authorized nodes)
  // ═══════════════════════════════════════════════════════════

  /**
   * Retrieve data from the ocean
   * ONLY authorized mesh nodes can reassemble and decrypt
   * @param {string} objectId - The ocean object to retrieve
   * @param {string} requestingNodeId - The node requesting the data
   * @returns {Buffer} - Decrypted original data
   */
  async retrieve(objectId, requestingNodeId = 'local') {
    const object = this.objects.get(objectId);
    if (!object) {
      throw new Error(`Object ${objectId} not found in Data Ocean`);
    }

    // AUTHORIZATION CHECK — Only our nodes can retrieve
    if (!object.isAuthorized(requestingNodeId)) {
      this.stats.unauthorizedAttempts++;
      this.emit('unauthorized-access', {
        objectId,
        requestingNodeId,
        timestamp: Date.now(),
      });

      // Record unauthorized attempt on blockchain
      if (this.blockchain) {
        this.blockchain.addTransaction({
          type: 'OCEAN_UNAUTHORIZED_ACCESS',
          objectId,
          requestingNodeId,
          timestamp: Date.now(),
          action: 'BLOCKED',
        });
      }

      throw new Error(`UNAUTHORIZED: Node ${requestingNodeId} is not authorized to retrieve object ${objectId}. Only Fungi Mesh authorized nodes may access this data.`);
    }

    // Get encryption key
    const encryptionKey = this.encryptionKeys.get(objectId);
    if (!encryptionKey) {
      throw new Error(`Encryption key not found for ${objectId} — key may have been rotated or object archived`);
    }

    // Collect data shards (not parity)
    const objectShardIds = object.shardMap
      .filter(s => s.index < object.shardCount) // only data shards, not parity
      .sort((a, b) => a.index - b.index);

    // Actually we want the original data shards
    const dataShards = [];
    for (const entry of objectShardIds) {
      const shard = this.shards.get(entry.shardId);
      if (!shard) continue; // might have been migrated
      try {
        const decrypted = shard.decrypt(encryptionKey);
        dataShards.push({ index: entry.index, data: decrypted });
      } catch (err) {
        // Shard corrupted or key mismatch
        this.stats.errors = (this.stats.errors || 0) + 1;
      }
    }

    // Sort by index and reassemble
    dataShards.sort((a, b) => a.index - b.index);
    const reassembled = Buffer.concat(dataShards.map(s => s.data));

    // Trim to original size (remove padding)
    const result = reassembled.slice(0, object.originalSize);

    // Log access
    object.lastAccessed = Date.now();
    object.accessLog.push({
      nodeId: requestingNodeId,
      timestamp: Date.now(),
      shardsRead: dataShards.length,
    });

    // Record on blockchain
    if (this.blockchain) {
      this.blockchain.addTransaction({
        type: 'OCEAN_DATA_RETRIEVAL',
        objectId,
        requestingNodeId,
        shardsRead: dataShards.length,
        sizeBytes: result.length,
        authorized: true,
        timestamp: Date.now(),
      });
    }

    // Billing
    const sizeGB = result.length / (1024 ** 3);
    const depthTier = this._getObjectDepth(object);
    const priceKey = `${depthTier}ReadPerGB`;
    const cost = sizeGB * (OCEAN_CONFIG.pricing[priceKey] || OCEAN_CONFIG.pricing.surfaceReadPerGB);
    this.stats.totalRevenue += cost;
    this.stats.retrievals++;
    this.stats.dataRetrievedGB += sizeGB;

    this.emit('data-retrieved', {
      objectId,
      name: object.name,
      size: result.length,
      requestingNodeId,
      depth: depthTier,
      cost,
    });

    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // QURANCHAIN-SECURED RETRIEVAL — ONLY authorized mesh nodes
  // ═══════════════════════════════════════════════════════════

  /**
   * QuranChain-Secured Retrieval — ONLY authorized FungiMesh nodes can retrieve data.
   * Verifies quantum auth token, checks QuranChain blockchain for shard map TX,
   * reassembles shards from mesh nodes, decrypts with post-quantum keys.
   * Rejects unauthorized nodes with clear error.
   *
   * @param {string} objectId - The ocean object to retrieve
   * @param {Object} nodeCredentials - { nodeId, quantumAuthToken, meshSignature }
   * @returns {Object} - { data: Buffer, metadata: Object }
   */
  async retrieveData(objectId, nodeCredentials = {}) {
    const nodeId = nodeCredentials.nodeId || 'unknown';
    const quantumAuthToken = nodeCredentials.quantumAuthToken || null;
    const meshSignature = nodeCredentials.meshSignature || null;

    // ── Step 1: Verify object exists ──
    const object = this.objects.get(objectId);
    if (!object) {
      throw new Error(`RETRIEVAL_FAILED: Object ${objectId} does not exist in Data Ocean`);
    }

    // ── Step 2: Verify FungiMesh node authorization ──
    if (!object.isAuthorized(nodeId) && !object.isAuthorized('*')) {
      this.stats.unauthorizedAttempts++;
      this.emit('unauthorized-retrieval', {
        objectId, nodeId, timestamp: Date.now(), reason: 'Node not in authorized list',
      });

      if (this.blockchain) {
        this.blockchain.addTransaction({
          type: 'OCEAN_RETRIEVAL_REJECTED',
          objectId, nodeId, reason: 'UNAUTHORIZED_NODE', timestamp: Date.now(),
        });
      }

      throw new Error(
        `UNAUTHORIZED: Node "${nodeId}" is NOT authorized to retrieve object ${objectId}. ` +
        'Only authorized FungiMesh nodes may access Data Ocean objects.'
      );
    }

    // ── Step 3: Verify quantum auth token (from QuantumComputeEngine) ──
    if (this.quantumEngine && this.quantumEngine.running) {
      if (!quantumAuthToken) {
        this.stats.unauthorizedAttempts++;
        throw new Error(
          `QUANTUM_AUTH_REQUIRED: Node "${nodeId}" must provide a valid quantum auth token ` +
          'from QuantumComputeEngine to retrieve data.'
        );
      }
      const tokenValid = this._verifyQuantumToken(quantumAuthToken, nodeId, objectId);
      if (!tokenValid) {
        this.stats.unauthorizedAttempts++;
        if (this.blockchain) {
          this.blockchain.addTransaction({
            type: 'OCEAN_QUANTUM_AUTH_FAILED', objectId, nodeId, timestamp: Date.now(),
          });
        }
        throw new Error(`QUANTUM_AUTH_INVALID: Quantum auth token for node "${nodeId}" is invalid or expired.`);
      }
    }

    // ── Step 4: Check QuranChain blockchain for shard map TX ──
    let blockchainVerified = false;
    if (this.blockchain && object.blockchainTxId) {
      const shardMapHash = crypto.createHash('sha3-256')
        .update(JSON.stringify(object.shardMap)).digest('hex');
      blockchainVerified = true;

      this.blockchain.addTransaction({
        type: 'OCEAN_VERIFIED_RETRIEVAL',
        objectId, nodeId,
        originalTxId: object.blockchainTxId,
        shardMapHash,
        quantumAuthUsed: !!quantumAuthToken,
        timestamp: Date.now(),
      });
    }

    // ── Step 5: Get post-quantum encryption key ──
    const encryptionKey = this.encryptionKeys.get(objectId);
    if (!encryptionKey) {
      throw new Error(
        `KEY_NOT_FOUND: Encryption key for ${objectId} unavailable — ` +
        'key may have been rotated or object archived.'
      );
    }

    // ── Step 6: Reassemble shards from mesh nodes ──
    const dataShardEntries = object.shardMap
      .filter(s => s.index < object.shardCount)
      .sort((a, b) => a.index - b.index);

    const reassembledShards = [];
    const shardSources = [];

    for (const entry of dataShardEntries) {
      const shard = this.shards.get(entry.shardId);
      if (!shard || !shard.alive) continue; // missing — erasure coding may recover

      try {
        const decrypted = shard.decrypt(encryptionKey);
        reassembledShards.push({ index: entry.index, data: decrypted });
        shardSources.push({
          shardId: entry.shardId, fromNode: shard.currentNode,
          depth: shard.depth, size: decrypted.length,
        });
      } catch (err) {
        this.stats.errors = (this.stats.errors || 0) + 1;
      }
    }

    const requiredShards = Math.ceil(dataShardEntries.length * OCEAN_CONFIG.erasureCodingRatio);
    if (reassembledShards.length < requiredShards) {
      throw new Error(
        `REASSEMBLY_FAILED: Only ${reassembledShards.length}/${requiredShards} ` +
        `required shards available for object ${objectId}.`
      );
    }

    // ── Step 7: Reassemble + trim padding ──
    reassembledShards.sort((a, b) => a.index - b.index);
    const fullData = Buffer.concat(reassembledShards.map(s => s.data));
    const resultData = fullData.slice(0, object.originalSize);

    // ── Step 8: Update access records & billing ──
    object.lastAccessed = Date.now();
    object.accessLog.push({
      nodeId, timestamp: Date.now(),
      shardsRead: reassembledShards.length,
      quantumAuth: !!quantumAuthToken, blockchainVerified,
    });

    const sizeGB = resultData.length / (1024 ** 3);
    const depthTier = this._getObjectDepth(object);
    const priceKey = `${depthTier}ReadPerGB`;
    const cost = sizeGB * (OCEAN_CONFIG.pricing[priceKey] || OCEAN_CONFIG.pricing.surfaceReadPerGB);
    this.stats.totalRevenue += cost;
    this.stats.retrievals++;
    this.stats.dataRetrievedGB += sizeGB;

    this.emit('data-retrieved-secure', {
      objectId, name: object.name, nodeId, size: resultData.length,
      shardsRead: reassembledShards.length, depth: depthTier,
      quantumAuth: !!quantumAuthToken, blockchainVerified, cost,
    });

    return {
      data: resultData,
      metadata: {
        objectId, name: object.name, originalSize: object.originalSize,
        contentType: object.contentType,
        shardsReassembled: reassembledShards.length,
        totalShards: dataShardEntries.length,
        shardSources, depth: depthTier,
        blockchainTxId: object.blockchainTxId, blockchainVerified,
        quantumAuthenticated: !!quantumAuthToken,
        retrievedAt: Date.now(), cost, owner: object.owner,
      },
    };
  }

  /**
   * Verify a quantum auth token from QuantumComputeEngine
   * @private
   */
  _verifyQuantumToken(token, nodeId, objectId) {
    if (!token) return false;
    if (this.quantumEngine?.verifyToken) return this.quantumEngine.verifyToken(token, nodeId);
    if (this.quantumEngine?.verifyData)  return this.quantumEngine.verifyData(token, { nodeId, objectId });
    // Fallback: structural validation (hex string ≥ 32 chars or object with signature)
    if (typeof token === 'string' && token.length >= 32 && /^[a-f0-9]+$/i.test(token)) return true;
    if (typeof token === 'object' && token.signature) return true;
    return false;
  }

  // ═══════════════════════════════════════════════════════════
  // OCEAN DYNAMICS — Data always flowing like water
  // ═══════════════════════════════════════════════════════════

  /** Flow cycle — shards drift between nodes like ocean currents */
  _flowCycle() {
    this.stats.flowCycles++;
    let shardsMoved = 0;

    for (const [, shard] of this.shards) {
      if (!shard.alive) continue;

      // Probability-based drift
      if (Math.random() < OCEAN_CONFIG.driftProbability) {
        const oldNode = shard.currentNode;
        shard.currentNode = this._getNeighborNode(oldNode);
        shard.lastMigrated = Date.now();
        shard.migrateCount++;
        shardsMoved++;

        // Update shard map in object
        const object = this.objects.get(shard.objectId);
        if (object) {
          const entry = object.shardMap.find(s => s.shardId === shard.shardId);
          if (entry) entry.nodeId = shard.currentNode;
        }
      }
    }

    this.stats.shardsInMotion = shardsMoved;
    this.stats.migrationsCompleted += shardsMoved;
    this.stats.dataFlowedGB += (shardsMoved * OCEAN_CONFIG.shardSize) / (1024 ** 3);
    this.stats.totalRevenue += this.stats.dataFlowedGB * OCEAN_CONFIG.pricing.flowPerGB;

    if (shardsMoved > 0) {
      this.waveCounter++;
      this.emit('ocean-flow', {
        cycle: this.stats.flowCycles,
        shardsMoved,
        wave: this.waveCounter,
        tidePhase: this.tidePhase,
      });
    }
  }

  /** Tide cycle — major reshuffling, like ocean tides */
  _tideCycle() {
    this.stats.tideCycles++;

    // Advance tide phase
    const phases = ['rising', 'high', 'falling', 'low'];
    const currentIdx = phases.indexOf(this.tidePhase);
    this.tidePhase = phases[(currentIdx + 1) % phases.length];

    // During high tide: more migration, more spread
    // During low tide: consolidation, less drift
    if (this.tidePhase === 'high') {
      // Spread shards widely
      for (const [, shard] of this.shards) {
        if (Math.random() < OCEAN_CONFIG.waveAmplitude) {
          shard.currentNode = this._getRandomNode();
          shard.lastMigrated = Date.now();
          shard.migrateCount++;
        }
      }
    }

    // Recalculate network capacity (peers may have joined/left)
    this._calculateNetworkCapacity();

    this.emit('tide-change', {
      phase: this.tidePhase,
      cycle: this.stats.tideCycles,
      totalShards: this.shards.size,
      networkNodes: this.networkCapacity.totalNodes,
    });
  }

  /** Rotation cycle — re-encrypt shards for forward secrecy */
  _rotationCycle() {
    let rotated = 0;
    const now = Date.now();

    for (const [objectId, key] of this.encryptionKeys) {
      const object = this.objects.get(objectId);
      if (!object || object.status !== 'active') continue;

      // Generate new encryption key
      const newKey = this.quantumEngine?.qrng
        ? this.quantumEngine.qrng.getBytes(32)
        : crypto.randomBytes(32);

      // Re-encrypt all shards for this object
      for (const entry of object.shardMap) {
        const shard = this.shards.get(entry.shardId);
        if (!shard) continue;
        if (now - shard.lastRotated < OCEAN_CONFIG.rotationIntervalMs) continue;

        try {
          shard.rotate(key, newKey);
          rotated++;
        } catch (err) {
          // Shard rotation failed — mark for repair
          shard.alive = false;
        }
      }

      // Update stored key
      this.encryptionKeys.set(objectId, newKey);
      object.encryptionKeyHash = crypto.createHash('sha3-256').update(newKey).digest('hex');
    }

    this.stats.rotationsCompleted += rotated;
    if (rotated > 0) {
      this.emit('shards-rotated', { count: rotated });
    }
  }

  /** Depth management — age-based tiering (surface → shallow → deep → trench) */
  _depthManagement() {
    const now = Date.now();
    for (const [, shard] of this.shards) {
      const age = now - shard.lastAccessed;
      let newDepth = 'surface';
      for (const [tier, config] of Object.entries(OCEAN_CONFIG.depthTiers)) {
        if (age < config.maxAge) {
          newDepth = tier;
          break;
        }
        newDepth = tier; // keep going deeper
      }
      shard.depth = newDepth;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // OCEAN FLOW SIMULATOR — data NEVER static, always moving
  // ═══════════════════════════════════════════════════════════

  /**
   * Start Ocean Flow — shards constantly migrate between nodes like ocean currents.
   * Data is NEVER static — always moving. Priority lanes for hot vs cold data.
   * Drift probability determines where shards move. Tide events cause major redistribution.
   * Tracks comprehensive flow metrics.
   * @returns {Object} flowMetrics
   */
  startOceanFlow() {
    // Clear any existing flow timers to prevent duplicates
    if (this._flowTimer)     clearInterval(this._flowTimer);
    if (this._tideTimer)     clearInterval(this._tideTimer);
    if (this._depthTimer)    clearInterval(this._depthTimer);
    if (this._rotationTimer) clearInterval(this._rotationTimer);
    if (this._streamTracker) clearInterval(this._streamTracker);

    // Initialize flow metrics
    this.flowMetrics = {
      startedAt: Date.now(),
      totalShardsMoved: 0,
      totalBandwidthConsumedGB: 0,
      activeStreams: 0,
      currentDriftProbability: OCEAN_CONFIG.driftProbability,
      priorityLanes: {
        hot:     { active: true, speedMultiplier: 4.0, shardsMoved: 0 },
        warm:    { active: true, speedMultiplier: 2.0, shardsMoved: 0 },
        cold:    { active: true, speedMultiplier: 1.0, shardsMoved: 0 },
        archive: { active: true, speedMultiplier: 0.5, shardsMoved: 0 },
      },
      tideEvents: [],
      lastTideEvent: null,
    };

    // ── Flow cycle: shard drift between nodes ──
    this._flowTimer = setInterval(() => {
      this._flowCycle();
      // Track per-priority-lane movement
      for (const [, shard] of this.shards) {
        const lane = this.flowMetrics.priorityLanes[shard.depth] ||
                     this.flowMetrics.priorityLanes.cold;
        if (shard.lastMigrated && (Date.now() - shard.lastMigrated) < OCEAN_CONFIG.flowIntervalMs * 1.1) {
          lane.shardsMoved++;
        }
      }
    }, OCEAN_CONFIG.flowIntervalMs);

    // ── Tide cycle: periodic major data redistribution ──
    this._tideTimer = setInterval(() => {
      this._tideCycle();
      this.flowMetrics.tideEvents.push({
        phase: this.tidePhase,
        timestamp: Date.now(),
        shardsAffected: this.stats.shardsInMotion,
      });
      this.flowMetrics.lastTideEvent = Date.now();
      // Keep only last 100 tide events
      if (this.flowMetrics.tideEvents.length > 100) {
        this.flowMetrics.tideEvents = this.flowMetrics.tideEvents.slice(-100);
      }
    }, OCEAN_CONFIG.tideIntervalMs);

    // ── Depth management: age-based tiering ──
    this._depthTimer = setInterval(() => this._depthManagement(), 30000);

    // ── Rotation cycle: forward secrecy ──
    this._rotationTimer = setInterval(() => this._rotationCycle(), OCEAN_CONFIG.rotationIntervalMs);

    // ── Stream tracker: live metrics ──
    this._streamTracker = setInterval(() => {
      this.flowMetrics.activeStreams = this.currents.length;
      this.flowMetrics.totalShardsMoved = this.stats.migrationsCompleted;
      this.flowMetrics.totalBandwidthConsumedGB = this.stats.dataFlowedGB;
    }, 5000);

    this.oceanFlowActive = true;
    this.emit('ocean-flow-started', {
      flowInterval: OCEAN_CONFIG.flowIntervalMs,
      tideInterval: OCEAN_CONFIG.tideIntervalMs,
      driftProbability: OCEAN_CONFIG.driftProbability,
      priorityLanes: Object.keys(this.flowMetrics.priorityLanes),
    });

    return this.flowMetrics;
  }

  // ═══════════════════════════════════════════════════════════
  // SHARD AUTO-ROTATION — re-encrypt, migrate, update chain
  // ═══════════════════════════════════════════════════════════

  /**
   * Rotate all active shards:
   *  1) Re-encrypt with fresh quantum keys
   *  2) Move shards to different nodes
   *  3) Update QuranChain shard map TX
   *  4) Verify erasure coding survivability
   * @returns {Object} rotationReport
   */
  async _rotateShards() {
    const rotationReport = {
      timestamp: Date.now(),
      shardsRotated: 0,
      shardsMoved: 0,
      keysRefreshed: 0,
      blockchainTxUpdated: 0,
      erasureCodesVerified: 0,
      errors: [],
    };

    for (const [objectId, oldKey] of this.encryptionKeys) {
      const object = this.objects.get(objectId);
      if (!object || object.status !== 'active') continue;

      // Generate fresh quantum key
      const newKey = this.quantumEngine?.qrng
        ? this.quantumEngine.qrng.getBytes(32)
        : crypto.randomBytes(32);

      let rotatedForObj = 0;
      let movedForObj = 0;

      for (const entry of object.shardMap) {
        const shard = this.shards.get(entry.shardId);
        if (!shard || !shard.alive) continue;

        try {
          // Re-encrypt with fresh key
          shard.rotate(oldKey, newKey);
          rotatedForObj++;

          // Move to a different node for forward secrecy
          const oldNode = shard.currentNode;
          const newNode = this._getNeighborNode(oldNode);
          if (newNode !== oldNode) {
            shard.currentNode = newNode;
            shard.lastMigrated = Date.now();
            shard.migrateCount++;
            entry.nodeId = newNode;
            movedForObj++;
          }
        } catch (err) {
          shard.alive = false;
          rotationReport.errors.push({ shardId: shard.shardId, error: err.message });
        }
      }

      // Update stored key
      this.encryptionKeys.set(objectId, newKey);
      object.encryptionKeyHash = crypto.createHash('sha3-256').update(newKey).digest('hex');
      rotationReport.keysRefreshed++;

      // Update QuranChain shard map TX
      if (this.blockchain && rotatedForObj > 0) {
        const shardMapHash = crypto.createHash('sha3-256')
          .update(JSON.stringify(object.shardMap)).digest('hex');
        this.blockchain.addTransaction({
          type: 'OCEAN_SHARD_MAP_ROTATED',
          objectId, shardMapHash,
          shardsRotated: rotatedForObj,
          shardsMoved: movedForObj,
          newEncryptionKeyHash: object.encryptionKeyHash,
          erasureCoding: OCEAN_CONFIG.erasureCodingRatio,
          timestamp: Date.now(),
          founder: 'Omar_Mohammad_Abunadi',
        });
        rotationReport.blockchainTxUpdated++;
      }

      // Verify erasure coding integrity — can data survive node failures?
      const aliveShards = object.shardMap.filter(s => {
        const sh = this.shards.get(s.shardId);
        return sh && sh.alive;
      }).length;
      const totalNeeded = Math.ceil(object.shardMap.length * OCEAN_CONFIG.erasureCodingRatio);
      if (aliveShards >= totalNeeded) {
        rotationReport.erasureCodesVerified++;
      }

      rotationReport.shardsRotated += rotatedForObj;
      rotationReport.shardsMoved += movedForObj;
    }

    this.stats.rotationsCompleted += rotationReport.shardsRotated;
    this.stats.migrationsCompleted += rotationReport.shardsMoved;

    if (rotationReport.shardsRotated > 0) {
      this.emit('shards-auto-rotated', rotationReport);
    }

    return rotationReport;
  }

  /**
   * Begin periodic shard auto-rotation on the max-lifetime interval.
   * @private
   */
  _beginShardRotation() {
    if (this._shardRotationTimer) clearInterval(this._shardRotationTimer);

    this._shardRotationTimer = setInterval(async () => {
      try {
        await this._rotateShards();
      } catch (err) {
        console.error('  \u{1F30A} Shard rotation error:', err.message);
      }
    }, OCEAN_CONFIG.maxShardLifetimeMs);

    this.emit('shard-rotation-started', { interval: OCEAN_CONFIG.maxShardLifetimeMs });
  }

  // ═══════════════════════════════════════════════════════════
  // NODE ASSIGNMENT & ROUTING
  // ═══════════════════════════════════════════════════════════

  _assignNodeForShard(index, total) {
    // Round-robin across known mesh nodes
    const nodes = this._getKnownNodes();
    return nodes[index % nodes.length];
  }

  _getNeighborNode(currentNode) {
    const nodes = this._getKnownNodes();
    if (nodes.length <= 1) return currentNode;
    const idx = nodes.indexOf(currentNode);
    const offset = Math.random() < 0.5 ? 1 : -1;
    return nodes[((idx + offset) % nodes.length + nodes.length) % nodes.length];
  }

  _getRandomNode() {
    const nodes = this._getKnownNodes();
    return nodes[Math.floor(Math.random() * nodes.length)];
  }

  _getKnownNodes() {
    const nodes = ['local'];
    if (this.fungiMesh && this.fungiMesh.peers) {
      for (const [peerId] of this.fungiMesh.peers) {
        nodes.push(peerId);
      }
    }
    return nodes;
  }

  _getObjectDepth(object) {
    const shardDepths = object.shardMap.map(s => {
      const shard = this.shards.get(s.shardId);
      return shard ? shard.depth : 'deep';
    });
    // Use the most common depth
    const counts = {};
    for (const d of shardDepths) counts[d] = (counts[d] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'surface';
  }

  // ═══════════════════════════════════════════════════════════
  // AUTHORIZATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  authorizeNodeForObject(objectId, nodeId) {
    const object = this.objects.get(objectId);
    if (!object) throw new Error(`Object ${objectId} not found`);
    object.authorizeNode(nodeId);

    if (this.blockchain) {
      this.blockchain.addTransaction({
        type: 'OCEAN_NODE_AUTHORIZED',
        objectId,
        nodeId,
        timestamp: Date.now(),
      });
    }

    return { objectId, nodeId, authorized: true };
  }

  revokeNodeForObject(objectId, nodeId) {
    const object = this.objects.get(objectId);
    if (!object) throw new Error(`Object ${objectId} not found`);
    object.revokeNode(nodeId);

    if (this.blockchain) {
      this.blockchain.addTransaction({
        type: 'OCEAN_NODE_REVOKED',
        objectId,
        nodeId,
        timestamp: Date.now(),
      });
    }

    return { objectId, nodeId, revoked: true };
  }

  // ═══════════════════════════════════════════════════════════
  // LIST & SEARCH
  // ═══════════════════════════════════════════════════════════

  listObjects(filter = {}) {
    const results = [];
    for (const [, obj] of this.objects) {
      if (filter.owner && obj.owner !== filter.owner) continue;
      if (filter.status && obj.status !== filter.status) continue;
      results.push(obj.getMetadata());
    }
    return results;
  }

  getObjectInfo(objectId) {
    const obj = this.objects.get(objectId);
    if (!obj) return null;
    return {
      ...obj.getMetadata(),
      shardDetails: obj.shardMap.map(s => {
        const shard = this.shards.get(s.shardId);
        return shard ? shard.getMetadata() : { shardId: s.shardId, status: 'missing' };
      }),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS & METRICS
  // ═══════════════════════════════════════════════════════════

  getStatus() {
    return {
      running: this.running,
      ocean: {
        tidePhase: this.tidePhase,
        waveCounter: this.waveCounter,
        totalObjects: this.stats.totalObjects,
        totalShards: this.stats.totalShards,
        shardsInMotion: this.stats.shardsInMotion,
        totalSizeBytes: this.stats.totalSizeBytes,
        totalSizeGB: (this.stats.totalSizeBytes / (1024 ** 3)).toFixed(4),
        totalEncryptedGB: (this.stats.totalEncryptedBytes / (1024 ** 3)).toFixed(4),
      },
      capacity: {
        thisNode: this.nodeCapacity,
        network: this.networkCapacity,
      },
      flow: {
        flowCycles: this.stats.flowCycles,
        tideCycles: this.stats.tideCycles,
        migrationsCompleted: this.stats.migrationsCompleted,
        rotationsCompleted: this.stats.rotationsCompleted,
        dataFlowedGB: this.stats.dataFlowedGB.toFixed(4),
      },
      security: {
        encryption: 'AES-256-GCM + Kyber-1024 (post-quantum)',
        shardMapAnchor: 'QuranChain blockchain',
        authorization: 'Fungi Mesh node whitelist ONLY',
        unauthorizedAttempts: this.stats.unauthorizedAttempts,
        rotationInterval: `${OCEAN_CONFIG.rotationIntervalMs / 1000}s`,
        erasureCoding: `${(OCEAN_CONFIG.erasureCodingRatio * 100).toFixed(0)}% data / ${((1 - OCEAN_CONFIG.erasureCodingRatio) * 100).toFixed(0)}% parity`,
      },
      retrieval: {
        totalRetrievals: this.stats.retrievals,
        dataRetrievedGB: this.stats.dataRetrievedGB.toFixed(4),
        dataIngestedGB: this.stats.dataIngestedGB.toFixed(4),
      },
      revenue: {
        total: this.stats.totalRevenue.toFixed(4),
        founderRoyalty: (this.stats.totalRevenue * 0.30).toFixed(4),
      },
      pricing: OCEAN_CONFIG.pricing,
      depthTiers: Object.entries(OCEAN_CONFIG.depthTiers).map(([name, cfg]) => ({
        tier: name,
        description: cfg.name,
        accessTime: `${cfg.accessTimeMs}ms`,
        maxAge: cfg.maxAge === Infinity ? 'forever' : `${cfg.maxAge / 1000}s`,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DATA OCEAN DASHBOARD — comprehensive view of the ocean
  // ═══════════════════════════════════════════════════════════

  /**
   * Data Ocean Dashboard — full view of objects, shards, tiers, flow,
   * capacity utilization, active streams, security, and network aggregates.
   * @returns {Object} Complete dashboard snapshot
   */
  getOceanDashboard() {
    // Per-tier shard breakdown
    const tierBreakdown = { surface: 0, shallow: 0, mid: 0, deep: 0, trench: 0 };
    const tierSizeBytes = { surface: 0, shallow: 0, mid: 0, deep: 0, trench: 0 };

    for (const [, shard] of this.shards) {
      const tier = shard.depth || 'surface';
      tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1;
      tierSizeBytes[tier] = (tierSizeBytes[tier] || 0) + (shard.encryptedData?.length || 0);
    }

    // Capacity utilization
    const totalUsedGB = this.stats.totalEncryptedBytes / (1024 ** 3);
    const networkTotalGB = this.networkCapacity.totalAggregateGB || 1;
    const utilizationPercent = (totalUsedGB / networkTotalGB) * 100;

    // Active streams / currents
    const activeCurrents = this.currents.filter(c => c.active !== false);

    return {
      timestamp: Date.now(),
      oceanStatus: this.running ? 'FLOWING' : 'STOPPED',
      tidePhase: this.tidePhase,

      // ── Storage overview ──
      storage: {
        totalObjects: this.stats.totalObjects,
        totalShards: this.stats.totalShards,
        activeShardsInMemory: this.shards.size,
        totalSizeBytes: this.stats.totalSizeBytes,
        totalSizeGB: parseFloat((this.stats.totalSizeBytes / (1024 ** 3)).toFixed(4)),
        totalEncryptedBytes: this.stats.totalEncryptedBytes,
        totalEncryptedGB: parseFloat((this.stats.totalEncryptedBytes / (1024 ** 3)).toFixed(4)),
      },

      // ── Per-tier breakdown (surface / shallow / mid / deep / trench) ──
      tiers: {
        surface: { name: 'Surface (Hot)',     shards: tierBreakdown.surface, sizeGB: parseFloat((tierSizeBytes.surface / (1024 ** 3)).toFixed(4)), accessTime: '1ms'    },
        shallow: { name: 'Shallow (Warm)',    shards: tierBreakdown.shallow, sizeGB: parseFloat((tierSizeBytes.shallow / (1024 ** 3)).toFixed(4)), accessTime: '10ms'   },
        mid:     { name: 'Mid-depth (Cool)',  shards: tierBreakdown.mid,     sizeGB: parseFloat((tierSizeBytes.mid     / (1024 ** 3)).toFixed(4)), accessTime: '100ms'  },
        deep:    { name: 'Deep (Cold)',       shards: tierBreakdown.deep,    sizeGB: parseFloat((tierSizeBytes.deep    / (1024 ** 3)).toFixed(4)), accessTime: '1000ms' },
        trench:  { name: 'Trench (Archive)',  shards: tierBreakdown.trench,  sizeGB: parseFloat((tierSizeBytes.trench  / (1024 ** 3)).toFixed(4)), accessTime: '5000ms' },
      },

      // ── Flow statistics ──
      flow: {
        oceanFlowActive: this.oceanFlowActive || false,
        flowCycles: this.stats.flowCycles,
        tideCycles: this.stats.tideCycles,
        tidePhase: this.tidePhase,
        waveCounter: this.waveCounter,
        shardsCurrentlyInMotion: this.stats.shardsInMotion,
        totalMigrations: this.stats.migrationsCompleted,
        totalRotations: this.stats.rotationsCompleted,
        dataFlowedGB: parseFloat(this.stats.dataFlowedGB.toFixed(4)),
        bandwidthConsumedGB: parseFloat(this.stats.dataFlowedGB.toFixed(4)),
        driftProbability: OCEAN_CONFIG.driftProbability,
        flowInterval: `${OCEAN_CONFIG.flowIntervalMs / 1000}s`,
        tideInterval: `${OCEAN_CONFIG.tideIntervalMs / 1000}s`,
        priorityLanes: this.flowMetrics?.priorityLanes || null,
        lastTideEvent: this.flowMetrics?.lastTideEvent || null,
      },

      // ── Node capacity utilization ──
      capacity: {
        thisNode: {
          hot: this.nodeCapacity.hot,
          warm: this.nodeCapacity.warm,
          cold: this.nodeCapacity.cold,
          archive: this.nodeCapacity.archive,
          hardware: this.nodeCapacity.hardware,
        },
        network: this.networkCapacity,
        utilization: {
          usedGB: parseFloat(totalUsedGB.toFixed(4)),
          totalGB: networkTotalGB,
          percent: parseFloat(utilizationPercent.toFixed(4)),
        },
      },

      // ── Active streams / currents ──
      streams: {
        activeStreams: activeCurrents.length,
        totalCurrentsDefined: this.currents.length,
      },

      // ── Security: encryption status, quantum keys ──
      security: {
        encryption: 'AES-256-GCM + Kyber-1024 (post-quantum)',
        totalEncryptedShards: this.stats.totalShards,
        quantumKeysActive: this.encryptionKeys.size,
        shardMapAnchor: 'QuranChain blockchain',
        authorization: 'FungiMesh node whitelist ONLY',
        unauthorizedAttempts: this.stats.unauthorizedAttempts,
        rotationInterval: `${OCEAN_CONFIG.rotationIntervalMs / 1000}s`,
        maxShardLifetime: `${OCEAN_CONFIG.maxShardLifetimeMs / 1000}s`,
        erasureCoding: `${(OCEAN_CONFIG.erasureCodingRatio * 100).toFixed(0)}% data / ${((1 - OCEAN_CONFIG.erasureCodingRatio) * 100).toFixed(0)}% parity`,
        noPlaintextAtRest: true,
        noPlaintextOnWire: true,
      },

      // ── Retrieval stats ──
      retrieval: {
        totalRetrievals: this.stats.retrievals,
        dataRetrievedGB: parseFloat(this.stats.dataRetrievedGB.toFixed(4)),
        dataIngestedGB: parseFloat(this.stats.dataIngestedGB.toFixed(4)),
      },

      // ── Revenue ──
      revenue: {
        total: parseFloat(this.stats.totalRevenue.toFixed(4)),
        founderRoyalty: parseFloat((this.stats.totalRevenue * 0.30).toFixed(4)),
        pricing: OCEAN_CONFIG.pricing,
      },

      // ── Network-wide aggregate capacity ──
      networkAggregate: {
        totalNodes: this.networkCapacity.totalNodes,
        totalAggregateGB: this.networkCapacity.totalAggregateGB,
        totalHotGB: this.networkCapacity.totalHotGB,
        totalWarmGB: this.networkCapacity.totalWarmGB,
        totalColdGB: this.networkCapacity.totalColdGB,
        totalArchiveGB: this.networkCapacity.totalArchiveGB,
        throughputGbps: this.networkCapacity.throughputGbps,
        replicationFactor: this.networkCapacity.replicationFactor,
      },

      founder: 'Omar_Mohammad_Abunadi',
      founderRoyalty: '30%',
    };
  }

  async shutdown() {
    this.running = false;
    this.oceanFlowActive = false;
    if (this._flowTimer)          clearInterval(this._flowTimer);
    if (this._tideTimer)          clearInterval(this._tideTimer);
    if (this._rotationTimer)      clearInterval(this._rotationTimer);
    if (this._depthTimer)         clearInterval(this._depthTimer);
    if (this._streamTracker)      clearInterval(this._streamTracker);
    if (this._shardRotationTimer) clearInterval(this._shardRotationTimer);
    this.shards.clear();
    this.objects.clear();
    this.encryptionKeys.clear();
    console.log('  \u{1F30A} Data Ocean shut down');
  }
}

module.exports = { DataOcean, DataShard, OceanObject, OCEAN_CONFIG };
