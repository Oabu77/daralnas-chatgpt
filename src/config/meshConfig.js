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
  // Primary seed nodes (replace with actual IPs/hostnames when deploying)
  'ws://localhost:7001',  // Local development
  // Add more seed nodes as the network grows:
  // 'ws://seed1.quranchain.org:7001',
  // 'ws://seed2.quranchain.org:7001',
  // 'ws://mesh-node-01.quranchain.net:7001',
];

// Blockchain P2P seed nodes
const BLOCKCHAIN_SEED_NODES = [
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

// Computational resource requirements
const TASK_REQUIREMENTS = {
  cpu_intensive: {
    minCores: 1,
    requiresGPU: false,
    priority: 'normal',
    estimatedDuration: 5000, // 5 seconds
  },
  gpu_intensive: {
    minCores: 2,
    requiresGPU: true,
    priority: 'high',
    estimatedDuration: 10000, // 10 seconds
  },
  verse_validation: {
    minCores: 2,
    requiresGPU: false,
    priority: 'high',
    estimatedDuration: 3000,
  },
  translation_processing: {
    minCores: 4,
    requiresGPU: true, // For ML models
    priority: 'high',
    estimatedDuration: 15000,
  },
  blockchain_sync: {
    minCores: 1,
    requiresGPU: false,
    priority: 'normal',
    estimatedDuration: 2000,
  },
  analytics_computation: {
    minCores: 2,
    requiresGPU: true,
    priority: 'high',
    estimatedDuration: 8000,
  },
};

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

module.exports = {
  SEED_NODES,
  BLOCKCHAIN_SEED_NODES,
  NETWORK_CONFIG,
  TASK_REQUIREMENTS,
  SECURITY_CONFIG,
  SCALING_CONFIG,
  MONITORING_CONFIG,
};