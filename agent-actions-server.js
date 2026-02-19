#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * agent-actions-server.js  –  QuranChain Omar Autonomous Agent Actions API
 *
 * Port 6200  |  30+ endpoints  |  OpenAPI 3.1.0  |  Swagger UI at /docs
 *
 * Usage:
 *   AGENT_API_KEY=your-key node agent-actions-server.js
 *
 * If AGENT_API_KEY is not set, auth is disabled (local dev).
 */

'use strict';

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const fs         = require('fs');
const path       = require('path');
const yaml       = require('js-yaml');

// ── Services ─────────────────────────────────────────────────────────────────
const store     = require('./src/services/agentActionsStore');
const vault     = require('./src/services/secretsVault');
const webhooks  = require('./src/services/webhookDispatcher');
const router    = require('./src/routes/agentActions');

// Wire webhook dispatcher to store + vault
webhooks.init(store, vault);

// ── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = parseInt(process.env.AGENT_ACTIONS_PORT, 10) || 6200;

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Rate limit
app.use(rateLimit({
  windowMs: 60 * 1000,          // 1 minute
  max: 200,                      // 200 req/min per IP
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Auth middleware ───────────────────────────────────────────────────────────
const API_KEY = process.env.AGENT_API_KEY;

app.use('/v1', (req, res, next) => {
  // Skip auth if no key configured (local dev mode)
  if (!API_KEY) return next();

  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Bearer token required' });
  }
  const token = authHeader.replace('Bearer ', '');
  if (token !== API_KEY) {
    return res.status(403).json({ error: 'forbidden', message: 'Invalid API key' });
  }
  next();
});

// ── Mount API routes ─────────────────────────────────────────────────────────
app.use('/v1', router);

// ── OpenAPI spec endpoint ────────────────────────────────────────────────────
const specPath = path.resolve(__dirname, 'openapi-agent-actions.yaml');

app.get('/openapi.yaml', (_req, res) => {
  if (fs.existsSync(specPath)) {
    res.type('text/yaml').send(fs.readFileSync(specPath, 'utf8'));
  } else {
    res.status(404).json({ error: 'not_found', message: 'OpenAPI spec not found' });
  }
});

app.get('/openapi.json', (_req, res) => {
  if (fs.existsSync(specPath)) {
    const doc = yaml.load(fs.readFileSync(specPath, 'utf8'));
    res.json(doc);
  } else {
    res.status(404).json({ error: 'not_found', message: 'OpenAPI spec not found' });
  }
});

// ── Swagger UI ───────────────────────────────────────────────────────────────
try {
  const swaggerUi = require('swagger-ui-express');
  const specDoc   = yaml.load(fs.readFileSync(specPath, 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specDoc, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'QuranChain Agent Actions API',
  }));
} catch (err) {
  console.warn('[AgentActionsServer] swagger-ui-express not available – /docs disabled');
  app.get('/docs', (_req, res) => {
    res.status(503).json({ error: 'unavailable', message: 'Install swagger-ui-express for API docs' });
  });
}

// ── Health & info endpoints ──────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    service: 'QuranChain Omar Autonomous Agent Actions API',
    version: '1.3.0',
    port: PORT,
    docs: `http://localhost:${PORT}/docs`,
    openapi: `http://localhost:${PORT}/openapi.yaml`,
    api: `http://localhost:${PORT}/v1`,
    status: 'operational',
    uptime: process.uptime(),
    endpoints: {
      agents:            'POST/GET /v1/agents',
      personas:          'PUT /v1/agents/:id/personas',
      specializations:   'PUT /v1/agents/:id/specializations',
      autonomy:          'PUT /v1/agents/:id/autonomy',
      messages:          'POST /v1/agents/:id/messages',
      subagents:         'CRUD /v1/agents/:id/subagents',
      tasks:             'POST/GET /v1/agents/:id/tasks',
      taskControl:       'POST /v1/agents/:id/tasks/:tid (pause/resume/cancel)',
      taskSteps:         'GET /v1/agents/:id/tasks/:tid/steps',
      approvals:         'GET/POST /v1/agents/:id/tasks/:tid/approvals',
      integrations:      'CRUD /v1/agents/:id/integrations',
      oauth:             'GET/POST /v1/agents/:id/oauth/*',
      secrets:           'POST/GET/DELETE /v1/agents/:id/secrets',
      deployments:       'POST /v1/agents/:id/deployments',
      externalAccounts:  'POST /v1/agents/:id/external-accounts',
      webhooks:          'POST/GET /v1/agents/:id/webhooks',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    agents: store.list('agents').length,
    tasks:  store.list('tasks').length,
  });
});

// ── 404 catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'Endpoint not found. See / for available routes.' });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[AgentActionsServer] error:', err);
  res.status(500).json({ error: 'internal', message: err.message });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   QuranChain Omar Autonomous Agent Actions API  v1.3.0       ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║   API:     http://localhost:${PORT}/v1                          ║`);
  console.log(`║   Docs:    http://localhost:${PORT}/docs                        ║`);
  console.log(`║   Spec:    http://localhost:${PORT}/openapi.yaml                ║`);
  console.log(`║   Health:  http://localhost:${PORT}/health                      ║`);
  console.log(`║   Auth:    ${API_KEY ? 'Bearer token ENABLED' : 'DISABLED (local dev)'}                        ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
