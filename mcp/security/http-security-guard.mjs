import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../src/http-server.ts"), "utf8");

function indexOfOrThrow(fragment) {
  const index = source.indexOf(fragment);
  assert.notEqual(index, -1, `missing expected security fragment: ${fragment}`);
  return index;
}

assert.ok(source.includes('process.env.MCP_CONTROL_TOKEN || ""'), "control token must come from runtime environment");
assert.ok(source.includes('MCP_CONTROL_TOKEN.length >= 32'), "weak control tokens must fail closed");
assert.ok(source.includes('createHash("sha256")'), "token comparison must normalize to fixed-length digests");
assert.ok(source.includes('timingSafeEqual(expected, actual)'), "token comparison must be constant-time");
assert.ok(source.includes('process.env.MCP_BIND_HOST || "127.0.0.1"'), "default listener must be loopback");
assert.ok(source.includes('process.env.MCP_ALLOW_REMOTE === "1"'), "non-loopback exposure must require explicit opt-in");
assert.ok(source.includes('MCP_ALLOWED_ORIGINS.has(origin)'), "browser origins must use an exact allowlist");
assert.ok(!source.includes('Access-Control-Allow-Origin", "*"'), "wildcard CORS must not return");
assert.ok(source.includes('express.json({ limit: MCP_MAX_BODY_BYTES })'), "request body size must be bounded");
assert.ok(source.includes('process.env.MCP_ALLOW_AUTH_TOOL === "1"'), "backend login bridge must be disabled by default");

const authMiddleware = indexOfOrThrow('app.use((req, res, next) => {\n  if (!hasStrongControlToken())');
const bodyParser = indexOfOrThrow('app.use(express.json({ limit: MCP_MAX_BODY_BYTES }))');
const streamableRoute = indexOfOrThrow('app.all("/mcp"');
const legacySseRoute = indexOfOrThrow('app.get("/sse"');
const legacyMessagesRoute = indexOfOrThrow('app.post("/messages"');

assert.ok(authMiddleware < bodyParser, "authentication must execute before JSON parsing");
assert.ok(authMiddleware < streamableRoute, "authentication must execute before Streamable HTTP session handling");
assert.ok(authMiddleware < legacySseRoute, "authentication must execute before legacy SSE setup");
assert.ok(authMiddleware < legacyMessagesRoute, "authentication must execute before legacy message handling");

console.log("MCP HTTP security guard passed");
