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
const path = require('path');
const { Blockchain } = require('./blockchain/Blockchain');
const { P2PNetwork } = require('./p2p/P2PNetwork');
const FungiMeshService = require('./services/fungiMeshService');
const { MeshIntegrationBridge } = require('./services/meshIntegrationBridge');
const crossProjectBridge = require('./services/crossProjectBridge');
const { ValidatorNode } = require('./services/validatorNode');
const { NomadMainnet } = require('./services/nomadMainnet');
const LiveAgentFleet = require('./services/liveAgentFleet');
const GasTollHighway = require('./services/gasTollHighway');
const LiveInvoiceEngine = require('./services/liveInvoiceEngine');
const stripeService = require('./services/stripeService');
const { EnterprisePricingEngine } = require('./services/enterprisePricing');
const EnterpriseMetering = require('./services/enterpriseMetering');
const BillingLedger = require('./services/billingLedger');
const EnterpriseInvoiceGenerator = require('./services/enterpriseInvoiceGenerator');
const BillingEnforcement = require('./services/billingEnforcement');
const { QuantumComputeEngine } = require('./services/quantumComputeEngine');
const { DataOcean, OCEAN_CONFIG } = require('./services/dataOcean');
const { BLOCKCHAIN_SEED_NODES, NETWORK_CONFIG } = require('./config/meshConfig');

const app = express();
const port = parseInt(process.env.BLOCKCHAIN_HTTP_PORT || process.env.BLOCKCHAIN_PORT || '3001', 10);

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
const INTERNAL_HOST = process.env.INTERNAL_HOST || '127.0.0.1';
const MAINNET_API = process.env.MAINNET_API || process.env.PUBLIC_BASE_URL || `http://${INTERNAL_HOST}:3000`;
const BLOCKCHAIN_API_BASE = process.env.BLOCKCHAIN_PUBLIC_URL || `http://${INTERNAL_HOST}:${port}`;
const meshBridge = new MeshIntegrationBridge({
  mainnetAPI: MAINNET_API,
  blockchainAPI: BLOCKCHAIN_API_BASE,
  darcloudDomain: process.env.CF_DOMAIN || 'darcloud.host',
});

// Initialize Validator Node — connects to mesh, collects hardware
const validatorNode = new ValidatorNode({
  port: parseInt(process.env.VALIDATOR_PORT || '8001', 10),
  meshEndpoints: ['ws://' + INTERNAL_HOST + ':' + (NETWORK_CONFIG.meshPort || 7001)],
  blockchainEndpoints: ['ws://' + INTERNAL_HOST + ':' + (NETWORK_CONFIG.blockchainPort || 6001)],
});

// Initialize Nomadic Mainnet — will be started after all services are up
let nomadMainnet = null;

// Initialize Live Revenue Systems
const liveAgentFleet = new LiveAgentFleet({ clonesPerType: 2 });
const gasTollHighway = new GasTollHighway();
const liveInvoiceEngine = new LiveInvoiceEngine();

// Initialize Enterprise Billing Systems (Stripe-integrated)
const enterprisePricing = new EnterprisePricingEngine();
const enterpriseMetering = new EnterpriseMetering();
const billingLedger = new BillingLedger();
const enterpriseInvoiceGenerator = new EnterpriseInvoiceGenerator();
const billingEnforcement = new BillingEnforcement();

// Initialize Quantum Computing & Data Ocean
const quantumEngine = new QuantumComputeEngine();
const dataOcean = new DataOcean();

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

// Serve static files for dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Serve dashboard at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/blockchain-dashboard.html'));
});

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
// � FUNGI TASK REGISTRY — Hot Patch & Introspection
// ═══════════════════════════════════════════════════════════

// List all known task types
app.get('/api/mesh/task-types', (req, res) => {
  res.json(fungiMeshService.getTaskRegistry());
});

// Hot-patch: register / update a single task type
app.post('/api/mesh/task-types/register', (req, res) => {
  try {
    const { name, spec } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    const registry = fungiMeshService.registerTaskType(name, spec || {});
    res.json({ success: true, registered: name, totalTypes: Object.keys(registry).length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Hot-patch: bulk register many task types at once
app.post('/api/mesh/task-types/bulk', (req, res) => {
  try {
    const { types } = req.body;
    if (!types || typeof types !== 'object') return res.status(400).json({ success: false, error: 'types object required' });
    const result = fungiMeshService.registerTaskTypes(types);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// �🌉 MESH INTEGRATION BRIDGE — Devices → Blockchain → DarCloud
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

// ═══════════════════════════════════════════════════════════
// ⚡ VALIDATOR NODE — Hardware Registry & Validator API
// ═══════════════════════════════════════════════════════════

// Full validator hardware registry (names, IPs, hardware, types)
app.get('/api/validators', (req, res) => {
  // Merge: FungiMesh registry + ValidatorNode registry
  const meshReg = fungiMeshService.network ? fungiMeshService.network.getValidatorRegistry() : { validatorCount: 0, validators: [] };
  const valReg = validatorNode.getRegistry();
  // Merge by nodeId
  const merged = new Map();
  for (const v of meshReg.validators) merged.set(v.nodeId, v);
  for (const v of valReg.validators) merged.set(v.nodeId, { ...merged.get(v.nodeId), ...v });
  const all = Array.from(merged.values());
  res.json({ validatorCount: all.length, validators: all });
});

// This machine's hardware
app.get('/api/validators/local', (req, res) => {
  res.json(validatorNode.getLocalHardware());
});

// Summary table (name, ip, type, cpu, memory, gpu)
app.get('/api/validators/summary', (req, res) => {
  const reg = validatorNode.getRegistry();
  const meshReg = fungiMeshService.network ? fungiMeshService.network.getValidatorRegistry() : { validators: [] };
  const merged = new Map();
  for (const v of meshReg.validators) merged.set(v.nodeId, v);
  for (const v of reg.validators) merged.set(v.nodeId, { ...merged.get(v.nodeId), ...v });

  const summary = Array.from(merged.values()).map(v => ({
    nodeId: v.nodeId,
    name: v.name || 'unknown',
    ip: v.ip || 'unknown',
    publicIP: v.publicIP || null,
    type: v.type?.chassis || v.type?.model || 'unknown',
    virtualization: v.type?.virtualization || 'unknown',
    cpu: `${v.cpu?.model || 'unknown'} (${v.cpu?.cores || '?'} cores)`,
    memoryGB: v.memory?.totalGB || 0,
    gpu: v.gpu?.count > 0 ? v.gpu.devices?.map(g => g.name || g.vendor).join(', ') : 'None',
    os: v.os?.distro || v.os?.type || 'unknown',
    uptime: v.uptime?.human || 'unknown',
  }));
  res.json({ count: summary.length, validators: summary });
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
    crossProject: crossProjectBridge.getStatus(),
    validator: {
      running: !!validatorNode.server,
      port: validatorNode.port,
      peers: validatorNode.getPeerCount(),
      registrySize: validatorNode.hardwareRegistry.size,
      localHardware: {
        name: validatorNode.localHardware.name,
        ip: validatorNode.localHardware.ip?.primary,
        cpu: validatorNode.localHardware.hardware?.cpu?.model,
        cores: validatorNode.localHardware.hardware?.cpu?.cores,
        memoryGB: validatorNode.localHardware.hardware?.memory?.totalGB,
        gpu: validatorNode.localHardware.hardware?.gpu?.count,
      },
    },
    meshExpander: {
      running: !!(fungiMeshService.network && fungiMeshService.network.meshExpander),
      stats: fungiMeshService.network?.meshExpander?.getStats() || null,
    },
    nomadMainnet: {
      running: !!(nomadMainnet && nomadMainnet.running),
      chainHeight: blockchain.chain.length,
      mining: nomadMainnet?.mining || false,
      autoMine: nomadMainnet?.autoMine || false,
      totalMined: nomadMainnet?.relayStats?.totalMined || 0,
      relay: nomadMainnet ? {
        txRelayed: nomadMainnet.relayStats.txRelayed,
        blocksRelayed: nomadMainnet.relayStats.blocksRelayed,
        meshBroadcasts: nomadMainnet.relayStats.meshBroadcasts,
      } : null,
    },
    liveAgentFleet: {
      running: liveAgentFleet.running,
      totalAgents: liveAgentFleet.metrics.totalAgents,
      revenue: liveAgentFleet.metrics.totalRevenue,
      transactions: liveAgentFleet.metrics.totalTransactions,
      invoicesSent: liveAgentFleet.metrics.totalInvoicesSent,
    },
    gasTollHighway: {
      running: gasTollHighway.running,
      totalCollected: gasTollHighway.ledger.totalCollected,
      totalTolls: gasTollHighway.ledger.transactions.length,
      founderRoyalty: gasTollHighway.ledger.totalFounderRoyalty,
    },
    liveInvoiceEngine: {
      running: liveInvoiceEngine.running,
      invoicesCreated: liveInvoiceEngine.metrics.totalCreated,
      invoicesSent: liveInvoiceEngine.metrics.totalSent,
      totalCollected: liveInvoiceEngine.metrics.totalCollected,
    },
    enterpriseBilling: {
      pricing: enterprisePricing.getStatus(),
      metering: enterpriseMetering.getStatus(),
      billingLedger: billingLedger.getStatus(),
      invoiceGenerator: enterpriseInvoiceGenerator.getStatus(),
      enforcement: billingEnforcement.getStatus(),
    },
  });
});

// Cross-Project Bridge API Routes
app.get('/api/cross-project/status', (req, res) => {
  res.json(crossProjectBridge.getStatus());
});

app.get('/api/cross-project/inventory', (req, res) => {
  res.json(crossProjectBridge.getServiceInventory());
});

// ═══════════════════════════════════════════════════════════
// MeshExpander API — External Device Discovery & Auto-Connect
// ═══════════════════════════════════════════════════════════

// All discovered external devices
app.get('/api/devices', (req, res) => {
  const mesh = fungiMeshService.network;
  if (mesh && mesh.meshExpander) {
    res.json(mesh.meshExpander.getDevices());
  } else {
    res.json({ deviceCount: 0, devices: [] });
  }
});

// Expander statistics
app.get('/api/devices/stats', (req, res) => {
  const mesh = fungiMeshService.network;
  if (mesh && mesh.meshExpander) {
    res.json(mesh.meshExpander.getStats());
  } else {
    res.json({ error: 'MeshExpander not running' });
  }
});

// Force-connect to a specific IP
app.post('/api/devices/connect', (req, res) => {
  const { ip, port } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'ip required' });
  const mesh = fungiMeshService.network;
  if (mesh && mesh.meshExpander) {
    mesh.meshExpander._queueForceConnect(ip, port || 7001, 'manual-api');
    res.json({ status: 'queued', ip, port: port || 7001 });
  } else {
    res.status(503).json({ error: 'MeshExpander not running' });
  }
});

// All connected mesh peers
app.get('/api/peers', (req, res) => {
  const mesh = fungiMeshService.network;
  if (mesh) {
    const peers = [];
    for (const [id, peer] of mesh.peers) {
      peers.push({
        id: id.substring(0, 12),
        address: peer.address,
        direction: peer.direction,
        connectedAt: peer.connectedAt,
        lastSeen: peer.lastSeen,
        capabilities: peer.capabilities ? {
          cpuCores: peer.capabilities.cpuCores,
          memoryGB: peer.capabilities.totalMemory ? +(peer.capabilities.totalMemory / 1024 / 1024 / 1024).toFixed(2) : null,
          hasGPU: peer.capabilities.hasGPU,
          role: peer.capabilities.role || 'mesh-node',
        } : null,
      });
    }
    res.json({ peerCount: peers.length, peers });
  } else {
    res.json({ peerCount: 0, peers: [] });
  }
});

// ═══════════════════════════════════════════════════════════
// 🌙 NOMADIC MAINNET API — QuranChain Nomad Network
// ═══════════════════════════════════════════════════════════

// Mainnet full status
app.get('/api/nomad/status', (req, res) => {
  if (!nomadMainnet) return res.json({ running: false, message: 'Nomadic Mainnet not initialized' });
  res.json(nomadMainnet.getStatus());
});

// Relay stats
app.get('/api/nomad/relay', (req, res) => {
  if (!nomadMainnet) return res.json({ error: 'Not running' });
  res.json(nomadMainnet.getRelayStats());
});

// Nomad peer list (nodes running nomad protocol)
app.get('/api/nomad/peers', (req, res) => {
  if (!nomadMainnet) return res.json({ peers: [] });
  res.json({ peers: nomadMainnet.getNomadPeers(), count: nomadMainnet.nomadPeers.size });
});

// Submit transaction through nomadic network (relays to ALL nodes)
app.post('/api/nomad/transaction', (req, res) => {
  if (!nomadMainnet) return res.status(503).json({ error: 'Mainnet not running' });
  try {
    const result = nomadMainnet.submitTransaction(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Transfer QRC through nomadic network
app.post('/api/nomad/transfer', (req, res) => {
  if (!nomadMainnet) return res.status(503).json({ error: 'Mainnet not running' });
  try {
    const { from, to, amount, memo } = req.body;
    if (!from || !to || !amount) return res.status(400).json({ error: 'from, to, amount required' });
    const result = nomadMainnet.transfer(from, to, parseFloat(amount), memo);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Authenticate Quran verse through nomadic network
app.post('/api/nomad/verse', (req, res) => {
  if (!nomadMainnet) return res.status(503).json({ error: 'Mainnet not running' });
  try {
    const { surah, ayah, text, arabicText, authenticator } = req.body;
    if (!surah || !ayah || !text) return res.status(400).json({ error: 'surah, ayah, text required' });
    const result = nomadMainnet.authenticateVerse(
      parseInt(surah), parseInt(ayah), text, arabicText,
      authenticator || 'Omar_Mohammad_Abunadi'
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Trigger immediate mining
app.post('/api/nomad/mine', async (req, res) => {
  if (!nomadMainnet) return res.status(503).json({ error: 'Mainnet not running' });
  try {
    await nomadMainnet.mineNow();
    res.json({
      success: true,
      chainHeight: blockchain.chain.length,
      message: 'Block mined and relayed to all mesh nodes',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 💰 LIVE AGENT FLEET — Revenue Agents (10:1 cloning)
// ═══════════════════════════════════════════════════════════

// Fleet full status (all agents, metrics, revenue)
app.get('/api/fleet/status', (req, res) => {
  res.json(liveAgentFleet.getStatus());
});

// Fleet compact summary
app.get('/api/fleet/summary', (req, res) => {
  res.json(liveAgentFleet.getSummary());
});

// Route a request to a specific agent type
app.post('/api/fleet/route', async (req, res) => {
  try {
    const { agentType, action, data } = req.body;
    if (!agentType) return res.status(400).json({ error: 'agentType required' });
    const result = await liveAgentFleet.routeRequest(agentType, { action, ...data });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all payment links (REAL Stripe links)
app.get('/api/fleet/payment-links', (req, res) => {
  const category = req.query.category;
  let links = liveAgentFleet.paymentLinks;
  if (category) {
    links = links.filter(l => (l.product || '').toLowerCase().includes(category.toLowerCase()));
  }
  res.json({
    total: links.length,
    links: links.map(l => ({
      product: l.product,
      amount: l.amount,
      interval: l.interval,
      url: l.payment_link_url,
      priceId: l.price_id,
    })),
  });
});

// ═══════════════════════════════════════════════════════════
// ⛽ GAS TOLL HIGHWAY — AI Crypto & Telecom Fees
// ═══════════════════════════════════════════════════════════

// Highway status
app.get('/api/toll/status', (req, res) => {
  res.json(gasTollHighway.getStatus());
});

// Toll rate schedule
app.get('/api/toll/rates', (req, res) => {
  res.json(gasTollHighway.getRates());
});

// Recent toll transactions
app.get('/api/toll/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(gasTollHighway.getRecentTolls(limit));
});

// Collect a toll manually
app.post('/api/toll/collect', (req, res) => {
  try {
    const { category, tollType, quantity, metadata } = req.body;
    const toll = gasTollHighway.collectToll(category, tollType, quantity || 1, metadata || {});
    res.json({ success: true, toll });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Collect cross-chain toll
app.post('/api/toll/cross-chain', (req, res) => {
  try {
    const { network, txCount, metadata } = req.body;
    const toll = gasTollHighway.collectCrossChainToll(network, txCount || 1, metadata || {});
    res.json({ success: true, toll });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Collect AI compute toll
app.post('/api/toll/ai-compute', (req, res) => {
  try {
    const { computeType, quantity, metadata } = req.body;
    const toll = gasTollHighway.collectAIComputeToll(computeType, quantity || 1, metadata || {});
    res.json({ success: true, toll });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Collect telecom toll
app.post('/api/toll/telecom', (req, res) => {
  try {
    const { serviceType, quantity, metadata } = req.body;
    const toll = gasTollHighway.collectTelecomToll(serviceType, quantity || 1, metadata || {});
    res.json({ success: true, toll });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Settle tolls to Stripe for a customer
app.post('/api/toll/settle', async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required' });
    const result = await gasTollHighway.settleTolls(customerId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create toll invoice for a customer
app.post('/api/toll/invoice', async (req, res) => {
  try {
    const { customerId, period } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId required' });
    const result = await gasTollHighway.createTollInvoice(customerId, period);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 📄 LIVE INVOICE ENGINE — Real Stripe Invoicing
// ═══════════════════════════════════════════════════════════

// Invoice engine status
app.get('/api/invoices/status', (req, res) => {
  res.json(liveInvoiceEngine.getStatus());
});

// Create and send a REAL invoice
app.post('/api/invoices/create', async (req, res) => {
  try {
    const { customerId, items, daysUntilDue, memo, metadata } = req.body;
    if (!customerId || !items) return res.status(400).json({ error: 'customerId and items required' });
    const result = await liveInvoiceEngine.createAndSend({
      customerId, items, daysUntilDue, memo, metadata,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a subscription invoice
app.post('/api/invoices/subscription', async (req, res) => {
  try {
    const { customerId, plan, amount } = req.body;
    if (!customerId || !plan || !amount) return res.status(400).json({ error: 'customerId, plan, and amount required' });
    const result = await liveInvoiceEngine.createSubscriptionInvoice(customerId, plan, parseFloat(amount));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a service invoice
app.post('/api/invoices/service', async (req, res) => {
  try {
    const { customerId, services } = req.body;
    if (!customerId || !services) return res.status(400).json({ error: 'customerId and services required' });
    const result = await liveInvoiceEngine.createServiceInvoice(customerId, services);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 💳 STRIPE LIVE API — Direct Stripe operations
// ═══════════════════════════════════════════════════════════

// Create a REAL customer
app.post('/api/stripe/customer', async (req, res) => {
  try {
    const customer = await stripeService.stripe.customers.create({
      email: req.body.email,
      name: req.body.name,
      phone: req.body.phone,
      address: req.body.address,
      metadata: {
        source: 'QuranChain-OS',
        founderAddress: 'Omar_Mohammad_Abunadi',
        createdAt: new Date().toISOString(),
      },
    });
    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a REAL payment intent
app.post('/api/stripe/payment-intent', async (req, res) => {
  try {
    const { amount, currency, customerId, metadata } = req.body;
    const pi = await stripeService.createPaymentIntent({
      amount: Math.round(parseFloat(amount) * 100),
      currency: currency || 'usd',
      customerId,
      metadata: {
        ...metadata,
        source: 'QuranChain-OS',
        founderAddress: 'Omar_Mohammad_Abunadi',
      },
    });
    res.json({ success: true, paymentIntent: pi });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Stripe revenue analytics
app.get('/api/stripe/analytics', async (req, res) => {
  try {
    const analytics = await stripeService.getRevenueAnalytics();
    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stripe webhook handler
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ error: 'Stripe webhook secret not configured' });
    }
    const event = stripeService.constructEvent(req.body, sig, webhookSecret);
    await stripeService.handleWebhookEvent(event);

    // Forward invoice.paid to LiveInvoiceEngine
    if (event.type === 'invoice.paid') {
      liveInvoiceEngine.handleInvoicePaid(event.data.object.id, event.data.object.amount_paid / 100);

      // Commit payment proof to QuranChain Billing Ledger
      billingLedger.commitPaymentProof({
        invoiceId: event.data.object.id,
        amount: event.data.object.amount_paid / 100,
        paidAt: Date.now(),
        stripePaymentIntentId: event.data.object.payment_intent,
        clientId: event.data.object.metadata?.darcloud_clientId || null,
        method: 'stripe',
      });
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// � ENTERPRISE BILLING — DarCloud AWS/AT&T Model (Stripe)
// ═══════════════════════════════════════════════════════════

// ── PRICING ENGINE ──
app.get('/api/enterprise/pricing/rate-card', (req, res) => {
  res.json(enterprisePricing.getRateCard());
});

app.get('/api/enterprise/pricing/terms', (req, res) => {
  res.json(enterprisePricing.getContractTerms());
});

app.get('/api/enterprise/pricing/status', (req, res) => {
  res.json(enterprisePricing.getStatus());
});

// ── CLIENT MANAGEMENT (Stripe-integrated) ──
app.post('/api/enterprise/clients', async (req, res) => {
  try {
    const client = await enterprisePricing.registerClientWithStripe(req.body);
    res.json({ success: true, client });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/enterprise/clients', (req, res) => {
  res.json({ clients: enterprisePricing.listClients(), total: enterprisePricing.clients.size });
});

app.get('/api/enterprise/clients/:clientId', (req, res) => {
  const client = enterprisePricing.getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

// ── CONTRACT MANAGEMENT ──
app.post('/api/enterprise/contracts', (req, res) => {
  try {
    const { clientId, ...contractData } = req.body;
    const contract = enterprisePricing.createContract(clientId, contractData);
    res.json({ success: true, contract });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/enterprise/contracts/:contractId/activate', async (req, res) => {
  try {
    const contract = await enterprisePricing.activateContractStripe(req.params.contractId);
    res.json({ success: true, contract });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── SERVICE ORDERS ──
app.post('/api/enterprise/service-orders', (req, res) => {
  try {
    const { contractId, ...orderData } = req.body;
    const sof = enterprisePricing.createServiceOrder(contractId, orderData);
    res.json({ success: true, serviceOrder: sof });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── PURCHASE ORDERS ──
app.post('/api/enterprise/purchase-orders', (req, res) => {
  try {
    const { clientId, ...poData } = req.body;
    const po = enterprisePricing.recordPurchaseOrder(clientId, poData);
    res.json({ success: true, purchaseOrder: po });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/enterprise/purchase-orders', (req, res) => {
  const clientId = req.query.clientId;
  res.json({ purchaseOrders: enterprisePricing.listPurchaseOrders(clientId) });
});

// ── USAGE COST CALCULATOR ──
app.post('/api/enterprise/calculate-cost', (req, res) => {
  try {
    const { usageItems, clientId } = req.body;
    const cost = enterprisePricing.calculateUsageCost(usageItems, clientId);
    res.json({ success: true, cost });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── CREATE STRIPE USAGE INVOICE ──
app.post('/api/enterprise/invoices/usage', async (req, res) => {
  try {
    const { clientId, usageItems, description } = req.body;
    const result = await enterprisePricing.createUsageInvoice(clientId, usageItems, { description });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── METERING ──
app.get('/api/enterprise/metering/status', (req, res) => {
  res.json(enterpriseMetering.getStatus());
});

app.get('/api/enterprise/metering/usage', (req, res) => {
  const clientId = req.query.clientId;
  if (clientId) {
    res.json(enterpriseMetering.getClientUsage(clientId));
  } else {
    res.json(enterpriseMetering.getAllUsage());
  }
});

app.post('/api/enterprise/metering/record', (req, res) => {
  try {
    const { clientId, apiKey, category, type, quantity, source } = req.body;
    let event;
    if (apiKey) {
      event = enterpriseMetering.recordUsageByKey(apiKey, category, type, quantity, source);
    } else {
      event = enterpriseMetering.recordUsage(clientId, category, type, quantity, source);
    }
    res.json({ success: !!event, event });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/enterprise/metering/batch', (req, res) => {
  try {
    const results = enterpriseMetering.recordBatch(req.body.events || []);
    res.json({ success: true, recorded: results.filter(Boolean).length });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/enterprise/metering/generate-invoices', async (req, res) => {
  try {
    const results = await enterpriseMetering.generateAllInvoices();
    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/enterprise/metering/audit/:clientId', (req, res) => {
  const startTs = req.query.start ? parseInt(req.query.start) : undefined;
  const endTs = req.query.end ? parseInt(req.query.end) : undefined;
  res.json(enterpriseMetering.generateAuditReport(req.params.clientId, startTs, endTs));
});

// ── BILLING LEDGER ──
app.get('/api/enterprise/ledger/status', (req, res) => {
  res.json(billingLedger.getStatus());
});

app.get('/api/enterprise/ledger/verify/invoice/:invoiceId', (req, res) => {
  res.json(billingLedger.verifyInvoice(req.params.invoiceId));
});

app.get('/api/enterprise/ledger/verify/payment/:paymentId', (req, res) => {
  res.json(billingLedger.verifyPayment(req.params.paymentId));
});

app.get('/api/enterprise/ledger/proof-of-usage/:clientId', (req, res) => {
  const periodKey = req.query.period;
  res.json(billingLedger.generateProofOfUsage(req.params.clientId, periodKey));
});

app.post('/api/enterprise/ledger/commit-payment', (req, res) => {
  try {
    const proof = billingLedger.commitPaymentProof(req.body);
    res.json({ success: true, proof });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── ENTERPRISE INVOICE GENERATOR ──
app.get('/api/enterprise/invoice-gen/status', (req, res) => {
  res.json(enterpriseInvoiceGenerator.getStatus());
});

app.post('/api/enterprise/invoice-gen/generate', async (req, res) => {
  try {
    const { clientId, usageItems, ...options } = req.body;
    const invoice = await enterpriseInvoiceGenerator.generateInvoice(clientId, usageItems, options);
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/enterprise/invoice-gen/send/:invoiceNumber', async (req, res) => {
  try {
    const invoice = await enterpriseInvoiceGenerator.sendViaStripe(req.params.invoiceNumber);
    res.json({ success: true, invoice: {
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      status: invoice.status,
      stripe: invoice.stripe,
      blockchainProof: invoice.blockchainProof,
    }});
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/enterprise/invoice-gen/invoices', (req, res) => {
  const clientId = req.query.clientId;
  res.json({ invoices: enterpriseInvoiceGenerator.listInvoices(clientId) });
});

app.get('/api/enterprise/invoice-gen/invoices/:invoiceNumber', (req, res) => {
  const invoice = enterpriseInvoiceGenerator.getInvoice(req.params.invoiceNumber);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

app.get('/api/enterprise/invoice-gen/vendor-portal/:invoiceNumber', (req, res) => {
  try {
    const data = enterpriseInvoiceGenerator.generateVendorPortalData(req.params.invoiceNumber);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/enterprise/invoice-gen/monthly', async (req, res) => {
  try {
    const results = await enterpriseInvoiceGenerator.generateMonthlyInvoices();
    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── BILLING ENFORCEMENT ──
app.get('/api/enterprise/enforcement/status', (req, res) => {
  res.json(billingEnforcement.getStatus());
});

app.get('/api/enterprise/enforcement/states', (req, res) => {
  res.json(billingEnforcement.getAllEnforcementStates());
});

app.get('/api/enterprise/enforcement/client/:clientId', (req, res) => {
  const state = billingEnforcement.getClientEnforcement(req.params.clientId);
  if (!state) return res.status(404).json({ error: 'Client not found' });
  res.json(state);
});

app.post('/api/enterprise/enforcement/check', async (req, res) => {
  try {
    const results = await billingEnforcement.runEnforcementCheck();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/enterprise/enforcement/log', (req, res) => {
  const clientId = req.query.clientId;
  const limit = parseInt(req.query.limit) || 50;
  res.json({ log: billingEnforcement.getEnforcementLog(clientId, limit) });
});

// ── DISPUTES ──
app.post('/api/enterprise/disputes', (req, res) => {
  try {
    const { clientId, invoiceId, reason } = req.body;
    const dispute = billingEnforcement.fileDispute(clientId, invoiceId, reason);
    res.json({ success: true, dispute });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/enterprise/disputes/:disputeId/resolve', (req, res) => {
  try {
    const { resolution, creditAmount } = req.body;
    const result = billingEnforcement.resolveDispute(req.params.disputeId, resolution, creditAmount);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── ADMIN OVERRIDES ──
app.post('/api/enterprise/enforcement/override', (req, res) => {
  try {
    const { clientId, level, reason } = req.body;
    const result = billingEnforcement.setEnforcementOverride(clientId, level, reason);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/enterprise/enforcement/reactivate', async (req, res) => {
  try {
    const { clientId, reason } = req.body;
    const result = await billingEnforcement.forceReactivate(clientId, reason);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ── FULL ENTERPRISE BILLING STATUS ──
app.get('/api/enterprise/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    founder: 'Omar Mohammad Abunadi™',
    platform: 'DarCloud™ Fungi Mesh Network',
    pricing: enterprisePricing.getStatus(),
    metering: enterpriseMetering.getStatus(),
    billingLedger: billingLedger.getStatus(),
    invoiceGenerator: enterpriseInvoiceGenerator.getStatus(),
    enforcement: billingEnforcement.getStatus(),
    stripeProducts: enterprisePricing.stripeProducts.size,
    stripeCustomers: enterprisePricing.stripeCustomers.size,
  });
});

// ═══════════════════════════════════════════════════════════
// ⚛️  QUANTUM COMPUTE ENGINE API
// ═══════════════════════════════════════════════════════════

// Quantum engine status
app.get('/api/quantum/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    founder: 'Omar Mohammad Abunadi™',
    ...quantumEngine.getStatus(),
  });
});

// Generate quantum keypair (Kyber-1024)
app.post('/api/quantum/keypair', (req, res) => {
  try {
    const keypair = quantumEngine.latticeCrypto.generateKyberKeypair();
    res.json({
      success: true,
      publicKey: keypair.publicKey,
      algorithm: keypair.algorithm,
      securityLevel: keypair.securityLevel,
      generated: keypair.generated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// QKD — Quantum Key Distribution with a peer
app.post('/api/quantum/qkd/exchange', (req, res) => {
  try {
    const { peerId } = req.body;
    const result = quantumEngine.qkd.exchangeKey(peerId || 'remote-peer');
    quantumEngine.stats.keyExchanges++;
    quantumEngine.stats.totalQuantumOps++;
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// QKD status
app.get('/api/quantum/qkd/status', (req, res) => {
  res.json(quantumEngine.qkd.getStatus());
});

// QRNG — Get quantum random bytes
app.get('/api/quantum/random/:count', (req, res) => {
  try {
    const count = Math.min(parseInt(req.params.count) || 32, 1024);
    const bytes = quantumEngine.qrng.getBytes(count);
    const cost = count * quantumEngine.constructor.QUANTUM_CONFIG?.pricing?.qrngByte || count * 0.001;
    quantumEngine.stats.totalQuantumOps++;
    quantumEngine.stats.totalRevenue += cost;
    res.json({
      success: true,
      bytes: bytes.toString('hex'),
      count,
      entropy: quantumEngine.qrng.getStatus(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Execute quantum circuit
app.post('/api/quantum/circuit', async (req, res) => {
  try {
    const { type, params, qubits } = req.body;
    const result = await quantumEngine.executeCircuit({
      type: type || 'grover_search',
      params: params || {},
      qubits: qubits || 8,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Quantum sign data
app.post('/api/quantum/sign', (req, res) => {
  try {
    const signature = quantumEngine.signData(req.body.data || req.body);
    res.json({ success: true, ...signature });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quantum verify signature
app.post('/api/quantum/verify', (req, res) => {
  try {
    const { data, signature, publicKey } = req.body;
    const result = quantumEngine.verifySignature(data, signature, publicKey);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quantum encrypt data
app.post('/api/quantum/encrypt', (req, res) => {
  try {
    const { data, peerId } = req.body;
    const encrypted = quantumEngine.encryptData(data, peerId);
    res.json({ success: true, ...encrypted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quantum Proof-of-Work
app.post('/api/quantum/pow', (req, res) => {
  try {
    const { blockData, difficulty } = req.body;
    const proof = quantumEngine.quantumProofOfWork(blockData || {}, difficulty || 3);
    res.json({ success: true, ...proof });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quantum peer keys
app.get('/api/quantum/peers', (req, res) => {
  const peers = [];
  for (const [peerId, keyInfo] of quantumEngine.peerQuantumKeys) {
    peers.push({
      peerId,
      protocol: keyInfo.protocol,
      established: keyInfo.established,
      expiresAt: keyInfo.expiresAt,
      active: Date.now() < keyInfo.expiresAt,
    });
  }
  res.json({ totalPeers: peers.length, peers });
});

// Entanglement status
app.get('/api/quantum/entanglement', (req, res) => {
  const table = [];
  for (const [peerId, pairs] of quantumEngine.entanglementTable) {
    const active = pairs.filter(p => !p.consumed).length;
    table.push({ peerId, totalPairs: pairs.length, activePairs: active });
  }
  res.json({ totalPeers: table.length, entanglement: table, stats: quantumEngine.stats });
});

// Quantum capacity calculator (how much quantum compute power the network has)
app.get('/api/quantum/capacity', (req, res) => {
  try {
    const capacity = quantumEngine.calculateQuantumCapacity();
    res.json({
      timestamp: new Date().toISOString(),
      founder: 'Omar Mohammad Abunadi™',
      platform: 'DarCloud™ Quantum Computing',
      description: 'Post-quantum secured mesh network — data ONLY retrievable by authorized FungiMesh nodes',
      ...capacity,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Full quantum dashboard (all metrics, channels, entropy, throughput)
app.get('/api/quantum/dashboard', (req, res) => {
  try {
    res.json({
      founder: 'Omar Mohammad Abunadi™',
      platform: 'DarCloud™ Quantum Computing Engine',
      ...quantumEngine.getQuantumDashboard(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authenticate a mesh node (Dilithium signed token)
app.post('/api/quantum/authenticate', (req, res) => {
  try {
    const { nodeId, challenge } = req.body;
    if (!nodeId) return res.status(400).json({ error: 'nodeId required' });
    const credential = quantumEngine.authenticateNode(
      nodeId, challenge || require('crypto').randomBytes(32).toString('hex')
    );
    res.json({ success: true, ...credential });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify an auth token
app.post('/api/quantum/verify-auth', (req, res) => {
  try {
    const { nodeId, token } = req.body;
    const result = quantumEngine.verifyAuthToken(nodeId, token);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Establish quantum channel with a peer
app.post('/api/quantum/channel/establish', (req, res) => {
  try {
    const { peerId } = req.body;
    if (!peerId) return res.status(400).json({ error: 'peerId required' });
    const channel = quantumEngine.establishQuantumChannel(peerId);
    res.json({ success: true, ...channel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send data over quantum channel
app.post('/api/quantum/channel/send', (req, res) => {
  try {
    const { peerId, data } = req.body;
    if (!peerId) return res.status(400).json({ error: 'peerId required' });
    const encrypted = quantumEngine.sendOverChannel(peerId, data);
    res.json({ success: true, encrypted });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Check quantum channel health
app.get('/api/quantum/channel/:peerId/health', (req, res) => {
  const health = quantumEngine.checkChannelHealth(req.params.peerId);
  res.json(health);
});

// List all quantum channels
app.get('/api/quantum/channels', (req, res) => {
  const channels = [];
  for (const [peerId, ch] of quantumEngine.quantumChannels) {
    channels.push({
      peerId,
      channelId: ch.channelId,
      status: Date.now() > ch.expiresAt ? 'EXPIRED' : ch.status,
      protocol: ch.protocol,
      qber: ch.qber,
      ageMs: Date.now() - ch.established,
      bytesSent: ch.bytesSent,
      messagesExchanged: ch.messagesExchanged,
    });
  }
  res.json({ totalChannels: channels.length, channels });
});

// Quantum decrypt data
app.post('/api/quantum/decrypt', (req, res) => {
  try {
    const { encrypted, peerId } = req.body;
    const decrypted = quantumEngine.decryptData(encrypted, peerId);
    res.json({ success: true, data: decrypted });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Consume an entangled pair (for teleportation/superdense coding)
app.post('/api/quantum/entanglement/consume', (req, res) => {
  try {
    const { peerId } = req.body;
    const pair = quantumEngine.consumeEntangledPair(peerId);
    if (!pair) return res.status(404).json({ success: false, error: 'No available entangled pairs' });
    res.json({ success: true, pair });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 🌊 DATA OCEAN API — Flowing data secured by QuranChain
// ═══════════════════════════════════════════════════════════

// 🌊🍄 Hot-patch: force Data Ocean to pick up MeshExpander + recalculate capacity
app.post('/api/ocean/recalculate', (req, res) => {
  try {
    // Ensure meshExpander reference is linked (handles late-init)
    if (!dataOcean.meshExpander && fungiMeshService.network?.meshExpander) {
      dataOcean.meshExpander = fungiMeshService.network.meshExpander;
      dataOcean.meshExpander.on('deviceFound', () => dataOcean._calculateNetworkCapacity());
      dataOcean.meshExpander.on('peerConnected', () => dataOcean._calculateNetworkCapacity());
    }
    // Force recalculate node + network capacity
    dataOcean._calculateNodeCapacity();
    dataOcean._calculateNetworkCapacity();

    const mesh = fungiMeshService.network;
    const expanderStats = mesh?.meshExpander?.getStats() || {};

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Data Ocean capacity recalculated with external device contributions',
      meshExpanderLinked: !!dataOcean.meshExpander,
      externalDevices: dataOcean.networkCapacity.externalDevices,
      networkCapacity: {
        totalNodes: dataOcean.networkCapacity.totalNodes,
        totalCores: dataOcean.networkCapacity.totalCores,
        totalAggregateGB: dataOcean.networkCapacity.totalAggregateGB,
        throughputGbps: dataOcean.networkCapacity.throughputGbps,
      },
      expanderStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ocean status
app.get('/api/ocean/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    founder: 'Omar Mohammad Abunadi™',
    ...dataOcean.getStatus(),
  });
});

// Ocean capacity (how much data can we handle)
app.get('/api/ocean/capacity', (req, res) => {
  // Trigger recalculation to pick up latest device count
  if (typeof dataOcean.calculateNetworkCapacity === 'function') {
    dataOcean.calculateNetworkCapacity();
  }
  res.json({
    timestamp: new Date().toISOString(),
    founder: 'Omar Mohammad Abunadi™',
    platform: 'DarCloud™ Data Ocean',
    description: 'Always-moving ocean of data, flowing freely across Fungi Mesh, secured by QuranChain, retrievable ONLY by authorized nodes. Capacity grows with every device the Fungi attaches to the network.',
    thisNode: dataOcean.nodeCapacity,
    network: dataOcean.networkCapacity,
    externalDevices: dataOcean.networkCapacity?.externalDevices || { discovered: 0, connected: 0, pending: 0 },
    depthTiers: Object.entries(dataOcean.getStatus().depthTiers || []),
    security: {
      encryption: 'AES-256-GCM keyed by CRYSTALS-Kyber-1024 (Post-Quantum)',
      signatures: 'CRYSTALS-Dilithium Level 5',
      shardMapAnchor: 'QuranChain blockchain (immutable)',
      authorization: 'Fungi Mesh node whitelist — ONLY our nodes retrieve data',
      keyRotation: 'Every 5 minutes (forward secrecy)',
      erasureCoding: '67% data / 33% parity (survives node loss)',
      qrng: 'Quantum Random Number Generator for all nonces/IVs',
    },
    capacityGrowthModel: 'Ocean capacity scales dynamically — every external device discovered and attached by FungiMesh MeshExpander increases total storage, throughput, and bandwidth. Connected devices contribute 100%, discovered-but-pending devices contribute 50%.',
  });
});

// Ingest data into the ocean
app.post('/api/ocean/ingest', async (req, res) => {
  try {
    const { data, name, contentType, owner, authorizedNodes } = req.body;
    const receipt = await dataOcean.ingest(
      data || JSON.stringify(req.body),
      { name, contentType, owner, authorizedNodes }
    );
    res.json({ success: true, ...receipt });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Retrieve data from the ocean (AUTHORIZED NODES ONLY)
app.get('/api/ocean/retrieve/:objectId', async (req, res) => {
  try {
    const nodeId = req.headers['x-mesh-node-id'] || 'local';
    const data = await dataOcean.retrieve(req.params.objectId, nodeId);
    const object = dataOcean.objects.get(req.params.objectId);
    res.json({
      success: true,
      objectId: req.params.objectId,
      name: object?.name,
      contentType: object?.contentType,
      size: data.length,
      data: data.toString('utf8'),
      authorizedNode: nodeId,
    });
  } catch (error) {
    const status = error.message.includes('UNAUTHORIZED') ? 403 : 404;
    res.status(status).json({ success: false, error: error.message });
  }
});

// List ocean objects
app.get('/api/ocean/objects', (req, res) => {
  const objects = dataOcean.listObjects(req.query);
  res.json({ totalObjects: objects.length, objects });
});

// Get detailed object info
app.get('/api/ocean/object/:objectId', (req, res) => {
  const info = dataOcean.getObjectInfo(req.params.objectId);
  if (!info) return res.status(404).json({ error: 'Object not found' });
  res.json(info);
});

// Authorize a mesh node for an object
app.post('/api/ocean/authorize', (req, res) => {
  try {
    const { objectId, nodeId } = req.body;
    const result = dataOcean.authorizeNodeForObject(objectId, nodeId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Revoke a mesh node from an object
app.post('/api/ocean/revoke', (req, res) => {
  try {
    const { objectId, nodeId } = req.body;
    const result = dataOcean.revokeNodeForObject(objectId, nodeId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Ocean flow dynamics (tide/current state)
app.get('/api/ocean/flow', (req, res) => {
  res.json({
    tidePhase: dataOcean.tidePhase,
    waveCounter: dataOcean.waveCounter,
    flowCycles: dataOcean.stats.flowCycles,
    tideCycles: dataOcean.stats.tideCycles,
    shardsInMotion: dataOcean.stats.shardsInMotion,
    migrationsCompleted: dataOcean.stats.migrationsCompleted,
    rotationsCompleted: dataOcean.stats.rotationsCompleted,
    dataFlowedGB: dataOcean.stats.dataFlowedGB.toFixed(4),
  });
});

// Ocean depth tiers (how data sinks from hot → archive)
app.get('/api/ocean/depth', (req, res) => {
  const shardsByDepth = { surface: 0, shallow: 0, mid: 0, deep: 0, trench: 0 };
  for (const [, shard] of dataOcean.shards) {
    shardsByDepth[shard.depth] = (shardsByDepth[shard.depth] || 0) + 1;
  }
  res.json({
    tiers: OCEAN_CONFIG.depthTiers,
    distribution: shardsByDepth,
    totalShards: dataOcean.shards.size,
  });
});

// Ocean security audit (unauthorized attempts, rotation stats)
app.get('/api/ocean/security', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    encryption: 'AES-256-GCM keyed by CRYSTALS-Kyber-1024 (NIST PQC Level 5)',
    signatures: 'CRYSTALS-Dilithium Level 5',
    shardMapAnchor: 'QuranChain™ blockchain (immutable)',
    nodeAuth: 'Fungi Mesh node whitelist — ONLY authorized mesh nodes can retrieve',
    quantumEntropy: 'QRNG-seeded nonces/IVs (quantum-grade randomness)',
    keyRotation: `Every ${OCEAN_CONFIG.rotationIntervalMs / 1000}s (forward secrecy)`,
    maxShardLifetime: `${OCEAN_CONFIG.maxShardLifetimeMs / 1000}s before forced re-encryption`,
    erasureCoding: `${(OCEAN_CONFIG.erasureCodingRatio * 100)}% data / ${((1 - OCEAN_CONFIG.erasureCodingRatio) * 100)}% parity`,
    replicationFactor: OCEAN_CONFIG.replicationFactor,
    stats: {
      unauthorizedAttempts: dataOcean.stats.unauthorizedAttempts,
      rotationsCompleted: dataOcean.stats.rotationsCompleted,
      totalShards: dataOcean.shards.size,
      totalObjects: dataOcean.objects.size,
    },
  });
});

// Ocean real-time bandwidth / throughput
app.get('/api/ocean/bandwidth', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    description: 'Data flows freely like an ocean across the Fungi Mesh — always moving, never static',
    meshThroughput: `${dataOcean.networkCapacity.throughputGbps.toFixed(1)} Gbps sustained`,
    internalBandwidth: `${OCEAN_CONFIG.currentSpeedMbps} Mbps mesh internal`,
    shardSize: `${OCEAN_CONFIG.shardSize / (1024*1024)} MB per shard`,
    flowInterval: `${OCEAN_CONFIG.flowIntervalMs / 1000}s (shard migration cycle)`,
    tideInterval: `${OCEAN_CONFIG.tideIntervalMs / 1000}s (major tide shift)`,
    driftProbability: `${(OCEAN_CONFIG.driftProbability * 100)}% per shard per cycle`,
    dataFlowed: {
      totalGB: dataOcean.stats.dataFlowedGB.toFixed(4),
      ingestedGB: dataOcean.stats.dataIngestedGB.toFixed(4),
      retrievedGB: dataOcean.stats.dataRetrievedGB.toFixed(4),
      migrationsCompleted: dataOcean.stats.migrationsCompleted,
    },
    currentTide: dataOcean.tidePhase,
    waveCounter: dataOcean.waveCounter,
  });
});

// Combined Quantum + Ocean status (the complete picture)
app.get('/api/quantum-ocean/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    founder: 'Omar Mohammad Abunadi™',
    platform: 'DarCloud™ Fungi Mesh Network',
    description: 'Ocean of data flowing freely across Fungi Mesh, quantum-encrypted by Kyber-1024/Dilithium-5, anchored on QuranChain, retrievable ONLY by authorized mesh nodes',
    quantum: quantumEngine.getStatus(),
    quantumCapacity: quantumEngine.capacityCache,
    ocean: dataOcean.getStatus(),
    integration: {
      quantumSecuredShards: dataOcean.stats.totalShards,
      quantumChannelsActive: quantumEngine.quantumChannels.size,
      authenticatedNodes: quantumEngine.authTokens.size,
      entangledPeers: quantumEngine.entanglementTable.size,
      dataSecuredByQuantum: quantumEngine.dataSecuredBytes,
      blockchainAnchors: dataOcean.stats.totalObjects,
    },
  });
});

// Ocean full dashboard (all metrics, tiers, flow, security)
app.get('/api/ocean/dashboard', (req, res) => {
  try {
    res.json({
      founder: 'Omar Mohammad Abunadi™',
      platform: 'DarCloud™ Data Ocean',
      description: 'Always-moving ocean of data — quantum-encrypted, flowing freely across Fungi Mesh, secured by QuranChain, ONLY retrievable by authorized nodes',
      ...dataOcean.getOceanDashboard(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quantum-secured data retrieval (requires auth token from quantum engine)
app.post('/api/ocean/secure-retrieve', async (req, res) => {
  try {
    const { objectId, nodeId, authToken } = req.body;
    if (!objectId || !nodeId) return res.status(400).json({ error: 'objectId and nodeId required' });
    const authResult = quantumEngine.verifyAuthToken(nodeId, authToken);
    if (!authResult.valid) {
      return res.status(403).json({
        error: 'UNAUTHORIZED — Node not authenticated via quantum channel',
        reason: authResult.reason || 'Invalid or expired quantum auth token',
        hint: 'POST /api/quantum/authenticate first to get a valid token',
      });
    }
    const data = await dataOcean.retrieveData(objectId, { nodeId, authToken });
    res.json({ success: true, ...data });
  } catch (error) {
    const status = error.message.includes('UNAUTHORIZED') ? 403 : error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// �📊 MASTER DASHBOARD — Full system revenue overview
// ═══════════════════════════════════════════════════════════
// 🤖 AI AGENTS API — Internet-accessible agent services
// ═══════════════════════════════════════════════════════════

// Agent fleet status (public access for customers)
app.get('/api/agents/status', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    platform: 'QuranChain-OS AI Agents',
    description: 'Autonomous AI agents for revenue generation and business automation',
    fleet: liveAgentFleet.getSummary(),
    availableServices: [
      'customer_service',
      'sales_outreach',
      'content_creator',
      'data_analyst',
      'devops',
      'islamic_finance',
      'security',
      'logistics',
      'payment_processor',
      'revenue_analytics',
      'subscription_manager'
    ],
    pricing: {
      baseSubscription: '$150/month',
      enterprise: '$500/month per agent type',
      custom: 'Contact for pricing'
    }
  });
});

// Request agent service (public API for customers)
app.post('/api/agents/request', async (req, res) => {
  try {
    const { agentType, action, data, customerId } = req.body;
    if (!agentType || !customerId) {
      return res.status(400).json({ error: 'agentType and customerId required' });
    }

    // Route to live agent fleet
    const result = await liveAgentFleet.routeRequest(agentType, {
      action: action || 'process',
      customerId,
      ...data
    });

    res.json({
      success: true,
      agentType,
      requestId: result.requestId,
      status: 'processing',
      estimatedCompletion: '30 seconds'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent service result
app.get('/api/agents/result/:requestId', (req, res) => {
  const result = liveAgentFleet.getRequestResult(req.params.requestId);
  if (result) {
    res.json({ success: true, ...result });
  } else {
    res.status(404).json({ error: 'Request not found or still processing' });
  }
});

// Customer service agent (public API)
app.post('/api/agents/customer-service', async (req, res) => {
  try {
    const { message, customerId, priority } = req.body;
    if (!message || !customerId) {
      return res.status(400).json({ error: 'message and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('customer_service', {
      action: 'handle_inquiry',
      message,
      customerId,
      priority: priority || 'normal'
    });

    res.json({
      success: true,
      ticketId: result.requestId,
      status: 'received',
      estimatedResponse: '2 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sales outreach agent (public API)
app.post('/api/agents/sales-outreach', async (req, res) => {
  try {
    const { company, industry, requirements, customerId } = req.body;
    if (!company || !customerId) {
      return res.status(400).json({ error: 'company and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('sales_outreach', {
      action: 'generate_proposal',
      company,
      industry: industry || 'general',
      requirements: requirements || [],
      customerId
    });

    res.json({
      success: true,
      proposalId: result.requestId,
      status: 'generating',
      estimatedDelivery: '5 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Islamic finance agent (public API)
app.post('/api/agents/islamic-finance', async (req, res) => {
  try {
    const { portfolio, analysisType, customerId } = req.body;
    if (!portfolio || !customerId) {
      return res.status(400).json({ error: 'portfolio and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('islamic_finance', {
      action: 'analyze_portfolio',
      portfolio,
      analysisType: analysisType || 'sharia_compliance',
      customerId
    });

    res.json({
      success: true,
      analysisId: result.requestId,
      status: 'analyzing',
      estimatedCompletion: '10 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Data analyst agent (public API)
app.post('/api/agents/data-analyst', async (req, res) => {
  try {
    const { data, analysisType, customerId } = req.body;
    if (!data || !customerId) {
      return res.status(400).json({ error: 'data and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('data_analyst', {
      action: 'analyze_data',
      data,
      analysisType: analysisType || 'insights',
      customerId
    });

    res.json({
      success: true,
      analysisId: result.requestId,
      status: 'processing',
      estimatedCompletion: '15 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DevOps agent (public API)
app.post('/api/agents/devops', async (req, res) => {
  try {
    const { task, environment, customerId } = req.body;
    if (!task || !customerId) {
      return res.status(400).json({ error: 'task and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('devops', {
      action: 'execute_task',
      task,
      environment: environment || 'production',
      customerId
    });

    res.json({
      success: true,
      taskId: result.requestId,
      status: 'executing',
      estimatedCompletion: '30 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Security agent (public API)
app.post('/api/agents/security', async (req, res) => {
  try {
    const { scanType, target, customerId } = req.body;
    if (!scanType || !customerId) {
      return res.status(400).json({ error: 'scanType and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('security', {
      action: 'perform_scan',
      scanType,
      target: target || 'system',
      customerId
    });

    res.json({
      success: true,
      scanId: result.requestId,
      status: 'scanning',
      estimatedCompletion: '20 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logistics agent (public API)
app.post('/api/agents/logistics', async (req, res) => {
  try {
    const { shipment, requirements, customerId } = req.body;
    if (!shipment || !customerId) {
      return res.status(400).json({ error: 'shipment and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('logistics', {
      action: 'optimize_shipping',
      shipment,
      requirements: requirements || [],
      customerId
    });

    res.json({
      success: true,
      shipmentId: result.requestId,
      status: 'optimizing',
      estimatedCompletion: '10 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Content creator agent (public API)
app.post('/api/agents/content-creator', async (req, res) => {
  try {
    const { topic, contentType, customerId } = req.body;
    if (!topic || !customerId) {
      return res.status(400).json({ error: 'topic and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('content_creator', {
      action: 'create_content',
      topic,
      contentType: contentType || 'article',
      customerId
    });

    res.json({
      success: true,
      contentId: result.requestId,
      status: 'creating',
      estimatedCompletion: '25 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Revenue analytics agent (public API)
app.post('/api/agents/revenue-analytics', async (req, res) => {
  try {
    const { data, reportType, customerId } = req.body;
    if (!data || !customerId) {
      return res.status(400).json({ error: 'data and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('revenue_analytics', {
      action: 'generate_report',
      data,
      reportType: reportType || 'performance',
      customerId
    });

    res.json({
      success: true,
      reportId: result.requestId,
      status: 'analyzing',
      estimatedCompletion: '20 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Subscription manager agent (public API)
app.post('/api/agents/subscription-manager', async (req, res) => {
  try {
    const { action, subscriptionData, customerId } = req.body;
    if (!action || !customerId) {
      return res.status(400).json({ error: 'action and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('subscription_manager', {
      action,
      subscriptionData: subscriptionData || {},
      customerId
    });

    res.json({
      success: true,
      requestId: result.requestId,
      status: 'processing',
      estimatedCompletion: '5 minutes'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Payment processor agent (public API)
app.post('/api/agents/payment-processor', async (req, res) => {
  try {
    const { amount, currency, description, customerId } = req.body;
    if (!amount || !customerId) {
      return res.status(400).json({ error: 'amount and customerId required' });
    }

    const result = await liveAgentFleet.routeRequest('payment_processor', {
      action: 'process_payment',
      amount: parseFloat(amount),
      currency: currency || 'usd',
      description: description || 'Service payment',
      customerId
    });

    res.json({
      success: true,
      paymentId: result.requestId,
      status: 'processing',
      amount: parseFloat(amount),
      currency: currency || 'usd'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════

app.get('/api/revenue/dashboard', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    founder: 'Omar Mohammad Abunadi™',
    platform: 'QuranChain-OS',
    fleet: liveAgentFleet.getSummary(),
    gasTollHighway: gasTollHighway.getStatus(),
    invoiceEngine: liveInvoiceEngine.getStatus(),
    blockchain: {
      chainHeight: blockchain.chain.length,
      pendingTx: blockchain.pendingTransactions.length,
    },
    mesh: {
      peers: fungiMeshService.network ? fungiMeshService.network.peers.size : 0,
      running: fungiMeshService.isRunning,
    },
    nomadMainnet: {
      running: !!(nomadMainnet && nomadMainnet.running),
      relayed: nomadMainnet?.relayStats?.txRelayed || 0,
      mined: nomadMainnet?.relayStats?.totalMined || 0,
    },
    enterpriseBilling: {
      pricing: enterprisePricing.getStatus(),
      metering: enterpriseMetering.getStatus(),
      billingLedger: billingLedger.getStatus(),
      invoiceGenerator: enterpriseInvoiceGenerator.getStatus(),
      enforcement: billingEnforcement.getStatus(),
    },
    quantumCompute: quantumEngine.getStatus(),
    dataOcean: dataOcean.getStatus(),
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

    // Start CrossProjectBridge — sync with Project QuranChain (Python/Go)
    // Wrapped in timeout to prevent blocking Quantum + Ocean init
    try {
      await Promise.race([
        crossProjectBridge.initialize({
          blockchain,
          fungiMesh: fungiMeshService.network,
          meshBridge,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('CrossProjectBridge timeout after 10s')), 10000))
      ]);
      console.log('🔄 CrossProjectBridge started — syncing with Project QuranChain');
    } catch (bridgeErr) {
      console.log(`⚠️  CrossProjectBridge non-fatal: ${bridgeErr.message} — continuing startup`);
    }

    // Start Validator Node — connect to mesh + collect hardware
    await validatorNode.start();
    console.log('⚡ Validator Node started — collecting hardware from all peers');

    // ═══════════════════════════════════════════════════════════
    // 🌙 LAUNCH NOMADIC MAINNET — Route TX through ALL mesh nodes
    // ═══════════════════════════════════════════════════════════
    nomadMainnet = new NomadMainnet({
      blockchain,
      p2pNetwork,
      fungiMesh: fungiMeshService.network,
      meshService: fungiMeshService,
      minerAddress: 'Omar_Mohammad_Abunadi',
      autoMine: true,
    });
    await nomadMainnet.start();
    console.log('🌙 Nomadic Mainnet LAUNCHED — TX relaying through all mesh nodes');

    // ═══════════════════════════════════════════════════════════
    // ⛽ LAUNCH GAS TOLL HIGHWAY — Collect tolls on everything
    // ═══════════════════════════════════════════════════════════
    await gasTollHighway.initialize({
      blockchain,
      fungiMesh: fungiMeshService.network,
      meshService: fungiMeshService,
    });
    console.log('⛽ Gas Toll Highway LIVE — All toll lanes open');

    // ═══════════════════════════════════════════════════════════
    // 📄 LAUNCH LIVE INVOICE ENGINE — Real Stripe invoicing
    // ═══════════════════════════════════════════════════════════
    await liveInvoiceEngine.initialize();
    console.log('📄 Live Invoice Engine ACTIVE — Real invoices, real collection');

    // ═══════════════════════════════════════════════════════════
    // 🚀 DEPLOY LIVE AGENT FLEET — 10:1 cloning, real Stripe
    // ═══════════════════════════════════════════════════════════
    await liveAgentFleet.initialize();
    console.log('🚀 Live Agent Fleet DEPLOYED — ' + liveAgentFleet.metrics.totalAgents + ' agents LIVE');

    // ═══════════════════════════════════════════════════════════
    // 💲 LAUNCH ENTERPRISE BILLING — DarCloud AWS/AT&T Model
    // ═══════════════════════════════════════════════════════════
    await enterprisePricing.initialize();
    console.log('💲 Enterprise Pricing Engine LIVE — Stripe products synced');

    await enterpriseMetering.initialize({
      pricingEngine: enterprisePricing,
      blockchain,
      fungiMesh: fungiMeshService.network,
      gasTollHighway,
    });
    console.log('📊 Enterprise Metering System LIVE — Usage tracking active');

    await billingLedger.initialize({
      blockchain,
      pricingEngine: enterprisePricing,
      metering: enterpriseMetering,
    });
    console.log('⛓️  QuranChain Billing Ledger LIVE — Cryptographic proofs on-chain');

    await enterpriseInvoiceGenerator.initialize({
      pricingEngine: enterprisePricing,
      metering: enterpriseMetering,
      billingLedger,
    });
    console.log('📄 Enterprise Invoice Generator LIVE — AWS/AT&T format invoicing');

    await billingEnforcement.initialize({
      pricingEngine: enterprisePricing,
      metering: enterpriseMetering,
      billingLedger,
      invoiceGenerator: enterpriseInvoiceGenerator,
    });
    console.log('⚖️  Billing Enforcement Engine LIVE — Auto-throttle/cutoff active');

    // ═══════════════════════════════════════════════════════════
    // ⚛️  LAUNCH QUANTUM COMPUTE ENGINE — Kyber-1024 + Dilithium-5
    // ═══════════════════════════════════════════════════════════
    await quantumEngine.initialize({
      blockchain,
      fungiMesh: fungiMeshService.network,
      p2pNetwork,
    });

    // ═══════════════════════════════════════════════════════════
    // 🌊 LAUNCH DATA OCEAN — QuranChain-secured, quantum-encrypted
    // ═══════════════════════════════════════════════════════════
    await dataOcean.initialize({
      blockchain,
      fungiMesh: fungiMeshService.network,
      meshExpander: fungiMeshService.network?.meshExpander || null,
      quantumEngine,
    });

    // ═══════════════════════════════════════════════════════════
    // ⚛️  LAUNCH QUANTUM COMPUTE ENGINE — Post-Quantum Security
    // ═══════════════════════════════════════════════════════════
    await quantumEngine.initialize({
      blockchain,
      fungiMesh: fungiMeshService.network,
      meshService: fungiMeshService,
    });
    console.log('⚛️  Quantum Compute Engine LIVE — Kyber-1024 + Dilithium-5 + BB84 QKD');

    // ═══════════════════════════════════════════════════════════
    // 🌊 LAUNCH DATA OCEAN — Infinite flowing data, quantum-secured
    // 🍄 Capacity now scales with every external device the Fungi discovers
    // ═══════════════════════════════════════════════════════════
    await dataOcean.initialize({
      blockchain,
      fungiMesh: fungiMeshService.network,
      meshExpander: fungiMeshService.network?.meshExpander || null,
      quantumEngine,
    });
    const extDevs = dataOcean.networkCapacity.externalDevices || {};
    console.log('🌊 Data Ocean LIVE — ' + dataOcean.networkCapacity.totalAggregateGB.toFixed(0) + 'GB capacity, quantum-encrypted, QuranChain-secured');
    console.log(`  🌊🍄 External devices contributing: ${extDevs.connected || 0} connected + ${extDevs.pending || 0} pending = ${extDevs.discovered || 0} total`);

    // Start HTTP server with port retry
    const HOST = process.env.HOST || '0.0.0.0';
    const startHTTP = (tryPort) => {
      const server = app.listen(tryPort, HOST)
        .on('listening', () => {
          console.log(`⛓️  QuranChain Blockchain Server running on port ${tryPort}`);
          console.log(`🌐 Host: ${HOST} | P2P Port: ${p2pNetwork.port} | Mesh Port: ${fungiMeshService.network.port} | API Port: ${tryPort}`);
        })
        .on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            const nextPort = Number(tryPort) + 1;
            console.log(`  ⚠️  API port ${tryPort} in use, trying ${nextPort}`);
            startHTTP(nextPort);
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

  await dataOcean.shutdown();
  await quantumEngine.shutdown();
  await billingEnforcement.shutdown();
  await enterpriseInvoiceGenerator.shutdown();
  await billingLedger.shutdown();
  await enterpriseMetering.shutdown();
  await enterprisePricing.shutdown();
  await liveAgentFleet.shutdown();
  await gasTollHighway.shutdown();
  await liveInvoiceEngine.shutdown();
  if (nomadMainnet) await nomadMainnet.stop();
  await validatorNode.stop();
  await crossProjectBridge.shutdown();
  await meshBridge.shutdown();
  await p2pNetwork.stop();
  await fungiMeshService.shutdown();

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');

  await dataOcean.shutdown();
  await quantumEngine.shutdown();
  await billingEnforcement.shutdown();
  await enterpriseInvoiceGenerator.shutdown();
  await billingLedger.shutdown();
  await enterpriseMetering.shutdown();
  await enterprisePricing.shutdown();
  await liveAgentFleet.shutdown();
  await gasTollHighway.shutdown();
  await liveInvoiceEngine.shutdown();
  if (nomadMainnet) await nomadMainnet.stop();
  await validatorNode.stop();
  await crossProjectBridge.shutdown();
  await meshBridge.shutdown();
  await p2pNetwork.stop();
  await fungiMeshService.shutdown();

  process.exit(0);
});

// Global safety net — prevent uncaught exceptions from killing the server
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught exception (non-fatal):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled rejection (non-fatal):', reason?.message || reason);
});

// Start the server
startServer();

module.exports = app;
