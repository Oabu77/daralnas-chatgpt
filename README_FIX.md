## Usage
1) **Freeze CI**: temporarily disable deploy workflows or remove `KUBE_CONFIG_BASE64` secret.
2) Run the fixer:
```bash
bash ops/fix-all.sh
```
   * You can override the target namespace with `NS=<name>` and the safe namespace with `SAFE_NS=<name>`; defaults are `default` and `mcp-tasks`.
3) Verify prod:
```bash
kubectl -n default get deploy,svc,ing -o wide
kubectl -n default get endpoints
```
4) Use the isolated sample at your Ingress path `/mcp-sample` (or set a dedicated host).
5) Re-enable CI. Deploy the sample only via deploy-safe.yaml (manual dispatch) to mcp-tasks.

Notes
- If your original Service/Ingress lacked last-applied annotations, restore them from Git history or your IaC source.
- Keep the sample image tag unique (`:mcp-tasks`) to avoid clobbering prod tags.

**a.** Want me to tailor this to your exact ingress (NGINX/ALB/Cloud Run) and domain so `/mcp-sample` is reachable?
**b.** Prefer Helm or Kustomize packaging so prod/staging/sample overlays never collide?
