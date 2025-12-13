import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const TOOL_NAMES = ["ping", "estimate_gas", "get_order_status"];

function createServer() {
  const server = new McpServer({
    name: "quranchain-mcp",
    version: "1.0.1"
  });

  server.tool(
    "ping",
    z.object({}),
    async () => {
      return { status: "ok", service: "quranchain-mcp" };
    }
  );

  // WHY: BigInt math + JSON serialization safety (return string).
  server.tool(
    "estimate_gas",
    z.object({
      chain: z.string().min(1),
      gasLimit: z.number().int().positive()
    }),
    async ({ chain, gasLimit }) => {
      const estimated = BigInt(gasLimit) * 1_000_000_000n; // 1 gwei * gas
      return {
        chain,
        gasLimit,
        estimatedCostWei: estimated.toString()
      };
    }
  );

  server.tool(
    "get_order_status",
    z.object({
      order_id: z.string().min(1)
    }),
    async ({ order_id }) => {
      return {
        order_id,
        status: "pending",
        source: "ledger"
      };
    }
  );

  return server;
}

async function handleMcpRequest(req, res) {
  const mcpServer = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  try {
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json" }).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error"
          },
          id: null
        })
      );
    }
  } finally {
    res.on("close", () => {
      transport.close().catch((closeError) => {
        console.error("Error closing transport:", closeError);
      });
      mcpServer.close().catch((closeError) => {
        console.error("Error closing MCP server:", closeError);
      });
    });
  }
}

const PORT = Number(process.env.PORT) || 3333;

const httpServer = http.createServer((req, res) => {
  if (!req.url || req.url !== "/mcp") {
    res.writeHead(404, { "content-type": "application/json" }).end(
      JSON.stringify({ error: "Not Found" })
    );
    return;
  }

  if (req.method === "POST") {
    void handleMcpRequest(req, res);
    return;
  }

  res.writeHead(405, { "content-type": "application/json" }).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null
    })
  );
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`MCP server listening on ${PORT}`);
  console.log(`Registered tools: ${TOOL_NAMES.join(", ")}`);
});

const shutdown = () => {
  console.log("Shutting down MCP server...");
  httpServer.close((error) => {
    if (error) {
      console.error("Error closing HTTP server:", error);
      process.exitCode = 1;
    }
    process.exit();
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
