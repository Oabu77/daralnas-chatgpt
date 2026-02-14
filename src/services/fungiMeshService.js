/**
 * FungiMesh Service — Distributed Computing Management
 * ===================================================
 * Service layer for managing FungiMesh network operations
 * Handles task distribution, resource monitoring, and network scaling
 *
 * Features:
 *  - Task submission and monitoring
 *  - Resource discovery and allocation
 *  - Network health monitoring
 *  - Auto-scaling triggers
 *  - Result aggregation
 *
 * Founder: Omar Mohammad Abunadi™
 */

const { FungiMeshNetwork } = require('../p2p/FungiMeshNetwork');
const { SEED_NODES, NETWORK_CONFIG, TASK_REQUIREMENTS } = require('../config/meshConfig');
const crypto = require('crypto');

class FungiMeshService {
  constructor(options = {}) {
    this.network = null;
    this.isRunning = false;
    this.options = {
      port: options.port || NETWORK_CONFIG.meshPort,
      seedNodes: options.seedNodes || SEED_NODES,
      maxPeers: options.maxPeers || NETWORK_CONFIG.maxPeers,
      minPeers: options.minPeers || NETWORK_CONFIG.minPeers,
      scaleThreshold: options.scaleThreshold || NETWORK_CONFIG.scaleThreshold,
      ...options,
    };

    this.taskCallbacks = new Map(); // taskId → { resolve, reject, timeout }
    this.taskResults = new Map();
  }

  /**
   * Initialize and start the FungiMesh network
   */
  async initialize() {
    if (this.isRunning) {
      console.log('🍄 FungiMesh already running');
      return;
    }

    try {
      this.network = new FungiMeshNetwork(this.options);

      // Set up event handlers
      this.network.on('peerConnected', (data) => {
        console.log(`🍄 Peer connected: ${data.address} (${data.direction})`);
      });

      this.network.on('peerDisconnected', (peerId) => {
        console.log(`🍄 Peer disconnected: ${peerId.substring(0, 8)}`);
      });

      this.network.on('peerReady', (peerId) => {
        console.log(`🍄 Peer ready for tasks: ${peerId.substring(0, 8)}`);
      });

      this.network.on('taskCompleted', (result) => {
        this._handleTaskCompletion(result);
      });

      this.network.on('taskFailed', (result) => {
        this._handleTaskFailure(result);
      });

      await this.network.start();
      this.isRunning = true;

      console.log('🍄 FungiMesh network initialized successfully');

      // Start periodic resource queries
      setInterval(() => {
        this.network.queryResources();
      }, 30000);

    } catch (error) {
      console.error('🍄 Failed to initialize FungiMesh:', error.message);
      throw error;
    }
  }

  /**
   * Submit a computational task to the mesh
   */
  async submitTask(taskData, options = {}) {
    if (!this.isRunning) {
      throw new Error('FungiMesh network not running');
    }

    const taskId = this.network.distributeTask(taskData);

    // Set up promise for task completion
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 300000; // 5 minutes default

      const timeoutId = setTimeout(() => {
        this.taskCallbacks.delete(taskId);
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);

      this.taskCallbacks.set(taskId, {
        resolve,
        reject,
        timeoutId,
      });
    });
  }

  _handleTaskCompletion(result) {
    const callback = this.taskCallbacks.get(result.taskId);
    if (callback) {
      clearTimeout(callback.timeoutId);
      this.taskCallbacks.delete(result.taskId);
      this.taskResults.set(result.taskId, result);
      callback.resolve(result.result);
    }
  }

  _handleTaskFailure(result) {
    const callback = this.taskCallbacks.get(result.taskId);
    if (callback) {
      clearTimeout(callback.timeoutId);
      this.taskCallbacks.delete(result.taskId);
      callback.reject(new Error(result.error || 'Task failed'));
    }
  }

  /**
   * Submit CPU-intensive task
   */
  async submitCPUTask(data, iterations = 1000000) {
    return this.submitTask({
      type: 'cpu_intensive',
      data,
      iterations,
      minCores: 1,
      requiresGPU: false,
      priority: 'normal',
    });
  }

  /**
   * Submit GPU-intensive task
   */
  async submitGPUTask(data, options = {}) {
    return this.submitTask({
      type: 'gpu_intensive',
      data,
      ...options,
      requiresGPU: true,
      minCores: 2,
      priority: 'high',
    });
  }

  /**
   * Submit QuranChain-specific computation task
   */
  async submitQuranChainTask(taskType, data) {
    const requirements = TASK_REQUIREMENTS[taskType] || TASK_REQUIREMENTS.cpu_intensive;

    const taskConfig = {
      type: taskType,
      data,
      priority: requirements.priority,
      minCores: requirements.minCores,
      requiresGPU: requirements.requiresGPU,
      estimatedDuration: requirements.estimatedDuration,
    };

    return this.submitTask(taskConfig);
  }

  /**
   * Get network status and statistics
   */
  getNetworkStatus() {
    if (!this.network) {
      return { status: 'not_initialized' };
    }

    return {
      status: this.isRunning ? 'running' : 'stopped',
      ...this.network.getStats(),
      pendingTasks: this.taskCallbacks.size,
      completedTasks: this.taskResults.size,
    };
  }

  /**
   * Get task result by ID
   */
  getTaskResult(taskId) {
    return this.taskResults.get(taskId);
  }

  /**
   * List all active tasks
   */
  getActiveTasks() {
    return Array.from(this.taskCallbacks.keys()).map(taskId => ({
      taskId,
      status: 'running',
    }));
  }

  /**
   * Force redistribute workload
   */
  redistributeWorkload() {
    if (this.network) {
      this.network.broadcast({
        type: 'LOAD_BALANCE',
        data: { requestRedistribution: true },
      });
    }
  }

  /**
   * Gracefully stop the mesh network
   */
  async shutdown() {
    if (this.network) {
      await this.network.stop();
    }

    // Reject all pending tasks
    for (const [taskId, callback] of this.taskCallbacks) {
      clearTimeout(callback.timeoutId);
      callback.reject(new Error('Mesh network shutting down'));
    }

    this.taskCallbacks.clear();
    this.isRunning = false;
    console.log('🍄 FungiMesh network shutdown complete');
  }
}

module.exports = FungiMeshService;
