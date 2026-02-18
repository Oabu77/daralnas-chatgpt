#!/usr/bin/env node
// Backward-compatible entrypoint for gaming server

const { GamingServer } = require('./services/gamingServer');

if (require.main === module) {
  const port = parseInt(process.argv[2]) || 7002;
  const serverName = process.argv[3] || 'gaming1';

  const gamingServer = new GamingServer(port, serverName);
  gamingServer.start();

  process.on('SIGINT', () => {
    console.log('\n🎮 Shutting down gaming server...');
    gamingServer.stop();
    process.exit(0);
  });
}

module.exports = { GamingServer };
