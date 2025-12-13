#!/usr/bin/env bash
set -euo pipefail

info() {
        echo "=============================================="
        echo " $1"
        echo "=============================================="
}

require_root() {
        if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
                echo "This script must be run as root (sudo -i)." >&2
                exit 1
        fi
}

install_base_packages() {
        info "Installing base packages"
        apt-get update
        apt-get install -y \
                ca-certificates curl gnupg lsb-release unzip jq \
                redis-server nginx python3 python3-venv nodejs npm

        systemctl enable redis-server nginx
}

install_warp() {
        info "Installing Cloudflare WARP"
        curl https://pkg.cloudflareclient.com/pubkey.gpg \
                | gpg --yes --dearmor \
                --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg

        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" \
                > /etc/apt/sources.list.d/cloudflare-client.list

        apt-get update
        apt-get install -y cloudflare-warp
        systemctl enable warp-svc
}

install_cloudflared() {
        info "Installing cloudflared"
        curl -fsSL https://developers.cloudflare.com/cloudflare-one/static/install.sh | bash
}

install_docker() {
        info "Installing Docker"
        curl -fsSL https://get.docker.com | sh
        apt-get install -y docker-compose-plugin
        systemctl enable docker
}

create_directories() {
        info "Preparing directories at /opt/infra"
        mkdir -p /opt/infra/{mcp,logs,audit,keys,tunnel}
}

create_audit_logger() {
        info "Configuring audit logger"
        cat > /opt/infra/audit/audit_logger.py << 'PYEOF'
from flask import Flask, request
import json, datetime, os

app = Flask(__name__)
os.makedirs("/logs", exist_ok=True)

@app.route("/audit", methods=["POST"])
def audit():
    entry = {
        "ts": datetime.datetime.utcnow().isoformat(),
        "agent": request.headers.get("X-Agent-ID"),
        "role": request.headers.get("X-Agent-ROLE"),
        "data": request.json,
    }
    with open("/logs/audit.log", "a") as f:
        f.write(json.dumps(entry) + "\n")
    return {"ok": True}

app.run(host="0.0.0.0", port=4444)
PYEOF
}

create_agent_permissions() {
        info "Configuring agent permissions"
        cat > /opt/infra/mcp/agents.json << 'JSONEOF'
{
  "agents": {
    "admin": { "repos": ["*"], "actions": ["*"] },
    "reviewer": { "repos": ["*"], "actions": ["read", "comment"] },
    "ci": { "repos": ["core"], "actions": ["read", "write", "workflow"] }
  }
}
JSONEOF
}

create_docker_compose() {
        info "Writing docker-compose.yml"
        cat > /opt/infra/mcp/docker-compose.yml << 'DOCKEREOF'
version: "3.9"
services:
  github-mcp:
    image: ghcr.io/github/github-mcp-server:latest
    restart: unless-stopped
    ports: ["3333:3333"]
    environment:
      GITHUB_APP_ID: ${GITHUB_APP_ID}
      GITHUB_INSTALLATION_ID: ${GITHUB_INSTALLATION_ID}
      GITHUB_PRIVATE_KEY_PATH: /keys/github.pem
    volumes:
      - ./keys:/keys:ro

  audit:
    image: python:3.11-slim
    restart: unless-stopped
    command: sh -c "pip install flask && python /app/audit_logger.py"
    volumes:
      - ../audit:/app
      - ../logs:/logs
    ports: ["4444:4444"]

  redis:
    image: redis:7
    restart: unless-stopped
DOCKEREOF
}

bring_stack_up() {
        info "Starting docker compose stack"
        cd /opt/infra/mcp
        docker compose up -d
}

print_next_steps() {
        info "CORE STACK DEPLOYED"
        cat << 'STEPS'
----------------------------------------------
Next manual steps:
1. Place GitHub App private key at:
   /opt/infra/mcp/keys/github.pem
2. export GITHUB_APP_ID=xxxx
   export GITHUB_INSTALLATION_ID=xxxx
3. Restart: docker compose up -d
STEPS
}

main() {
        info "AUTONOMOUS INFRASTRUCTURE FULL EXECUTION"
        echo " Install · Deploy · Maintain · Expand"

        require_root
        install_base_packages
        install_warp
        install_cloudflared
        install_docker
        create_directories
        create_audit_logger
        create_agent_permissions
        create_docker_compose
        bring_stack_up
        print_next_steps
}

main "$@"
