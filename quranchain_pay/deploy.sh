#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# QuranChain Pay™ - One-Command Deployment Script
# © QuranChain™ | Omar Mohammad Abunadi™
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║     ██████╗ ██╗   ██╗██████╗  █████╗ ███╗   ██╗ ██████╗██╗  ██╗ █████╗ ██╗   ║"
echo "║    ██╔═══██╗██║   ██║██╔══██╗██╔══██╗████╗  ██║██╔════╝██║  ██║██╔══██╗██║   ║"
echo "║    ██║   ██║██║   ██║██████╔╝███████║██╔██╗ ██║██║     ███████║███████║██║   ║"
echo "║    ██║▄▄ ██║██║   ██║██╔══██╗██╔══██║██║╚██╗██║██║     ██╔══██║██╔══██║██║   ║"
echo "║    ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██║ ╚████║╚██████╗██║  ██║██║  ██║██║   ║"
echo "║     ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝   ║"
echo "║                                                                              ║"
echo "║                            PAY™ - DEPLOYMENT                                 ║"
echo "║                   © QuranChain™ | Omar Mohammad Abunadi™                     ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for .env file
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}⚠ No .env file found. Creating from .env.example${NC}"
        cp .env.example .env
        echo -e "${RED}❌ Please edit .env with your production values before continuing${NC}"
        exit 1
    fi
fi

# Check required environment variables
check_env() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}❌ Missing required environment variable: $1${NC}"
        return 1
    fi
    return 0
}

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo -e "${BLUE}[1/6] Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

echo -e "${BLUE}[2/6] Validating configuration...${NC}"

# Check critical environment variables
MISSING=0
if [ -z "$SECRET_KEY" ] || [ "$SECRET_KEY" = "" ]; then
    echo -e "${YELLOW}⚠ SECRET_KEY not set, generating...${NC}"
    export SECRET_KEY=$(openssl rand -hex 32)
    echo "SECRET_KEY=$SECRET_KEY" >> .env
fi

if [ -z "$FOUNDER_USDC_ADDRESS" ]; then
    echo -e "${RED}❌ FOUNDER_USDC_ADDRESS not set${NC}"
    MISSING=1
fi

if [ "$MISSING" = "1" ]; then
    echo -e "${RED}Please configure required environment variables in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration validated${NC}"

echo -e "${BLUE}[3/6] Creating SSL certificates...${NC}"

mkdir -p nginx/ssl

# Generate self-signed cert if none exists (for initial setup)
if [ ! -f nginx/ssl/fullchain.pem ]; then
    echo -e "${YELLOW}Generating self-signed certificate (replace with Let's Encrypt for production)${NC}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/privkey.pem \
        -out nginx/ssl/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=QuranChain/CN=localhost" \
        2>/dev/null
    echo -e "${GREEN}✓ Self-signed certificate created${NC}"
else
    echo -e "${GREEN}✓ SSL certificates exist${NC}"
fi

echo -e "${BLUE}[4/6] Building Docker images...${NC}"

docker-compose build --no-cache
echo -e "${GREEN}✓ Docker images built${NC}"

echo -e "${BLUE}[5/6] Starting services...${NC}"

docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"

echo -e "${BLUE}[6/6] Waiting for health check...${NC}"

# Wait for API to be healthy
MAX_ATTEMPTS=30
ATTEMPT=0
until curl -sf http://localhost:8080/health > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo -e "${RED}❌ API failed to start${NC}"
        docker-compose logs api
        exit 1
    fi
    echo -n "."
    sleep 2
done

echo ""
echo -e "${GREEN}✓ API is healthy${NC}"

# Display status
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                        QURANCHAIN PAY™ IS RUNNING                            ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}                                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  API Endpoints:                                                             ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • HTTP:  ${BLUE}http://localhost:8080${NC}                                         ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • HTTPS: ${BLUE}https://localhost:443${NC}                                         ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Documentation:                                                             ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • Swagger: ${BLUE}http://localhost:8080/docs${NC}                                  ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • ReDoc:   ${BLUE}http://localhost:8080/redoc${NC}                                 ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Health Check:                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • ${BLUE}http://localhost:8080/health${NC}                                         ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Founder Fee: ${YELLOW}2.5%${NC} on every transaction                                    ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                                              ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}© QuranChain™ | Omar Mohammad Abunadi™${NC}"
echo ""

# Quick test
echo -e "${BLUE}Quick API Test:${NC}"
curl -s http://localhost:8080/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8080/health
