#!/bin/bash

################################################################################
# MongoDB Atlas Automated Backup & Restore Configuration
# Manages backups, retention, and disaster recovery
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}💾 MongoDB Atlas Backup Configuration${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

BACKUP_DIR="/var/backups/mongodb"
BACKUP_LOG="/var/log/quranchain/mongodb-backup.log"
MONGODB_URI="${MONGODB_URI:-mongodb+srv://admin:password@cluster.mongodb.net/}"

# Create backup directories
echo -e "${BLUE}Creating backup infrastructure...${NC}"
sudo mkdir -p "$BACKUP_DIR"
sudo mkdir -p "/var/log/quranchain"
sudo chmod 700 "$BACKUP_DIR"

# Create backup script
echo -e "${BLUE}Installing backup script...${NC}"
sudo tee /usr/local/bin/mongodb-backup.sh > /dev/null << 'BACKUPSCRIPT'
#!/bin/bash

BACKUP_DIR="/var/backups/mongodb"
BACKUP_LOG="/var/log/quranchain/mongodb-backup.log"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="${BACKUP_DIR}/quranchain-backup-${TIMESTAMP}.archive"
MONGODB_URI="${MONGODB_URI:-mongodb+srv://admin:password@cluster.mongodb.net/}"

echo "[$(date)] Starting MongoDB backup..." >> "$BACKUP_LOG"

# Create backup using mongodump
if mongodump --uri="$MONGODB_URI" --archive="$BACKUP_FILE" --gzip 2>&1 | tee -a "$BACKUP_LOG"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] ✅ Backup completed: $BACKUP_FILE ($FILE_SIZE)" >> "$BACKUP_LOG"
    
    # Keep only last 30 days of backups
    find "$BACKUP_DIR" -name "*.archive" -mtime +30 -delete 2>/dev/null && \
        echo "[$(date)] 🗑️  Cleaned old backups (>30 days)" >> "$BACKUP_LOG"
else
    echo "[$(date)] ❌ Backup failed" >> "$BACKUP_LOG"
    exit 1
fi

# Database statistics
echo "[$(date)] Database Stats:" >> "$BACKUP_LOG"
echo "  Backup size: $FILE_SIZE" >> "$BACKUP_LOG"
echo "  Backups retained: $(ls $BACKUP_DIR/*.archive 2>/dev/null | wc -l)" >> "$BACKUP_LOG"
BACKUPSCRIPT

sudo chmod +x /usr/local/bin/mongodb-backup.sh

# Create restore script
echo -e "${BLUE}Installing restore script...${NC}"
sudo tee /usr/local/bin/mongodb-restore.sh > /dev/null << 'RESTORESCRIPT'
#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: mongodb-restore.sh <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh /var/backups/mongodb/*.archive 2>/dev/null | awk '{print "  " $9}'
    exit 1
fi

BACKUP_FILE="$1"
MONGODB_URI="${MONGODB_URI:-mongodb+srv://admin:password@cluster.mongodb.net/}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring from: $BACKUP_FILE"
echo "⚠️  WARNING: This will overwrite existing data!"
read -p "Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

mongorestore --uri="$MONGODB_URI" --archive="$BACKUP_FILE" --gzip

echo "✅ Restore completed"
RESTORESCRIPT

sudo chmod +x /usr/local/bin/mongodb-restore.sh

# Create systemd backup timer
echo -e "${BLUE}Setting up automated backups...${NC}"
sudo tee /etc/systemd/system/mongodb-backup.service > /dev/null << 'BACKUPSERVICE'
[Unit]
Description=MongoDB Backup
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/mongodb-backup.sh
StandardOutput=journal
StandardError=journal
BACKUPSERVICE

sudo tee /etc/systemd/system/mongodb-backup.timer > /dev/null << 'BACKUPTIMER'
[Unit]
Description=MongoDB Backup Timer
Requires=mongodb-backup.service

[Timer]
OnBootSec=10m
OnUnitActiveSec=24h
Persistent=true

[Install]
WantedBy=timers.target
BACKUPTIMER

# Enable and start backup timer
sudo systemctl daemon-reload
sudo systemctl enable mongodb-backup.timer 2>/dev/null || true
sudo systemctl start mongodb-backup.timer 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ MongoDB Backup setup completed!${NC}"
echo ""
echo -e "${BLUE}💾 Backup Commands:${NC}"
echo "  Run backup manually:    sudo mongodb-backup.sh"
echo "  List backups:           ls -lh /var/backups/mongodb/"
echo "  Restore from backup:    sudo mongodb-restore.sh /var/backups/mongodb/quranchain-backup-TIMESTAMP.archive"
echo "  View backup logs:       tail -f /var/log/quranchain/mongodb-backup.log"
echo "  Check backup timer:     systemctl status mongodb-backup.timer"
echo ""
echo -e "${YELLOW}⚠️  Note: Configure MONGODB_URI environment variable${NC}"
echo "  export MONGODB_URI=\"mongodb+srv://user:pass@cluster.mongodb.net/\""
echo ""
