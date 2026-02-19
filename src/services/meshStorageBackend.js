/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * Mesh Storage Backend — HTTP Bridge for DarCloud ↔ FungiMesh Storage
 * ====================================================================
 * Exposes a simple REST API that DarCloud (Python/FastAPI) can call to
 * store, retrieve, and delete files via the FungiMesh distributed
 * storage protocol.  Internally delegates to FungiMeshNetwork's
 * storeFile / retrieveFile / deleteFile methods which handle chunking,
 * DHT routing, replication, and P2P chunk transfer.
 *
 * Port: 7100 (configurable via MESH_STORAGE_PORT env)
 *
 * Endpoints:
 *   POST   /store          — Upload a file → returns fileHash + chunkHashes
 *   POST   /retrieve       — Download a file by chunkHashes → returns raw bytes
 *   POST   /delete         — Delete a file's chunks from the mesh
 *   GET    /stats          — Distributed storage statistics
 *   GET    /health         — Health check
 *   GET    /dht/:chunkHash — Lookup who holds a specific chunk
 *
 * Founder: Omar Mohammad Abunadi™
 * © QuranChain™ | DarCloud™
 */

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const FungiMeshService = require('./fungiMeshService');

const PORT = parseInt(process.env.MESH_STORAGE_PORT || '7100', 10);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB max

class MeshStorageBackend {
  constructor(options = {}) {
    this.port = options.port || PORT;
    this.app = express();
    this.meshService = null;
    this.server = null;
    this.replicationTimer = null;

    // JSON body parsing for non-file routes
    this.app.use(express.json({ limit: '10mb' }));

    this._setupRoutes();
  }

  /**
   * Initialize the FungiMesh network and start the HTTP server
   */
  async start() {
    // Start mesh network
    this.meshService = new FungiMeshService();
    await this.meshService.initialize();

    // Start periodic replication maintenance (every 60s)
    this.replicationTimer = setInterval(() => {
      if (this.meshService.network) {
        this.meshService.network.maintainReplication().catch(err => {
          console.error('🍄 💾 Replication maintenance error:', err.message);
        });
      }
    }, 60000);

    // Periodic storage capacity query (every 30s)
    setInterval(() => {
      if (this.meshService.network) {
        this.meshService.network.queryStorageCapacity();
      }
    }, 30000);

    // Start HTTP server
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🍄 💾 Mesh Storage Backend listening on port ${this.port}`);
        console.log(`🍄 💾 DarCloud can reach mesh storage at http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  _setupRoutes() {
    // ── Store a file ─────────────────────────────────────────────────────
    this.app.post('/store', upload.single('file'), async (req, res) => {
      try {
        if (!this.meshService?.network) {
          return res.status(503).json({ error: 'Mesh network not ready' });
        }

        let fileBuffer;
        let metadata = {};

        if (req.file) {
          // multipart/form-data upload
          fileBuffer = req.file.buffer;
          metadata = {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            bucket: req.body?.bucket || 'default',
            objectKey: req.body?.objectKey || req.file.originalname,
            uploadedAt: Date.now(),
          };
        } else if (req.body?.data) {
          // Base64 data in JSON body
          fileBuffer = Buffer.from(req.body.data, 'base64');
          metadata = req.body.metadata || {};
        } else {
          return res.status(400).json({ error: 'No file or data provided' });
        }

        const result = await this.meshService.network.storeFile(fileBuffer, metadata);

        res.json({
          success: true,
          fileHash: result.fileHash,
          chunkHashes: result.chunkHashes,
          totalChunks: result.totalChunks,
          totalSize: result.totalSize,
          replicationFactor: this.meshService.network.REPLICATION_FACTOR,
          replicationMap: result.replicationMap,
          quantum: result.quantum ? {
            quantumHash: result.quantum.quantumHash?.quantumHash,
            latticeProof: result.quantum.quantumHash?.latticeProof,
            signature: result.quantum.signature?.algorithm,
            entanglementPairs: result.quantum.entanglementPairs?.length || 0,
            chunksSecured: result.quantum.chunks?.length || 0,
            version: result.quantum.version,
          } : null,
        });
      } catch (err) {
        console.error('🍄 💾 Store error:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // ── Retrieve a file ──────────────────────────────────────────────────
    this.app.post('/retrieve', async (req, res) => {
      try {
        if (!this.meshService?.network) {
          return res.status(503).json({ error: 'Mesh network not ready' });
        }

        const { chunkHashes } = req.body;
        if (!chunkHashes || !Array.isArray(chunkHashes)) {
          return res.status(400).json({ error: 'chunkHashes array required' });
        }

        const fileBuffer = await this.meshService.network.retrieveFile(chunkHashes);

        // Return raw binary
        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Length', fileBuffer.length);
        res.send(fileBuffer);
      } catch (err) {
        console.error('🍄 💾 Retrieve error:', err.message);
        if (err.message.includes('not found')) {
          res.status(404).json({ error: err.message });
        } else {
          res.status(500).json({ error: err.message });
        }
      }
    });

    // ── Delete a file ────────────────────────────────────────────────────
    this.app.post('/delete', async (req, res) => {
      try {
        if (!this.meshService?.network) {
          return res.status(503).json({ error: 'Mesh network not ready' });
        }

        const { chunkHashes } = req.body;
        if (!chunkHashes || !Array.isArray(chunkHashes)) {
          return res.status(400).json({ error: 'chunkHashes array required' });
        }

        await this.meshService.network.deleteFile(chunkHashes);
        res.json({ success: true, deleted: chunkHashes.length });
      } catch (err) {
        console.error('🍄 💾 Delete error:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // ── Storage stats ────────────────────────────────────────────────────
    this.app.get('/stats', (req, res) => {
      if (!this.meshService?.network) {
        return res.status(503).json({ error: 'Mesh network not ready' });
      }
      res.json(this.meshService.network.getStorageStats());
    });

    // ── DHT lookup ───────────────────────────────────────────────────────
    this.app.get('/dht/:chunkHash', (req, res) => {
      if (!this.meshService?.network) {
        return res.status(503).json({ error: 'Mesh network not ready' });
      }

      const holders = this.meshService.network.dht.get(req.params.chunkHash);
      res.json({
        chunkHash: req.params.chunkHash,
        holders: holders ? Array.from(holders) : [],
        found: holders ? holders.size > 0 : false,
      });
    });

    // ── Quantum stats ────────────────────────────────────────────────────
    this.app.get('/quantum', (req, res) => {
      if (!this.meshService?.network) {
        return res.status(503).json({ error: 'Mesh network not ready' });
      }
      const qe = this.meshService.network.quantumEngine;
      if (!qe) {
        return res.json({ enabled: false });
      }
      res.json({
        enabled: true,
        ...qe.getStats(),
      });
    });

    // ── MeshTalk OS Integration ─────────────────────────────────────────
    this.app.get('/meshtalk', (req, res) => {
      if (!this.meshService?.network) {
        return res.status(503).json({ error: 'Mesh network not ready' });
      }
      res.json({
        service: 'MeshTalk OS ↔ FungiMesh Bridge',
        ...this.meshService.network.getMeshTalkStats(),
      });
    });

    this.app.post('/meshtalk/backup', upload.single('file'), async (req, res) => {
      try {
        if (!this.meshService?.network) {
          return res.status(503).json({ error: 'Mesh network not ready' });
        }

        let fileBuffer;
        let metadata = {};

        if (req.file) {
          fileBuffer = req.file.buffer;
          metadata = {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            type: 'meshtalk-telecom-backup',
            dataType: req.body?.dataType || 'telecom-general',
            nodeId: req.body?.nodeId || 'meshtalk-os',
            uploadedAt: Date.now(),
          };
        } else if (req.body?.data) {
          fileBuffer = Buffer.from(JSON.stringify(req.body.data));
          metadata = {
            type: 'meshtalk-telecom-backup',
            dataType: req.body.dataType || 'telecom-general',
            nodeId: req.body.nodeId || 'meshtalk-os',
            uploadedAt: Date.now(),
          };
        } else {
          return res.status(400).json({ error: 'No file or data provided' });
        }

        const result = await this.meshService.network.storeFile(fileBuffer, metadata);

        // Update MeshTalk stats
        this.meshService.network.meshtalkStats.telecomDataBackups++;
        this.meshService.network.meshtalkStats.telecomBytesStored += fileBuffer.length;

        res.json({
          success: true,
          service: 'MeshTalk Telecom Backup',
          fileHash: result.fileHash,
          chunkHashes: result.chunkHashes,
          totalChunks: result.totalChunks,
          totalSize: result.totalSize,
          quantum: result.quantum ? {
            quantumHash: result.quantum.quantumHash?.quantumHash,
            signature: result.quantum.signature?.algorithm,
          } : null,
        });
      } catch (err) {
        console.error('📡 MeshTalk backup error:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // ── Expander / Device Discovery ─────────────────────────────────────
    this.app.get('/expander/stats', (req, res) => {
      if (!this.meshService?.network) {
        return res.status(503).json({ error: 'Mesh network not ready' });
      }
      const expander = this.meshService.network.meshExpander;
      if (!expander) {
        return res.json({ enabled: false });
      }
      res.json({
        enabled: true,
        ...expander.getStats(),
      });
    });

    this.app.get('/expander/devices', (req, res) => {
      if (!this.meshService?.network) {
        return res.status(503).json({ error: 'Mesh network not ready' });
      }
      const expander = this.meshService.network.meshExpander;
      if (!expander) {
        return res.json({ enabled: false, devices: [] });
      }
      res.json({
        enabled: true,
        ...expander.getDevices(),
      });
    });

    this.app.post('/expander/scan', async (req, res) => {
      if (!this.meshService?.network) {
        return res.status(503).json({ error: 'Mesh network not ready' });
      }
      const expander = this.meshService.network.meshExpander;
      if (!expander) {
        return res.status(404).json({ error: 'MeshExpander not initialized' });
      }
      // Trigger immediate discovery cycle
      try {
        await expander._immediateDiscovery();
        res.json({
          success: true,
          message: 'Immediate discovery scan completed',
          ...expander.getStats(),
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── AI Agent Coordination ───────────────────────────────────────────
    this.app.get('/agents/status', (req, res) => {
      if (!this.meshService?.network) {
        return res.status(503).json({ error: 'Mesh network not ready' });
      }
      const net = this.meshService.network;
      const expander = net.meshExpander;
      res.json({
        service: 'FungiMesh Agent Coordination',
        meshNetwork: {
          nodeId: net.nodeId,
          peers: net.peers?.size || 0,
          running: this.meshService.isRunning,
        },
        expander: expander ? {
          running: expander._running,
          ...expander.getStats(),
        } : { running: false },
        meshtalk: net.getMeshTalkStats ? net.getMeshTalkStats() : {},
        quantum: net.quantumEngine ? {
          enabled: net.quantumEngine.enabled,
          version: net.quantumEngine.version,
        } : { enabled: false },
        timestamp: new Date().toISOString(),
      });
    });

    this.app.post('/agents/notify', (req, res) => {
      // Receive notifications from Python AI agents
      const { agentId, eventType, data } = req.body;
      if (!agentId || !eventType) {
        return res.status(400).json({ error: 'agentId and eventType required' });
      }
      console.log(`🤖 Agent notification from ${agentId}: ${eventType}`);

      // Forward rebuild events to MeshExpander
      if (eventType === 'network_rebuild' && this.meshService?.network?.meshExpander) {
        const expander = this.meshService.network.meshExpander;
        if (data?.newNodes) {
          for (const node of data.newNodes) {
            if (node.ip_address) {
              expander._registerDevice(node.ip_address, {
                source: 'ai-agent',
                hostname: node.device_name || null,
                mac: node.mac_address || null,
              });
            }
          }
        }
      }

      // Forward device discovery events to mesh network
      if (eventType === 'device_discovered' && this.meshService?.network) {
        this.meshService.network.emit('agentDeviceDiscovered', data);
      }

      res.json({ success: true, received: eventType });
    });

    // ── Health check ─────────────────────────────────────────────────────
    this.app.get('/health', (req, res) => {
      const isReady = !!this.meshService?.isRunning;
      const qe = this.meshService?.network?.quantumEngine;
      const mt = this.meshService?.network?.meshtalkStats;
      const exp = this.meshService?.network?.meshExpander;
      res.status(isReady ? 200 : 503).json({
        status: isReady ? 'healthy' : 'starting',
        service: 'Mesh Storage Backend',
        port: this.port,
        meshConnected: isReady,
        peers: this.meshService?.network?.peers?.size || 0,
        chunksStored: this.meshService?.network?.storageStats?.chunksStored || 0,
        quantumEnabled: !!qe?.enabled,
        quantumVersion: qe?.version || null,
        meshtalkConnected: (mt?.nodesRegistered || 0) > 0,
        meshtalkNodes: mt?.nodesRegistered || 0,
        meshtalkTelecomBackups: mt?.telecomDataBackups || 0,
        expanderActive: exp?._running || false,
        expanderDevices: exp?.devices?.size || 0,
        expanderMeshPeers: exp?.stats?.meshPeersCreated || 0,
        timestamp: new Date().toISOString(),
      });
    });
  }

  async stop() {
    if (this.replicationTimer) clearInterval(this.replicationTimer);
    if (this.server) {
      return new Promise(resolve => this.server.close(resolve));
    }
  }
}

// ── Standalone launcher ──────────────────────────────────────────────────
if (require.main === module) {
  const backend = new MeshStorageBackend();
  backend.start().catch(err => {
    console.error('🍄 💾 Failed to start Mesh Storage Backend:', err.message);
    process.exit(1);
  });
}

module.exports = { MeshStorageBackend };
