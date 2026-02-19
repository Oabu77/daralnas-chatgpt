<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

# DarCloud FungiMesh Primary Server Deployment

This guide explains how to deploy the primary FungiMesh server to DarCloud web hosting instead of running on localhost.

## Overview

The primary server consists of:
- **Blockchain Server** (Port 3001): Main API and blockchain operations
- **FungiMesh Network** (Port 7001): P2P mesh networking
- **Blockchain P2P** (Port 6001): Blockchain peer-to-peer communication

## Domains

- **mesh.darcloud.host**: Primary mesh API and WebSocket endpoint
- **fungi.darcloud.host**: Secondary mesh node
- **blockchain.darcloud.host**: Blockchain API
- **quran.darcloud.host**: QuranChain specific services

## Deployment Steps

### 1. Server Setup
```bash
# On your DarCloud hosting server
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /var/www/darcloud/quranchain-mesh
sudo chown -R www-data:www-data /var/www/darcloud
```

### 2. Deploy Application
```bash
# Copy files to server
scp -r ./* user@your-darcloud-server:/var/www/darcloud/quranchain-mesh/

# Install dependencies
cd /var/www/darcloud/quranchain-mesh
npm install --production
```

### 3. Configure Environment
```bash
# Copy environment file
cp .env.darcloud .env

# Edit with your actual credentials
nano .env
```

### 4. Setup Services
```bash
# Copy systemd service
sudo cp deploy/darcloud-mesh.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable quranchain-mesh
sudo systemctl start quranchain-mesh
```

### 5. Configure Nginx
```bash
# Copy nginx config
sudo cp deploy/nginx-darcloud.conf /etc/nginx/sites-available/mesh.darcloud.host

# Enable site
sudo ln -s /etc/nginx/sites-available/mesh.darcloud.host /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 6. Setup SSL
```bash
# Get SSL certificates
sudo certbot --nginx -d mesh.darcloud.host -d fungi.darcloud.host -d blockchain.darcloud.host -d quran.darcloud.host
```

### 7. Verify Deployment
```bash
# Run verification script
./deploy/verify-darcloud-deployment.sh
```

## Monitoring

### Check Service Status
```bash
sudo systemctl status quranchain-mesh
```

### View Logs
```bash
sudo journalctl -u quranchain-mesh -f
```

### API Health Check
```bash
curl https://mesh.darcloud.host/health
curl https://mesh.darcloud.host/mesh/status
curl https://mesh.darcloud.host/blockchain/status
```

## Scaling

To add more mesh nodes:
1. Deploy additional servers with the same configuration
2. Update MESH_SEED_NODES in .env to include new node addresses
3. Restart services to connect to new peers

## Troubleshooting

### Common Issues

1. **Port conflicts**: Check if ports 3001, 7001, 6001 are available
2. **SSL issues**: Ensure certificates are properly installed
3. **Peer connections**: Verify firewall allows WebSocket connections
4. **Memory issues**: Monitor with `htop` and adjust MemoryLimit in service file

### Logs Location
- Application logs: `sudo journalctl -u quranchain-mesh`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`

## Security Notes

- All services run under www-data user
- SSL/TLS encryption enabled
- Security headers configured
- PrivateTmp and ProtectSystem enabled
- NoNewPrivileges set

## Founder
Omar Mohammad Abunadi™
