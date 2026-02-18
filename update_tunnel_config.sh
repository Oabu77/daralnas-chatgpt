#!/bin/bash
source /home/omar/.cloudflared/cloudflare.env

# Update tunnel ingress config via Cloudflare API
curl -s -X PUT \
  -H "X-Auth-Email: $CF_API_EMAIL" \
  -H "X-Auth-Key: $CF_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/cfd_tunnel/$CF_TUNNEL_ID/configurations" \
  -d '{
    "config": {
      "ingress": [
        {"hostname": "darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "www.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "meshtalk.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "whispernet.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "daralnas.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "logistics.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "qex.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "darpay.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "tokens.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "aiagents.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "core.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "shop.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "marketplace.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "api.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "hub.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "payments.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "crypto.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "finance.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "commerce.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "cloud.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "health.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "storage.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "telecom.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "humanitarian.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "blockchain.darcloud.host", "service": "http://localhost:3001"},
        {"hostname": "rpc.darcloud.host", "service": "http://localhost:3001"},
        {"hostname": "chain.darcloud.host", "service": "http://localhost:3001"},
        {"hostname": "explorer.darcloud.host", "service": "http://localhost:3001"},
        {"hostname": "mainnet.darcloud.host", "service": "http://localhost:3001"},
        {"hostname": "mesh.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "fungi.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "fungi2.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "fungi3.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "fungi4.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "fungi5.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "fungi6.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "fungi7.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "fungi8.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "mesh-control.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "mesh-monitor.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "mesh-api.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "5g.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "open5g.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "radio.darcloud.host", "service": "http://localhost:5006"},
        {"hostname": "ai.darcloud.host", "service": "http://localhost:3000"},
        {"hostname": "orchestrator.darcloud.host", "service": "http://localhost:3000"},
        {"service": "http_status:404"}
      ]
    }
  }' | python3 -m json.tool 2>/dev/null
