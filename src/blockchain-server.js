/**
 * QuranChain Blockchain Server
 * ============================
 * Standalone blockchain server with P2P networking and FungiMesh integration
 *
 * Features:
 *  - Independent blockchain node
 *  - P2P blockchain synchronization
 *  - FungiMesh distributed computing
 *  - REST API for blockchain operations
 *  - Mining and transaction processing
 *
 * Ports:
 *  - Blockchain P2P: 6001
 *  - FungiMesh P2P: 7001
 *  - HTTP API: 3001
 *
 * Founder: Omar Mohammad Abunadi™
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Blockchain } = require('./blockchain/Blockchain');
const { P2PNetwork } = require('./p2p/P2PNetwork');
const FungiMeshService = require('./services/fungiMeshService');
const { MeshIntegrationBridge } = require('./services/meshIntegrationBridge');
const { BLOCKCHAIN_SEED_NODES, NETWORK_CONFIG } = require('./config/meshConfig');

const app = express();
const port = process.env.BLOCKCHAIN_PORT || 3001;

// Initialize blockchain
const blockchain = new Blockchain();

// Initialize P2P network for blockchain
const p2pNetwork = new P2PNetwork(blockchain, {
  port: NETWORK_CONFIG.blockchainPort,
  seedNodes: BLOCKCHAIN_SEED_NODES,
  maxPeers: NETWORK_CONFIG.maxBlockchainPeers,
});

// Initialize FungiMesh for distributed computing
const fungiMeshService = new FungiMeshService({
  port: NETWORK_CONFIG.meshPort,
  seedNodes: process.env.MESH_SEED_NODES ? process.env.MESH_SEED_NODES.split(',') : undefined,
});

// Initialize Mesh ↔ Blockchain ↔ DarCloud Integration Bridge
const meshBridge = new MeshIntegrationBridge({
  mainnetAPI: process.env.MAINNET_API || 'http://localhost:3000',
  blockchainAPI: `http://localhost:${port}`,
  darcloudDomain: process.env.CF_DOMAIN || 'darcloud.host',
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Blockchain API Routes

// Get blockchain info
app.get('/api/blockchain/info', (req, res) => {
  res.json({
    chainId: blockchain.chainId,
    chainLength: blockchain.chain.length,
    difficulty: blockchain.difficulty,
    pendingTransactions: blockchain.pendingTransactions.length,
    isMining: blockchain.isMining,
    nodeId: blockchain.nodeId,
  });
});

// Get full chain
app.get('/api/blockchain/chain', (req, res) => {
  res.json({
    chain: blockchain.chain.map(block => block.toJSON()),
    length: blockchain.chain.length,
  });
});

// Get pending transactions
app.get('/api/blockchain/pending', (req, res) => {
  res.json({
    transactions: blockchain.pendingTransactions,
    count: blockchain.pendingTransactions.length,
  });
});

// Submit transaction
app.post('/api/blockchain/transaction', (req, res) => {
  try {
    const tx = req.body;
    blockchain.addTransaction(tx);
    res.json({ success: true, message: 'Transaction added to pending pool' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Mine block
app.post('/api/blockchain/mine', async (req, res) => {
  try {
    const block = await blockchain.mineBlock();
    res.json({
      success: true,
      block: block.toJSON(),
      message: 'Block mined successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get P2P network stats
app.get('/api/p2p/stats', (req, res) => {
  res.json(p2pNetwork.getStats());
});

// FungiMesh API Routes

// Get mesh network status
app.get('/api/mesh/status', (req, res) => {
  res.json(fungiMeshService.getNetworkStatus());
});

// Get discovered devices and peer history (all radios)
app.get('/api/mesh/discovery', (req, res) => {
  const net = fungiMeshService.network;
  if (!net) return res.json({ status: 'not_initialized' });
  if (typeof net.getDiscoveryStatus === 'function') {
    return res.json(net.getDiscoveryStatus());
  }
  res.json({
    discoveredHosts: Array.from(net.discoveredHosts),
    knownPeers: Array.from(net.knownPeers),
    previousPeers: net.previousPeers.length,
    localSubnets: net._getLocalSubnets(),
    scanning: {
      lan: !!net.discoverySocket,
      network: !!net.networkScanInterval,
      cellular: !!net.cellularScanInterval,
      bluetooth: !!net.bluetoothScanInterval,
    },
    radioInterfaces: net.radioInterfaces || {},
  });
});

// Trigger manual full network scan (all radios)
app.post('/api/mesh/scan', (req, res) => {
  const net = fungiMeshService.network;
  if (!net) return res.status(503).json({ error: 'Mesh not running' });
  net._discoverFromARP();
  net._startNetworkScanner();
  if (typeof net._startCellularScanner === 'function') net._discoverCellularGateways?.();
  if (typeof net._discoverBluetoothDevices === 'function') net._discoverBluetoothDevices();
  res.json({ success: true, message: 'Full radio scan triggered (LAN + Cellular + Bluetooth)' });
});

// Submit CPU task
app.post('/api/mesh/task/cpu', async (req, res) => {
  try {
    const { data, iterations } = req.body;
    const result = await fungiMeshService.submitCPUTask(data, iterations);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit GPU task
app.post('/api/mesh/task/gpu', async (req, res) => {
  try {
    const { data, options } = req.body;
    const result = await fungiMeshService.submitGPUTask(data, options);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit QuranChain-specific task
app.post('/api/mesh/task/quranchain', async (req, res) => {
  try {
    const { taskType, data } = req.body;
    const result = await fungiMeshService.submitQuranChainTask(taskType, data);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get active tasks
app.get('/api/mesh/tasks/active', (req, res) => {
  res.json(fungiMeshService.getActiveTasks());
});

// Get task result
app.get('/api/mesh/task/:taskId', (req, res) => {
  const result = fungiMeshService.getTaskResult(req.params.taskId);
  if (result) {
    res.json({ success: true, result });
  } else {
    res.status(404).json({ success: false, error: 'Task not found' });
  }
});

// Redistribute workload
app.post('/api/mesh/redistribute', (req, res) => {
  fungiMeshService.redistributeWorkload();
  res.json({ success: true, message: 'Workload redistribution initiated' });
});

// ═══════════════════════════════════════════════════════════
// 🌉 MESH INTEGRATION BRIDGE — Devices → Blockchain → DarCloud
// ═══════════════════════════════════════════════════════════

// Bridge status (full overview)
app.get('/api/bridge/status', (req, res) => {
  res.json(meshBridge.getStatus());
});

// List all enrolled devices
app.get('/api/bridge/devices', (req, res) => {
  res.json({
    devices: meshBridge.getDevices(),
    total: meshBridge.enrolledDevices.size,
  });
});

// Compute pool stats (borrowed hardware)
app.get('/api/bridge/compute-pool', (req, res) => {
  const pool = meshBridge.computePool;
  res.json({
    totalCPU: pool.totalCPU,
    totalMemoryGB: +(pool.totalMemory / 1024 / 1024 / 1024).toFixed(2),
    totalGPU: pool.totalGPU,
    totalStorage: pool.totalStorage,
    activeWorkers: pool.activeWorkers,
    tasksProcessed: pool.tasksProcessed,
    qrcEarned: pool.qrcEarned,
    activeBorrows: Array.from(meshBridge.borrowedResources.values())
      .filter(b => b.status === 'active')
      .map(b => ({
        borrowId: b.borrowId,
        fromDevice: b.fromDevice?.substring(0, 12),
        resources: b.resources,
        runningFor: Math.floor((Date.now() - b.startedAt) / 1000) + 's',
      })),
  });
});

// DarCloud edge nodes
app.get('/api/bridge/edge-nodes', (req, res) => {
  res.json({
    edgeNodes: Array.from(meshBridge.edgeNodes.values()),
    total: meshBridge.edgeNodes.size,
    active: Array.from(meshBridge.edgeNodes.values()).filter(n => n.status === 'active').length,
    domain: meshBridge.darcloudDomain,
  });
});

// Force enroll all discovered devices
app.post('/api/bridge/enroll-all', (req, res) => {
  meshBridge._enrollExistingPeers();
  res.json({
    success: true,
    enrolledDevices: meshBridge.enrolledDevices.size,
    message: 'All discovered devices enrolled into FungiMesh + QuranChain + DarCloud',
  });
});

// Register edge node endpoint (for mainnet callbacks)
app.post('/api/mesh/edge-node', (req, res) => {
  const node = req.body;
  if (node && node.nodeId) {
    meshBridge.edgeNodes.set(node.nodeId, { ...node, status: 'active', registeredAt: Date.now() });
    res.json({ success: true, message: 'Edge node registered' });
  } else {
    res.status(400).json({ error: 'Invalid edge node data' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    blockchain: {
      height: blockchain.chain.length,
      pending: blockchain.pendingTransactions.length,
    },
    p2p: {
      peers: p2pNetwork.peers.size,
    },
    mesh: {
      running: fungiMeshService.isRunning,
      peers: fungiMeshService.network ? fungiMeshService.network.peers.size : 0,
    },
    bridge: {
      running: meshBridge._running,
      enrolledDevices: meshBridge.enrolledDevices.size,
      computePool: {
        cpu: meshBridge.computePool.totalCPU,
        memoryGB: +(meshBridge.computePool.totalMemory / 1024 / 1024 / 1024).toFixed(2),
        gpu: meshBridge.computePool.totalGPU,
        workers: meshBridge.computePool.activeWorkers,
      },
      edgeNodes: meshBridge.edgeNodes.size,
      darcloud: meshBridge.darcloudDomain,
    },
  });
});

// Start server and networks
async function startServer() {
  try {
    // Start P2P blockchain network
    await p2pNetwork.start();
    console.log('🔗 Blockchain P2P network started');

    // Start FungiMesh network
    await fungiMeshService.initialize();
    console.log('🍄 FungiMesh network started');

    // Start MeshIntegrationBridge — connect ALL devices to blockchain + DarCloud
    await meshBridge.initialize({
      fungiMesh: fungiMeshService.network,
      fungiMeshService,
      blockchain,
      p2pNetwork,
    });
    console.log('🌉 MeshIntegrationBridge started — devices → blockchain → DarCloud');

    // Start HTTP server with port retry
    const startHTTP = (tryPort) => {
      const server = app.listen(tryPort)
        .on('listening', () => {
          console.log(`⛓️  QuranChain Blockchain Server running on port ${tryPort}`);
          console.log(`🌐 P2P Port: ${p2pNetwork.port} | Mesh Port: ${fungiMeshService.network.port} | API Port: ${tryPort}`);
        })
        .on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`  ⚠️  API port ${tryPort} in use, trying ${tryPort + 1}`);
            startHTTP(tryPort + 1);
          } else {
            console.error('HTTP server error:', err);
            process.exit(1);
          }
        });
    };
    startHTTP(port);

  } catch (error) {
    console.error('Failed to start blockchain server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');

  await meshBridge.shutdown();
  await p2pNetwork.stop();
  await fungiMeshService.shutdown();

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');

  await meshBridge.shutdown();
  await p2pNetwork.stop();
  await fungiMeshService.shutdown();

  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
