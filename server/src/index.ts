import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

type ToolResponse<T extends Record<string, unknown>> = {
  content: string;
  structuredContent: T;
  _meta?: Record<string, unknown>;
};

const PORT = Number(process.env.PORT ?? 2091);
const MCP_PATH = process.env.MCP_PATH ?? '/mcp';
const serverStart = Date.now();

const widgetPath = resolve(
  fileURLToPath(new URL('../../public/orders-widget.html', import.meta.url))
);

const tasks: Task[] = [];
let nextId = 1;

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

const mcpServer = new McpServer({ name: 'tasks-app', version: '1.0.0' });

const outputMeta = {
  'openai/outputTemplate': 'ui://widget/tasks.html',
  'openai/toolInvocation/invoking': 'Working on it…',
  'openai/toolInvocation/invoked': 'Done.',
};

const toResult = <T extends Record<string, unknown>>(payload: ToolResponse<T>): CallToolResult =>
  payload as unknown as CallToolResult;

mcpServer.registerResource(
  'tasks-widget',
  'ui://widget/tasks.html',
  {
    mimeType: 'text/html+skybridge',
    _meta: {
      'openai/widgetPrefersBorder': true,
      'openai/widgetCSP': {
        connect_domains: ['https://chatgpt.com'],
        resource_domains: [],
      },
    },
  },
  async () => {
    const html = await readFile(widgetPath, 'utf8');
    return {
      contents: [
        {
          uri: 'ui://widget/tasks.html',
          mimeType: 'text/html+skybridge',
          text: html,
        },
      ],
    };
  }
);

const tasksOutputSchema = z.object({ tasks: z.array(taskSchema) });

mcpServer.registerTool(
  'list_tasks',
  {
    description: 'List all tasks',
    outputSchema: tasksOutputSchema,
    _meta: outputMeta,
  },
  () =>
    toResult({
      content: 'Current task list',
      structuredContent: { tasks: tasks.map(task => ({ ...task })) },
      _meta: outputMeta,
    })
);

mcpServer.registerTool(
  'add_task',
  {
    description: 'Add a task with a title',
    inputSchema: z.object({
      title: z.string().trim().min(1),
    }),
    outputSchema: tasksOutputSchema.extend({
      created: taskSchema,
    }),
    _meta: outputMeta,
  },
  ({ title }) => {
    const task: Task = { id: String(nextId++), title: title.trim(), completed: false };
    tasks.push(task);
    return toResult({
      content: `Added task: ${task.title}`,
      structuredContent: { tasks: tasks.map(item => ({ ...item })), created: task },
      _meta: outputMeta,
    });
  }
);

mcpServer.registerTool(
  'complete_task',
  {
    description: 'Mark a task completed by id',
    inputSchema: z.object({ id: z.string() }),
    outputSchema: tasksOutputSchema.extend({ updatedId: z.string().nullable() }),
    _meta: outputMeta,
  },
  ({ id }) => {
    const task = tasks.find(item => item.id === id);
    if (task) {
      task.completed = true;
    }
    return toResult({
      content: task ? `Completed task ${id}` : `Task ${id} not found`,
      structuredContent: {
        tasks: tasks.map(item => ({ ...item })),
        updatedId: task ? task.id : null,
      },
      _meta: outputMeta,
    });
  }
);

mcpServer.registerTool(
  'health_check',
  {
    description: 'Check server health and uptime',
    outputSchema: z.object({
      ok: z.boolean(),
      uptimeSec: z.number(),
      timestamp: z.string(),
    }),
    _meta: outputMeta,
  },
  () => {
    const uptimeSec = (Date.now() - serverStart) / 1000;
    return toResult({
      content: 'Server health reported',
      structuredContent: {
        ok: true,
        uptimeSec,
        timestamp: new Date().toISOString(),
      },
      _meta: outputMeta,
    });
  }
);

const httpServer = createServer(async (req, res) => {
  const started = process.hrtime.bigint();
  res.setHeader('x-content-type-options', 'nosniff');

  let statusCode = 500;
  try {
    if (!req.url || !req.method) {
      res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Bad Request');
      statusCode = 400;
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (pathname.startsWith('/.well-known/')) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not Found');
      statusCode = 404;
      return;
    }

    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('MCP server alive');
      statusCode = 200;
      return;
    }

    if (req.method === 'OPTIONS' && pathname === MCP_PATH) {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, mcp-session-id',
        'Access-Control-Expose-Headers': 'Mcp-Session-Id',
      }).end();
      statusCode = 204;
      return;
    }

    if (pathname === MCP_PATH && ['POST', 'GET', 'DELETE'].includes(req.method)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
      });
      res.on('close', () => {
        transport.close().catch(() => undefined);
        mcpServer.close().catch(() => undefined);
      });
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
      statusCode = res.statusCode || 200;
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not Found');
    statusCode = 404;
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Internal Server Error');
    statusCode = 500;
    console.error('Unhandled error:', error);
  } finally {
    const durationMs = Number((process.hrtime.bigint() - started) / BigInt(1_000_000));
    const path = req?.url ?? 'unknown';
    const method = req?.method ?? 'UNKNOWN';
    console.log(`${method} ${path} -> ${statusCode} in ${durationMs}ms`);
  }
});

httpServer.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT} at path ${MCP_PATH}`);
});
