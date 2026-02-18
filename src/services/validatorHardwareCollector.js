/**
 * Validator Node Hardware Collector for FungiMesh
 * ================================================
 * Connects Validator Nodes to the FungiMesh network and collects
 * real hardware information: name, IP, hardware type, CPU, GPU,
 * memory, disk, network interfaces, OS, and uptime.
 *
 * This is a LIVE production module — no simulations.
 *
 * Founder: Omar Mohammad Abunadi™
 */

const os = require('os');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HARDWARE_DB = path.join(__dirname, '..', '..', 'data', 'validator-hardware.json');

class ValidatorHardwareCollector {
  constructor() {
    this.nodeId = crypto.randomBytes(16).toString('hex');
    this.collectedAt = new Date().toISOString();
  }

  /**
   * Collect ALL hardware info from this machine — real data only
   */
  collect() {
    const hw = {
      nodeId: this.nodeId,
      collectedAt: this.collectedAt,
      name: this._getHostname(),
      ip: this._getIPAddresses(),
      type: this._getDeviceType(),
      hardware: {
        cpu: this._getCPUInfo(),
        gpu: this._getGPUInfo(),
        memory: this._getMemoryInfo(),
        disk: this._getDiskInfo(),
        motherboard: this._getMotherboardInfo(),
        bios: this._getBIOSInfo(),
      },
      network: this._getNetworkInterfaces(),
      os: this._getOSInfo(),
      uptime: this._getUptime(),
      performance: this._getPerformanceSnapshot(),
    };
    return hw;
  }

  // ─── Hostname ───────────────────────────────────────────
  _getHostname() {
    const hostname = os.hostname();
    let prettyName = hostname;
    try {
      const pretty = execSync('hostnamectl --json=short 2>/dev/null || cat /etc/hostname 2>/dev/null', { timeout: 3000 }).toString().trim();
      if (pretty.startsWith('{')) {
        const j = JSON.parse(pretty);
        prettyName = j.PrettyHostname || j.StaticHostname || hostname;
      } else {
        prettyName = pretty || hostname;
      }
    } catch { /* use os.hostname */ }
    return prettyName;
  }

  // ─── IP addresses (all real interfaces) ─────────────────
  _getIPAddresses() {
    const result = { primary: null, all: [] };
    const ifaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(ifaces)) {
      for (const a of addrs) {
        if (a.internal) continue;
        const entry = { iface: name, address: a.address, family: a.family, mac: a.mac, netmask: a.netmask, cidr: a.cidr };
        result.all.push(entry);
        if (a.family === 'IPv4' && !result.primary) result.primary = a.address;
      }
    }
    // Try to get public IP
    try {
      result.publicIP = execSync('curl -s --max-time 4 https://api.ipify.org 2>/dev/null || curl -s --max-time 4 https://ifconfig.me 2>/dev/null', { timeout: 6000 }).toString().trim();
    } catch { result.publicIP = null; }
    return result;
  }

  // ─── Device type detection ──────────────────────────────
  _getDeviceType() {
    const platform = os.platform();
    let chassis = 'unknown';
    try {
      chassis = execSync('hostnamectl 2>/dev/null | grep -i chassis | awk \'{print $2}\'', { timeout: 3000 }).toString().trim() || 'unknown';
    } catch {}

    // Detect virtualisation
    let virt = 'bare-metal';
    try {
      virt = execSync('systemd-detect-virt 2>/dev/null || echo bare-metal', { timeout: 3000 }).toString().trim();
      if (virt === 'none') virt = 'bare-metal';
    } catch {}

    // Detect if Raspberry Pi / ARM SBC
    let model = null;
    try {
      model = execSync('cat /proc/device-tree/model 2>/dev/null || cat /sys/firmware/devicetree/base/model 2>/dev/null', { timeout: 2000 }).toString().replace(/\0/g, '').trim();
    } catch {}

    return {
      platform,
      arch: os.arch(),
      chassis,
      virtualization: virt,
      model: model || os.type(),
      release: os.release(),
    };
  }

  // ─── CPU ────────────────────────────────────────────────
  _getCPUInfo() {
    const cpus = os.cpus();
    const info = {
      model: cpus[0]?.model?.trim() || 'unknown',
      cores: cpus.length,
      physicalCores: null,
      speed: cpus[0]?.speed || 0,
      maxSpeed: null,
      architecture: os.arch(),
      flags: [],
    };

    try {
      const lscpu = execSync('lscpu 2>/dev/null', { timeout: 3000 }).toString();
      const phys = lscpu.match(/Core\(s\) per socket:\s*(\d+)/);
      const sockets = lscpu.match(/Socket\(s\):\s*(\d+)/);
      const maxMHz = lscpu.match(/CPU max MHz:\s*([\d.]+)/);
      const flagsLine = lscpu.match(/Flags?:\s*(.+)/i);
      if (phys && sockets) info.physicalCores = parseInt(phys[1]) * parseInt(sockets[1]);
      if (maxMHz) info.maxSpeed = Math.round(parseFloat(maxMHz[1]));
      if (flagsLine) info.flags = flagsLine[1].split(/\s+/).slice(0, 30); // first 30 flags
    } catch {}

    // CPU temperature
    try {
      const temp = execSync('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null', { timeout: 2000 }).toString().trim();
      if (temp) info.temperature = (parseInt(temp) / 1000).toFixed(1) + '°C';
    } catch {}

    return info;
  }

  // ─── GPU ────────────────────────────────────────────────
  _getGPUInfo() {
    const gpus = [];

    // NVIDIA
    try {
      const nv = execSync('nvidia-smi --query-gpu=name,memory.total,memory.free,temperature.gpu,driver_version,utilization.gpu --format=csv,noheader,nounits 2>/dev/null', { timeout: 5000 }).toString().trim();
      if (nv) {
        for (const line of nv.split('\n')) {
          const [name, memTotal, memFree, temp, driver, util] = line.split(',').map(s => s.trim());
          gpus.push({ vendor: 'NVIDIA', name, memoryMB: parseInt(memTotal), freeMemoryMB: parseInt(memFree), temperature: temp + '°C', driver, utilization: util + '%' });
        }
      }
    } catch {}

    // AMD
    try {
      const amd = execSync('rocm-smi --showid --showtemp --showmeminfo vram 2>/dev/null', { timeout: 5000 }).toString().trim();
      if (amd && !amd.includes('command not found')) {
        gpus.push({ vendor: 'AMD', raw: amd.substring(0, 300) });
      }
    } catch {}

    // Intel iGPU / generic
    if (gpus.length === 0) {
      try {
        const lspci = execSync('lspci 2>/dev/null | grep -iE "VGA|3D|Display"', { timeout: 3000 }).toString().trim();
        if (lspci) {
          for (const line of lspci.split('\n')) {
            gpus.push({ vendor: 'detected', name: line.replace(/^[0-9a-f:.]+\s*/i, '').trim() });
          }
        }
      } catch {}
    }

    return { count: gpus.length, devices: gpus };
  }

  // ─── Memory ─────────────────────────────────────────────
  _getMemoryInfo() {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const info = {
      totalGB: +(totalBytes / 1024 / 1024 / 1024).toFixed(2),
      freeGB: +(freeBytes / 1024 / 1024 / 1024).toFixed(2),
      usedGB: +((totalBytes - freeBytes) / 1024 / 1024 / 1024).toFixed(2),
      usagePercent: +((1 - freeBytes / totalBytes) * 100).toFixed(1),
      slots: [],
    };

    // Detailed DIMM info (skip sudo to avoid blocking startup)
    try {
      const dimm = execSync('dmidecode -t memory 2>/dev/null | grep -E "Size:|Type:|Speed:|Manufacturer:|Locator:" | head -40 || true', { timeout: 5000, stdio: ['pipe','pipe','pipe'] }).toString();
      if (dimm) info.dimmRaw = dimm.trim();
    } catch {}

    // Swap
    try {
      const swap = execSync('free -b 2>/dev/null | grep Swap', { timeout: 2000 }).toString().trim();
      if (swap) {
        const parts = swap.split(/\s+/);
        info.swapTotalGB = +(parseInt(parts[1] || 0) / 1024 / 1024 / 1024).toFixed(2);
        info.swapUsedGB = +(parseInt(parts[2] || 0) / 1024 / 1024 / 1024).toFixed(2);
      }
    } catch {}

    return info;
  }

  // ─── Disk ───────────────────────────────────────────────
  _getDiskInfo() {
    const disks = [];
    try {
      const df = execSync('df -BG --output=source,size,used,avail,pcent,target 2>/dev/null | grep -vE "^Filesystem|tmpfs|devtmpfs|udev"', { timeout: 3000 }).toString().trim();
      for (const line of df.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 6) {
          disks.push({
            device: parts[0],
            sizeGB: parseInt(parts[1]),
            usedGB: parseInt(parts[2]),
            availGB: parseInt(parts[3]),
            usePercent: parts[4],
            mountPoint: parts[5],
          });
        }
      }
    } catch {}

    // Physical disks
    let physicalDisks = [];
    try {
      const lsblk = execSync('lsblk -d -o NAME,SIZE,TYPE,MODEL,ROTA,TRAN 2>/dev/null | grep -i disk', { timeout: 3000 }).toString().trim();
      for (const line of lsblk.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          physicalDisks.push({
            name: parts[0],
            size: parts[1],
            type: parseInt(parts[4]) === 0 ? 'SSD' : 'HDD',
            transport: parts[5] || 'unknown',
            model: parts[3] || 'unknown',
          });
        }
      }
    } catch {}

    return { partitions: disks, physicalDisks };
  }

  // ─── Motherboard ────────────────────────────────────────
  _getMotherboardInfo() {
    const info = {};
    try {
      info.manufacturer = execSync('cat /sys/class/dmi/id/board_vendor 2>/dev/null', { timeout: 2000 }).toString().trim();
      info.product = execSync('cat /sys/class/dmi/id/board_name 2>/dev/null', { timeout: 2000 }).toString().trim();
      info.version = execSync('cat /sys/class/dmi/id/board_version 2>/dev/null', { timeout: 2000 }).toString().trim();
    } catch {}
    return info;
  }

  // ─── BIOS / Firmware ───────────────────────────────────
  _getBIOSInfo() {
    const info = {};
    try {
      info.vendor = execSync('cat /sys/class/dmi/id/bios_vendor 2>/dev/null', { timeout: 2000 }).toString().trim();
      info.version = execSync('cat /sys/class/dmi/id/bios_version 2>/dev/null', { timeout: 2000 }).toString().trim();
      info.date = execSync('cat /sys/class/dmi/id/bios_date 2>/dev/null', { timeout: 2000 }).toString().trim();
    } catch {}
    return info;
  }

  // ─── Network interfaces (detailed) ─────────────────────
  _getNetworkInterfaces() {
    const ifaces = os.networkInterfaces();
    const detailed = [];
    for (const [name, addrs] of Object.entries(ifaces)) {
      const entry = { name, addresses: [], type: this._classifyNIC(name) };

      // Link speed
      try {
        entry.speed = execSync(`cat /sys/class/net/${name}/speed 2>/dev/null`, { timeout: 1000 }).toString().trim() + ' Mbps';
      } catch { entry.speed = 'unknown'; }

      // Operstate
      try {
        entry.state = execSync(`cat /sys/class/net/${name}/operstate 2>/dev/null`, { timeout: 1000 }).toString().trim();
      } catch { entry.state = 'unknown'; }

      // Driver
      try {
        entry.driver = execSync(`readlink /sys/class/net/${name}/device/driver 2>/dev/null | xargs basename 2>/dev/null`, { timeout: 1000 }).toString().trim() || 'unknown';
      } catch { entry.driver = 'unknown'; }

      for (const a of addrs) {
        entry.addresses.push({ address: a.address, family: a.family, mac: a.mac, netmask: a.netmask, internal: a.internal });
      }
      detailed.push(entry);
    }
    return detailed;
  }

  _classifyNIC(name) {
    const n = name.toLowerCase();
    if (/^(wl|wlan|wifi|ath)/.test(n)) return 'wifi';
    if (/^(wwan|rmnet|mbim|qmi|ppp|lte|nr)/.test(n)) return 'cellular';
    if (/^(bt|bnep|pan)/.test(n)) return 'bluetooth';
    if (/^(tun|tap|wg|ogstun)/.test(n)) return 'vpn';
    if (/^(docker|br-|veth|cni)/.test(n)) return 'container';
    if (/^(eth|en|em|eno|ens|enp)/.test(n)) return 'ethernet';
    if (/^lo/.test(n)) return 'loopback';
    return 'other';
  }

  // ─── OS ─────────────────────────────────────────────────
  _getOSInfo() {
    const info = {
      type: os.type(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
    };
    try {
      info.distro = execSync('cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'', { timeout: 2000 }).toString().trim();
    } catch {}
    try {
      info.kernel = execSync('uname -r 2>/dev/null', { timeout: 2000 }).toString().trim();
    } catch {}
    return info;
  }

  // ─── Uptime ─────────────────────────────────────────────
  _getUptime() {
    const sec = os.uptime();
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return { seconds: sec, human: `${d}d ${h}h ${m}m` };
  }

  // ─── Live performance snapshot ──────────────────────────
  _getPerformanceSnapshot() {
    const load = os.loadavg();
    const info = {
      loadAvg1m: load[0],
      loadAvg5m: load[1],
      loadAvg15m: load[2],
      cpuUsagePercent: null,
      processCount: null,
    };

    try {
      info.processCount = parseInt(execSync('ps aux --no-heading 2>/dev/null | wc -l', { timeout: 3000 }).toString().trim());
    } catch {}

    // Quick 1-second CPU usage snapshot
    try {
      const stat1 = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].split(/\s+/).slice(1).map(Number);
      const total1 = stat1.reduce((a, b) => a + b, 0);
      const idle1 = stat1[3];

      const used1 = total1 - idle1;
      info.cpuUsagePercent = +((used1 / total1) * 100).toFixed(1);
    } catch {}

    return info;
  }

  // ─── Save to disk ───────────────────────────────────────
  save(hwData) {
    try {
      const dir = path.dirname(HARDWARE_DB);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let db = { validators: [], updatedAt: null };
      if (fs.existsSync(HARDWARE_DB)) {
        db = JSON.parse(fs.readFileSync(HARDWARE_DB, 'utf8'));
      }

      // Upsert by nodeId
      const idx = db.validators.findIndex(v => v.nodeId === hwData.nodeId);
      if (idx >= 0) db.validators[idx] = hwData;
      else db.validators.push(hwData);

      db.updatedAt = new Date().toISOString();
      fs.writeFileSync(HARDWARE_DB, JSON.stringify(db, null, 2));
      return true;
    } catch (err) {
      console.error('Failed to save validator hardware:', err.message);
      return false;
    }
  }
}

module.exports = { ValidatorHardwareCollector };
