#!/usr/bin/env node
/**
 * QuranChain MCP HTTP Server — OpenAI-Compatible
 * 
 * Exposes the QuranChain MCP tools over HTTP so OpenAI agents,
 * Claude Desktop, and any MCP-compatible client can connect remotely.
 * 
 * Endpoints:
 *   POST /mcp      — Streamable HTTP transport (OpenAI standard)
 *   GET  /mcp      — SSE stream for Streamable HTTP
 *   DELETE /mcp    — Session termination
 *   GET  /sse      — Legacy SSE transport (Claude Desktop compat)
 *   POST /messages — Legacy message endpoint for SSE transport
 *   GET  /health   — Health check
 * 
 * Port: 3100 (MCP_PORT env override)
 * 
 * Founder: Omar Mohammad Abunadi™
 * FOUNDER_ROYALTY_RATE = 0.30 (IMMUTABLE)
 */

import express from "express";
import { randomUUID } from "node:crypto";
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
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";
const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL || "http://localhost:3001";

// ═══════════════════════════════════════════════════════════
// MCP Server Factory — creates a fresh server instance per session
// ═══════════════════════════════════════════════════════════

function createMcpServer(): Server {
  const server = new Server(
    {
      name: "quranchain-mcp-server",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  // ── Tool List ──────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
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
          properties: {
            verseId: { type: "string", description: "The verse ID to get translations for" },
          },
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
        name: "authenticate_user",
        description: "Authenticate a user against QuranChain and return a JWT token",
        inputSchema: {
          type: "object" as const,
          properties: {
            email: { type: "string", description: "User email" },
            password: { type: "string", description: "User password" },
          },
          required: ["email", "password"],
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
        description: "Get live revenue metrics — gas tolls, enterprise billing, fiat payments, founder royalty (30% IMMUTABLE)",
        inputSchema: { type: "object" as const, properties: {}, required: [] },
      },
      {
        name: "get_fungi_mesh_status",
        description: "Get FungiMesh P2P network status — peer count, compute pool, edge nodes, enrolled devices",
        inputSchema: { type: "object" as const, properties: {}, required: [] },
      },
    ],
  }));

  // ── Tool Execution ─────────────────────────────────────
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
          } catch (e: any) {
            return { content: [{ type: "text", text: JSON.stringify({ error: e.message, hint: "Blockchain server may be down on port 3001" }) }] };
          }
        }

        case "get_darcloud_services": {
          const services: Record<string, number> = {
            web_hosting: 8080, domain_manager: 8081, cdn_distribution: 8083,
            mesh_deployer: 8084, cloud_storage: 8086, blockchain_storage: 8087,
            ssl_certificates: 8089, personal_cloud: 8091,
          };
          const results: Record<string, any> = {};
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
          } catch (e: any) {
            return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
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
          } catch (e: any) {
            return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }] };
          }
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error: any) {
      if (error instanceof McpError) throw error;
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
    }
  });

  return server;
}


// ═══════════════════════════════════════════════════════════
// Express App — Dual transport (StreamableHTTP + SSE)
// ═══════════════════════════════════════════════════════════

const app = express();
app.use(express.json());

// Allow cross-origin for OpenAI / browser clients
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Last-Event-ID");
  res.header("Access-Control-Expose-Headers", "mcp-session-id");
  next();
});
app.options("/{*path}", (_req, res) => res.sendStatus(204));

// Transport storage
const transports: Record<string, StreamableHTTPServerTransport | SSEServerTransport> = {};

// ── Health Check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    server: "quranchain-mcp-server",
    version: "2.0.0",
    transports: ["streamable-http", "sse"],
    tools: 8,
    activeSessions: Object.keys(transports).length,
    founder: "Omar Mohammad Abunadi™",
    royalty: "30% IMMUTABLE",
  });
});

// ── Streamable HTTP Transport (POST/GET/DELETE /mcp) ─────
app.all("/mcp", async (req, res) => {
  console.log(`[MCP] ${req.method} /mcp`);

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

    // New session — only accept POST with initialize
    if (req.method === "POST") {
      const body = req.body;
      if (isInitializeRequest(body)) {
        const eventStore = new InMemoryEventStore();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          eventStore,
          onsessioninitialized: (sessionId) => {
            transports[sessionId] = transport;
            console.log(`[MCP] New StreamableHTTP session: ${sessionId}`);
          },
        });

        transport.onclose = () => {
          const sid = Object.keys(transports).find((k) => transports[k] === transport);
          if (sid) {
            delete transports[sid];
            console.log(`[MCP] Session closed: ${sid}`);
          }
        };

        const server = createMcpServer();
        await server.connect(transport);
        await transport.handleRequest(req, res);
        return;
      }
    }

    // No valid session
    res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: No valid session. Send an initialize request first." }, id: null });
  } catch (error) {
    console.error("[MCP] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});

// ── Legacy SSE Transport (GET /sse + POST /messages) ─────
app.get("/sse", async (req, res) => {
  console.log("[MCP] Legacy SSE connection");
  const server = createMcpServer();
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  
  res.on("close", () => {
    delete transports[transport.sessionId];
    console.log(`[MCP] SSE session closed: ${transport.sessionId}`);
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


// ═══════════════════════════════════════════════════════════
// Start
// ═══════════════════════════════════════════════════════════

app.listen(MCP_PORT, () => {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" QuranChain MCP Server v2.0.0 — OpenAI Compatible");
  console.log(` Listening on http://localhost:${MCP_PORT}`);
  console.log(` Streamable HTTP: POST/GET/DELETE http://localhost:${MCP_PORT}/mcp`);
  console.log(` Legacy SSE:      GET http://localhost:${MCP_PORT}/sse`);
  console.log(` Health:          GET http://localhost:${MCP_PORT}/health`);
  console.log(` Tools: 8 (get_verse, get_translations, verify_hash, authenticate_user,`);
  console.log(`         get_blockchain_status, get_darcloud_services, get_revenue_status, get_fungi_mesh_status)`);
  console.log(` API Backend: ${API_BASE_URL}`);
  console.log(` Blockchain: ${BLOCKCHAIN_URL}`);
  console.log(" Founder: Omar Mohammad Abunadi™ | Royalty: 30% IMMUTABLE");
  console.log("═══════════════════════════════════════════════════════════");
});

process.on("SIGINT", async () => {
  console.log("\nShutting down MCP server...");
  for (const sid of Object.keys(transports)) {
    try {
      await transports[sid].close?.();
      delete transports[sid];
    } catch {}
  }
  process.exit(0);
});
