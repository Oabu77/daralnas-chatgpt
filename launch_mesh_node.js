#!/usr/bin/env node
/**
 * FungiMesh Node Launcher
 * Launches individual FungiMesh network nodes with enhanced growth capabilities
 */

const { FungiMeshNetwork } = require('./src/p2p/FungiMeshNetwork');
const fs = require('fs');
const path = require('path');

class MeshNodeLauncher {
  constructor() {
    this.node = null;
    this.config = this.loadConfig();
  }

  loadConfig() {
    // Default configuration
    let config = {
      port: 7001,
      nodeId: `fungi-node-${Date.now()}`,
      seedNodes: [
        'ws://localhost:7001',
        'ws://10.248.195.1:7001',
        'ws://192.168.1.98:7001'
      ],
      maxPeers: 100,
      minPeers: 3,
      scaleThreshold: 0.6, // More aggressive scaling
      autoScale: true,
      discoveryEnabled: true
    };

    // Load from command line args
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--port':
          config.port = parseInt(args[i + 1]);
          i++;
          break;
        case '--node-id':
          config.nodeId = args[i + 1];
          i++;
          break;
        case '--config':
          const configFile = args[i + 1];
          if (fs.existsSync(configFile)) {
            const fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            config = { ...config, ...fileConfig };
          }
          i++;
          break;
      }
    }

    return config;
  }

  async start() {
    console.log('🍄 Starting FungiMesh Node...');
    console.log(`   Node ID: ${this.config.nodeId}`);
    console.log(`   Port: ${this.config.port}`);
    console.log(`   Seed Nodes: ${this.config.seedNodes.length}`);

    try {
      this.node = new FungiMeshNetwork({
        port: this.config.port,
        seedNodes: this.config.seedNodes,
        maxPeers: this.config.maxPeers,
        minPeers: this.config.minPeers,
        scaleThreshold: this.config.scaleThreshold
      });

      await this.node.start();

      // Enhanced growth features
      this.enableGrowthFeatures();

      console.log('✅ FungiMesh node started successfully');

      // Keep alive
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());

    } catch (error) {
      console.error('❌ Failed to start FungiMesh node:', error.message);
      process.exit(1);
    }
  }

  enableGrowthFeatures() {
    if (!this.node) return;

    // Aggressive peer discovery
    this.node.discoveryInterval = setInterval(() => {
      this.node._startLANDiscovery();
      this.node._startNetworkScanner();
    }, 30000); // Every 30 seconds instead of 45

    // Enhanced auto-scaling
    this.node.scalingInterval = setInterval(() => {
      this.enhancedAutoScale();
    }, 30000); // Every 30 seconds instead of 60

    // Peer recruitment
    this.node.recruitmentInterval = setInterval(() => {
      this.recruitPeers();
    }, 60000); // Every minute

    console.log('🚀 Growth features enabled:');
    console.log('   • Aggressive discovery (30s intervals)');
    console.log('   • Enhanced auto-scaling (30s intervals)');
    console.log('   • Peer recruitment (60s intervals)');
  }

  enhancedAutoScale() {
    if (!this.node) return;

    const currentPeers = this.node.peers.size;
    const workload = this.node._calculateWorkload();

    // More aggressive scaling thresholds
    if (workload > 0.5 && currentPeers < this.node.maxPeers) {
      console.log(`🍄 Growth: Expanding network (workload: ${(workload * 100).toFixed(1)}%)`);
      this.node.broadcast({
        type: 'NETWORK_SCALE',
        data: {
          action: 'expand',
          reason: 'high_workload',
          priority: 'high'
        },
      });
    }

    // Also scale based on peer count alone
    if (currentPeers < this.node.minPeers) {
      console.log(`🍄 Growth: Need more peers (${currentPeers}/${this.node.minPeers})`);
      this.node.broadcast({
        type: 'PEER_REQUEST',
        data: { requested: this.node.minPeers - currentPeers }
      });
    }
  }

  recruitPeers() {
    if (!this.node) return;

    // Broadcast recruitment message
    this.node.broadcast({
      type: 'PEER_RECRUITMENT',
      data: {
        nodeId: this.node.nodeId,
        capabilities: this.node.capabilities,
        availableSlots: this.node.maxPeers - this.node.peers.size
      }
    });

    // Try to connect to known but disconnected peers
    for (const peerAddr of this.node.knownPeers) {
      if (!this.node.peers.has(peerAddr)) {
        console.log(`🍄 Recruiting peer: ${peerAddr}`);
        this.node.connectToPeer(peerAddr);
      }
    }
  }

  stop() {
    console.log('🛑 Stopping FungiMesh node...');

    if (this.node) {
      if (this.node.discoveryInterval) clearInterval(this.node.discoveryInterval);
      if (this.node.scalingInterval) clearInterval(this.node.scalingInterval);
      if (this.node.recruitmentInterval) clearInterval(this.node.recruitmentInterval);

      this.node.stop();
    }

    process.exit(0);
  }
}

// Start the node
const launcher = new MeshNodeLauncher();
launcher.start();