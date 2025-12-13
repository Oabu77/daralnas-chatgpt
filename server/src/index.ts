import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 2091);
const MCP_PATH = process.env.MCP_PATH ?? "/mcp";

type Task = { id: string; title: string; completed: boolean };
let tasks: Task[] = [];
let nextId = 1;

const widgetHtml = readFileSync("public/orders-widget.html", "utf8");

const AddTaskSchema = z.object({ title: z.string().min(1) });
const CompleteTaskSchema = z.object({ id: z.string().min(1) });

function reply(message: string | null, payload: Record<string, unknown>, meta?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: message ?? "" }],
    structuredContent: payload,
    _meta: meta ?? {}
  };
}

function createMcpServer() {
  const server = new McpServer({ name: "tasks-app", version: "1.0.0" });

  server.registerResource(
    "tasks-widget",
    "ui://widget/tasks.html",
    {},
    async () => ({
      contents: [
        {
          uri: "ui://widget/tasks.html",
          mimeType: "text/html+skybridge",
          text: widgetHtml,
          _meta: {
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: ["https://chatgpt.com"],
              resource_domains: []
            }
          }
        }
      ]
    })
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "Returns the current task list.",
      inputSchema: {},
      _meta: {
        "openai/outputTemplate": "ui://widget/tasks.html",
        "openai/toolInvocation/invoking": "Listing tasks…",
        "openai/toolInvocation/invoked": "Listed tasks"
      }
    },
    async () => {
      return reply(null, { tasks });
    }
  );

  server.registerTool(
    "add_task",
    {
      title: "Add task",
      description: "Create a new task with a title.",
      inputSchema: { title: z.string().min(1) },
      _meta: {
        "openai/outputTemplate": "ui://widget/tasks.html",
        "openai/toolInvocation/invoking": "Adding task…",
        "openai/toolInvocation/invoked": "Task added"
      }
    },
    async (args) => {
      const parsed = AddTaskSchema.safeParse(args);
      if (!parsed.success) {
        return reply("Invalid input: title is required.", { tasks, error: parsed.error.flatten() });
      }
      const title = parsed.data.title.trim();
      if (!title) return reply("Title cannot be empty.", { tasks });

      const task: Task = { id: `task-${nextId++}`, title, completed: false };
      tasks = [...tasks, task];
      return reply(`Added “${task.title}”.`, { tasks, created: task });
    }
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete a task",
      description: "Mark a task complete by id.",
      inputSchema: { id: z.string().min(1) },
      _meta: {
        "openai/outputTemplate": "ui://widget/tasks.html",
        "openai/toolInvocation/invoking": "Completing task…",
        "openai/toolInvocation/invoked": "Task completed"
      }
    },
    async (args) => {
      const parsed = CompleteTaskSchema.safeParse(args);
      if (!parsed.success) {
        return reply("Invalid input: id is required.", { tasks, error: parsed.error.flatten() });
      }
      const { id } = parsed.data;
      const found = tasks.find((t) => t.id === id);
      if (!found) return reply(`Task ${id} not found.`, { tasks });

      tasks = tasks.map((t) => (t.id === id ? { ...t, completed: true } : t));
      return reply(`Completed “${found.title}”.`, { tasks, updatedId: id });
    }
  );

  server.registerTool(
    "health_check",
    {
      title: "Health check",
      description: "Reports server health and uptime.",
      inputSchema: {},
      _meta: {
        "openai/toolInvocation/invoking": "Checking health…",
        "openai/toolInvocation/invoked": "Health OK"
      }
    },
    async () => {
      return reply(null, {
        ok: true,
        uptimeSec: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      });
    }
  );

  return server;
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const start = Date.now();
  try {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, mcp-session-id",
        "Access-Control-Expose-Headers": "Mcp-Session-Id"
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/plain" }).end("MCP server alive");
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/.well-known/")) {
      res.writeHead(404).end("Not configured");
      return;
    }

    const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
    if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });

      res.on("close", () => {
        transport.close();
        server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404).end("Not Found");
  } catch (err) {
    console.error("Unhandled error:", err);
    if (!res.headersSent) res.writeHead(500).end("Internal server error");
  } finally {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.url} -> ${res.statusCode} (${ms}ms)`);
  }
});

httpServer.listen(PORT, () => {
  console.log(`MCP server listening on http://localhost:${PORT}${MCP_PATH}`);
});
