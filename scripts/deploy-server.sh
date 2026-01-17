#!/usr/bin/env bash
set -euo pipefail

# ChatGPT Deployment Agent - Server Deployment Script
# This script handles automated deployment to the Linux server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/daralnas/apps/daralnas-chatgpt}"
BACKUP_DIR="${BACKUP_DIR:-/opt/daralnas/backups}"
LOG_DIR="${LOG_DIR:-/opt/daralnas/logs}"
LOG_FILE="$LOG_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
REPO_URL="${REPO_URL:-https://github.com/Oabu77/daralnas-chatgpt.git}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

log "========================================="
log "ChatGPT Deployment Agent - Server Deploy"
log "========================================="

# Ensure script is run with appropriate permissions
if [ ! -w "$LOG_DIR" ]; then
    error "Cannot write to log directory: $LOG_DIR"
fi

log "Starting deployment process..."

# Create backup of current deployment
if [ -d "$DEPLOY_DIR" ]; then
    log "Creating backup of current deployment..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    mkdir -p "$BACKUP_DIR"
    
    if tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$(dirname "$DEPLOY_DIR")" "$(basename "$DEPLOY_DIR")" 2>/dev/null; then
        log "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    else
        warning "Backup creation failed, continuing anyway"
    fi
    
    # Keep only last 5 backups
    info "Cleaning up old backups (keeping last 5)..."
    cd "$BACKUP_DIR" && ls -t backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f
fi

# Clone or update repository
if [ -d "$DEPLOY_DIR/.git" ]; then
    log "Updating existing repository..."
    cd "$DEPLOY_DIR"
    
    # Stash any local changes (shouldn't be any in production)
    git stash || true
    
    # Fetch latest changes
    git fetch origin
    
    # Reset to origin/main
    git reset --hard origin/main
    
    log "Repository updated to latest commit: $(git rev-parse --short HEAD)"
else
    log "Cloning repository..."
    mkdir -p "$(dirname "$DEPLOY_DIR")"
    
    if ! git clone "$REPO_URL" "$DEPLOY_DIR"; then
        error "Failed to clone repository"
    fi
    
    cd "$DEPLOY_DIR"
    log "Repository cloned successfully"
fi

# Update Python services
if [ -f "requirements.txt" ]; then
    log "Updating Python dependencies..."
    
    # Create virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
        info "Creating Python virtual environment..."
        python3 -m venv .venv
    fi
    
    # Activate virtual environment and update dependencies
    source .venv/bin/activate
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    
    log "Python dependencies updated successfully"
fi

# Update Node.js services
if [ -f "package.json" ]; then
    log "Updating Node.js dependencies..."
    
    if command -v npm &> /dev/null; then
        npm ci --quiet || npm install --quiet
        log "Node.js dependencies updated successfully"
    else
        warning "npm not found, skipping Node.js dependency update"
    fi
fi

# Stop running services
log "Stopping services..."
if [ -f "docker-compose.yml" ]; then
    docker-compose down || warning "Docker Compose down failed"
else
    info "No docker-compose.yml found, skipping service stop"
fi

# Pull latest Docker images
if [ -f "docker-compose.yml" ]; then
    log "Pulling latest Docker images..."
    docker-compose pull || warning "Docker Compose pull failed (may be using local images)"
fi

# Start services
log "Starting services..."
if [ -f "docker-compose.yml" ]; then
    if docker-compose up -d --build; then
        log "Services started successfully"
    else
        error "Failed to start services with Docker Compose"
    fi
else
    info "No docker-compose.yml found, skipping service start"
fi

# Wait for services to be healthy
log "Waiting for services to become healthy..."
sleep 10

# Health checks
log "Running health checks..."
HEALTH_OK=true

# Check QC Agent
if curl -sf --max-time 5 http://127.0.0.1:7444/health >/dev/null 2>&1; then
    log "✅ QC Agent: Healthy"
else
    warning "❌ QC Agent: Not responding"
    HEALTH_OK=false
fi

# Check Telegram Bot
if curl -sf --max-time 5 http://127.0.0.1:8000/health >/dev/null 2>&1; then
    log "✅ Telegram Bot: Healthy"
else
    info "⚠️  Telegram Bot: Not responding (may not be deployed)"
fi

# Check Docker containers
if command -v docker &> /dev/null; then
    log "Docker container status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tee -a "$LOG_FILE"
fi

# Clean up old Docker images
log "Cleaning up old Docker images..."
docker image prune -f || true

# System resource check
log "System resources:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" 2>/dev/null | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}' || echo 'N/A')" | tee -a "$LOG_FILE"
echo "Memory: $(free -h 2>/dev/null | grep Mem | awk '{print $3 "/" $2}' || echo 'N/A')" | tee -a "$LOG_FILE"
echo "Disk: $(df -h / 2>/dev/null | tail -1 | awk '{print $5 " used"}' || echo 'N/A')" | tee -a "$LOG_FILE"

# Final status
log "========================================="
if [ "$HEALTH_OK" = true ]; then
    log "✅ Deployment completed successfully!"
    exit 0
else
    warning "⚠️  Deployment completed with warnings"
    log "Check service logs for details"
    exit 1
fi
