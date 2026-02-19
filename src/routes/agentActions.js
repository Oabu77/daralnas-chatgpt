/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * agentActions.js  –  Express Router implementing all 30+ OpenAPI endpoints
 *
 * Tags: Agent, Personas, Specializations, Autonomy, SubAgents, Tasks,
 *       Approvals, Integrations, OAuth, Secrets, Webhooks, Deployments,
 *       ExternalAccounts
 */

'use strict';

const { Router } = require('express');
const store      = require('../services/agentActionsStore');
const vault      = require('../services/secretsVault');
const webhooks   = require('../services/webhookDispatcher');
const taskRunner = require('../services/agentTaskRunner');

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function err(res, code, error, message, details) {
  return res.status(code).json({ error, message, ...(details ? { details } : {}) });
}

function requireAgent(req, res) {
  const agent = store.getAgent(req.params.agentId);
  if (!agent) { err(res, 404, 'not_found', `Agent ${req.params.agentId} not found`); return null; }
  return agent;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Agent
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agents  —  createAgent
router.post('/agents', (req, res) => {
  const { name, instructions, description } = req.body || {};
  if (!name || !instructions) {
    return err(res, 400, 'validation', 'name and instructions are required');
  }
  const agent = store.createAgent({ name, description, instructions });
  res.status(201).json(agent);
});

// GET /agents/:agentId  —  getAgent
router.get('/agents/:agentId', (req, res) => {
  const agent = requireAgent(req, res);
  if (agent) res.json(agent);
});

// PATCH /agents/:agentId  —  updateAgent
router.patch('/agents/:agentId', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const updated = store.updateAgent(req.params.agentId, req.body);
  res.json(updated);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Personas
// ═══════════════════════════════════════════════════════════════════════════════

// PUT /agents/:agentId/personas  —  setPersonas
router.put('/agents/:agentId/personas', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { personas } = req.body || {};
  if (!Array.isArray(personas) || personas.length === 0) {
    return err(res, 400, 'validation', 'personas array required (min 1)');
  }
  const validNames = ['QuranChain AI', 'Omar AI'];
  for (const p of personas) {
    if (!validNames.includes(p.name)) {
      return err(res, 400, 'validation', `Invalid persona name: ${p.name}. Must be one of: ${validNames.join(', ')}`);
    }
  }
  const updated = store.setPersonas(req.params.agentId, personas);
  res.json(updated);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Specializations
// ═══════════════════════════════════════════════════════════════════════════════

// PUT /agents/:agentId/specializations  —  setSpecializations
router.put('/agents/:agentId/specializations', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { specializations } = req.body || {};
  if (!Array.isArray(specializations) || specializations.length === 0) {
    return err(res, 400, 'validation', 'specializations array required (min 1)');
  }
  const validSpecs = ['QuranChain', 'DarCloud', 'FungiMeshNetwork', 'Cloudflare', 'Stripe'];
  for (const s of specializations) {
    if (!validSpecs.includes(s)) {
      return err(res, 400, 'validation', `Invalid specialization: ${s}. Must be one of: ${validSpecs.join(', ')}`);
    }
  }
  const updated = store.setSpecializations(req.params.agentId, specializations);
  res.json(updated);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Autonomy
// ═══════════════════════════════════════════════════════════════════════════════

// PUT /agents/:agentId/autonomy  —  setAutonomy
router.put('/agents/:agentId/autonomy', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { autonomy } = req.body || {};
  if (!autonomy || !autonomy.mode) {
    return err(res, 400, 'validation', 'autonomy.mode is required');
  }
  const validModes = ['manual', 'assisted', 'autonomous'];
  if (!validModes.includes(autonomy.mode)) {
    return err(res, 400, 'validation', `Invalid mode: ${autonomy.mode}`);
  }
  const updated = store.setAutonomy(req.params.agentId, autonomy);
  res.json(updated);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Agent — Messages
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agents/:agentId/messages  —  sendMessage
router.post('/agents/:agentId/messages', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { message, persona } = req.body || {};
  if (!message) {
    return err(res, 400, 'validation', 'message is required');
  }
  const result = taskRunner.handleMessage(agent, message, persona);
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: SubAgents
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agents/:agentId/subagents  —  createSubAgent
router.post('/agents/:agentId/subagents', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { name, role } = req.body || {};
  if (!name || !role) {
    return err(res, 400, 'validation', 'name and role are required');
  }
  const sub = store.createSubAgent(req.params.agentId, req.body);
  webhooks.dispatch(req.params.agentId, 'subagent.created', sub);
  res.status(201).json(sub);
});

// GET /agents/:agentId/subagents  —  listSubAgents
router.get('/agents/:agentId/subagents', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  res.json(store.listSubAgents(req.params.agentId));
});

// GET /agents/:agentId/subagents/:subAgentId  —  getSubAgent
router.get('/agents/:agentId/subagents/:subAgentId', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const sub = store.getSubAgent(req.params.subAgentId);
  if (!sub || sub.parentAgentId !== req.params.agentId) {
    return err(res, 404, 'not_found', 'SubAgent not found');
  }
  res.json(sub);
});

// PATCH /agents/:agentId/subagents/:subAgentId  —  updateSubAgent
router.patch('/agents/:agentId/subagents/:subAgentId', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const sub = store.getSubAgent(req.params.subAgentId);
  if (!sub || sub.parentAgentId !== req.params.agentId) {
    return err(res, 404, 'not_found', 'SubAgent not found');
  }
  const updated = store.updateSubAgent(req.params.subAgentId, req.body);
  res.json(updated);
});

// DELETE /agents/:agentId/subagents/:subAgentId  —  deleteSubAgent
router.delete('/agents/:agentId/subagents/:subAgentId', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const sub = store.getSubAgent(req.params.subAgentId);
  if (!sub || sub.parentAgentId !== req.params.agentId) {
    return err(res, 404, 'not_found', 'SubAgent not found');
  }
  store.removeSubAgent(req.params.subAgentId);
  webhooks.dispatch(req.params.agentId, 'subagent.deleted', { subAgentId: req.params.subAgentId });
  res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Tasks
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agents/:agentId/tasks  —  createTask
router.post('/agents/:agentId/tasks', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { goal } = req.body || {};
  if (!goal) {
    return err(res, 400, 'validation', 'goal is required');
  }
  const task = store.createTask(req.params.agentId, req.body);
  webhooks.dispatch(req.params.agentId, 'task.queued', task);

  // Fire-and-forget execution
  setImmediate(() => {
    taskRunner.executeTask(task.taskId).catch((e) => {
      console.error('[TaskRunner] execution error:', e.message);
    });
  });

  res.status(202).json(task);
});

// GET /agents/:agentId/tasks  —  listTasks
router.get('/agents/:agentId/tasks', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const statusFilter = req.query.status || null;
  res.json(store.listTasks(req.params.agentId, statusFilter));
});

// GET /agents/:agentId/tasks/:taskId  —  getTask
router.get('/agents/:agentId/tasks/:taskId', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const task = store.getTask(req.params.taskId);
  if (!task || task.agentId !== req.params.agentId) {
    return err(res, 404, 'not_found', 'Task not found');
  }
  res.json(task);
});

// POST /agents/:agentId/tasks/:taskId  —  controlTask (pause/resume/cancel)
router.post('/agents/:agentId/tasks/:taskId', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const task = store.getTask(req.params.taskId);
  if (!task || task.agentId !== req.params.agentId) {
    return err(res, 404, 'not_found', 'Task not found');
  }
  const { action } = req.body || {};
  if (!['pause', 'resume', 'cancel'].includes(action)) {
    return err(res, 400, 'validation', 'action must be pause, resume, or cancel');
  }
  let updated;
  switch (action) {
    case 'pause':  updated = taskRunner.pauseTask(req.params.taskId); break;
    case 'resume': updated = taskRunner.resumeTask(req.params.taskId); break;
    case 'cancel': updated = taskRunner.cancelTask(req.params.taskId); break;
  }
  res.json(updated || task);
});

// GET /agents/:agentId/tasks/:taskId/steps  —  listTaskSteps
router.get('/agents/:agentId/tasks/:taskId/steps', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const task = store.getTask(req.params.taskId);
  if (!task || task.agentId !== req.params.agentId) {
    return err(res, 404, 'not_found', 'Task not found');
  }
  res.json(store.listTaskSteps(req.params.taskId));
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Approvals
// ═══════════════════════════════════════════════════════════════════════════════

// GET /agents/:agentId/tasks/:taskId/approvals  —  getApprovals
router.get('/agents/:agentId/tasks/:taskId/approvals', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const task = store.getTask(req.params.taskId);
  if (!task || task.agentId !== req.params.agentId) {
    return err(res, 404, 'not_found', 'Task not found');
  }
  res.json(store.listPendingApprovals(req.params.taskId));
});

// POST /agents/:agentId/tasks/:taskId/approvals/:approvalId/approve
router.post('/agents/:agentId/tasks/:taskId/approvals/:approvalId/approve', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const approval = store.getApproval(req.params.approvalId);
  if (!approval || approval.taskId !== req.params.taskId) {
    return err(res, 404, 'not_found', 'Approval not found');
  }
  store.decideApproval(req.params.approvalId, 'approved', req.body?.notes);
  const task = store.getTask(req.params.taskId);
  res.json(task);
});

// POST /agents/:agentId/tasks/:taskId/approvals/:approvalId/reject
router.post('/agents/:agentId/tasks/:taskId/approvals/:approvalId/reject', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const approval = store.getApproval(req.params.approvalId);
  if (!approval || approval.taskId !== req.params.taskId) {
    return err(res, 404, 'not_found', 'Approval not found');
  }
  store.decideApproval(req.params.approvalId, 'rejected', req.body?.notes);
  const task = store.getTask(req.params.taskId);
  res.json(task);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Integrations
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agents/:agentId/integrations  —  createIntegration
router.post('/agents/:agentId/integrations', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { type, auth } = req.body || {};
  if (!type || !auth || !auth.method) {
    return err(res, 400, 'validation', 'type and auth.method are required');
  }
  const validTypes = ['Cloudflare', 'Stripe', 'Custom'];
  if (!validTypes.includes(type)) {
    return err(res, 400, 'validation', `type must be one of: ${validTypes.join(', ')}`);
  }
  const integration = store.createIntegration(req.params.agentId, req.body);
  webhooks.dispatch(req.params.agentId, 'integration.created', integration);
  res.status(201).json(integration);
});

// GET /agents/:agentId/integrations  —  listIntegrations
router.get('/agents/:agentId/integrations', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  res.json(store.listIntegrations(req.params.agentId));
});

// GET /agents/:agentId/integrations/:integrationId  —  getIntegration
router.get('/agents/:agentId/integrations/:integrationId', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const integration = store.getIntegration(req.params.integrationId);
  if (!integration || integration.agentId !== req.params.agentId) {
    return err(res, 404, 'not_found', 'Integration not found');
  }
  res.json(integration);
});

// DELETE /agents/:agentId/integrations/:integrationId  —  deleteIntegration
router.delete('/agents/:agentId/integrations/:integrationId', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const integration = store.getIntegration(req.params.integrationId);
  if (!integration || integration.agentId !== req.params.agentId) {
    return err(res, 404, 'not_found', 'Integration not found');
  }
  store.removeIntegration(req.params.integrationId);
  webhooks.dispatch(req.params.agentId, 'integration.deleted', { integrationId: req.params.integrationId });
  res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: OAuth
// ═══════════════════════════════════════════════════════════════════════════════

const OAUTH_PROVIDERS = [
  {
    providerId: 'cloudflare',
    name: 'Cloudflare',
    scopes: ['account:read', 'zone:read', 'zone:edit', 'dns:edit', 'workers:write'],
  },
  {
    providerId: 'stripe',
    name: 'Stripe',
    scopes: ['read_write', 'read_only'],
  },
];

// GET /agents/:agentId/oauth/providers  —  listOauthProviders
router.get('/agents/:agentId/oauth/providers', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  res.json(OAUTH_PROVIDERS);
});

// POST /agents/:agentId/oauth/authorize  —  startOauth
router.post('/agents/:agentId/oauth/authorize', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { providerId, redirectUri, scopes, state } = req.body || {};
  if (!providerId || !redirectUri) {
    return err(res, 400, 'validation', 'providerId and redirectUri are required');
  }
  const provider = OAUTH_PROVIDERS.find((p) => p.providerId === providerId);
  if (!provider) {
    return err(res, 400, 'validation', `Unknown provider: ${providerId}`);
  }

  // Build authorization URL
  const authUrls = {
    cloudflare: 'https://dash.cloudflare.com/oauth2/authorize',
    stripe: 'https://connect.stripe.com/oauth/authorize',
  };

  const params = new URLSearchParams({
    client_id: process.env[`${providerId.toUpperCase()}_CLIENT_ID`] || 'placeholder',
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: (scopes || provider.scopes).join(' '),
    state: state || store.uid(),
  });

  res.json({
    authorizationUrl: `${authUrls[providerId]}?${params.toString()}`,
  });
});

// POST /agents/:agentId/oauth/exchange  —  exchangeOauth
router.post('/agents/:agentId/oauth/exchange', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { providerId, code, redirectUri } = req.body || {};
  if (!providerId || !code || !redirectUri) {
    return err(res, 400, 'validation', 'providerId, code, and redirectUri are required');
  }

  // In production this would exchange the code with the provider's token endpoint.
  // For now, create a connection record representing the successful exchange.
  const connection = store.createOAuthConnection(req.params.agentId, providerId);
  res.status(201).json(connection);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Secrets
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agents/:agentId/secrets  —  createSecret
router.post('/agents/:agentId/secrets', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { name, value, type, rotateAfterDays } = req.body || {};
  if (!name || !value || !type) {
    return err(res, 400, 'validation', 'name, value, and type are required');
  }
  const validTypes = ['apiKey', 'webhookSecret', 'privateKey', 'token'];
  if (!validTypes.includes(type)) {
    return err(res, 400, 'validation', `type must be one of: ${validTypes.join(', ')}`);
  }
  const secretRef = vault.store(req.params.agentId, name, value, type, rotateAfterDays);
  // Also track metadata in main store for listing
  store.createSecretMeta({
    ...secretRef,
    agentId: req.params.agentId,
  });
  webhooks.dispatch(req.params.agentId, 'secret.created', { secretId: secretRef.secretId, name });
  res.status(201).json(secretRef);
});

// GET /agents/:agentId/secrets  —  listSecrets (metadata only)
router.get('/agents/:agentId/secrets', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  res.json(vault.listRefs(req.params.agentId));
});

// DELETE /agents/:agentId/secrets/:secretId  —  deleteSecret
router.delete('/agents/:agentId/secrets/:secretId', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const deleted = vault.deleteSecret(req.params.secretId);
  if (!deleted) {
    return err(res, 404, 'not_found', 'Secret not found');
  }
  store.removeSecretMeta(req.params.secretId);
  webhooks.dispatch(req.params.agentId, 'secret.deleted', { secretId: req.params.secretId });
  res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Deployments
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agents/:agentId/deployments  —  createDeployment
router.post('/agents/:agentId/deployments', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { title, target } = req.body || {};
  if (!title || !target) {
    return err(res, 400, 'validation', 'title and target are required');
  }
  const validTargets = ['Cloudflare', 'Stripe', 'DarCloud', 'QuranChain', 'FungiMeshNetwork', 'Custom'];
  if (!validTargets.includes(target)) {
    return err(res, 400, 'validation', `target must be one of: ${validTargets.join(', ')}`);
  }
  const deployment = store.createDeployment(req.params.agentId, req.body);
  webhooks.dispatch(req.params.agentId, 'deployment.queued', deployment);

  // If not plan-only, execute as a task
  if (req.body.planOnly === false) {
    const task = store.createTask(req.params.agentId, {
      title: `Deploy: ${title}`,
      goal: `Deploy ${title} to ${target}`,
      context: { target, deploymentId: deployment.deploymentId, ...req.body.desiredState },
    });
    setImmediate(() => {
      taskRunner.executeTask(task.taskId).then(() => {
        store.updateDeployment(deployment.deploymentId, { status: 'succeeded', output: 'Deployment completed' });
        webhooks.dispatch(req.params.agentId, 'deployment.succeeded', deployment);
      }).catch((e) => {
        store.updateDeployment(deployment.deploymentId, { status: 'failed', output: e.message });
        webhooks.dispatch(req.params.agentId, 'deployment.failed', { ...deployment, error: e.message });
      });
    });
  }

  res.status(202).json(deployment);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: ExternalAccounts
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agents/:agentId/external-accounts  —  requestExternalAccount
router.post('/agents/:agentId/external-accounts', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { provider, purpose } = req.body || {};
  if (!provider || !purpose) {
    return err(res, 400, 'validation', 'provider and purpose are required');
  }

  const request = store.createExternalAccountRequest(req.params.agentId, req.body);

  // Always requires approval (safety model)
  const approval = store.createApproval(
    null, // no task
    req.params.agentId,
    'external_account_create',
    `Provision ${provider} account: ${purpose}`,
    { requestId: request.requestId, provider, purpose }
  );

  webhooks.dispatch(req.params.agentId, 'externalAccount.awaiting_approval', {
    requestId: request.requestId,
    approvalId: approval.approvalId,
  });

  res.status(202).json({
    requestId: request.requestId,
    status: 'awaiting_approval',
    approval: {
      approvalId: approval.approvalId,
      category: approval.category,
      summary: approval.summary,
      details: approval.details,
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAG: Webhooks
// ═══════════════════════════════════════════════════════════════════════════════

// POST /agents/:agentId/webhooks  —  createWebhook
router.post('/agents/:agentId/webhooks', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  const { url: webhookUrl, events } = req.body || {};
  if (!webhookUrl || !Array.isArray(events) || events.length === 0) {
    return err(res, 400, 'validation', 'url and events array are required');
  }

  const validEvents = [
    'task.queued', 'task.started', 'task.step', 'task.awaiting_approval',
    'task.succeeded', 'task.failed', 'task.canceled',
    'integration.created', 'integration.deleted',
    'subagent.created', 'subagent.deleted',
    'secret.created', 'secret.deleted',
    'deployment.queued', 'deployment.awaiting_approval', 'deployment.succeeded', 'deployment.failed',
    'externalAccount.awaiting_approval', 'externalAccount.succeeded', 'externalAccount.failed',
  ];
  for (const e of events) {
    if (!validEvents.includes(e)) {
      return err(res, 400, 'validation', `Invalid event: ${e}`);
    }
  }

  const hook = store.createWebhook(req.params.agentId, req.body);
  res.status(201).json(hook);
});

// GET /agents/:agentId/webhooks  —  listWebhooks
router.get('/agents/:agentId/webhooks', (req, res) => {
  const agent = requireAgent(req, res);
  if (!agent) return;
  res.json(store.listWebhooks(req.params.agentId));
});

module.exports = router;
