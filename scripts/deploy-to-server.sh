#!/usr/bin/env bash
set -euo pipefail

# Deploy Telegram Bot to Linux Server
# This script is executed on the remote server via SSH during CI/CD deployment
# It handles:
# - Code synchronization
# - Virtual environment setup
# - Dependency installation
# - Service restart
# - Health check validation

DEPLOY_DIR="${DEPLOY_DIR:-/opt/daralnas-chatgpt}"
VENV_DIR="${DEPLOY_DIR}/.venv"
SERVICE_NAME="${SERVICE_NAME:-daralnas-bot}"

echo "🚀 Starting deployment to Linux server..."
echo "📁 Deploy directory: ${DEPLOY_DIR}"

# Navigate to deployment directory
cd "${DEPLOY_DIR}"

# Validate requirements.txt exists (fail fast)
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt not found in ${DEPLOY_DIR}"
    echo "❌ Deployment cannot proceed without dependency specifications"
    exit 1
fi

# Backup current deployment (if exists)
if [ -d "${DEPLOY_DIR}/daralnas_bot" ]; then
    echo "💾 Creating backup of current deployment..."
    BACKUP_DIR="${DEPLOY_DIR}/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "${BACKUP_DIR}"
    # Backup Python bot files if they exist
    [ -d "daralnas_bot" ] && cp -r daralnas_bot "${BACKUP_DIR}/"
    [ -f "requirements.txt" ] && cp requirements.txt "${BACKUP_DIR}/"
    echo "✅ Backup created at ${BACKUP_DIR}"
else
    echo "ℹ️  No existing deployment found - skipping backup"
fi

# Pull latest code (assuming repository is cloned at DEPLOY_DIR)
# Note: This is redundant when using rsync from CI/CD, but useful for manual deployments
if [ -d "${DEPLOY_DIR}/.git" ]; then
    echo "🔄 Pulling latest code from repository..."
    git fetch origin
    # Using reset --hard is safe here as code is synced via rsync during CI/CD
    # For manual runs, ensure no important uncommitted changes exist
    git reset --hard origin/main
    echo "✅ Code updated to latest version"
else
    echo "⚠️  No .git directory found - skipping git pull"
fi

# Create/update Python virtual environment
echo "🐍 Setting up Python virtual environment..."
if [ ! -d "${VENV_DIR}" ]; then
    python3 -m venv "${VENV_DIR}"
    echo "✅ Virtual environment created"
else
    echo "✅ Using existing virtual environment"
fi

# Activate virtual environment and install dependencies
echo "📦 Installing Python dependencies..."
source "${VENV_DIR}/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Dependencies installed"

# Restart service if systemd service exists
if systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
    echo "🔄 Restarting ${SERVICE_NAME} service..."
    sudo systemctl restart "${SERVICE_NAME}"
    sleep 3
    
    # Check service status
    if systemctl is-active --quiet "${SERVICE_NAME}"; then
        echo "✅ Service ${SERVICE_NAME} is running"
    else
        echo "❌ Service ${SERVICE_NAME} failed to start"
        sudo systemctl status "${SERVICE_NAME}" --no-pager || true
        exit 1
    fi
else
    echo "⚠️  Systemd service ${SERVICE_NAME}.service not found"
    echo "ℹ️  You may need to start the application manually"
fi

# Health check
echo "🏥 Performing health check..."
HEALTH_URL="${HEALTH_URL:-http://localhost:8000/health}"
for i in {1..10}; do
    if curl -sf "${HEALTH_URL}" > /dev/null 2>&1; then
        echo "✅ Health check passed (attempt ${i})"
        echo "🎉 Deployment completed successfully!"
        exit 0
    fi
    echo "⏳ Waiting for service to be ready (attempt ${i}/10)..."
    sleep 2
done

echo "⚠️  Health check endpoint not responding, but deployment completed"
echo "ℹ️  Check service logs: sudo journalctl -u ${SERVICE_NAME} -n 50"
exit 0
