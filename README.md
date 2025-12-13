# Tasks MCP Server

Minimal MCP server for the ChatGPT Apps SDK featuring a streamable HTTP transport, task tools, and an embedded widget resource.

## Features
- Pure Node HTTP server (no frameworks) with CORS-ready `/mcp` endpoint supporting POST, GET, DELETE, and preflight OPTIONS.
- MCP tools: `list_tasks`, `add_task`, `complete_task`, and `health_check`, all returning `{ content, structuredContent, _meta }`.
- Registered widget resource `ui://widget/tasks.html` served as `text/html+skybridge`, powered by `public/orders-widget.html`.
- In-memory task state with zod validation and OpenAI widget metadata for seamless rendering.
- Dockerfile for HTTPS-friendly deployments and instructions for local testing via ngrok.

## Requirements
- Node.js 20+
- npm 10+

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build and start:
   ```bash
   npm run build
   npm start
   ```
   Server runs at `http://localhost:2091`. Health check: `GET /` → `MCP server alive`. MCP endpoint: `http://localhost:2091/mcp`.
3. Development mode with auto-reload:
   ```bash
   npm run dev
   ```

## MCP Inspector
Use the official inspector to exercise the tools and widget:
```bash
npx @modelcontextprotocol/inspector@latest http://localhost:2091/mcp
```

## Ngrok Testing
Expose the server securely for ChatGPT connectors:
```bash
ngrok http 2091
```
Use the forwarded URL: `https://<subdomain>.ngrok.app/mcp` when configuring ChatGPT → Settings → Connectors.

## Deployment
- Dockerfile is optimized for streaming-friendly platforms (Fly.io, Render, Railway, Cloud Run, Kubernetes). Ensure HTTPS termination and SSE/streamable HTTP pass-through are enabled.
- Keep cold starts low; rely on environment variables for configuration (`PORT`, `MCP_PATH`). Store secrets in your platform’s secret manager—never hardcode them.
- Container entrypoint: `node dist/server/src/index.js`. Exposes port `2091` by default.

## Tool Contract
Every tool returns the strict shape:
```json
{
  "content": "human-friendly narration",
  "structuredContent": { /* reliable JSON payload */ },
  "_meta": { /* UI-only metadata; optional */ }
}
```

Metadata includes `openai/outputTemplate` and invocation messages so ChatGPT renders the widget `ui://widget/tasks.html`. Avoid placing secrets in any of these fields.

## Widget Behavior
The widget reads `window.openai.toolOutput.structuredContent.tasks`, renders the list with completion state, and calls tools via `window.openai.callTool`. If `callTool` is unavailable (offline/fallback), it simulates add/complete locally. It calls `window.openai.notifyIntrinsicHeight()` after layout changes for smooth embedding.

## Repository Structure
- `server/src/index.ts`: HTTP server, MCP server, tools, and resource registration.
- `public/orders-widget.html`: Widget markup/logic for tasks.
- `Dockerfile`, `.dockerignore`: Container packaging.
- `tsconfig.json`, `package.json`: TypeScript build configuration and scripts.

## Notes
- `.well-known/*` paths intentionally return 404 to avoid auth noise.
- CORS preflight on `/mcp` includes `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS`, `Access-Control-Allow-Headers: content-type, mcp-session-id`, and `Access-Control-Expose-Headers: Mcp-Session-Id`.
- Keep responses minimal and avoid embedding sensitive data in `content`, `structuredContent`, or `_meta`.
