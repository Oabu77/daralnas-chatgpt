#!/usr/bin/env bash
# Why: one-shot, idempotent recovery + isolation
set -euo pipefail

NS="${NS:-default}"
SAMPLE_DEPLOY="${SAMPLE_DEPLOY:-app-deploy}"
SAMPLE_SVC="${SAMPLE_SVC:-app-svc}"
SAMPLE_ING="${SAMPLE_ING:-app-ing}"
SAFE_NS="${SAFE_NS:-mcp-tasks}"
BACKUP_DIR="ops/backup/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1"; exit 1; }; }
need kubectl

echo "==> Freeze CI manually: disable deploy workflow or remove KUBE_CONFIG_BASE64 secret (reminder)."
echo "==> Backing up $NS resources to $BACKUP_DIR ..."
kubectl -n "$NS" get deploy,svc,ingress -o yaml > "$BACKUP_DIR/${NS}-deploy-svc-ing.yaml" || true

echo "==> Neutralize sample Deployment if present ..."
if kubectl -n "$NS" get deploy "$SAMPLE_DEPLOY" >/dev/null 2>&1; then
  # rollback if there is a previous revision, else scale to 0
  REV_COUNT=$(kubectl -n "$NS" rollout history deploy/"$SAMPLE_DEPLOY" | awk 'NR>1 && $1 ~ /^[0-9]+$/ {c++} END{print c+0}')
  if [ "${REV_COUNT:-0}" -gt 1 ]; then
    echo "   - Rolling back $SAMPLE_DEPLOY to previous revision"
    kubectl -n "$NS" rollout undo deploy/"$SAMPLE_DEPLOY" || true
  else
    echo "   - No history; scaling $SAMPLE_DEPLOY to 0"
    kubectl -n "$NS" scale deploy/"$SAMPLE_DEPLOY" --replicas=0 || true
  fi
else
  echo "   - $SAMPLE_DEPLOY not found; skipping"
fi

restore_from_last_applied() {
  local KIND="$1" NAME="$2"
  if ! kubectl -n "$NS" get "$KIND" "$NAME" >/dev/null 2>&1; then
    echo "   - $KIND/$NAME not found; skip"
    return 0
  fi
  local TMP="$BACKUP_DIR/${KIND}-${NAME}-lastapplied.json"
  kubectl -n "$NS" get "$KIND" "$NAME" -o json \
    | jq -r '.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"] // empty' > "$TMP" || true
  if [ -s "$TMP" ]; then
    echo "   - Restoring $KIND/$NAME from last-applied"
    kubectl -n "$NS" apply -f "$TMP" || true
  else
    echo "   - No last-applied for $KIND/$NAME; leaving as-is (manual review may be needed)"
  fi
}

echo "==> Attempting Service/Ingress restore (best-effort) ..."
command -v jq >/dev/null 2>&1 || echo "   - jq not installed; skipping last-applied restore"
if command -v jq >/dev/null 2>&1; then
  restore_from_last_applied service "$SAMPLE_SVC"
  restore_from_last_applied ingress "$SAMPLE_ING"
fi

echo "==> Checking endpoints and rollout ..."
kubectl -n "$NS" get deploy,rs,po,svc,ing -o wide || true
kubectl -n "$NS" get endpoints || true

echo "==> Create safe namespace + apply isolated sample (no traffic collision) ..."
sed "s/mcp-tasks/${SAFE_NS}/g" k8s/safe/namespace.yaml | kubectl apply -f -
kubectl -n "$SAFE_NS" apply -f k8s/safe/deploy.yaml
kubectl -n "$SAFE_NS" apply -f k8s/safe/service.yaml
if [ -f k8s/safe/ingress.yaml ]; then
  kubectl -n "$SAFE_NS" apply -f k8s/safe/ingress.yaml
fi
kubectl -n "$SAFE_NS" rollout status deploy/mcp-tasks-deploy --timeout=120s || true

echo "==> Safety: install guarded CI workflow (manual-only, namespace-checked)."
echo "   - Commit and push .github/workflows/deploy-safe.yaml"

echo "==> Done. Next:"
echo "   1) Re-enable CI only after verifying prod endpoints."
echo "   2) Use /mcp-sample path for the demo app; keep prod Ingress untouched."
