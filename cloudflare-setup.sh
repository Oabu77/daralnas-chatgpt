#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
# ═══════════════════════════════════════════════════════════════
# 🌐 QuranChain-OS — Cloudflare DNS & Tunnel Setup
# Creates CNAME records for all platform subdomains
# Links everything to the Cloudflare Argo Tunnel
#
# Usage: bash cloudflare-setup.sh
# Founder: Omar Mohammad Abunadi™
# ═══════════════════════════════════════════════════════════════

CF_API_KEY="1b781976c6025473c6218e1fc608328bca296"
CF_API_EMAIL="omarabunadi28@gmail.com"
CF_ZONE_ID="7b621a2a5e20fbd7c75a2f1daf51ae9f"
CF_ACCOUNT_ID="3bfc21f5baba642160ec706818e3a19f"
CF_TUNNEL_ID="e7247d58-41d4-4db7-b690-85d34ac99121"
CF_DOMAIN="darcloud.host"
TUNNEL_CNAME="${CF_TUNNEL_ID}.cfargotunnel.com"
API="https://api.cloudflare.com/client/v4"

echo "═══════════════════════════════════════════════════════════"
echo "🌐 QuranChain-OS — Cloudflare DNS Setup"
echo "═══════════════════════════════════════════════════════════"
echo "  Zone:    ${CF_DOMAIN} (${CF_ZONE_ID})"
echo "  Tunnel:  ${CF_TUNNEL_ID}"
echo "  CNAME:   ${TUNNEL_CNAME}"
echo "═══════════════════════════════════════════════════════════"

SUBS=(
  "@" "www"
  "meshtalk" "whispernet" "daralnas" "logistics" "qex" "darpay" "tokens" "aiagents" "core" "shop" "marketplace"
  "api" "hub" "ai" "orchestrator" "blockchain" "rpc" "payments" "crypto" "finance" "cloud" "health" "commerce" "storage" "telecom" "humanitarian"
  "mesh" "mesh-control" "mesh-monitor" "mesh-api" "mesh-sync"
  "fungi" "fungi2" "fungi3" "fungi4" "fungi5" "fungi6" "fungi7" "fungi8" "fungi-backup"
)

SUCCESS=0
SKIPPED=0
FAILED=0

cf_api() {
  local method="$1"
  local path="$2"
  shift 2
  curl -s -X "$method" "${API}${path}" \
    -H "X-Auth-Email: ${CF_API_EMAIL}" \
    -H "X-Auth-Key: ${CF_API_KEY}" \
    -H "Content-Type: application/json" \
    "$@"
}

create_record() {
  local sub="$1"
  local name
  if [[ "$sub" == "@" ]]; then
    name="${CF_DOMAIN}"
  else
    name="${sub}.${CF_DOMAIN}"
  fi

  local resp
  resp=$(cf_api GET "/zones/${CF_ZONE_ID}/dns_records?name=${name}")
  local count
  count=$(echo "$resp" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('result',[])))" 2>/dev/null || echo "0")

  if [[ "$count" -gt 0 ]]; then
    local rtype rid current_content
    rtype=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['type'])" 2>/dev/null)
    rid=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])" 2>/dev/null)
    current_content=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['content'])" 2>/dev/null)

    if [[ "$rtype" == "A" || "$rtype" == "AAAA" ]]; then
      echo "  ⏭  ${name} — has ${rtype} record (${current_content}), keeping"
      SKIPPED=$((SKIPPED + 1))
      return
    fi

    if [[ "$current_content" == "$TUNNEL_CNAME" ]]; then
      echo "  ✓  ${name} — already points to tunnel"
      SKIPPED=$((SKIPPED + 1))
      return
    fi

    local ok
    ok=$(cf_api PUT "/zones/${CF_ZONE_ID}/dns_records/${rid}" \
      --data "{\"type\":\"CNAME\",\"name\":\"${name}\",\"content\":\"${TUNNEL_CNAME}\",\"proxied\":true,\"ttl\":1}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [[ "$ok" == "True" ]]; then
      echo "  ✅ ${name} → tunnel (updated)"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "  ⚠️  ${name} — update failed"
      FAILED=$((FAILED + 1))
    fi
  else
    local ok
    ok=$(cf_api POST "/zones/${CF_ZONE_ID}/dns_records" \
      --data "{\"type\":\"CNAME\",\"name\":\"${name}\",\"content\":\"${TUNNEL_CNAME}\",\"proxied\":true,\"ttl\":1}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [[ "$ok" == "True" ]]; then
      echo "  ✅ ${name} → tunnel (created)"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "  ❌ ${name} — create failed"
      FAILED=$((FAILED + 1))
    fi
  fi
}

echo ""
echo "Creating DNS records (${#SUBS[@]} subdomains)..."
echo ""

for sub in "${SUBS[@]}"; do
  create_record "$sub"
  sleep 0.25
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  DNS: ✅ ${SUCCESS} ok | ⏭ ${SKIPPED} skipped | ❌ ${FAILED} failed"
echo "═══════════════════════════════════════════════════════════"

echo ""
echo "Configuring zone settings..."

set_zone() {
  local setting="$1" value="$2" label="$3"
  local ok
  ok=$(cf_api PATCH "/zones/${CF_ZONE_ID}/settings/${setting}" --data "{\"value\":${value}}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
  if [[ "$ok" == "True" ]]; then
    echo "  ✅ ${label}"
  else
    echo "  ⚠️  ${label} — skipped"
  fi
}

set_zone "ssl" '"full"' "SSL/TLS: Full"
set_zone "min_tls_version" '"1.2"' "Min TLS: 1.2"
set_zone "always_use_https" '"on"' "Always HTTPS: on"
set_zone "brotli" '"on"' "Brotli: on"
set_zone "http2" '"on"' "HTTP/2: on"
set_zone "websockets" '"on"' "WebSockets: on"
set_zone "browser_cache_ttl" '14400' "Browser Cache: 4h"
set_zone "security_level" '"medium"' "Security: medium"
set_zone "minify" '{"js":"on","css":"on","html":"on"}' "Auto Minify: on"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🎉 Cloudflare setup complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Platform Sites Live:"
echo "    https://darcloud.host             → Main storefront"
echo "    https://meshtalk.darcloud.host    → MeshTalk"
echo "    https://whispernet.darcloud.host  → WhisperNet VPN"
echo "    https://daralnas.darcloud.host    → Dar Al-Nas"
echo "    https://logistics.darcloud.host   → Logistics"
echo "    https://qex.darcloud.host         → QEX Exchange"
echo "    https://darpay.darcloud.host      → DarPay"
echo "    https://tokens.darcloud.host      → QCOIN & Tokens"
echo "    https://aiagents.darcloud.host    → AI Agent School"
echo "    https://core.darcloud.host        → QuranChain Core"
echo "    https://marketplace.darcloud.host → AI Commerce Marketplace"
echo "    https://shop.darcloud.host        → Product Shop"
echo ""
echo "  © Omar Mohammad Abunadi™"
echo "═══════════════════════════════════════════════════════════"
