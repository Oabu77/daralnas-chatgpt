/**
 * QuranChain Nomadic Mainnet
 * ===========================
 * Location-independent, self-sustaining blockchain mainnet that propagates
 * transactions and blocks through ALL connected mesh nodes.
 *
 * Nomadic Design:
 *  - No fixed validators — any node can mine
 *  - Auto-mining loop with configurable interval
 *  - TX relay through FungiMesh (21+ peers) + P2P Network
 *  - Gossip protocol with dedup (seen cache)
 *  - Consensus: longest valid chain wins
 *  - Nomadic state: nodes join/leave freely, chain syncs automatically
 *  - Islamic finance TX types supported natively
 *
 * Founder: Omar Mohammad Abunadi™
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const os = require('os');

// ═══════════════════════════════════════════════════════════
// NOMADIC MAINNET CONFIGURATION
// ═══════════════════════════════════════════════════════════

const NOMAD_CONFIG = {
  CHAIN_NAME: 'QuranChain Nomadic Mainnet',
  VERSION: '1.0.0',
  MINING_INTERVAL: 30000,         // 30s block time
  TX_RELAY_INTERVAL: 2000,        // Relay pending TX every 2s
  SYNC_INTERVAL: 60000,           // Sync chain with peers every 60s
  STATUS_BROADCAST_INTERVAL: 15000, // Broadcast node status every 15s
  SEEN_CACHE_MAX: 10000,          // Max entries in seen TX/block cache
  SEEN_CACHE_TTL: 600000,         // 10 min TTL for seen entries
  MINER_ADDRESS: 'Omar_Mohammad_Abunadi',
  AUTO_MINE: true,                // Start mining automatically
  MIN_TX_TO_MINE: 0,              // Mine even empty blocks (keep chain alive)
  RELAY_HOPS: 5,                  // Max relay hops before dropping
  NOMAD_PROTOCOL_VERSION: 1,
};

// Nomad-specific message types for mesh relay
const NOMAD_MSG = {
  NOMAD_TX: 'NOMAD_TX',                   // Relay transaction through mesh
  NOMAD_BLOCK: 'NOMAD_BLOCK',             // Relay mined block through mesh
  NOMAD_CHAIN_QUERY: 'NOMAD_CHAIN_QUERY', // Request chain from mesh peer
  NOMAD_CHAIN_RESPONSE: 'NOMAD_CHAIN_RESPONSE', // Chain response
  NOMAD_STATUS: 'NOMAD_STATUS',           // Node status broadcast
  NOMAD_SYNC: 'NOMAD_SYNC',              // Chain sync request
  NOMAD_MEMPOOL: 'NOMAD_MEMPOOL',        // Mempool share
  NOMAD_HEARTBEAT: 'NOMAD_HEARTBEAT',    // Nomad liveness
};

class NomadMainnet extends EventEmitter {
  constructor(options = {}) {
    super();

    // Core references
    this.blockchain = options.blockchain;
    this.p2pNetwork = options.p2pNetwork;
    this.fungiMesh = options.fungiMesh;       // FungiMeshNetwork instance
    this.meshService = options.meshService;     // FungiMeshService instance

    // Nomad identity
    this.nodeId = this.blockchain?.nodeId || crypto.randomBytes(16).toString('hex');
    this.minerAddress = options.minerAddress || NOMAD_CONFIG.MINER_ADDRESS;
    this.nodeName = os.hostname();
    this.nodeIP = this._getLocalIP();

    // State
    this.running = false;
    this.mining = false;
    this.autoMine = options.autoMine !== undefined ? options.autoMine : NOMAD_CONFIG.AUTO_MINE;
    this.miningInterval = null;
    this.relayInterval = null;
    this.syncInterval = null;
    this.statusInterval = null;

    // Gossip dedup — prevent infinite relay loops
    this.seenTxs = new Map();       // txHash → timestamp
    this.seenBlocks = new Map();    // blockHash → timestamp
    this.seenMessages = new Map();  // msgId → timestamp

    // Nomad network state
    this.nomadPeers = new Map();    // nodeId → { chainHeight, lastSeen, ip, name, ... }
    this.relayStats = {
      txRelayed: 0,
      txReceived: 0,
      blocksRelayed: 0,
      blocksReceived: 0,
      meshBroadcasts: 0,
      p2pBroadcasts: 0,
      duplicatesDropped: 0,
      totalMined: 0,
      miningErrors: 0,
      startedAt: null,
    };

    // Block production stats
    this.blockTimes = [];           // Last 100 block mining times
    this.lastBlockTime = null;

    console.log(`⛓️  NomadMainnet initialized — ${NOMAD_CONFIG.CHAIN_NAME} v${NOMAD_CONFIG.VERSION}`);
    console.log(`⛓️  Miner: ${this.minerAddress} | Node: ${this.nodeId.substring(0, 12)}`);
  }

  // ═══════════════════════════════════════════════════════════
  // MAINNET LIFECYCLE
  // ═══════════════════════════════════════════════════════════

  async start() {
    if (this.running) return;
    this.running = true;
    this.relayStats.startedAt = Date.now();

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║    🌙 QURANCHAIN NOMADIC MAINNET — LAUNCHING 🌙   ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // 1. Wire up blockchain event listeners (TX + block propagation)
    this._wireBlockchainEvents();

    // 2. Wire up FungiMesh message handling (receive relayed TX/blocks)
    this._wireMeshRelay();

    // 3. Start mining loop
    if (this.autoMine) {
      this._startMiningLoop();
    }

    // 4. Start TX relay loop (batch relay pending TX)
    this._startRelayLoop();

    // 5. Start periodic chain sync across mesh
    this._startSyncLoop();

    // 6. Broadcast initial node status to all peers
    this._broadcastStatus();
    this.statusInterval = setInterval(() => this._broadcastStatus(), NOMAD_CONFIG.STATUS_BROADCAST_INTERVAL);

    // 7. Clean seen cache periodically
    this._seenCleanupInterval = setInterval(() => this._cleanSeenCache(), 60000);

    // Log chain state
    const stats = this.blockchain.getStats();
    console.log(`⛓️  Chain loaded: ${stats.blocks} blocks | Difficulty: ${stats.difficulty}`);
    console.log(`⛓️  Total supply: ${stats.totalSupply} QRC | Block reward: ${stats.blockReward} QRC`);
    console.log(`⛓️  Authenticated verses: ${stats.authenticatedVerses}`);
    console.log(`⛓️  Pending TX: ${stats.pendingTx}`);

    // Log network state
    const meshPeers = this.fungiMesh ? this.fungiMesh.peers.size : 0;
    const p2pPeers = this.p2pNetwork ? this.p2pNetwork.peers.size : 0;
    console.log(`🌐 P2P peers: ${p2pPeers} | FungiMesh peers: ${meshPeers}`);
    console.log(`🍄 Total relay network: ${p2pPeers + meshPeers} nodes`);

    if (this.autoMine) {
      console.log(`⛏️  Auto-mining: ACTIVE (every ${NOMAD_CONFIG.MINING_INTERVAL / 1000}s)`);
    }

    console.log(`\n🌙 بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ`);
    console.log(`🌙 QuranChain Nomadic Mainnet is LIVE\n`);

    this.emit('mainnet:started', {
      nodeId: this.nodeId,
      chainHeight: this.blockchain.chain.length,
      meshPeers,
      p2pPeers,
      autoMine: this.autoMine,
    });

    return { success: true, message: 'Nomadic Mainnet launched' };
  }

  async stop() {
    if (!this.running) return;
    this.running = false;

    console.log('⛓️  Stopping Nomadic Mainnet...');

    if (this.miningInterval) clearInterval(this.miningInterval);
    if (this.relayInterval) clearInterval(this.relayInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.statusInterval) clearInterval(this.statusInterval);
    if (this._seenCleanupInterval) clearInterval(this._seenCleanupInterval);

    // Remove blockchain event listeners
    this.blockchain.removeAllListeners('block');
    this.blockchain.removeAllListeners('transaction');

    console.log('⛓️  Nomadic Mainnet stopped');
    this.emit('mainnet:stopped', { nodeId: this.nodeId });
  }

  // ═══════════════════════════════════════════════════════════
  // BLOCKCHAIN EVENT WIRING
  // ═══════════════════════════════════════════════════════════

  _wireBlockchainEvents() {
    // When a new block is mined locally → relay to ALL mesh peers
    this.blockchain.on('block', (block) => {
      this._relayBlockToMesh(block);
    });

    // When a new TX is added locally → relay to ALL mesh peers
    this.blockchain.on('transaction', (tx) => {
      this._relayTxToMesh(tx);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // FUNGIMESH RELAY WIRING
  // ═══════════════════════════════════════════════════════════

  _wireMeshRelay() {
    if (!this.fungiMesh) {
      console.log('⚠️  No FungiMesh — relay disabled');
      return;
    }

    // Intercept all mesh messages for nomad protocol
    const originalHandleMessage = this.fungiMesh._handleMessage.bind(this.fungiMesh);
    this.fungiMesh._handleMessage = (peerId, msg) => {
      // Handle nomad-specific messages
      if (msg.type && msg.type.startsWith('NOMAD_')) {
        this._handleNomadMessage(peerId, msg);
        return;
      }
      // Pass through to original handler
      originalHandleMessage(peerId, msg);
    };

    console.log('🍄 FungiMesh relay wired — TX/blocks will propagate through mesh');
  }

  _handleNomadMessage(peerId, msg) {
    const msgId = msg.msgId || `${msg.type}_${Date.now()}`;

    // Dedup check
    if (this.seenMessages.has(msgId)) {
      this.relayStats.duplicatesDropped++;
      return;
    }
    this.seenMessages.set(msgId, Date.now());

    // Hop limit check
    const hops = (msg.hops || 0) + 1;
    if (hops > NOMAD_CONFIG.RELAY_HOPS) return;

    switch (msg.type) {
      case NOMAD_MSG.NOMAD_TX:
        this._handleRelayedTx(peerId, msg, hops);
        break;

      case NOMAD_MSG.NOMAD_BLOCK:
        this._handleRelayedBlock(peerId, msg, hops);
        break;

      case NOMAD_MSG.NOMAD_CHAIN_QUERY:
        this._handleChainQuery(peerId, msg);
        break;

      case NOMAD_MSG.NOMAD_CHAIN_RESPONSE:
        this._handleChainResponse(peerId, msg);
        break;

      case NOMAD_MSG.NOMAD_STATUS:
        this._handlePeerStatus(peerId, msg);
        break;

      case NOMAD_MSG.NOMAD_SYNC:
        this._handleSyncRequest(peerId, msg);
        break;

      case NOMAD_MSG.NOMAD_MEMPOOL:
        this._handleMempoolShare(peerId, msg);
        break;

      case NOMAD_MSG.NOMAD_HEARTBEAT:
        this._handleNomadHeartbeat(peerId, msg);
        break;

      default:
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TX RELAY — Send transactions through ALL nodes
  // ═══════════════════════════════════════════════════════════

  /**
   * Relay a transaction to all FungiMesh peers
   */
  _relayTxToMesh(tx) {
    const txHash = tx.id || tx.hash || crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex');

    // Don't re-relay already seen
    if (this.seenTxs.has(txHash)) return;
    this.seenTxs.set(txHash, Date.now());

    const msgId = `nomad_tx_${txHash}_${this.nodeId.substring(0, 8)}`;
    const relayMsg = {
      type: NOMAD_MSG.NOMAD_TX,
      msgId,
      hops: 0,
      origin: this.nodeId,
      data: tx,
      timestamp: Date.now(),
      chainHeight: this.blockchain.chain.length,
    };

    // Broadcast to all FungiMesh peers
    if (this.fungiMesh) {
      this.fungiMesh.broadcast(relayMsg);
      this.relayStats.meshBroadcasts++;
    }

    this.relayStats.txRelayed++;
    this.emit('tx:relayed', { txHash, meshPeers: this.fungiMesh?.peers.size || 0 });
  }

  /**
   * Handle a transaction relayed from a mesh peer
   */
  _handleRelayedTx(peerId, msg, hops) {
    const tx = msg.data;
    if (!tx) return;

    const txHash = tx.id || tx.hash || crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex');

    // Already seen this TX
    if (this.seenTxs.has(txHash)) {
      this.relayStats.duplicatesDropped++;
      return;
    }
    this.seenTxs.set(txHash, Date.now());

    // Try to add to our mempool
    try {
      this.blockchain.addTransaction(tx);
      this.relayStats.txReceived++;

      console.log(`📨 Received TX via mesh relay: ${txHash.substring(0, 12)}... (${tx.type || 'TRANSFER'}) [hop ${hops}]`);

      // Re-relay to remaining peers (gossip)
      const reRelayMsg = {
        ...msg,
        hops,
        relayedBy: this.nodeId,
      };
      this._gossipExcept(peerId, reRelayMsg);

      // Also propagate via P2P network
      if (this.p2pNetwork) {
        this.p2pNetwork.broadcastTransaction(tx);
        this.relayStats.p2pBroadcasts++;
      }

      this.emit('tx:received', { txHash, from: msg.origin, hops });
    } catch (err) {
      // Duplicate or invalid — don't relay further
      this.relayStats.duplicatesDropped++;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // BLOCK RELAY — Send mined blocks through ALL nodes
  // ═══════════════════════════════════════════════════════════

  /**
   * Relay a mined block to all FungiMesh peers
   */
  _relayBlockToMesh(block) {
    const blockHash = block.hash || crypto.createHash('sha256').update(JSON.stringify(block)).digest('hex');

    if (this.seenBlocks.has(blockHash)) return;
    this.seenBlocks.set(blockHash, Date.now());

    const msgId = `nomad_block_${blockHash}_${this.nodeId.substring(0, 8)}`;
    const relayMsg = {
      type: NOMAD_MSG.NOMAD_BLOCK,
      msgId,
      hops: 0,
      origin: this.nodeId,
      data: block,
      timestamp: Date.now(),
      chainHeight: this.blockchain.chain.length,
      minerAddress: this.minerAddress,
    };

    // Broadcast to all FungiMesh peers
    if (this.fungiMesh) {
      this.fungiMesh.broadcast(relayMsg);
      this.relayStats.meshBroadcasts++;
    }

    this.relayStats.blocksRelayed++;
    console.log(`📦 Block #${block.index || '?'} relayed to ${this.fungiMesh?.peers.size || 0} mesh peers`);
    this.emit('block:relayed', { blockHash, meshPeers: this.fungiMesh?.peers.size || 0 });
  }

  /**
   * Handle a block relayed from a mesh peer
   */
  _handleRelayedBlock(peerId, msg, hops) {
    const blockData = msg.data;
    if (!blockData) return;

    const blockHash = blockData.hash || 'unknown';

    if (this.seenBlocks.has(blockHash)) {
      this.relayStats.duplicatesDropped++;
      return;
    }
    this.seenBlocks.set(blockHash, Date.now());

    this.relayStats.blocksReceived++;
    console.log(`📦 Received block #${blockData.index || '?'} via mesh relay from ${(msg.origin || peerId).substring(0, 12)} [hop ${hops}]`);

    // Try to add to our chain
    try {
      const Block = require('../blockchain/Block');
      const newBlock = Block.fromJSON(blockData);
      const latest = this.blockchain.chain[this.blockchain.chain.length - 1];

      if (newBlock.previousHash === latest.hash && newBlock.isValid()) {
        // Direct append
        this.blockchain.chain.push(newBlock);
        this.blockchain._rebuildState();
        this.blockchain._saveChain();

        console.log(`✅ Block #${newBlock.index} accepted — chain now ${this.blockchain.chain.length} blocks`);

        // Re-relay to remaining peers (gossip)
        const reRelayMsg = { ...msg, hops, relayedBy: this.nodeId };
        this._gossipExcept(peerId, reRelayMsg);

        // Also propagate via P2P
        if (this.p2pNetwork) {
          this.p2pNetwork.broadcastBlock(blockData);
          this.relayStats.p2pBroadcasts++;
        }

        this.emit('block:received', { blockHash, index: newBlock.index, from: msg.origin });
      } else if (blockData.index > latest.index + 1) {
        // We're behind — request full chain from sender
        console.log(`⛓️  Behind by ${blockData.index - latest.index} blocks — requesting chain sync`);
        this._requestChainFromPeer(peerId);
      }
    } catch (err) {
      console.log(`⚠️  Block relay error: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CHAIN SYNC — Consensus across nomadic nodes
  // ═══════════════════════════════════════════════════════════

  _handleChainQuery(peerId, msg) {
    const peer = this.fungiMesh?.peers.get(peerId);
    if (!peer) return;

    this.fungiMesh._send(peer.ws, {
      type: NOMAD_MSG.NOMAD_CHAIN_RESPONSE,
      msgId: `chain_resp_${Date.now()}_${this.nodeId.substring(0, 8)}`,
      data: this.blockchain.chain.map(b => typeof b.toJSON === 'function' ? b.toJSON() : b),
      chainHeight: this.blockchain.chain.length,
      origin: this.nodeId,
    });
  }

  _handleChainResponse(peerId, msg) {
    if (!msg.data || !Array.isArray(msg.data)) return;

    const result = this.blockchain.replaceChain(msg.data);
    if (result.replaced) {
      console.log(`⛓️  Chain synced from mesh peer — now ${result.newLength} blocks`);
      this.emit('chain:synced', { newLength: result.newLength, from: msg.origin });
    }
  }

  _requestChainFromPeer(peerId) {
    const peer = this.fungiMesh?.peers.get(peerId);
    if (!peer) return;

    this.fungiMesh._send(peer.ws, {
      type: NOMAD_MSG.NOMAD_CHAIN_QUERY,
      msgId: `chain_query_${Date.now()}_${this.nodeId.substring(0, 8)}`,
      origin: this.nodeId,
      chainHeight: this.blockchain.chain.length,
    });
  }

  _handleSyncRequest(peerId, msg) {
    // Peer is asking for chain sync
    this._handleChainQuery(peerId, msg);
  }

  _handleMempoolShare(peerId, msg) {
    if (!msg.data || !Array.isArray(msg.data)) return;

    let added = 0;
    for (const tx of msg.data) {
      try {
        this.blockchain.addTransaction(tx);
        added++;
      } catch (err) {
        // Already have it or invalid
      }
    }

    if (added > 0) {
      console.log(`📋 Received ${added} TX from mesh mempool share`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PEER STATUS TRACKING
  // ═══════════════════════════════════════════════════════════

  _handlePeerStatus(peerId, msg) {
    const data = msg.data || {};
    this.nomadPeers.set(data.nodeId || peerId, {
      nodeId: data.nodeId || peerId,
      chainHeight: data.chainHeight || 0,
      name: data.name || 'unknown',
      ip: data.ip || 'unknown',
      miner: data.miner || false,
      meshPeers: data.meshPeers || 0,
      p2pPeers: data.p2pPeers || 0,
      lastSeen: Date.now(),
      version: data.version || '?',
    });
  }

  _handleNomadHeartbeat(peerId, msg) {
    const nodeId = msg.origin || peerId;
    if (this.nomadPeers.has(nodeId)) {
      this.nomadPeers.get(nodeId).lastSeen = Date.now();
      this.nomadPeers.get(nodeId).chainHeight = msg.chainHeight || 0;
    }
  }

  _broadcastStatus() {
    if (!this.fungiMesh) return;

    const statusMsg = {
      type: NOMAD_MSG.NOMAD_STATUS,
      msgId: `status_${Date.now()}_${this.nodeId.substring(0, 8)}`,
      origin: this.nodeId,
      data: {
        nodeId: this.nodeId,
        chainHeight: this.blockchain.chain.length,
        name: this.nodeName,
        ip: this.nodeIP,
        miner: this.autoMine,
        meshPeers: this.fungiMesh.peers.size,
        p2pPeers: this.p2pNetwork?.peers.size || 0,
        pendingTx: this.blockchain.pendingTransactions.length,
        difficulty: this.blockchain.difficulty,
        version: NOMAD_CONFIG.VERSION,
        minerAddress: this.minerAddress,
        totalMined: this.relayStats.totalMined,
      },
      timestamp: Date.now(),
    };

    this.fungiMesh.broadcast(statusMsg);
  }

  // ═══════════════════════════════════════════════════════════
  // MINING LOOP — Auto-mine blocks
  // ═══════════════════════════════════════════════════════════

  _startMiningLoop() {
    console.log(`⛏️  Mining loop started — interval: ${NOMAD_CONFIG.MINING_INTERVAL / 1000}s`);

    // Mine first block after 5s delay
    setTimeout(() => this._mineNext(), 5000);

    this.miningInterval = setInterval(() => {
      this._mineNext();
    }, NOMAD_CONFIG.MINING_INTERVAL);
  }

  async _mineNext() {
    if (!this.running || this.mining) return;

    const pendingCount = this.blockchain.pendingTransactions.length;
    if (pendingCount < NOMAD_CONFIG.MIN_TX_TO_MINE && NOMAD_CONFIG.MIN_TX_TO_MINE > 0) return;

    this.mining = true;
    const startTime = Date.now();

    try {
      console.log(`\n⛏️  Mining block #${this.blockchain.chain.length}... (${pendingCount} pending TX)`);

      const result = await this.blockchain.mineBlock(this.minerAddress);

      const elapsed = Date.now() - startTime;
      this.blockTimes.push(elapsed);
      if (this.blockTimes.length > 100) this.blockTimes.shift();
      this.lastBlockTime = elapsed;

      this.relayStats.totalMined++;

      console.log(`✅ Block #${result.block.index} mined in ${elapsed}ms`);
      console.log(`   Hash: ${result.block.hash.substring(0, 24)}...`);
      console.log(`   TX: ${result.block.transactions.length} | Reward: ${result.reward} QRC`);
      console.log(`   Chain: ${result.chainLength} blocks | Difficulty: ${this.blockchain.difficulty}`);

      // Block event will trigger relay via _wireBlockchainEvents
      this.emit('block:mined', {
        index: result.block.index,
        hash: result.block.hash,
        txCount: result.block.transactions.length,
        reward: result.reward,
        miningTime: elapsed,
        chainLength: result.chainLength,
      });

    } catch (err) {
      this.relayStats.miningErrors++;
      console.log(`⚠️  Mining error: ${err.message}`);
    } finally {
      this.mining = false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TX RELAY LOOP — Batch relay pending TX
  // ═══════════════════════════════════════════════════════════

  _startRelayLoop() {
    this.relayInterval = setInterval(() => {
      if (!this.running) return;

      const pending = this.blockchain.pendingTransactions;
      if (pending.length === 0) return;

      // Relay each pending TX that hasn't been relayed yet
      for (const tx of pending) {
        const txHash = tx.id || tx.hash || crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex');
        if (!this.seenTxs.has(txHash)) {
          this._relayTxToMesh(tx);
        }
      }
    }, NOMAD_CONFIG.TX_RELAY_INTERVAL);
  }

  // ═══════════════════════════════════════════════════════════
  // CHAIN SYNC LOOP — Periodic consensus check
  // ═══════════════════════════════════════════════════════════

  _startSyncLoop() {
    this.syncInterval = setInterval(() => {
      if (!this.running || !this.fungiMesh) return;

      // Check if any nomad peer has a longer chain
      for (const [nodeId, peerInfo] of this.nomadPeers) {
        if (peerInfo.chainHeight > this.blockchain.chain.length) {
          console.log(`⛓️  Peer ${nodeId.substring(0, 12)} has ${peerInfo.chainHeight} blocks (we have ${this.blockchain.chain.length}) — syncing...`);

          // Find this peer in mesh
          for (const [peerId, peer] of this.fungiMesh.peers) {
            if (peer.nodeId === nodeId || peerId === nodeId) {
              this._requestChainFromPeer(peerId);
              break;
            }
          }
          break; // Only sync from one peer at a time
        }
      }

      // Share mempool with mesh
      if (this.blockchain.pendingTransactions.length > 0) {
        this.fungiMesh.broadcast({
          type: NOMAD_MSG.NOMAD_MEMPOOL,
          msgId: `mempool_${Date.now()}_${this.nodeId.substring(0, 8)}`,
          origin: this.nodeId,
          data: this.blockchain.pendingTransactions.slice(0, 50), // Share up to 50 TX
        });
      }
    }, NOMAD_CONFIG.SYNC_INTERVAL);
  }

  // ═══════════════════════════════════════════════════════════
  // GOSSIP PROTOCOL — Relay to all except sender
  // ═══════════════════════════════════════════════════════════

  _gossipExcept(excludePeerId, msg) {
    if (!this.fungiMesh) return;

    for (const [peerId, peer] of this.fungiMesh.peers) {
      if (peerId !== excludePeerId) {
        this.fungiMesh._send(peer.ws, msg);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TRANSACTION SUBMISSION — Send TX through the nomadic network
  // ═══════════════════════════════════════════════════════════

  /**
   * Submit a transaction to the nomadic mainnet
   * This adds it to the local mempool AND relays to ALL mesh peers
   */
  submitTransaction(tx) {
    // Add to local blockchain
    const added = this.blockchain.addTransaction(tx);

    // Relay to mesh (the event handler will do this, but force immediate relay)
    this._relayTxToMesh(tx);

    // Also relay via P2P
    if (this.p2pNetwork) {
      this.p2pNetwork.broadcastTransaction(tx);
    }

    const totalPeers = (this.fungiMesh?.peers.size || 0) + (this.p2pNetwork?.peers.size || 0);
    console.log(`📨 TX submitted & relayed to ${totalPeers} nodes — ${tx.type || 'TRANSFER'}`);

    return {
      success: true,
      txHash: tx.id || tx.hash,
      relayedTo: totalPeers,
      meshPeers: this.fungiMesh?.peers.size || 0,
      p2pPeers: this.p2pNetwork?.peers.size || 0,
    };
  }

  /**
   * Transfer QRC through the nomadic network
   */
  transfer(from, to, amount, memo) {
    const { Transaction, TX_TYPES } = require('../blockchain/Transaction');
    const tx = Transaction.createTransfer({ from, to, amount, memo });
    return this.submitTransaction(tx.toJSON());
  }

  /**
   * Authenticate a Quran verse on-chain via nomadic network
   */
  authenticateVerse(surah, ayah, text, arabicText, authenticator) {
    const { Transaction } = require('../blockchain/Transaction');
    const tx = Transaction.createVerseAuth({ surah, ayah, text, arabicText, authenticator });
    return this.submitTransaction(tx.toJSON());
  }

  /**
   * Mine a block immediately (manual trigger)
   */
  async mineNow() {
    return this._mineNext();
  }

  // ═══════════════════════════════════════════════════════════
  // SEEN CACHE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  _cleanSeenCache() {
    const now = Date.now();
    const ttl = NOMAD_CONFIG.SEEN_CACHE_TTL;

    for (const [key, ts] of this.seenTxs) {
      if (now - ts > ttl) this.seenTxs.delete(key);
    }
    for (const [key, ts] of this.seenBlocks) {
      if (now - ts > ttl) this.seenBlocks.delete(key);
    }
    for (const [key, ts] of this.seenMessages) {
      if (now - ts > ttl) this.seenMessages.delete(key);
    }

    // Hard cap
    if (this.seenTxs.size > NOMAD_CONFIG.SEEN_CACHE_MAX) {
      const keys = [...this.seenTxs.keys()].slice(0, this.seenTxs.size - NOMAD_CONFIG.SEEN_CACHE_MAX);
      keys.forEach(k => this.seenTxs.delete(k));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  _getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS & STATS
  // ═══════════════════════════════════════════════════════════

  getStatus() {
    const uptime = this.relayStats.startedAt
      ? Math.floor((Date.now() - this.relayStats.startedAt) / 1000)
      : 0;

    const avgBlockTime = this.blockTimes.length > 0
      ? Math.floor(this.blockTimes.reduce((a, b) => a + b, 0) / this.blockTimes.length)
      : 0;

    return {
      mainnet: {
        name: NOMAD_CONFIG.CHAIN_NAME,
        version: NOMAD_CONFIG.VERSION,
        running: this.running,
        uptime: `${uptime}s`,
        autoMine: this.autoMine,
        mining: this.mining,
      },
      chain: this.blockchain.getStats(),
      network: {
        meshPeers: this.fungiMesh?.peers.size || 0,
        p2pPeers: this.p2pNetwork?.peers.size || 0,
        totalRelayNodes: (this.fungiMesh?.peers.size || 0) + (this.p2pNetwork?.peers.size || 0),
        nomadPeers: this.nomadPeers.size,
        nomadPeerList: Array.from(this.nomadPeers.values()).map(p => ({
          nodeId: p.nodeId?.substring(0, 12),
          name: p.name,
          ip: p.ip,
          chainHeight: p.chainHeight,
          miner: p.miner,
          lastSeen: Math.floor((Date.now() - p.lastSeen) / 1000) + 's ago',
        })),
      },
      relay: this.relayStats,
      mining: {
        totalMined: this.relayStats.totalMined,
        errors: this.relayStats.miningErrors,
        avgBlockTime: `${avgBlockTime}ms`,
        lastBlockTime: this.lastBlockTime ? `${this.lastBlockTime}ms` : null,
        minerAddress: this.minerAddress,
      },
      node: {
        nodeId: this.nodeId.substring(0, 12),
        name: this.nodeName,
        ip: this.nodeIP,
      },
    };
  }

  getRelayStats() {
    return this.relayStats;
  }

  getNomadPeers() {
    return Array.from(this.nomadPeers.values());
  }
}

module.exports = { NomadMainnet, NOMAD_CONFIG, NOMAD_MSG };
