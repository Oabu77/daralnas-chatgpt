import http from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const appServer = new McpServer({ name: "quranchain-mcp", version: "1.1.0" });

// Tools
appServer.tool("ping", z.object({}), async () => ({ status: "ok", service: "quranchain-mcp" }));

appServer.tool(
  "estimate_gas",
  z.object({ chain: z.string().min(1), gasLimit: z.number().int().positive() }),
  async ({ chain, gasLimit }) => {
    const wei = BigInt(gasLimit) * 1_000_000_000n; // 1 gwei per unit
    return { chain, gasLimit, estimatedCostWei: wei.toString() }; // BigInt → string for JSON
  }
);

appServer.tool(
  "get_order_status",
  z.object({ order_id: z.string().min(1) }),
  async ({ order_id }) => ({ order_id, status: "pending", source: "ledger" })
);

const PORT = Number(process.env.PORT) || 3333;

const start = async () => {
  const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true, sessionIdGenerator: undefined });
  await appServer.connect(transport);

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400).end();
      return;
    }
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "quranchain-mcp" }));
      return;
    }
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("Error handling request:", err);
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "internal_error" }));
    }
  });

  server.listen(PORT, () => {
    console.log(`MCP server running on port ${PORT}`);
  });

  const shutdown = (sig) => {
    console.log(`Received ${sig}, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
