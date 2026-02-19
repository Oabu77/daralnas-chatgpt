<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

# FungiMesh Gaming Server Auto-Healing System

## Overview

The FungiMesh Gaming Server Auto-Healing System integrates gaming infrastructure and cloud resources to provide automatic network healing and backup capabilities for the decentralized FungiMesh network.

## Architecture

### Components

1. **FungiMesh Network** - Core P2P network with auto-healing capabilities
2. **Gaming Servers** - Specialized servers providing backup nodes and healing coordination
3. **Backup Nodes** - Virtual nodes activated during network healing
4. **Health Monitoring** - Continuous network health assessment
5. **Failover System** - Automatic failover when network health drops

### Message Types

#### Auto-Healing Messages
- `NETWORK_HEAL` - Initiate network healing
- `HEALING_REQUEST` - Request healing support
- `HEALING_RESPONSE` - Provide healing support
- `BACKUP_NODE_ACTIVATE` - Activate backup nodes
- `FAILOVER_INITIATE` - Initiate failover

#### Gaming Server Messages
- `GAMING_SERVER_CONNECT` - Register with gaming server
- `GAMING_SERVER_HEARTBEAT` - Gaming server heartbeat
- `GAMING_SERVER_BACKUP` - Gaming server backup offer

## Configuration

### Mesh Configuration (`src/config/meshConfig.js`)

```javascript
// Gaming server endpoints
const GAMING_SERVER_ENDPOINTS = [
  'wss://gaming1.darcloud.host:7001',
  'wss://gaming2.darcloud.host:7001',
  'wss://gamechain.darcloud.host:7001',
  'wss://web3gaming.darcloud.host:7001',
  'ws://localhost:7002',  // Local gaming server 1
  'ws://localhost:7003',  // Local gaming server 2
];

// Auto-healing configuration
const HEALING_CONFIG = {
  enabled: true,
  healthCheckInterval: 30000,     // 30 seconds
  criticalHealthThreshold: 50,    // Trigger healing when health < 50%
  healingTimeout: 300000,         // 5 minutes healing timeout
  maxBackupNodes: 5,              // Maximum backup nodes to activate
  failoverTimeout: 180000,        // 3 minutes failover timeout
};
```

### Environment Variables

```bash
# Enable/disable auto-healing
MESH_HEALING_ENABLED=true

# Custom gaming server endpoints
MESH_GAMING_SERVERS=wss://custom-gaming.example.com:7001,ws://localhost:7002
```

## Usage

### Starting Gaming Servers

```bash
# Start 2 gaming servers (default)
./start-gaming-servers.sh

# Start 4 gaming servers
./start-gaming-servers.sh 4
```

### Testing Auto-Healing

```bash
# Run comprehensive healing test
./test-gaming-healing.sh
```

### Stopping Gaming Servers

```bash
# Stop all gaming servers
./stop-gaming-servers.sh
```

### Monitoring

```bash
# Monitor gaming server logs
tail -f logs/gaming-server-*.log

# Check mesh network status
curl http://localhost:3001/mesh/status

# View healing statistics
curl http://localhost:3001/mesh/stats | jq '.healingEvents'
```

## How Auto-Healing Works

### 1. Health Monitoring
- Network health is continuously monitored every 30 seconds
- Health is calculated as: `(healthy_peers / total_peers) * 100`
- Healthy peers are those that responded within 60 seconds

### 2. Healing Trigger
- When network health drops below 50%, auto-healing is triggered
- Healing request is broadcast to all connected gaming servers
- Backup nodes are activated to restore network connectivity

### 3. Healing Process
- Gaming servers provide backup peer addresses
- Failed connections are re-established through backup routes
- Network load is redistributed across healthy nodes
- Healing continues until network health reaches 75% or timeout

### 4. Failover Protection
- If primary healing fails, failover mode is activated
- All network operations are temporarily suspended
- Backup infrastructure takes over critical functions
- Normal operations resume after failover completes

## Gaming Server Features

### Backup Node Provisioning
- Gaming servers maintain pools of virtual backup nodes
- Backup nodes are activated only during healing events
- Each backup node provides 8 CPU cores and 16GB RAM
- Gaming-optimized hardware with GPU acceleration

### Healing Coordination
- Gaming servers coordinate healing across multiple regions
- Support for cross-region backup node deployment
- Intelligent load balancing during healing operations
- Real-time healing progress monitoring

### Cloud Integration
- Integration with gaming cloud providers
- Dynamic resource allocation based on healing needs
- Cost-optimized backup node activation
- Geographic distribution for global coverage

## API Endpoints

### Mesh Status
```bash
GET /mesh/status
```
Returns current network health and healing status.

### Healing Statistics
```bash
GET /mesh/stats
```
Returns detailed healing statistics including:
- Network health percentage
- Active backup nodes
- Healing events history
- Gaming server connections

### Force Healing Test
```bash
POST /mesh/heal
```
Manually trigger network healing for testing.

## Troubleshooting

### Common Issues

1. **Gaming servers not connecting**
   - Check firewall settings for WebSocket ports (7001+)
   - Verify gaming server endpoints in configuration
   - Ensure gaming servers are running and accessible

2. **Healing not triggering**
   - Verify `MESH_HEALING_ENABLED=true` in environment
   - Check network health calculation in logs
   - Ensure sufficient peer connections for health monitoring

3. **Backup nodes not activating**
   - Check gaming server connectivity
   - Verify backup node pool availability
   - Monitor gaming server logs for activation errors

4. **High healing frequency**
   - Adjust `criticalHealthThreshold` in configuration
   - Increase `healthCheckInterval` to reduce monitoring frequency
   - Check for network instability causing false triggers

### Debug Commands

```bash
# Enable debug logging
DEBUG=fungimesh:* npm run blockchain

# Monitor healing events
tail -f logs/blockchain-server.log | grep "🩹"

# Check gaming server connectivity
curl -s http://localhost:7002/health

# View network topology
curl http://localhost:3001/mesh/peers
```

## Performance Considerations

### Resource Usage
- Health monitoring: ~1% CPU, minimal memory
- Healing operations: 5-15% CPU during active healing
- Gaming server connections: ~50KB memory per connection
- Backup node activation: ~100MB memory per node

### Scaling Guidelines
- 1 gaming server per 100 mesh nodes recommended
- Maximum 10 gaming servers per region
- Backup node pool: 5-10 nodes per gaming server
- Healing timeout: 5 minutes maximum

### Network Impact
- Healing traffic: Minimal during normal operation
- Peak healing bandwidth: ~10Mbps per gaming server
- WebSocket connections: Persistent, low overhead
- Geographic distribution reduces latency

## Security

### Authentication
- Gaming servers authenticate mesh nodes using node IDs
- Backup nodes require valid healing requests
- All WebSocket connections use secure protocols (WSS)

### Access Control
- Healing operations restricted to authorized nodes
- Backup node activation requires network health validation
- Geographic restrictions for cross-region healing

### Monitoring
- All healing events logged with timestamps
- Failed healing attempts tracked and reported
- Suspicious activity monitoring and alerts

## Integration Examples

### Custom Gaming Server

```javascript
const { GamingServer } = require('./src/services/gamingServer');

const customServer = new GamingServer(7005, 'custom-gaming');
customServer.start();

// Add custom backup nodes
customServer.addBackupNode({
  id: 'custom-backup-1',
  address: 'ws://custom-backup.example.com:7001',
  capabilities: { cpuCores: 16, totalMemory: 32GB }
});
```

### Custom Healing Logic

```javascript
// Extend FungiMeshNetwork with custom healing
class CustomFungiMesh extends FungiMeshNetwork {
  _customHealingStrategy() {
    // Implement custom healing logic
    if (this.networkHealth < 25) {
      this._activateEmergencyBackups();
    }
  }
}
```

## Future Enhancements

### Planned Features
- **AI-Powered Healing**: Machine learning for predictive healing
- **Multi-Cloud Support**: Integration with multiple gaming cloud providers
- **Advanced Metrics**: Detailed healing performance analytics
- **Automated Scaling**: Dynamic backup node pool sizing
- **Cross-Platform Healing**: Support for mobile and IoT devices

### Research Areas
- **Quantum-Resistant Healing**: Post-quantum cryptography for healing protocols
- **Edge Computing Integration**: Healing at the network edge
- **Blockchain-Based Healing**: Decentralized healing coordination
- **5G Network Slicing**: Dedicated healing network slices

## Support

### Documentation
- [FungiMesh Network Guide](./FUNGI_MESH_README.md)
- [API Reference](./docs/api.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)

### Community
- GitHub Issues: Report bugs and request features
- Discord: Real-time support and discussions
- Documentation Wiki: Comprehensive guides and tutorials

## License

This gaming server auto-healing system is part of the QuranChain-OS project.

**Founder: Omar Mohammad Abunadi™**