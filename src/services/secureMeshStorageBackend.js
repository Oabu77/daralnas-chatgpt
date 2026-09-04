const express = require('express');
const { MeshStorageBackend } = require('./meshStorageBackend');
const FungiMeshService = require('./fungiMeshService');
const {
  DEFAULT_HOST,
  getControlToken,
  resolveHost,
  createMeshStorageGuard,
} = require('./meshStorageSecurity');

const DEFAULT_PORT = 7100;

class SecureMeshStorageBackend {
  constructor(options = {}) {
    this.env = options.env || process.env;
    this.port = options.port || Number.parseInt(this.env.MESH_STORAGE_PORT || String(DEFAULT_PORT), 10);
    this.host = resolveHost(options, this.env);
    this.app = express();
    this.legacyBackend = new MeshStorageBackend({ port: this.port });
    this.server = null;
    this.replicationTimer = null;
    this.capacityTimer = null;

    // Keep unauthenticated health intentionally minimal. Every other request is
    // authenticated before the legacy app can parse JSON or multipart bodies.
    this.app.get('/health', (req, res) => {
      const ready = Boolean(this.legacyBackend.meshService?.isRunning);
      return res.status(ready ? 200 : 503).json({
        status: ready ? 'healthy' : 'starting',
        service: 'mesh-storage',
      });
    });

    this.app.use(createMeshStorageGuard({ env: this.env }));
    this.app.use((req, res, next) => this.legacyBackend.app(req, res, next));
  }

  async start() {
    if (!getControlToken(this.env)) {
      throw new Error('MESH_STORAGE_CONTROL_TOKEN is required');
    }

    const meshService = new FungiMeshService();
    await meshService.initialize();
    this.legacyBackend.meshService = meshService;

    this.replicationTimer = setInterval(() => {
      const network = meshService.network;
      if (network) {
        network.maintainReplication().catch((err) => {
          console.error('Mesh storage replication maintenance error:', err.message);
        });
      }
    }, 60000);

    this.capacityTimer = setInterval(() => {
      const network = meshService.network;
      if (network) network.queryStorageCapacity();
    }, 30000);

    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.port, this.host, () => {
        this.server = server;
        console.log(`Mesh Storage Backend listening at http://${this.host}:${this.port}`);
        resolve();
      });
      server.once('error', reject);
    });
  }

  async stop() {
    if (this.replicationTimer) clearInterval(this.replicationTimer);
    if (this.capacityTimer) clearInterval(this.capacityTimer);

    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
      this.server = null;
    }

    if (this.legacyBackend.meshService?.shutdown) {
      await this.legacyBackend.meshService.shutdown();
    }
  }
}

if (require.main === module) {
  const backend = new SecureMeshStorageBackend();
  backend.start().catch((err) => {
    console.error('Failed to start secure Mesh Storage Backend:', err.message);
    process.exit(1);
  });
}

module.exports = {
  SecureMeshStorageBackend,
  DEFAULT_HOST,
};
