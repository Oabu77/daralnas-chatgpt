# 🔐 DarCloud SSH Access & Deployment Guide
**Generated**: February 16, 2026  
**Founder**: Omar Mohammad Abunadi™

---

## 📋 Overview

This guide provides complete SSH setup, access control, and automated deployment for QuranChain-OS on DarCloud hosting infrastructure.

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| SSH Keys | Authentication | `~/.ssh/darcloud_prod` (private), `~/.ssh/darcloud_prod.pub` (public) |
| SSH Config | Connection profiles | `~/.ssh/config` (updated with DarCloud entries) |
| Setup Script | Initialize SSH access | `./setup-darcloud-ssh.sh` |
| Deploy Script | Automated deployment | `./deploy-with-ssh.sh` |
| Auth Script | Authorize SSH keys | `./authorize-darcloud-key.sh` |
| Test Script | Verify connectivity | `./test-darcloud-ssh.sh` |

---

## 🔑 SSH Keys Status

### Keys Generated ✅

```bash
/home/omar/.ssh/darcloud_prod      (3.4K, private key)
/home/omar/.ssh/darcloud_prod.pub  (756B, public key)
/home/omar/.ssh/darcloud_staging   (3.4K, private key)
/home/omar/.ssh/darcloud_staging.pub (753B, public key)
```

**Key Specifications:**
- Type: RSA
- Size: 4096 bits
- Format: OpenSSH
- Passphrase: None (automated deployment)
- Permissions: 600 (read/write owner only)

### SSH Config Updated ✅

**File**: `~/.ssh/config`

**Added Entries:**
```ssh_config
Host darcloud-prod
    HostName mesh.darcloud.host
    User www-data
    Port 22
    IdentityFile ~/.ssh/darcloud_prod
    ServerAliveInterval 60
    ServerAliveCountMax 10
    StrictHostKeyChecking no

Host darcloud-staging
    HostName staging.darcloud.host
    User ubuntu
    Port 22
    IdentityFile ~/.ssh/darcloud_staging
    ServerAliveInterval 60
    StrictHostKeyChecking no
```

---

## 🚀 Deployment Workflow

### Option 1: Full Automated Deployment (Recommended)

```bash
cd /home/omar/Desktop/QuranChain-OS

# 1. Setup SSH access on DarCloud (one time)
bash setup-darcloud-ssh.sh 192.168.1.99 www-data 22

# 2. Deploy QuranChain-OS
bash deploy-with-ssh.sh 192.168.1.99 www-data 22
```

**Time**: ~15 minutes  
**Result**: Complete deployment with services running

---

### Option 2: Manual SSH Access + Deploy Script

```bash
# 1. Authorize SSH key manually first
bash authorize-darcloud-key.sh 192.168.1.99 www-data 22

# 2. Test connection
bash test-darcloud-ssh.sh 192.168.1.99 www-data 22

# 3. Deploy when ready
bash deploy-with-ssh.sh 192.168.1.99 www-data 22
```

**Advantages**: More control, verify each step  
**Time**: ~20 minutes

---

### Option 3: Step-by-Step Manual Deployment

```bash
# 1. Test basic SSH connectivity
ssh -i ~/.ssh/darcloud_prod -p 22 www-data@192.168.1.99 "echo 'Connected!'"

# 2. Create directories
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "mkdir -p /var/www/darcloud/quranchain-mesh/logs"

# 3. Copy files
scp -r -i ~/.ssh/darcloud_prod \
    /home/omar/Desktop/QuranChain-OS/src \
    www-data@192.168.1.99:/var/www/darcloud/quranchain-mesh/

# 4. Install dependencies
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "cd /var/www/darcloud/quranchain-mesh && npm install --production"

# 5. Start services
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "cd /var/www/darcloud/quranchain-mesh && nohup node src/blockchain-server.js > logs/blockchain.log 2>&1 &"
```

---

## 🔧 Script Parameters

### setup-darcloud-ssh.sh

```bash
Usage: bash setup-darcloud-ssh.sh <DARCLOUD_IP> [USER] [PORT]

Examples:
  bash setup-darcloud-ssh.sh 192.168.1.99                    # Default: www-data, port 22
  bash setup-darcloud-ssh.sh 192.168.1.99 ubuntu 2222       # Custom port
  bash setup-darcloud-ssh.sh mesh.darcloud.host www-data     # Using hostname
```

**What it does:**
1. ✅ Verifies SSH key exists
2. ✅ Tests SSH connectivity
3. ✅ Uploads SSH public key to `authorized_keys`
4. ✅ Creates remote `.ssh` directory
5. ✅ Generates deployment script
6. ✅ Updates local SSH config
7. ✅ Tests final connectivity

**Output**: Log file in `logs/setup-darcloud-ssh-TIMESTAMP.log`

---

### deploy-with-ssh.sh

```bash
Usage: bash deploy-with-ssh.sh <DARCLOUD_IP> [USER] [PORT]

Examples:
  bash deploy-with-ssh.sh 192.168.1.99              # Standard deployment
  bash deploy-with-ssh.sh 192.168.1.99 ubuntu 2222  # Custom SSH port
  bash deploy-with-ssh.sh mesh.darcloud.host        # Using registered hostname
```

**What it does:**
1. ✅ Validates SSH connectivity
2. ✅ Creates remote directory structure
3. ✅ Copies all application files
4. ✅ Installs npm dependencies
5. ✅ Sets up systemd services
6. ✅ Configures Nginx reverse proxy
7. ✅ Starts services (blockchain, revenue, gaming)
8. ✅ Verifies health endpoints
9. ✅ Generates post-deployment instructions

**Output**: 
- Logs to `logs/darcloud-deploy-TIMESTAMP.log`
- Real-time console output with timestamps

**Estimated Time**: 12-15 minutes

---

### authorize-darcloud-key.sh

```bash
Usage: bash authorize-darcloud-key.sh <DARCLOUD_IP> [SSH_USER] [SSH_PORT]

Examples:
  bash authorize-darcloud-key.sh 192.168.1.99              # Default: www-data, port 22
  bash authorize-darcloud-key.sh 192.168.1.99 ubuntu 2222  # Custom user and port
```

**What it does:**
1. ✅ Verifies SSH key file exists
2. ✅ Creates `.ssh` directory on remote (700 permissions)
3. ✅ Copies public key to `authorized_keys`
4. ✅ Sets proper permissions (600)
5. ✅ Tests key-based authentication
6. ✅ Shows key fingerprint

**Output**: Logs to `logs/darcloud-auth-TIMESTAMP.log`

---

### test-darcloud-ssh.sh

```bash
Usage: bash test-darcloud-ssh.sh <DARCLOUD_IP> [SSH_USER] [SSH_PORT]

Examples:
  bash test-darcloud-ssh.sh 192.168.1.99              # Full diagnostic test
  bash test-darcloud-ssh.sh 192.168.1.99 ubuntu 2222  # Custom credentials
```

**What it tests:**
✅ SSH connectivity  
✅ System information (OS, kernel, memory, disk)  
✅ Listening ports (3000, 3001, 80, 443, 7001-7005)  
✅ Health endpoints (/health)  
✅ File system access  
✅ Systemd services status  
✅ Running processes  
✅ Network configuration  
✅ Node.js/npm installed  
✅ Directory structure  

**Output**: Comprehensive report to `logs/darcloud-tests/test-TIMESTAMP.log`

---

## 📊 Deployment Checklist

Before deploying, verify:

- [ ] DarCloud server is running and accessible
- [ ] DarCloud IP address known (e.g., 192.168.1.99)
- [ ] SSH user account exists (default: `www-data`)
- [ ] SSH port is open (default: 22)
- [ ] `/var/www/` directory exists or can be created
- [ ] Node.js 16+ installed on DarCloud (or will be installed)
- [ ] Sufficient disk space (minimum 2GB for app + dependencies)
- [ ] Sufficient memory (minimum 2GB RAM)
- [ ] Network connectivity between local and DarCloud

---

## 🔍 Troubleshooting

### SSH Connection Refused

```bash
# Check if SSH server is running
ssh -i ~/.ssh/darcloud_prod -p 22 www-data@192.168.1.99 "ps aux | grep sshd"

# Verify firewall allows port 22
ssh -i ~/.ssh/darcloud_prod -p 22 www-data@192.168.1.99 "sudo ufw allow 22"

# Check SSH daemon status
ssh -i ~/.ssh/darcloud_prod -p 22 www-data@192.168.1.99 "sudo systemctl status ssh"
```

### Authentication Failed

```bash
# Verify public key in authorized_keys
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 "cat ~/.ssh/authorized_keys"

# Re-authorize key
bash authorize-darcloud-key.sh 192.168.1.99 www-data 22

# Check key permissions
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 "ls -la ~/.ssh/"
```

### Deployment Fails

```bash
# Check deployment log
tail -100 logs/darcloud-deploy-*.log

# Test connectivity
bash test-darcloud-ssh.sh 192.168.1.99 www-data 22

# Check remote logs
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "tail -50 /var/www/darcloud/quranchain-mesh/logs/*.log"
```

### Services Not Starting

```bash
# Check if Node.js is installed
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 "node --version"

# Install Node.js if needed
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"

# Check service status
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "sudo systemctl status quranchain-mesh"

# View service logs
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "sudo journalctl -u quranchain-mesh -n 50"
```

---

## 📈 Post-Deployment

After successful deployment:

### 1. Update DNS Records

```bash
# Point these domains to your DarCloud server IP:
mesh.darcloud.host         → 192.168.1.99 (or your DarCloud IP)
blockchain.darcloud.host   → 192.168.1.99
fungi.darcloud.host        → 192.168.1.99
quran.darcloud.host        → 192.168.1.99
```

### 2. Generate SSL Certificates

```bash
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "sudo certbot certonly --nginx -d mesh.darcloud.host -d blockchain.darcloud.host -d fungi.darcloud.host -d quran.darcloud.host"
```

### 3. Configure Firewall

```bash
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 << 'EOF'
sudo ufw allow 22       # SSH
sudo ufw allow 80       # HTTP
sudo ufw allow 443      # HTTPS
sudo ufw allow 3000     # Revenue API
sudo ufw allow 3001     # Blockchain API
sudo ufw allow 6001     # P2P Blockchain
sudo ufw allow 7001     # Mesh Network
sudo ufw enable
EOF
```

### 4. Monitor Services

```bash
# Tail all logs in real-time
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "tail -f /var/www/darcloud/quranchain-mesh/logs/*.log"

# Check service health
ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 \
    "curl -s http://localhost:3001/health | jq ."
```

### 5. Setup Backup

```bash
# Backup to local
scp -r -i ~/.ssh/darcloud_prod \
    www-data@192.168.1.99:/var/www/darcloud/quranchain-mesh/data \
    /home/omar/Desktop/QuranChain-OS/backups/darcloud-$(date +%Y%m%d)/
```

---

## 🔐 Security Best Practices

1. **SSH Key Management**
   - Keep private keys in `~/.ssh/` only
   - Never commit keys to version control
   - Rotate keys every 90 days
   - Use separate keys for production/staging

2. **File Permissions**
   - SSH private keys: `600` (read/write owner)
   - SSH config: `600` (read/write owner)
   - `.ssh` directory: `700` (rwx owner)

3. **SSH Config**
   - Use `StrictHostKeyChecking=no` only for automated scripts
   - Always use specific `IdentityFile` paths
   - Set timeouts and keep-alives appropriately

4. **Access Control**
   - Limit SSH users (use `www-data` not `root`)
   - Disable password authentication
   - Use key-based auth only
   - Monitor SSH logs: `ssh -i ~/.ssh/darcloud_prod www-data@192.168.1.99 "tail /var/log/auth.log"`

---

## 📝 Log Files

All operations are logged to `logs/` directory:

```
logs/
├── setup-darcloud-ssh-20260216-102637.log     # Setup session
├── darcloud-auth-20260216-102645.log          # SSH authorization
├── darcloud-tests-20260216-102653.log         # Connectivity tests
├── darcloud-deploy-20260216-102700.log        # Deployment session
└── darcloud-tests/
    └── test-20260216-102653.log               # Detailed test results
```

**View logs**: `tail -f logs/darcloud-deploy-*.log`

---

## 🎯 Quick Start

### 5-Minute Quick Deploy

```bash
cd /home/omar/Desktop/QuranChain-OS

# 1. Setup SSH (2 min)
bash setup-darcloud-ssh.sh 192.168.1.99

# 2. Deploy (3 min)
bash deploy-with-ssh.sh 192.168.1.99

# ✅ Done!
```

### 30-Minute Full Setup

```bash
# 1. Test connectivity (2 min)
bash test-darcloud-ssh.sh 192.168.1.99

# 2. Authorize SSH key (3 min)
bash authorize-darcloud-key.sh 192.168.1.99

# 3. Deploy (15 min)
bash deploy-with-ssh.sh 192.168.1.99

# 4. Update DNS (5 min)
# Update your DNS provider with DarCloud IP

# 5. Verify deployment (5 min)
bash test-darcloud-ssh.sh 192.168.1.99
```

---

## 📞 Support

For assistance:
1. Check log files: `tail logs/darcloud-*.log`
2. Run test script: `bash test-darcloud-ssh.sh <IP>`
3. Verify SSH config: `ssh -v -i ~/.ssh/darcloud_prod www-data@<IP>`
4. Check DarCloud process: `ps aux | grep darcloud`

---

**Status**: ✅ SSH infrastructure ready  
**Last Updated**: February 16, 2026  
**Founder**: Omar Mohammad Abunadi™
