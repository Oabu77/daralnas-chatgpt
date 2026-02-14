# FungiMesh Network — Decentralized Computing Infrastructure

## Overview

FungiMesh is an auto-expanding mesh network for decentralized computing within the QuranChain-OS ecosystem. It enables distributed CPU and GPU workload processing across a peer-to-peer network with intelligent task distribution, secure connections, and automatic scaling.

## Features

### 🌐 Auto-Expansion & Growth
- **Dynamic Network Scaling**: Automatically expands when workload exceeds 80% capacity
- **Seed Node Discovery**: Bootstrap network using predefined seed nodes
- **Peer Recruitment**: New nodes join automatically as network grows

### ⚡ Decentralized Computing
- **CPU Workload Distribution**: Parallel processing across multiple CPU cores
- **GPU Acceleration**: Leverage GPU resources for compute-intensive tasks
- **Task Scheduling**: Intelligent assignment based on node capabilities

### 🔒 Security & Reliability
- **TLS 1.3 Encryption**: Secure P2P connections with end-to-end encryption
- **Node Authentication**: Challenge-response authentication system
- **Task Verification**: Cryptographic verification of computation results

### ⚖️ Workload Balancing
- **Resource Monitoring**: Real-time tracking of node capabilities and load
- **Load Distribution**: Automatic redistribution of tasks across available nodes
- **Failure Recovery**: Retry mechanisms and failover handling

## Architecture

### Network Components

1. **FungiMeshNetwork**: Core P2P networking layer
2. **FungiMeshService**: High-level service interface for task management
3. **Blockchain Server**: Integrated HTTP API server

### Node Capabilities

Each node broadcasts its capabilities:
- CPU cores and architecture
- Memory capacity
- GPU availability
- Platform information
- Current workload status

### Task Types

- **CPU Intensive**: Mathematical computations, data processing
- **GPU Intensive**: ML inference, graphics processing, crypto mining
- **QuranChain Specific**:
  - Verse validation and authentication
  - Translation processing
  - Analytics computation
  - Blockchain synchronization

## Getting Started

### Prerequisites

- Node.js 16+
- Linux/Windows/macOS
- Optional: CUDA-compatible GPU for GPU tasks

### Installation

1. **Start the Blockchain Server with FungiMesh**:
   ```bash
   npm run blockchain
   ```

2. **Check Network Status**:
   ```bash
   curl http://localhost:3001/api/mesh/status
   ```

3. **Submit a CPU Task**:
   ```bash
   curl -X POST http://localhost:3001/api/mesh/task/cpu \
     -H "Content-Type: application/json" \
     -d '{"data": {"test": "computation"}, "iterations": 100000}'
   ```

4. **Submit a GPU Task**:
   ```bash
   curl -X POST http://localhost:3001/api/mesh/task/gpu \
     -H "Content-Type: application/json" \
     -d '{"data": {"test": "gpu_work"}, "options": {"complexity": "high"}}'
   ```

### API Endpoints

#### Status & Monitoring
- `GET /api/mesh/status` - Network status and statistics
- `GET /api/mesh/tasks/active` - List active tasks
- `GET /api/mesh/task/:taskId` - Get task result

#### Task Submission
- `POST /api/mesh/task/cpu` - Submit CPU-intensive task
- `POST /api/mesh/task/gpu` - Submit GPU-intensive task
- `POST /api/mesh/task/quranchain` - Submit QuranChain-specific task

#### Network Management
- `POST /api/mesh/redistribute` - Force workload redistribution

## Configuration

### Environment Variables

```bash
# Mesh Network
MESH_PORT=7001                    # FungiMesh P2P port
MAX_MESH_PEERS=100               # Maximum peer connections
MIN_MESH_PEERS=5                 # Minimum peer connections
MESH_SEED_NODES=ws://seed1.example.com:7001,ws://seed2.example.com:7001

# Blockchain
BLOCKCHAIN_PORT=6001             # Blockchain P2P port
MAX_BLOCKCHAIN_PEERS=50          # Maximum blockchain peers

# Security
ENCRYPTION_KEY=your-32-byte-key  # For node authentication
```

### Seed Nodes

Configure initial seed nodes in `src/config/meshConfig.js`:

```javascript
const SEED_NODES = [
  'ws://your-seed-node-1:7001',
  'ws://your-seed-node-2:7001',
  // Add more seed nodes
];
```

## Task Examples

### CPU Task
```javascript
{
  "data": { "input": "large_dataset" },
  "iterations": 1000000,
  "priority": "high"
}
```

### GPU Task
```javascript
{
  "data": { "model": "llm_inference", "input": "text_data" },
  "options": { "batch_size": 32, "precision": "fp16" }
}
```

### QuranChain Task
```javascript
{
  "taskType": "verse_validation",
  "data": {
    "surah": 1,
    "ayah": 1,
    "text": "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
    "expectedHash": "sha256_hash"
  }
}
```

## Monitoring

### Real-time Statistics

The network provides comprehensive monitoring:

```json
{
  "status": "running",
  "nodeId": "fe2d9f36",
  "peers": 5,
  "activeTasks": 12,
  "completedTasks": 1456,
  "workload": 0.67,
  "capabilities": {
    "cpuCores": 12,
    "totalMemory": 16511848448,
    "hasGPU": true
  }
}
```

### Health Checks

- **Network Health**: Peer connectivity and responsiveness
- **Task Completion**: Success rates and failure analysis
- **Resource Utilization**: CPU, memory, and GPU usage
- **Scaling Events**: Network expansion/contraction logs

## Security Model

### Authentication
- **Challenge-Response**: HMAC-based node authentication
- **Session Keys**: Ephemeral encryption keys per connection
- **Certificate Validation**: Optional X.509 certificate support

### Task Security
- **Input Validation**: Sanitize all task inputs
- **Result Verification**: Cryptographic proof of computation
- **Timeout Protection**: Prevent resource exhaustion
- **Sandboxing**: Isolated execution environments

## Scaling Strategy

### Auto-Scaling Triggers
- **High Workload**: >80% capacity triggers expansion
- **Low Utilization**: <30% capacity triggers contraction
- **Peer Availability**: Minimum peer thresholds
- **Task Queue Depth**: Queue size monitoring

### Network Growth
1. **Seed Discovery**: Connect to known seed nodes
2. **Peer Exchange**: Learn about new peers from existing connections
3. **Capacity Planning**: Scale based on task demand patterns
4. **Geographic Distribution**: Optimize for latency and bandwidth

## Troubleshooting

### Common Issues

1. **No Peer Connections**
   - Check seed node configuration
   - Verify firewall settings
   - Ensure correct ports are open

2. **Task Timeouts**
   - Increase timeout values
   - Check node resource availability
   - Monitor network latency

3. **High Failure Rates**
   - Validate task input format
   - Check node capabilities
   - Review error logs

### Logs

Enable detailed logging:
```bash
DEBUG=fungimesh:* npm run blockchain
```

## Contributing

### Development Setup

1. **Clone Repository**:
   ```bash
   git clone https://github.com/your-org/quranchain-os.git
   cd quranchain-os
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run blockchain:dev
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```

### Code Structure

```
src/
├── p2p/
│   ├── FungiMeshNetwork.js    # Core mesh networking
│   └── P2PNetwork.js          # Blockchain P2P
├── services/
│   └── fungiMeshService.js    # Service layer
├── config/
│   └── meshConfig.js          # Configuration
└── blockchain-server.js       # Main server
```

## License

This project is part of QuranChain-OS and follows the same licensing terms.

## Founder

**Omar Mohammad Abunadi™**

*Revolutionizing decentralized computing for Islamic finance and blockchain technology.*</content>
<parameter name="filePath">/home/omar/Desktop/QuranChain-OS/FUNGI_MESH_README.md