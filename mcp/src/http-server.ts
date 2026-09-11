#!/usr/bin/env node
/**
 * QuranChain MCP HTTP Server — security-hardened transport boundary.
 *
 * Protected endpoints require a server-controlled bearer credential before
 * request parsing, session creation, SSE setup, or backend/tool dispatch.
 */

import express from "express";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import keccak256 from "keccak256";

const MCP_PORT = parseInt(process.env.MCP_PORT || "3100", 10);
const MCP_BIND_HOST = (process.env.MCP_BIND_HOST || "127.0.0.1").trim();
const MCP_ALLOW_REMOTE = process.env.MCP_ALLOW_REMOTE === "1";
const MCP_CONTROL_TOKEN = process.env.MCP_CONTROL_TOKEN || "";
const MCP_ALLOW_AUTH_TOOL = process.env.MCP_ALLOW_AUTH_TOOL === "1";
const MCP_MAX_BODY_BYTES = 256 * 1024;
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";
const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL || "http://localhost:3001";
const MCP_ALLOWED_ORIGINS = new Set(
  (process.env.MCP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host.toLowerCase() === "localhost";
}

function hasStrongControlToken(): boolean {
  return MCP_CONTROL_TOKEN.length >= 32;
}

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function controlTokenMatches(candidate: string): boolean {
  if (!hasStrongControlToken() || !candidate) return false;
  const expected = createHash("sha256").update(MCP_CONTROL_TOKEN).digest();
  const actual = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expected, actual);
}

function createMcpServer(): Server {
  const server = new Server(
    { name: "quranchain-mcp-server", version: "2.1.0" },
    { capabilities: { tools: {}, logging: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [
      {
        name: "get_verse",
        description: "Retrieve a Quran verse by Surah and Ayah numbers from the QuranChain blockchain",
        inputSchema: {
          type: "object" as const,
          properties: {
            surahNumber: { type: "number", description: "Surah number (1-114)", minimum: 1, maximum: 114 },
            verseNumber: { type: "number", description: "Verse number within the Surah", minimum: 1 },
          },
          required: ["surahNumber", "verseNumber"],
        },
      },
      {
        name: "get_translations",
        description: "Get available translations for a specific Quran verse",
        inputSchema: {
          type: "object" as const,
          properties: { verseId: { type: "string", description: "The verse ID to get translations for" } },
          required: ["verseId"],
        },
      },
      {
        name: "verify_hash",
        description: "Verify blockchain data integrity using Keccak-256 hash",
        inputSchema: {
          type: "object" as const,
          properties: {
            data: { type: "object", description: "The data object to verify" },
            hash: { type: "string", description: "The expected Keccak-256 hash" },
          },
          required: ["data", "hash"],
        },
      },
      {
        name: "get_blockchain_status",
        description: "Get QuranChain blockchain status — chain height, mesh peers, gas toll, validators, founder royalty",
        inputSchema: { type: "object" as const, properties: {}, required: [] },
      },
      {
        name: "get_darcloud_services",
        description: "Get health status of all DarCloud services (hosting, CDN, storage, domains, SSL, mesh deployer)",
        inputSchema: { type: "object" as const, properties: {}, required: [] },
      },
      {
        name: "get_revenue_status",
        description: "Get live revenue metrics — gas tolls, enterprise billing, fiat payments, founder royalty",
        inputSchema: { type: "object" as const, properties: {}, required: [] },
      },
      {
        name: "get_fungi_mesh_status",
        description: "Get FungiMesh P2P network status — peer count, compute pool, edge nodes, enrolled devices",
        inputSchema: { type: "object" as const, properties: {}, required: [] },
      },
    ];

    if (MCP_ALLOW_AUTH_TOOL) {
      tools.push({
        name: "authenticate_user",
        description: "Authenticate a user against QuranChain and return the backend response to an authorized MCP operator",
        inputSchema: {
          type: "object" as const,
          properties: {
            email: { type: "string", description: "User email" },
            password: { type: "string", description: "User password" },
          },
          required: ["email", "password"],
        },
      });
    }

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_verse": {
          const r = await axios.get(`${API_BASE_URL}/verses/surah/${args!.surahNumber}/ayah/${args!.verseNumber}`);
          return { content: [{ type: "text", text: JSON.stringify(r.data.data ?? r.data, null, 2) }] };
        }
        case "get_translations": {
          const r = await axios.get(`${API_BASE_URL}/translations/verse/${args!.verseId}`);
          return { content: [{ type: "text", text: JSON.stringify(r.data.data ?? r.data, null, 2) }] };
        }
        case "verify_hash": {
          const computed = "0x" + keccak256(JSON.stringify(args!.data)).toString("hex");
          const isValid = computed === args!.hash;
          return { content: [{ type: "text", text: JSON.stringify({ isValid, computedHash: computed }, null, 2) }] };
        }
        case "authenticate_user": {
          if (!MCP_ALLOW_AUTH_TOOL) {
            throw new McpError(ErrorCode.MethodNotFound, "Unknown tool: authenticate_user");
          }
          const r = await axios.post(`${API_BASE_URL}/auth/login`, { email: args!.email, password: args!.password });
          return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
        }
        case "get_blockchain_status": {
          try {
            const r = await axios.get(`${BLOCKCHAIN_URL}/health`, { timeout: 5000 });
            const d = r.data;
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: d.status,
                  chain_height: d.blockchain?.height,
                  mesh_peers: d.mesh?.peers,
                  gas_toll_collected: d.gasTollHighway?.totalCollected,
                  founder_royalty: d.gasTollHighway?.founderRoyalty,
                  agent_fleet: d.liveAgentFleet?.totalAgents,
                  validator: d.validator?.running,
                }, null, 2),
              }],
            };
          } catch {
            return { content: [{ type: "text", text: JSON.stringify({ error: "Blockchain status unavailable" }) }] };
          }
        }
        case "get_darcloud_services": {
          const services: Record<string, number> = {
            web_hosting: 8080,
            domain_manager: 8081,
            cdn_distribution: 8083,
            mesh_deployer: 8084,
            cloud_storage: 8086,
            blockchain_storage: 8087,
            ssl_certificates: 8089,
            personal_cloud: 8091,
          };
          const results: Record<string, unknown> = {};
          for (const [svc, port] of Object.entries(services)) {
            try {
              const r = await axios.get(`http://localhost:${port}/health`, { timeout: 2000 });
              results[svc] = { port, status: r.status, healthy: r.status === 200 };
            } catch {
              results[svc] = { port, status: "unreachable", healthy: false };
            }
          }
          return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
        }
        case "get_revenue_status": {
          try {
            const r = await axios.get(`${BLOCKCHAIN_URL}/health`, { timeout: 5000 });
            const d = r.data;
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  gas_toll: {
                    total_collected: d.gasTollHighway?.totalCollected ?? 0,
                    total_tolls: d.gasTollHighway?.totalTolls ?? 0,
                    founder_royalty: d.gasTollHighway?.founderRoyalty ?? 0,
                  },
                  enterprise_billing: {
                    invoices_generated: d.enterpriseBilling?.invoiceGenerator?.totalGenerated ?? 0,
                    total_amount: d.enterpriseBilling?.invoiceGenerator?.totalAmount ?? 0,
                  },
                  revenue_distribution: {
                    founder_30pct: 0.30,
                    ai_validators_40pct: 0.40,
                    hardware_hosts_10pct: 0.10,
                    ecosystem_18pct: 0.18,
                    zakat_2pct: 0.02,
                  },
                }, null, 2),
              }],
            };
          } catch {
            return { content: [{ type: "text", text: JSON.stringify({ error: "Revenue status unavailable" }) }] };
          }
        }
        case "get_fungi_mesh_status": {
          try {
            const r = await axios.get(`${BLOCKCHAIN_URL}/health`, { timeout: 5000 });
            const d = r.data;
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  peers: d.mesh?.peers,
                  enrolled_devices: d.fungiMesh?.enrolledDevices,
                  compute_pool: d.fungiMesh?.computePool,
                  edge_nodes: d.fungiMesh?.edgeNodes,
                }, null, 2),
              }],
            };
          } catch {
            return { content: [{ type: "text", text: JSON.stringify({ error: "FungiMesh status unavailable" }) }] };
          }
        }
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error: unknown) {
      if (error instanceof McpError) throw error;
      throw new McpError(ErrorCode.InternalError, "Tool execution failed");
    }
  });

  return server;
}

const app = express();
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");

  const origin = req.headers.origin;
  if (origin && MCP_ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, mcp-session-id, Last-Event-ID");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  }

  if (req.method === "OPTIONS") {
    if (!origin || !MCP_ALLOWED_ORIGINS.has(origin)) {
      res.sendStatus(403);
      return;
    }
    res.sendStatus(204);
    return;
  }

  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", server: "quranchain-mcp-server", version: "2.1.0" });
});

app.use((req, res, next) => {
  if (!hasStrongControlToken()) {
    res.status(503).json({ error: "MCP authentication is not configured" });
    return;
  }

  const presented = bearerToken(req.headers.authorization);
  if (!presented) {
    res.setHeader("WWW-Authenticate", "Bearer");
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (!controlTokenMatches(presented)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
});

// Authentication is intentionally evaluated before body parsing.
app.use(express.json({ limit: MCP_MAX_BODY_BYTES }));

const transports: Record<string, StreamableHTTPServerTransport | SSEServerTransport> = {};

app.all("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports[sessionId]) {
      const transport = transports[sessionId];
      if (transport instanceof StreamableHTTPServerTransport) {
        await transport.handleRequest(req, res);
        return;
      }
      res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Session uses different transport" }, id: null });
      return;
    }

    if (req.method === "POST" && isInitializeRequest(req.body)) {
      const eventStore = new InMemoryEventStore();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        onsessioninitialized: (newSessionId) => {
          transports[newSessionId] = transport;
          console.log(`[MCP] StreamableHTTP session initialized: ${newSessionId}`);
        },
      });

      transport.onclose = () => {
        const sid = Object.keys(transports).find((key) => transports[key] === transport);
        if (sid) delete transports[sid];
      };

      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request" }, id: null });
  } catch {
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});

app.get("/sse", async (_req, res) => {
  const server = createMcpServer();
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
  await transport.start();
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (!transport || !(transport instanceof SSEServerTransport)) {
    res.status(400).send("Invalid or missing session");
    return;
  }
  await transport.handlePostMessage(req, res);
});

app.use((error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large" });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }
  next(error);
});

if (!isLoopbackHost(MCP_BIND_HOST) && (!MCP_ALLOW_REMOTE || !hasStrongControlToken())) {
  console.error("Refusing non-loopback MCP binding without MCP_ALLOW_REMOTE=1 and a strong MCP_CONTROL_TOKEN");
  process.exit(1);
}

app.listen(MCP_PORT, MCP_BIND_HOST, () => {
  console.log(`QuranChain MCP Server v2.1.0 listening on http://${MCP_BIND_HOST}:${MCP_PORT}`);
  console.log(`Remote binding: ${isLoopbackHost(MCP_BIND_HOST) ? "disabled" : "explicitly enabled"}`);
  console.log(`Browser origins configured: ${MCP_ALLOWED_ORIGINS.size}`);
  console.log(`authenticate_user tool: ${MCP_ALLOW_AUTH_TOOL ? "explicitly enabled" : "disabled"}`);
});

process.on("SIGINT", async () => {
  for (const sid of Object.keys(transports)) {
    try {
      await transports[sid].close?.();
      delete transports[sid];
    } catch {}
  }
  process.exit(0);
});
