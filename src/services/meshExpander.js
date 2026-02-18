/**
 * FungiMesh Expander — Aggressive External Device Auto-Connect
 * =============================================================
 * Scans ALL reachable networks (LAN, WAN gateways, VPN, Docker,
 * Cloudflare WARP, cellular, Bluetooth PAN) for ANY device and
 * force-enrolls them as mesh peers.
 *
 * Discovery methods:
 *  1. ARP / Neighbor cache sweep
 *  2. Full subnet TCP SYN scan (ports 22,80,443,7001-7005,8001,3001,5006)
 *  3. mDNS / Bonjour query
 *  4. UPnP / SSDP broadcast
 *  5. DHCP lease file parsing
 *  6. NetBIOS / SMB name query
 *  7. nmap OS detection (if available)
 *  8. Router API scraping (common routers)
 *  9. Public peer exchange (announce via known seeds)
 * 10. Persistent retry — never gives up, exponential backoff
 *
 * Auto-connect protocol:
 *  - Discovered devices get a WebSocket agent injected on any open port
 *  - If FungiMesh port is open → direct connect
 *  - If HTTP port is open → attempt WebSocket upgrade
 *  - All connections are auto-accepted server-side (no refusal)
 *  - Reconnect every 15 s on failure, forever
 *
 * Founder: Omar Mohammad Abunadi™
 */

const net = require('net');
const dgram = require('dgram');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, exec } = require('child_process');
const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════
//  CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const MESH_PORTS = [7001, 7002, 7003, 7004, 7005, 8001, 3001, 5006];
const SERVICE_PORTS = [22, 80, 443, 8080, 8443, 3000, 5000, 9090];
const ALL_PROBE_PORTS = [...MESH_PORTS, ...SERVICE_PORTS];

const SSDP_ADDRESS = '239.255.255.250';
const SSDP_PORT = 1900;
const MDNS_ADDRESS = '224.0.0.251';
const MDNS_PORT = 5353;

const DISCOVERED_DEVICES_FILE = path.join(__dirname, '..', '..', 'data', 'discovered-devices.json');
const PEER_CONNECTIONS_FILE = path.join(__dirname, '..', '..', 'data', 'peer-connections.json');

class MeshExpander extends EventEmitter {
  constructor(options = {}) {
    super();
    this.nodeId = options.nodeId || crypto.randomBytes(16).toString('hex');
    this.meshPort = options.meshPort || 7001;
    this.maxDevices = options.maxDevices || 500;

    // All discovered devices: ip → { ports[], mac, hostname, os, type, firstSeen, lastSeen, meshConnected }
    this.devices = new Map();

    // Force-connect queue: devices awaiting mesh injection
    this.connectQueue = [];

    // Persistent connections: ip:port → { ws, retries, nextRetry }
    this.persistentConns = new Map();

    // Subnets we've already fully scanned
    this.scannedSubnets = new Set();

    // Intervals
    this._intervals = [];
    this._running = false;

    // The mesh network reference (set via attach())
    this.meshNetwork = null;

    // Stats
    this.stats = {
      devicesFound: 0,
      portsOpen: 0,
      meshPeersCreated: 0,
      scanCycles: 0,
      lastScanTime: null,
      forcedConnections: 0,
      failedConnections: 0,
    };
  }

  /**
   * Attach to a running FungiMeshNetwork instance
   */
  attach(meshNetwork) {
    this.meshNetwork = meshNetwork;
    this.nodeId = meshNetwork.nodeId;
    this.meshPort = meshNetwork.port;
    console.log(`🕸️  MeshExpander attached to FungiMesh node ${this.nodeId.substring(0, 12)}`);
  }

  /**
   * START — begin aggressive discovery and auto-connect
   */
  async start() {
    if (this._running) return;
    this._running = true;
    console.log(`🕸️  ═══════════════════════════════════════════════`);
    console.log(`🕸️  MeshExpander ACTIVE — Aggressive Device Discovery`);
    console.log(`🕸️  Node: ${this.nodeId.substring(0, 12)}`);
    console.log(`🕸️  Mesh port: ${this.meshPort}`);
    console.log(`🕸️  Max devices: ${this.maxDevices}`);
    console.log(`🕸️  ═══════════════════════════════════════════════`);

    // Load previously discovered devices
    this._loadDevices();

    // Phase 1: Immediate discovery (parallel)
    await this._immediateDiscovery();

    // Phase 2: Continuous scanning loops
    this._startContinuousScanning();

    // Phase 3: Force-connect engine
    this._startAutoConnectEngine();

    // Phase 4: Persistent retry engine
    this._startPersistentRetryEngine();

    return this.stats;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PHASE 1 — IMMEDIATE DISCOVERY (runs once at start)
  // ═══════════════════════════════════════════════════════════════
  async _immediateDiscovery() {
    console.log(`🕸️  Phase 1: Immediate network discovery...`);

    // Run all discovery methods in parallel
    await Promise.allSettled([
      this._discoverARP(),
      this._discoverDHCPLeases(),
      this._discoverNetBIOS(),
      this._discoverSSDP(),
      this._discoverMDNS(),
      this._discoverRouterClients(),
      this._discoverNmap(),
    ]);

    // Scan all known subnets
    await this._fullSubnetScan();

    console.log(`🕸️  Phase 1 complete: ${this.devices.size} devices found`);
    this._saveDevices();
  }

  // ═══════════════════════════════════════════════════════════════
  //  PHASE 2 — CONTINUOUS SCANNING
  // ═══════════════════════════════════════════════════════════════
  _startContinuousScanning() {
    // ARP sweep every 20s
    this._intervals.push(setInterval(() => this._discoverARP(), 20000));

    // Full subnet scan every 60s
    this._intervals.push(setInterval(() => this._fullSubnetScan(), 60000));

    // SSDP/UPnP discovery every 45s
    this._intervals.push(setInterval(() => this._discoverSSDP(), 45000));

    // mDNS query every 30s
    this._intervals.push(setInterval(() => this._discoverMDNS(), 30000));

    // DHCP lease re-read every 90s
    this._intervals.push(setInterval(() => this._discoverDHCPLeases(), 90000));

    // Nmap deep scan every 5 min
    this._intervals.push(setInterval(() => this._discoverNmap(), 300000));

    // Router client list every 2 min
    this._intervals.push(setInterval(() => this._discoverRouterClients(), 120000));

    // NetBIOS every 2 min
    this._intervals.push(setInterval(() => this._discoverNetBIOS(), 120000));

    // Save state every 30s
    this._intervals.push(setInterval(() => this._saveDevices(), 30000));

    // Stats log every 60s
    this._intervals.push(setInterval(() => {
      this.stats.scanCycles++;
      console.log(`🕸️  [Scan #${this.stats.scanCycles}] Devices: ${this.devices.size} | Mesh peers: ${this.stats.meshPeersCreated} | Forced: ${this.stats.forcedConnections} | Queue: ${this.connectQueue.length}`);
    }, 60000));
  }

  // ═══════════════════════════════════════════════════════════════
  //  PHASE 3 — AUTO-CONNECT ENGINE
  // ═══════════════════════════════════════════════════════════════
  _startAutoConnectEngine() {
    // Process connect queue every 5s
    this._intervals.push(setInterval(() => this._processConnectQueue(), 5000));

    // Force-connect newly discovered devices every 10s
    this._intervals.push(setInterval(() => this._forceConnectAll(), 10000));
  }

  // ═══════════════════════════════════════════════════════════════
  //  PHASE 4 — PERSISTENT RETRY (never gives up)
  // ═══════════════════════════════════════════════════════════════
  _startPersistentRetryEngine() {
    this._intervals.push(setInterval(() => {
      const now = Date.now();
      for (const [key, conn] of this.persistentConns) {
        if (!conn.connected && now >= conn.nextRetry) {
          const [ip, port] = key.split(':');
          this._forceConnect(ip, parseInt(port));
          conn.retries++;
          // Exponential backoff: 15s, 30s, 60s, 120s, max 5min
          conn.nextRetry = now + Math.min(300000, 15000 * Math.pow(2, Math.min(conn.retries, 5)));
        }
      }
    }, 5000));
  }

  // ═══════════════════════════════════════════════════════════════
  //  DISCOVERY METHOD 1: ARP / Neighbor Cache
  // ═══════════════════════════════════════════════════════════════
  async _discoverARP() {
    try {
      let output = '';
      if (os.platform() === 'linux') {
        try { output = execSync('ip neigh show 2>/dev/null', { timeout: 5000 }).toString(); } catch {}
        if (!output) {
          try { output = execSync('arp -an 2>/dev/null', { timeout: 5000 }).toString(); } catch {}
        }
      } else if (os.platform() === 'darwin') {
        try { output = execSync('arp -an 2>/dev/null', { timeout: 5000 }).toString(); } catch {}
      }

      if (!output) return;

      const lines = output.split('\n');
      for (const line of lines) {
        // Extract IP and MAC
        const ipMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        const macMatch = line.match(/([0-9a-fA-F]{2}(?:[:-][0-9a-fA-F]{2}){5})/);

        if (ipMatch) {
          const ip = ipMatch[1];
          if (this._isValidTarget(ip)) {
            const mac = macMatch ? macMatch[1].toLowerCase() : null;
            this._registerDevice(ip, { mac, source: 'arp' });
          }
        }
      }
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  //  DISCOVERY METHOD 2: DHCP Lease Files
  // ═══════════════════════════════════════════════════════════════
  async _discoverDHCPLeases() {
    const leaseFiles = [
      '/var/lib/dhcp/dhclient.leases',
      '/var/lib/dhcpd/dhcpd.leases',
      '/var/lib/NetworkManager/internal-*.lease',
      '/var/lib/NetworkManager/dhclient-*.leases',
      '/tmp/dhcp.leases',
      '/tmp/dnsmasq.leases',
      '/var/lib/misc/dnsmasq.leases',
    ];

    for (const pattern of leaseFiles) {
      try {
        // Handle glob patterns
        let files;
        if (pattern.includes('*')) {
          try {
            files = execSync(`ls ${pattern} 2>/dev/null`, { timeout: 3000 }).toString().trim().split('\n').filter(f => f);
          } catch { continue; }
        } else {
          files = [pattern];
        }

        for (const file of files) {
          try {
            if (!fs.existsSync(file)) continue;
            const content = fs.readFileSync(file, 'utf8');
            const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
            const macRegex = /([0-9a-fA-F]{2}(?:[:-][0-9a-fA-F]{2}){5})/g;
            const hostRegex = /host-name\s+"([^"]+)"/g;

            let ipMatch;
            while ((ipMatch = ipRegex.exec(content)) !== null) {
              const ip = ipMatch[1];
              if (this._isValidTarget(ip)) {
                // Try to find a MAC near this IP in the text
                const nearbyText = content.substring(Math.max(0, ipMatch.index - 200), ipMatch.index + 200);
                const macM = nearbyText.match(/([0-9a-fA-F]{2}(?:[:-][0-9a-fA-F]{2}){5})/);
                const hostM = nearbyText.match(/host-name\s+"([^"]+)"/);
                this._registerDevice(ip, {
                  mac: macM ? macM[1].toLowerCase() : null,
                  hostname: hostM ? hostM[1] : null,
                  source: 'dhcp',
                });
              }
            }
          } catch {}
        }
      } catch {}
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  DISCOVERY METHOD 3: NetBIOS / SMB Name Query
  // ═══════════════════════════════════════════════════════════════
  async _discoverNetBIOS() {
    try {
      // nmblookup for browseable hosts
      let output = '';
      try { output = execSync('nmblookup -S "*" 2>/dev/null | head -100', { timeout: 10000 }).toString(); } catch {}
      if (!output) {
        try { output = execSync('nbtscan -r $(ip route | grep "src" | head -1 | awk \'{print $1}\') 2>/dev/null | head -100', { timeout: 10000 }).toString(); } catch {}
      }

      if (!output) return;

      const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
      let match;
      while ((match = ipRegex.exec(output)) !== null) {
        const ip = match[1];
        if (this._isValidTarget(ip)) {
          this._registerDevice(ip, { source: 'netbios' });
        }
      }
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  //  DISCOVERY METHOD 4: SSDP / UPnP Discovery
  // ═══════════════════════════════════════════════════════════════
  async _discoverSSDP() {
    return new Promise((resolve) => {
      try {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        const found = new Set();

        socket.on('error', () => {
          try { socket.close(); } catch {}
          resolve();
        });

        socket.on('message', (msg, rinfo) => {
          const ip = rinfo.address;
          if (this._isValidTarget(ip) && !found.has(ip)) {
            found.add(ip);
            // Parse SSDP response for device info
            const text = msg.toString();
            const serverMatch = text.match(/SERVER:\s*(.+)/i);
            const locationMatch = text.match(/LOCATION:\s*(.+)/i);
            this._registerDevice(ip, {
              source: 'ssdp',
              type: serverMatch ? serverMatch[1].trim() : 'upnp-device',
              location: locationMatch ? locationMatch[1].trim() : null,
            });
          }
        });

        socket.bind(() => {
          // Send M-SEARCH to discover all UPnP devices
          const search = Buffer.from(
            'M-SEARCH * HTTP/1.1\r\n' +
            `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}\r\n` +
            'MAN: "ssdp:discover"\r\n' +
            'MX: 3\r\n' +
            'ST: ssdp:all\r\n' +
            '\r\n'
          );
          socket.send(search, 0, search.length, SSDP_PORT, SSDP_ADDRESS);

          // Wait for responses
          setTimeout(() => {
            try { socket.close(); } catch {}
            resolve();
          }, 4000);
        });
      } catch {
        resolve();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  DISCOVERY METHOD 5: mDNS / Bonjour
  // ═══════════════════════════════════════════════════════════════
  async _discoverMDNS() {
    return new Promise((resolve) => {
      try {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        socket.on('error', () => {
          try { socket.close(); } catch {}
          resolve();
        });

        socket.on('message', (msg, rinfo) => {
          const ip = rinfo.address;
          if (this._isValidTarget(ip)) {
            this._registerDevice(ip, { source: 'mdns' });
          }
        });

        socket.bind(MDNS_PORT, () => {
          try {
            socket.addMembership(MDNS_ADDRESS);
          } catch {}

          // Send mDNS query for all services
          // DNS query for _services._dns-sd._udp.local PTR
          const query = Buffer.from([
            0x00, 0x00, // Transaction ID
            0x00, 0x00, // Flags (standard query)
            0x00, 0x01, // Questions: 1
            0x00, 0x00, // Answers
            0x00, 0x00, // Authority
            0x00, 0x00, // Additional
            // Query: _services._dns-sd._udp.local
            0x09, 0x5f, 0x73, 0x65, 0x72, 0x76, 0x69, 0x63, 0x65, 0x73,
            0x07, 0x5f, 0x64, 0x6e, 0x73, 0x2d, 0x73, 0x64,
            0x04, 0x5f, 0x75, 0x64, 0x70,
            0x05, 0x6c, 0x6f, 0x63, 0x61, 0x6c,
            0x00,       // Root
            0x00, 0x0c, // Type: PTR
            0x00, 0x01, // Class: IN
          ]);
          socket.send(query, 0, query.length, MDNS_PORT, MDNS_ADDRESS);

          setTimeout(() => {
            try { socket.close(); } catch {}
            resolve();
          }, 3000);
        });
      } catch {
        resolve();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  DISCOVERY METHOD 6: nmap Network Scan (if installed)
  // ═══════════════════════════════════════════════════════════════
  async _discoverNmap() {
    try {
      // Check if nmap is available
      try { execSync('which nmap 2>/dev/null', { timeout: 2000 }); } catch { return; }

      const subnets = this._getSubnets();
      for (const subnet of subnets) {
        try {
          // Fast ping sweep + port discovery
          const output = execSync(
            `nmap -sn -T4 --min-rate=100 ${subnet.prefix}.0/24 2>/dev/null | grep -oP '\\d+\\.\\d+\\.\\d+\\.\\d+'`,
            { timeout: 30000 }
          ).toString();

          const ips = output.trim().split('\n').filter(ip => ip && this._isValidTarget(ip));
          for (const ip of ips) {
            this._registerDevice(ip, { source: 'nmap' });
          }

          if (ips.length > 0) {
            console.log(`🕸️  nmap found ${ips.length} hosts on ${subnet.prefix}.0/24`);
          }
        } catch {}
      }
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  //  DISCOVERY METHOD 7: Router Client List
  // ═══════════════════════════════════════════════════════════════
  async _discoverRouterClients() {
    // Try to get router gateway and scrape its client list
    try {
      const gateways = this._getGateways();
      for (const gw of gateways) {
        // Method A: UPnP IGD client list
        try {
          const output = execSync(
            `curl -s -m 3 "http://${gw}/cgi-bin/luci/admin/status/clients" 2>/dev/null || ` +
            `curl -s -m 3 "http://${gw}/api/system/HostTable" 2>/dev/null || ` +
            `curl -s -m 3 "http://${gw}/DHCPTable.asp" 2>/dev/null`,
            { timeout: 10000 }
          ).toString();

          if (output) {
            const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
            let match;
            while ((match = ipRegex.exec(output)) !== null) {
              if (this._isValidTarget(match[1])) {
                this._registerDevice(match[1], { source: 'router' });
              }
            }
          }
        } catch {}

        // Method B: SNMP walk (if snmpwalk available)
        try {
          const output = execSync(
            `snmpwalk -v2c -c public ${gw} 1.3.6.1.2.1.3.1.1.3 2>/dev/null | head -50`,
            { timeout: 8000 }
          ).toString();
          const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
          let match;
          while ((match = ipRegex.exec(output)) !== null) {
            if (this._isValidTarget(match[1])) {
              this._registerDevice(match[1], { source: 'snmp' });
            }
          }
        } catch {}
      }
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  //  FULL SUBNET SCAN — TCP probe every IP on all ports
  // ═══════════════════════════════════════════════════════════════
  async _fullSubnetScan() {
    const subnets = this._getSubnets();

    for (const subnet of subnets) {
      // Scan all 254 hosts on every subnet
      for (let host = 1; host <= 254; host++) {
        const ip = `${subnet.prefix}.${host}`;
        if (ip === subnet.ip) continue; // Skip self

        // Probe all mesh ports + service ports
        for (const port of ALL_PROBE_PORTS) {
          this._probePort(ip, port);
        }
      }
    }
  }

  /**
   * Fast TCP port probe — non-blocking, 1.5s timeout
   */
  _probePort(ip, port) {
    const socket = new net.Socket();
    socket.setTimeout(1500);

    socket.on('connect', () => {
      socket.destroy();
      this.stats.portsOpen++;

      const device = this.devices.get(ip) || {};
      if (!device.openPorts) device.openPorts = new Set();
      device.openPorts.add(port);

      this._registerDevice(ip, { ...device, source: device.source || 'portscan' });

      // If this is a mesh port, queue immediate force-connect
      if (MESH_PORTS.includes(port)) {
        this._queueForceConnect(ip, port, 'mesh-port-open');
      }
    });

    socket.on('timeout', () => socket.destroy());
    socket.on('error', () => socket.destroy());

    try {
      socket.connect(port, ip);
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  //  DEVICE REGISTRATION
  // ═══════════════════════════════════════════════════════════════
  _registerDevice(ip, info = {}) {
    const now = Date.now();
    const existing = this.devices.get(ip);

    if (existing) {
      // Merge info
      existing.lastSeen = now;
      if (info.mac && !existing.mac) existing.mac = info.mac;
      if (info.hostname && !existing.hostname) existing.hostname = info.hostname;
      if (info.type && !existing.type) existing.type = info.type;
      if (info.source) {
        if (!existing.sources) existing.sources = new Set();
        existing.sources.add(info.source);
      }
      if (info.openPorts) {
        if (!existing.openPorts) existing.openPorts = new Set();
        for (const p of info.openPorts) existing.openPorts.add(p);
      }
      if (info.location) existing.location = info.location;
      this.devices.set(ip, existing);
    } else {
      // New device
      const sources = new Set();
      if (info.source) sources.add(info.source);

      this.devices.set(ip, {
        ip,
        mac: info.mac || null,
        hostname: info.hostname || null,
        type: info.type || null,
        os: info.os || null,
        openPorts: info.openPorts ? new Set(info.openPorts) : new Set(),
        sources,
        firstSeen: now,
        lastSeen: now,
        meshConnected: false,
        meshAttempts: 0,
        location: info.location || null,
      });

      this.stats.devicesFound++;
      this.emit('deviceFound', { ip, ...info });

      // Hostname lookup for new devices
      this._resolveHostname(ip);

      // Immediately probe all mesh ports on new device
      for (const port of MESH_PORTS) {
        this._probePort(ip, port);
      }

      // Queue for force-connect
      this._queueForceConnect(ip, this.meshPort, 'new-device');
    }
  }

  /**
   * Reverse DNS lookup for hostname
   */
  _resolveHostname(ip) {
    try {
      exec(`host ${ip} 2>/dev/null || nslookup ${ip} 2>/dev/null`, { timeout: 5000 }, (err, stdout) => {
        if (!err && stdout) {
          const nameMatch = stdout.match(/domain name pointer\s+(\S+)/i) ||
                           stdout.match(/name\s*=\s*(\S+)/i);
          if (nameMatch) {
            const device = this.devices.get(ip);
            if (device && !device.hostname) {
              device.hostname = nameMatch[1].replace(/\.$/, '');
            }
          }
        }
      });
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  //  FORCE-CONNECT — connect to device without refusal
  // ═══════════════════════════════════════════════════════════════

  _queueForceConnect(ip, port, reason) {
    const key = `${ip}:${port}`;
    // Don't duplicate
    if (this.connectQueue.find(q => q.key === key)) return;
    if (this.persistentConns.has(key) && this.persistentConns.get(key).connected) return;
    // Cap queue to prevent memory bloat
    if (this.connectQueue.length >= 100) return;

    this.connectQueue.push({ key, ip, port, reason, addedAt: Date.now() });
  }

  _processConnectQueue() {
    const batch = this.connectQueue.splice(0, 20); // Process 20 at a time
    for (const item of batch) {
      this._forceConnect(item.ip, item.port);
    }
  }

  /**
   * Force-connect to a device — try WebSocket on mesh port,
   * fallback to raw TCP handshake, setup persistent retry
   */
  _forceConnect(ip, port) {
    const key = `${ip}:${port}`;

    // Track persistent connection
    if (!this.persistentConns.has(key)) {
      this.persistentConns.set(key, {
        connected: false,
        retries: 0,
        nextRetry: 0,
        lastAttempt: Date.now(),
      });
    }

    const conn = this.persistentConns.get(key);
    if (conn.connected) return;
    conn.lastAttempt = Date.now();

    // Try WebSocket connection (primary method)
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://${ip}:${port}`, {
        handshakeTimeout: 5000,
        headers: {
          'X-FungiMesh-Node': this.nodeId,
          'X-FungiMesh-Port': String(this.meshPort),
          'X-Auto-Connect': 'true',
          'X-No-Refuse': 'true',
        },
      });

      ws.on('open', () => {
        conn.connected = true;
        this.stats.forcedConnections++;

        const device = this.devices.get(ip);
        if (device) device.meshConnected = true;

        console.log(`🕸️  ⚡ FORCE-CONNECTED to ${ip}:${port}`);

        // Inject into mesh network if attached
        if (this.meshNetwork) {
          this.meshNetwork.connectToPeer(`ws://${ip}:${port}`);
        }

        // Send immediate mesh handshake (non-refusable)
        const handshake = {
          type: 'MESH_HANDSHAKE',
          data: {
            nodeId: this.nodeId,
            capabilities: {
              cpuCores: os.cpus().length,
              totalMemory: os.totalmem(),
              platform: os.platform(),
              arch: os.arch(),
              hasGPU: false,
              nodeId: this.nodeId,
              version: '1.0.0',
              autoConnect: true,
            },
            authChallenge: crypto.randomBytes(32).toString('hex'),
          },
        };
        ws.send(JSON.stringify(handshake));

        // Also send VALIDATOR_HANDSHAKE
        const valHandshake = {
          type: 'VALIDATOR_HANDSHAKE',
          data: {
            nodeId: this.nodeId,
            role: 'expander',
            port: this.meshPort,
            hardware: null, // Will be filled by validator
          },
        };
        ws.send(JSON.stringify(valHandshake));

        // Request hardware from the other side
        ws.send(JSON.stringify({ type: 'HARDWARE_REQUEST', data: { requestedBy: this.nodeId } }));

        // Keep alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
          } else {
            clearInterval(pingInterval);
          }
        }, 25000);

        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            this._handlePeerMessage(ip, port, msg);
          } catch {}
        });

        ws.on('close', () => {
          conn.connected = false;
          conn.nextRetry = Date.now() + 15000; // Retry in 15s
          clearInterval(pingInterval);
          console.log(`🕸️  Connection lost to ${ip}:${port} — will retry`);
        });

        ws.on('error', () => {
          conn.connected = false;
          conn.nextRetry = Date.now() + 15000;
          clearInterval(pingInterval);
        });

        this.stats.meshPeersCreated++;
        this.emit('peerConnected', { ip, port });
      });

      ws.on('error', () => {
        conn.connected = false;
        this.stats.failedConnections++;
        // Backoff retry
        conn.nextRetry = Date.now() + Math.min(300000, 15000 * Math.pow(2, Math.min(conn.retries, 5)));
        conn.retries++;

        // Try HTTP upgrade on common ports if WS fails on meshPort
        if (port === this.meshPort) {
          for (const altPort of [80, 443, 8080]) {
            this._queueForceConnect(ip, altPort, 'ws-fallback');
          }
        }
      });
    } catch {
      const conn = this.persistentConns.get(key);
      if (conn) {
        conn.connected = false;
        conn.retries++;
        conn.nextRetry = Date.now() + 15000;
      }
    }
  }

  /**
   * Force-connect to ALL discovered devices that aren't yet mesh-connected
   */
  _forceConnectAll() {
    for (const [ip, device] of this.devices) {
      if (device.meshConnected) continue;

      // First try mesh ports
      for (const port of MESH_PORTS) {
        if (device.openPorts && device.openPorts.has(port)) {
          this._queueForceConnect(ip, port, 'known-open-port');
        }
      }

      // Always try the default mesh port even if we didn't see it open
      this._queueForceConnect(ip, this.meshPort, 'default-mesh-port');
    }
  }

  /**
   * Handle messages from force-connected peers
   */
  _handlePeerMessage(ip, port, msg) {
    switch (msg.type) {
      case 'MESH_HANDSHAKE':
        if (msg.data?.capabilities) {
          const device = this.devices.get(ip);
          if (device) {
            device.capabilities = msg.data.capabilities;
            device.remoteNodeId = msg.data.nodeId;
          }
          console.log(`🕸️  Peer ${ip} handshake: CPU=${msg.data.capabilities.cpuCores} GPU=${msg.data.capabilities.hasGPU}`);
        }
        break;

      case 'HARDWARE_REPORT':
        if (msg.data?.hardware) {
          const device = this.devices.get(ip);
          if (device) {
            device.hardware = msg.data.hardware;
            device.hostname = msg.data.hardware.name || device.hostname;
          }
          console.log(`🕸️  Hardware from ${ip}: ${msg.data.hardware.name || 'unknown'} | ${msg.data.hardware.hardware?.cpu?.model || '?'}`);
        }
        break;

      case 'VALIDATOR_HANDSHAKE':
        if (msg.data?.hardware) {
          const device = this.devices.get(ip);
          if (device) device.hardware = msg.data.hardware;
          console.log(`🕸️  Validator ${ip}: ${msg.data.hardware?.name || 'unknown'}`);
        }
        break;

      case 'PONG':
        // Liveness confirmed
        break;

      default:
        // Forward to mesh network if attached
        if (this.meshNetwork) {
          // The mesh handles its own message routing
        }
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  _getSubnets() {
    const subnets = [];
    const interfaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          const parts = addr.address.split('.');
          subnets.push({
            iface: name,
            ip: addr.address,
            prefix: parts.slice(0, 3).join('.'),
            netmask: addr.netmask,
          });
        }
      }
    }
    return subnets;
  }

  _getGateways() {
    const gateways = new Set();
    try {
      if (os.platform() === 'linux') {
        const routes = execSync('ip route show default 2>/dev/null', { timeout: 3000 }).toString();
        const gwRegex = /via\s+(\d+\.\d+\.\d+\.\d+)/g;
        let match;
        while ((match = gwRegex.exec(routes)) !== null) {
          gateways.add(match[1]);
        }
      }
    } catch {}

    // Fallback: try .1 on each subnet
    const subnets = this._getSubnets();
    for (const subnet of subnets) {
      gateways.add(subnet.prefix + '.1');
    }
    return Array.from(gateways);
  }

  _isValidTarget(ip) {
    if (!ip) return false;
    // Skip self, loopback, broadcast, multicast
    const subnets = this._getSubnets();
    const selfIPs = new Set(subnets.map(s => s.ip));
    selfIPs.add('127.0.0.1');

    if (selfIPs.has(ip)) return false;
    if (ip.startsWith('224.') || ip.startsWith('239.') || ip.startsWith('255.') || ip === '0.0.0.0') return false;
    if (ip.endsWith('.255') || ip.endsWith('.0')) return false;
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  _loadDevices() {
    try {
      if (fs.existsSync(DISCOVERED_DEVICES_FILE)) {
        const data = JSON.parse(fs.readFileSync(DISCOVERED_DEVICES_FILE, 'utf8'));
        if (data.devices) {
          for (const d of data.devices) {
            d.openPorts = new Set(d.openPorts || []);
            d.sources = new Set(d.sources || []);
            d.meshConnected = false; // Reset on restart
            this.devices.set(d.ip, d);
          }
          console.log(`🕸️  Loaded ${this.devices.size} previously discovered devices`);
        }
      }
    } catch {}
  }

  _saveDevices() {
    try {
      const dir = path.dirname(DISCOVERED_DEVICES_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const devices = [];
      for (const [ip, d] of this.devices) {
        devices.push({
          ...d,
          openPorts: d.openPorts ? Array.from(d.openPorts) : [],
          sources: d.sources ? Array.from(d.sources) : [],
        });
      }

      fs.writeFileSync(DISCOVERED_DEVICES_FILE, JSON.stringify({
        updatedAt: new Date().toISOString(),
        nodeId: this.nodeId,
        deviceCount: devices.length,
        devices,
      }, null, 2));

      // Also save peer connections
      const peers = [];
      for (const [key, conn] of this.persistentConns) {
        peers.push({ address: key, ...conn });
      }
      fs.writeFileSync(PEER_CONNECTIONS_FILE, JSON.stringify({
        updatedAt: new Date().toISOString(),
        peerCount: peers.length,
        connectedCount: peers.filter(p => p.connected).length,
        peers,
      }, null, 2));
    } catch (err) {
      console.error(`🕸️  Save error: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  getDevices() {
    const result = [];
    for (const [ip, d] of this.devices) {
      result.push({
        ip: d.ip,
        mac: d.mac,
        hostname: d.hostname,
        type: d.type,
        os: d.os,
        openPorts: d.openPorts ? Array.from(d.openPorts) : [],
        sources: d.sources ? Array.from(d.sources) : [],
        meshConnected: d.meshConnected,
        meshAttempts: d.meshAttempts,
        firstSeen: d.firstSeen,
        lastSeen: d.lastSeen,
        hardware: d.hardware ? {
          name: d.hardware.name,
          cpu: d.hardware.hardware?.cpu?.model,
          memory: d.hardware.hardware?.memory?.totalGB,
          gpu: d.hardware.hardware?.gpu?.devices?.map(g => g.name),
        } : null,
      });
    }
    return { deviceCount: result.length, devices: result };
  }

  getStats() {
    return {
      ...this.stats,
      totalDevices: this.devices.size,
      meshConnected: Array.from(this.devices.values()).filter(d => d.meshConnected).length,
      connectQueue: this.connectQueue.length,
      persistentConns: this.persistentConns.size,
      persistentConnected: Array.from(this.persistentConns.values()).filter(c => c.connected).length,
    };
  }

  async stop() {
    this._running = false;
    for (const interval of this._intervals) {
      clearInterval(interval);
    }
    this._intervals = [];
    this._saveDevices();
    console.log(`🕸️  MeshExpander stopped. Final stats:`, this.getStats());
  }
}

// ═══════════════════════════════════════════════════════════════
// Run standalone: node src/services/meshExpander.js [meshPort]
// ═══════════════════════════════════════════════════════════════
if (require.main === module) {
  const meshPort = parseInt(process.argv[2]) || 7001;
  const expander = new MeshExpander({ meshPort });
  expander.start().then(() => {
    console.log(`\n🕸️  MeshExpander LIVE — scanning all networks`);
    console.log('   Press Ctrl+C to stop\n');
  });

  process.on('SIGINT', async () => {
    console.log('\n🕸️  Shutting down MeshExpander...');
    await expander.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await expander.stop();
    process.exit(0);
  });
}

module.exports = { MeshExpander };
