# Cloudflare Tunnel Finalization Runbook

The commands below must be run **as root** on the target host to finish wiring the Cloudflare tunnels, lock down raw ports, and verify the deployment. The sequence assumes MCP (port 3333) and Audit (port 4444) services are already running locally.

## 1) Verify local services
```bash
docker ps
curl -fsS http://127.0.0.1:3333/health
curl -fsS -X POST http://127.0.0.1:4444/audit -H "Content-Type: application/json" -d '{}'
```

## 2) Authenticate Cloudflare & create tunnel (once)
```bash
cloudflared tunnel login
cloudflared tunnel create sovereign-core || true

TUNNEL_ID=$(cloudflared tunnel list | awk '/sovereign-core/{print $1}')
echo "Tunnel ID: $TUNNEL_ID"
```

## 3) Write systemd-persistent tunnel config
```bash
mkdir -p /etc/cloudflared
cat >/etc/cloudflared/config.yml <<EOF2
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json
ingress:
  - hostname: ${MCP_HOST}
    service: http://127.0.0.1:3333
  - hostname: audit.${DOMAIN}
    service: http://127.0.0.1:4444
  - service: http_status:404
EOF2
```

## 4) Bind DNS (no open ports)
```bash
cloudflared tunnel route dns sovereign-core ${MCP_HOST}
cloudflared tunnel route dns sovereign-core audit.${DOMAIN}
```

## 5) Install & enable tunnel as a service
```bash
cloudflared service install
systemctl enable cloudflared
systemctl restart cloudflared
systemctl status cloudflared --no-pager
```

## 6) Lock down raw ports (tunnel-only ingress)
```bash
ufw allow ssh
ufw deny 3333
ufw deny 4444
ufw enable
```

## 7) External verification (HTTPS via tunnel)
```bash
curl -fsS https://${MCP_HOST}/health
curl -fsS -X POST https://audit.${DOMAIN}/audit -H "Content-Type: application/json" -d '{}'

tail -n 5 /opt/sovereign/logs/audit.log
```

## 8) Workers + Workflows (deploy & verify)
```bash
cd /opt/sovereign/workers
npx wrangler login
npx wrangler deploy
npx wrangler workflows list
# Expected workflows:
#   - InfraApproval
#   - PRReviewMerge
#   - KeyRotation
```

## 9) Pages Approval UI (public, HTTPS)
```bash
cd /opt/sovereign/pages
npx wrangler pages deploy .
# Save the resulting Pages URL as the Approval UI endpoint.
```

## 10) Final health snapshot
```bash
echo "MCP:" && curl -fsS https://${MCP_HOST}/health
echo "Tunnel:" && systemctl is-active cloudflared
echo "Containers:" && docker ps --format 'table {{.Names}}\t{{.Status}}'
echo "Audit (last 5):" && tail -n 5 /opt/sovereign/logs/audit.log
```

## Final state checklist
- MCP reachable only via HTTPS tunnel
- Audit logging live and append-only
- Cloudflare Tunnel persistent via systemd
- Workers + Workflows deployed and triggerable
- Human approval UI live via Pages
- No raw public ports exposed
- Configuration survives reboot
