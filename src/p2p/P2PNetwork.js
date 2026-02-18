/**
 * QuranChain P2P Nomadic Network
 * ===============================
 * WebSocket-based peer-to-peer mesh network for the QuranChain blockchain.
 *
 * Nomadic Design:
 *  - Any node can join/leave at any time from anywhere
 *  - Automatic peer discovery via seed nodes
 *  - Block and transaction propagation across the mesh
 *  - Chain sync on connect (longest valid chain wins)
 *  - Heartbeat-based liveness detection
 *  - NAT traversal friendly (WebSocket over HTTP)
 *
 * Protocol Messages:
 *  - HANDSHAKE: Exchange node info
 *  - QUERY_CHAIN: Request full chain
 *  - CHAIN_RESPONSE: Send full chain
 *  - NEW_BLOCK: Propagate newly mined block
 *  - NEW_TX: Propagate new transaction
 *  - QUERY_PEERS: Request peer list
 *  - PEERS_RESPONSE: Send known peers
 *  - PING/PONG: Liveness check
 *
 * Founder: Omar Mohammad Abunadi™
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

const MSG_TYPES = {
  HANDSHAKE: 'HANDSHAKE',
  QUERY_CHAIN: 'QUERY_CHAIN',
  CHAIN_RESPONSE: 'CHAIN_RESPONSE',
  NEW_BLOCK: 'NEW_BLOCK',
  NEW_TX: 'NEW_TX',
  QUERY_PEERS: 'QUERY_PEERS',
  PEERS_RESPONSE: 'PEERS_RESPONSE',
  PING: 'PING',
  PONG: 'PONG',
};

class P2PNetwork extends EventEmitter {
  constructor(blockchain, options = {}) {
    super();
    this.blockchain = blockchain;
    this.port = options.port || 6001;
    this.nodeId = blockchain.nodeId;
    this.peers = new Map(); // peerId → { ws, address, connectedAt, lastSeen }
    this.knownPeers = new Set(); // addresses to try connecting to
    this.server = null;
    this.seedNodes = options.seedNodes || [];
    this.maxPeers = options.maxPeers || 50;
    this.heartbeatInterval = null;

    // Listen for blockchain events to propagate
    this.blockchain.on('block', (block) => this.broadcastBlock(block));
    this.blockchain.on('transaction', (tx) => this.broadcastTransaction(tx));
  }

  /**
   * Start P2P server and connect to seed nodes
   */
  async start() {
    const maxRetries = 10;
    let retries = 0;
    
    const tryListen = () => {
      return new Promise((resolve) => {
        this.server = new WebSocket.Server({ port: this.port }, () => {
          console.log(`  🌐 P2P Network listening on port ${this.port}`);
          resolve();
        });

        this.server.on('connection', (ws, req) => {
          const address = req.socket.remoteAddress;
          console.log(`  🌐 Incoming peer connection from ${address}`);
          this._handleConnection(ws, address, 'incoming');
        });

        this.server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            retries++;
            if (retries >= maxRetries) {
              console.log(`  🌐 P2P: exhausted ${maxRetries} port retries starting from original port`);
              resolve(); // resolve anyway so startup continues
              return;
            }
            const oldPort = this.port;
            this.port++;
            console.log(`  🌐 P2P port ${oldPort} in use, trying ${this.port}`);
            try { this.server.close(); } catch (_) {}
            tryListen().then(resolve);
          } else {
            console.error('  🌐 P2P server error:', err.message);
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

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => this._heartbeat(), 30000);
  }

  /**
   * Connect to a peer
   */
  connectToPeer(address) {
    if (this.peers.size >= this.maxPeers) return;

    // Don't connect to self
    if (address.includes(`localhost:${this.port}`) || address.includes(`127.0.0.1:${this.port}`)) return;

    // Don't reconnect to existing peers
    for (const [, peer] of this.peers) {
      if (peer.address === address) return;
    }

    try {
      const ws = new WebSocket(address);
      ws.on('open', () => {
        console.log(`  🌐 Connected to peer: ${address}`);
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
    const peerId = `peer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    this.peers.set(peerId, {
      ws,
      address,
      direction,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      nodeId: null,
      chainLength: 0,
    });

    this.knownPeers.add(address);

    // Send handshake
    this._send(ws, {
      type: MSG_TYPES.HANDSHAKE,
      data: {
        nodeId: this.nodeId,
        chainLength: this.blockchain.chain.length,
        chainId: this.blockchain.chainId,
        port: this.port,
        version: '1.0.0',
      },
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        this._handleMessage(peerId, msg);
      } catch (err) {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      this.peers.delete(peerId);
      this.emit('peerDisconnected', peerId);
    });

    ws.on('error', () => {
      this.peers.delete(peerId);
    });

    this.emit('peerConnected', { peerId, address, direction });
  }

  _handleMessage(peerId, msg) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.lastSeen = Date.now();

    switch (msg.type) {
      case MSG_TYPES.HANDSHAKE:
        peer.nodeId = msg.data.nodeId;
        peer.chainLength = msg.data.chainLength;
        // If peer has longer chain, request it
        if (msg.data.chainLength > this.blockchain.chain.length) {
          this._send(peer.ws, { type: MSG_TYPES.QUERY_CHAIN });
        }
        // Request peers
        this._send(peer.ws, { type: MSG_TYPES.QUERY_PEERS });
        break;

      case MSG_TYPES.QUERY_CHAIN:
        this._send(peer.ws, {
          type: MSG_TYPES.CHAIN_RESPONSE,
          data: this.blockchain.chain.map(b => b.toJSON()),
        });
        break;

      case MSG_TYPES.CHAIN_RESPONSE:
        if (msg.data && Array.isArray(msg.data)) {
          const result = this.blockchain.replaceChain(msg.data);
          if (result.replaced) {
            console.log(`  ⛓️  Chain synced from peer: ${result.newLength} blocks`);
            this.emit('chainSynced', result);
          }
        }
        break;

      case MSG_TYPES.NEW_BLOCK:
        if (msg.data) {
          const Block = require('./Block');
          const newBlock = Block.fromJSON(msg.data);
          const latest = this.blockchain.chain[this.blockchain.chain.length - 1];

          if (newBlock.previousHash === latest.hash && newBlock.isValid()) {
            this.blockchain.chain.push(newBlock);
            this.blockchain._rebuildState();
            this.blockchain._saveChain();
            this.blockchain.emit('block', newBlock.toJSON());
            // Re-broadcast to other peers (not back to sender)
            this._broadcastExcept(peerId, { type: MSG_TYPES.NEW_BLOCK, data: msg.data });
          } else if (newBlock.index > latest.index + 1) {
            // We're behind, request full chain
            this._send(peer.ws, { type: MSG_TYPES.QUERY_CHAIN });
          }
        }
        break;

      case MSG_TYPES.NEW_TX:
        if (msg.data) {
          try {
            this.blockchain.addTransaction(msg.data);
            this._broadcastExcept(peerId, { type: MSG_TYPES.NEW_TX, data: msg.data });
          } catch (err) {
            // Duplicate or invalid tx, ignore
          }
        }
        break;

      case MSG_TYPES.QUERY_PEERS:
        const peerAddresses = [];
        for (const [, p] of this.peers) {
          if (p.address) peerAddresses.push(p.address);
        }
        this._send(peer.ws, {
          type: MSG_TYPES.PEERS_RESPONSE,
          data: peerAddresses,
        });
        break;

      case MSG_TYPES.PEERS_RESPONSE:
        if (Array.isArray(msg.data)) {
          for (const addr of msg.data) {
            if (!this.knownPeers.has(addr)) {
              this.knownPeers.add(addr);
              this.connectToPeer(addr);
            }
          }
        }
        break;

      case MSG_TYPES.PING:
        this._send(peer.ws, { type: MSG_TYPES.PONG });
        break;

      case MSG_TYPES.PONG:
        // Liveness confirmed
        break;
    }
  }

  _send(ws, msg) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  _broadcastExcept(excludePeerId, msg) {
    for (const [peerId, peer] of this.peers) {
      if (peerId !== excludePeerId) {
        this._send(peer.ws, msg);
      }
    }
  }

  broadcast(msg) {
    for (const [, peer] of this.peers) {
      this._send(peer.ws, msg);
    }
  }

  broadcastBlock(block) {
    this.broadcast({ type: MSG_TYPES.NEW_BLOCK, data: block });
  }

  broadcastTransaction(tx) {
    this.broadcast({ type: MSG_TYPES.NEW_TX, data: tx });
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

  getStats() {
    return {
      nodeId: this.nodeId.substring(0, 8),
      port: this.port,
      peers: this.peers.size,
      knownPeers: this.knownPeers.size,
      maxPeers: this.maxPeers,
      peerList: Array.from(this.peers.values()).map(p => ({
        nodeId: p.nodeId?.substring(0, 8) || 'unknown',
        address: p.address,
        direction: p.direction,
        connectedFor: Math.floor((Date.now() - p.connectedAt) / 1000) + 's',
      })),
    };
  }

  async stop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    for (const [, peer] of this.peers) {
      peer.ws.close();
    }
    this.peers.clear();
    if (this.server) {
      return new Promise(resolve => this.server.close(resolve));
    }
  }
}

module.exports = { P2PNetwork, MSG_TYPES };
