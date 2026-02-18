/**
 * FungiMesh Configuration
 * =======================
 * Configuration for FungiMesh network nodes and distributed computing
 *
 * This file contains seed nodes, network settings, and computational parameters
 * for the decentralized computing infrastructure.
 *
 * Founder: Omar Mohammad Abunadi™
 */

// Seed nodes for initial peer discovery
// These are well-known, stable nodes that help bootstrap the network
const SEED_NODES = [
  // Primary seed nodes (DarCloud hosting)
  'wss://mesh.darcloud.host:7001',  // Primary DarCloud mesh node
  'wss://fungi.darcloud.host:7001', // Secondary DarCloud mesh node
  'wss://5g.darcloud.host:7001',    // 5G-enabled mesh node
  // Local development fallback
  'ws://localhost:7001',  // Local development
  // Add more seed nodes as the network grows:
  // 'ws://seed1.quranchain.org:7001',
  // 'ws://seed2.quranchain.org:7001',
  // 'ws://mesh-node-01.quranchain.net:7001',
];

// Blockchain P2P seed nodes
const BLOCKCHAIN_SEED_NODES = [
  'wss://blockchain.darcloud.host:6001', // Primary DarCloud blockchain node
  'wss://quran.darcloud.host:6001',     // Secondary DarCloud blockchain node
  // Local development fallback
  'ws://localhost:6001',
  // Add blockchain seed nodes:
  // 'ws://blockchain-seed1.quranchain.org:6001',
];

// Network configuration
const NETWORK_CONFIG = {
  // FungiMesh settings
  meshPort: process.env.MESH_PORT || 7001,
  maxPeers: parseInt(process.env.MAX_MESH_PEERS) || 100,
  minPeers: parseInt(process.env.MIN_MESH_PEERS) || 5,
  heartbeatInterval: 30000, // 30 seconds
  scalingInterval: 60000, // 1 minute
  scaleThreshold: 0.8, // Scale when 80% capacity

  // Blockchain P2P settings
  blockchainPort: process.env.BLOCKCHAIN_PORT || 6001,
  maxBlockchainPeers: parseInt(process.env.MAX_BLOCKCHAIN_PEERS) || 50,

  // Task settings
  defaultTaskTimeout: 300000, // 5 minutes
  maxRetries: 3,
  taskQueueSize: 1000,
};

// Computational resource requirements — FULL REGISTRY
// Every task type the platform can encounter is listed here.
// Unknown types are auto-inferred at runtime (see inferTaskRequirements).
const TASK_REQUIREMENTS = {
  // ── Core compute ──
  cpu_intensive:          { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 5000 },
  gpu_intensive:          { minCores: 2, requiresGPU: true,  priority: 'high',   estimatedDuration: 10000 },

  // ── QuranChain blockchain ──
  verse_validation:       { minCores: 2, requiresGPU: false, priority: 'high',   estimatedDuration: 3000 },
  translation_processing: { minCores: 4, requiresGPU: true,  priority: 'high',   estimatedDuration: 15000 },
  blockchain_sync:        { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 2000 },
  analytics_computation:  { minCores: 2, requiresGPU: true,  priority: 'high',   estimatedDuration: 8000 },
  block_reward:           { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 1000 },
  staking_reward:         { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 1000 },

  // ── Gas Toll Highway ──
  cross_chain_route:      { minCores: 2, requiresGPU: false, priority: 'high',   estimatedDuration: 4000 },
  ai_compute:             { minCores: 4, requiresGPU: true,  priority: 'high',   estimatedDuration: 12000 },
  telecom_usage:          { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 2000 },
  mesh_resource:          { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 3000 },
  gas_toll_settlement:    { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 5000 },
  gas_toll_invoice:       { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 3000 },

  // ── Quantum Compute Engine ──
  quantum_compute:        { minCores: 4, requiresGPU: true,  priority: 'critical', estimatedDuration: 20000 },
  quantum_keypair:        { minCores: 2, requiresGPU: false, priority: 'high',   estimatedDuration: 5000 },
  quantum_encrypt:        { minCores: 2, requiresGPU: false, priority: 'high',   estimatedDuration: 4000 },
  quantum_verify:         { minCores: 2, requiresGPU: false, priority: 'high',   estimatedDuration: 3000 },

  // ── Data Ocean ──
  ocean_shard_map:        { minCores: 2, requiresGPU: false, priority: 'high',   estimatedDuration: 6000 },
  ocean_data_retrieval:   { minCores: 2, requiresGPU: false, priority: 'normal', estimatedDuration: 5000 },
  ocean_verified_retrieval:{ minCores: 2, requiresGPU: false, priority: 'high',  estimatedDuration: 7000 },
  ocean_shard_map_rotated:{ minCores: 2, requiresGPU: false, priority: 'high',   estimatedDuration: 8000 },
  ocean_node_authorized:  { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 2000 },
  ocean_node_revoked:     { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 1000 },

  // ── Enterprise Billing ──
  enterprise_usage:       { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 4000 },
  billing_invoice:        { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 3000 },
  payment_proof:          { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 2000 },
  usage_merkle_root:      { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 5000 },
  billing_dispute:        { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 3000 },
  dispute_credit:         { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 2000 },
  subscription_invoice:   { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 3000 },
  service_invoice:        { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 3000 },
  enterprise_usage_invoice:{ minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 5000 },
  sla:                    { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 2000 },
  license:                { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 2000 },
  reservation:            { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 2000 },

  // ── AI Agent Fleet ──
  subscription_manager:   { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 4000 },
  payment_processor:      { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 5000 },
  invoice_agent:          { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 4000 },
  revenue_analytics:      { minCores: 2, requiresGPU: true,  priority: 'normal', estimatedDuration: 8000 },
  customer_service:       { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 3000 },
  compliance_security:    { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 4000 },
  gas_toll_collector:     { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 3000 },
  telecom_billing:        { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 3000 },
  sales_outreach:         { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 5000 },
  islamic_finance:        { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 5000 },
  card_issuing:           { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 4000 },

  // ── Mesh / Network ──
  network_healing:        { minCores: 2, requiresGPU: false, priority: 'critical', estimatedDuration: 10000 },
  load_balance:           { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 3000 },
  mesh_handshake:         { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 1000 },
  validator_handshake:    { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 1000 },
  compute_node_registration:{ minCores: 1, requiresGPU: false, priority: 'high', estimatedDuration: 2000 },
  compute_proof:          { minCores: 2, requiresGPU: false, priority: 'high',   estimatedDuration: 5000 },
  peer_recruitment:       { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 2000 },
  network_scale:          { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 3000 },
  cross_chain_bridge:     { minCores: 2, requiresGPU: false, priority: 'high',   estimatedDuration: 4000 },
  gas_toll_sync:          { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 2000 },

  // ── Gaming / Auto-Healing ──
  gaming_server_connect:  { minCores: 2, requiresGPU: true,  priority: 'high',   estimatedDuration: 3000 },
  gaming_server_heartbeat:{ minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 1000 },
  gaming_server_backup:   { minCores: 2, requiresGPU: true,  priority: 'high',   estimatedDuration: 8000 },

  // ── DevOps / Misc ──
  devops:                 { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 5000 },
  data_analyst:           { minCores: 2, requiresGPU: true,  priority: 'normal', estimatedDuration: 8000 },
  content_creator:        { minCores: 2, requiresGPU: true,  priority: 'normal', estimatedDuration: 10000 },
  logistics:              { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 4000 },
  security:               { minCores: 1, requiresGPU: false, priority: 'high',   estimatedDuration: 3000 },
};

/**
 * Auto-infer task requirements for any unknown task type.
 * Uses keyword heuristics so the fungi can figure out new tasks on the fly.
 */
function inferTaskRequirements(taskType) {
  const t = (taskType || '').toLowerCase();
  const req = { minCores: 1, requiresGPU: false, priority: 'normal', estimatedDuration: 5000 };

  // GPU-heavy keywords
  if (/gpu|render|train|ml|ai|neural|quantum|vision|video|gaming/.test(t)) {
    req.requiresGPU = true; req.minCores = 2; req.estimatedDuration = 10000;
  }
  // High-priority keywords
  if (/critical|heal|security|compliance|encrypt|auth|dispute|verify|quantum/.test(t)) {
    req.priority = 'critical'; req.estimatedDuration = Math.max(req.estimatedDuration, 8000);
  } else if (/billing|invoice|payment|settlement|toll|sla|bridge|validation/.test(t)) {
    req.priority = 'high';
  }
  // Heavy compute keywords
  if (/analytics|ocean|shard|merkle|enterprise|aggregate/.test(t)) {
    req.minCores = Math.max(req.minCores, 2); req.estimatedDuration = 8000;
  }
  // Fast / lightweight
  if (/ping|heartbeat|handshake|status|sync|ack/.test(t)) {
    req.estimatedDuration = 1000; req.priority = 'normal';
  }

  return req;
}

// Security settings
const SECURITY_CONFIG = {
  encryptionAlgorithm: 'aes-256-gcm',
  keyLength: 32,
  authChallengeLength: 32,
  tokenExpiry: 3600000, // 1 hour
  maxAuthAttempts: 3,
};

// Auto-scaling parameters
const SCALING_CONFIG = {
  expansionThreshold: 0.8, // Expand when workload > 80%
  contractionThreshold: 0.3, // Contract when workload < 30%
  maxExpansionRate: 10, // Max peers to add per scaling event
  minContractionRate: 1, // Min peers to remove per scaling event
  scalingCooldown: 300000, // 5 minutes between scaling events
};

// Monitoring and logging
const MONITORING_CONFIG = {
  statsInterval: 30000, // 30 seconds
  healthCheckInterval: 60000, // 1 minute
  logLevel: process.env.LOG_LEVEL || 'info',
  enableMetrics: true,
  metricsPort: process.env.METRICS_PORT || 9090,
};

// Gaming server endpoints for auto-healing and backup
const GAMING_SERVER_ENDPOINTS = [
  'wss://gaming1.darcloud.host:7001',
  'wss://gaming2.darcloud.host:7001',
  'wss://gamechain.darcloud.host:7001',
  'wss://web3gaming.darcloud.host:7001',
  // Local development gaming servers
  'ws://localhost:7002',  // Local gaming server 1
  'ws://localhost:7003',  // Local gaming server 2
];

// Auto-healing configuration
const HEALING_CONFIG = {
  enabled: process.env.MESH_HEALING_ENABLED !== 'false', // Default enabled
  healthCheckInterval: 30000, // 30 seconds
  criticalHealthThreshold: 50, // Trigger healing when health < 50%
  healingTimeout: 300000, // 5 minutes healing timeout
  maxBackupNodes: 5, // Maximum backup nodes to activate
  failoverTimeout: 180000, // 3 minutes failover timeout
};

module.exports = {
  SEED_NODES,
  BLOCKCHAIN_SEED_NODES,
  NETWORK_CONFIG,
  TASK_REQUIREMENTS,
  inferTaskRequirements,
  SECURITY_CONFIG,
  SCALING_CONFIG,
  MONITORING_CONFIG,
  GAMING_SERVER_ENDPOINTS,
  HEALING_CONFIG,
};