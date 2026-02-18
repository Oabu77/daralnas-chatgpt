/**
 * agentActionsStore.js  –  In-memory persistence layer for the Agent Actions API
 * 
 * Every collection is a Map keyed by primary ID.
 * Mutations trigger a debounced flush to JSON files under data/agent-actions/.
 * On startup the store hydrates from disk (if files exist).
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.resolve(__dirname, '../../data/agent-actions');

// ── Collections ──────────────────────────────────────────────────────────────
const collections = {
  agents:          new Map(),
  subAgents:       new Map(),
  tasks:           new Map(),
  taskSteps:       new Map(),   // key = stepId
  approvals:       new Map(),
  integrations:    new Map(),
  oauthConnections:new Map(),
  secrets:         new Map(),   // metadata only (encrypted values in vault)
  webhooks:        new Map(),
  deployments:     new Map(),
  externalAccountRequests: new Map(),
  conversations:   new Map(),
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ── Disk persistence (debounced) ─────────────────────────────────────────────
let _flushTimer = null;

function schedulePersist() {
  if (_flushTimer) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(persistAll, 1000);
}

function persistAll() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const [name, map] of Object.entries(collections)) {
      if (name === 'secrets') continue; // secrets persisted by vault
      const file = path.join(DATA_DIR, `${name}.json`);
      const arr = Array.from(map.values());
      fs.writeFileSync(file, JSON.stringify(arr, null, 2));
    }
  } catch (err) {
    console.error('[AgentActionsStore] persist error:', err.message);
  }
}

function hydrateAll() {
  try {
    if (!fs.existsSync(DATA_DIR)) return;
    for (const [name, map] of Object.entries(collections)) {
      if (name === 'secrets') continue;
      const file = path.join(DATA_DIR, `${name}.json`);
      if (!fs.existsSync(file)) continue;
      const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
      const keyField = getPrimaryKey(name);
      for (const item of arr) {
        if (item[keyField]) map.set(item[keyField], item);
      }
    }
    console.log('[AgentActionsStore] hydrated from disk');
  } catch (err) {
    console.error('[AgentActionsStore] hydrate error:', err.message);
  }
}

function getPrimaryKey(collectionName) {
  const keyMap = {
    agents:          'agentId',
    subAgents:       'subAgentId',
    tasks:           'taskId',
    taskSteps:       'stepId',
    approvals:       'approvalId',
    integrations:    'integrationId',
    oauthConnections:'connectionId',
    secrets:         'secretId',
    webhooks:        'webhookId',
    deployments:     'deploymentId',
    externalAccountRequests: 'requestId',
    conversations:   'conversationId',
  };
  return keyMap[collectionName] || 'id';
}

// ── Generic CRUD helpers ─────────────────────────────────────────────────────
function getCollection(name) { return collections[name]; }

function create(collectionName, idField, data) {
  const map = collections[collectionName];
  const id = uid();
  const record = { [idField]: id, ...data, createdAt: now() };
  map.set(id, record);
  schedulePersist();
  return record;
}

function get(collectionName, id) {
  return collections[collectionName].get(id) || null;
}

function update(collectionName, id, patch) {
  const map = collections[collectionName];
  const existing = map.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updatedAt: now() };
  map.set(id, updated);
  schedulePersist();
  return updated;
}

function remove(collectionName, id) {
  const map = collections[collectionName];
  const existed = map.delete(id);
  if (existed) schedulePersist();
  return existed;
}

function list(collectionName, filterFn) {
  const arr = Array.from(collections[collectionName].values());
  return filterFn ? arr.filter(filterFn) : arr;
}

// ── Agent-specific helpers ───────────────────────────────────────────────────
function createAgent(body) {
  return create('agents', 'agentId', {
    name: body.name,
    description: body.description || '',
    instructions: body.instructions || '',
    personas: [],
    specializations: [],
    autonomy: {
      mode: 'assisted',
      maxStepsPerTask: 50,
      allowToolUse: true,
      approvalsRequiredFor: ['external_account_create', 'credential_rotate', 'stripe_money_movement'],
    },
  });
}

function updateAgent(agentId, patch) {
  const allowed = {};
  if (patch.name !== undefined) allowed.name = patch.name;
  if (patch.description !== undefined) allowed.description = patch.description;
  if (patch.instructions !== undefined) allowed.instructions = patch.instructions;
  return update('agents', agentId, allowed);
}

function setPersonas(agentId, personas) {
  return update('agents', agentId, { personas });
}

function setSpecializations(agentId, specializations) {
  return update('agents', agentId, { specializations });
}

function setAutonomy(agentId, autonomy) {
  const existing = get('agents', agentId);
  if (!existing) return null;
  const merged = {
    mode: autonomy.mode || existing.autonomy?.mode || 'assisted',
    maxStepsPerTask: autonomy.maxStepsPerTask ?? existing.autonomy?.maxStepsPerTask ?? 50,
    allowToolUse: autonomy.allowToolUse ?? existing.autonomy?.allowToolUse ?? true,
    approvalsRequiredFor: autonomy.approvalsRequiredFor || existing.autonomy?.approvalsRequiredFor || [],
  };
  return update('agents', agentId, { autonomy: merged });
}

// ── SubAgent helpers ─────────────────────────────────────────────────────────
function createSubAgent(parentAgentId, body) {
  return create('subAgents', 'subAgentId', {
    parentAgentId,
    name: body.name,
    description: body.description || '',
    role: body.role,
    instructions: body.instructions || '',
    policy: body.policy || {
      allowedIntegrations: [],
      canCreateIntegrations: false,
      canRequestExternalAccounts: false,
      canStoreSecrets: false,
      maxStepsPerTask: 30,
    },
  });
}

function listSubAgents(parentAgentId) {
  return list('subAgents', (sa) => sa.parentAgentId === parentAgentId);
}

// ── Task helpers ─────────────────────────────────────────────────────────────
function createTask(agentId, body) {
  return create('tasks', 'taskId', {
    agentId,
    subAgentId: body.delegateToSubAgentId || null,
    title: body.title || body.goal.substring(0, 80),
    goal: body.goal,
    persona: body.persona || null,
    context: body.context || {},
    constraints: body.constraints || { maxRuntimeSeconds: 900, maxSteps: 50 },
    status: 'queued',
    latestOutput: null,
    result: null,
    error: null,
  });
}

function addTaskStep(taskId, stepData) {
  const existing = listTaskSteps(taskId);
  const index = existing.length;
  return create('taskSteps', 'stepId', {
    taskId,
    index,
    type: stepData.type || 'action',
    status: stepData.status || 'pending',
    content: stepData.content || '',
    metadata: stepData.metadata || {},
    startedAt: null,
    endedAt: null,
  });
}

function listTaskSteps(taskId) {
  return list('taskSteps', (s) => s.taskId === taskId).sort((a, b) => a.index - b.index);
}

function listTasks(agentId, statusFilter) {
  return list('tasks', (t) => {
    if (t.agentId !== agentId) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });
}

// ── Approval helpers ─────────────────────────────────────────────────────────
function createApproval(taskId, agentId, category, summary, details) {
  return create('approvals', 'approvalId', {
    taskId,
    agentId,
    category,
    summary,
    details: details || {},
    status: 'pending',
    decidedAt: null,
    notes: null,
  });
}

function listPendingApprovals(taskId) {
  return list('approvals', (a) => a.taskId === taskId && a.status === 'pending');
}

function decideApproval(approvalId, decision, notes) {
  return update('approvals', approvalId, {
    status: decision, // 'approved' or 'rejected'
    decidedAt: now(),
    notes: notes || null,
  });
}

// ── Integration helpers ──────────────────────────────────────────────────────
function createIntegration(agentId, body) {
  const authObj = {
    method: body.auth.method,
  };
  if (body.auth.connectionId) authObj.connectionId = body.auth.connectionId;
  if (body.auth.secretId) authObj.secretRef = { secretId: body.auth.secretId };

  return create('integrations', 'integrationId', {
    agentId,
    type: body.type,
    displayName: body.displayName || `${body.type} Integration`,
    auth: authObj,
    metadata: body.metadata || {},
  });
}

function listIntegrations(agentId) {
  return list('integrations', (i) => i.agentId === agentId);
}

// ── OAuth helpers ────────────────────────────────────────────────────────────
function createOAuthConnection(agentId, providerId) {
  return create('oauthConnections', 'connectionId', {
    agentId,
    providerId,
  });
}

// ── Webhook helpers ──────────────────────────────────────────────────────────
function createWebhook(agentId, body) {
  return create('webhooks', 'webhookId', {
    agentId,
    url: body.url,
    events: body.events,
    secretId: body.secretId || null,
  });
}

function listWebhooks(agentId) {
  return list('webhooks', (w) => w.agentId === agentId);
}

function getWebhooksForEvent(agentId, event) {
  return list('webhooks', (w) => w.agentId === agentId && w.events.includes(event));
}

// ── Deployment helpers ───────────────────────────────────────────────────────
function createDeployment(agentId, body) {
  return create('deployments', 'deploymentId', {
    agentId,
    title: body.title,
    target: body.target,
    integrationId: body.integrationId || null,
    planOnly: body.planOnly !== false,
    desiredState: body.desiredState || {},
    status: 'queued',
    output: null,
  });
}

// ── External Account helpers ─────────────────────────────────────────────────
function createExternalAccountRequest(agentId, body) {
  return create('externalAccountRequests', 'requestId', {
    agentId,
    provider: body.provider,
    purpose: body.purpose,
    method: body.method || 'oauth',
    connectionId: body.connectionId || null,
    requestedScopes: body.requestedScopes || [],
    metadata: body.metadata || {},
    status: 'awaiting_approval',
    accountRef: null,
  });
}

// ── Conversation helper ──────────────────────────────────────────────────────
function addConversation(agentId, persona, message, response) {
  return create('conversations', 'conversationId', {
    agentId,
    persona,
    message,
    response,
  });
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
hydrateAll();

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  uid,
  now,
  // Generic
  getCollection,
  create,
  get,
  update,
  remove,
  list,
  // Agent
  createAgent,
  updateAgent,
  getAgent:        (id) => get('agents', id),
  setPersonas,
  setSpecializations,
  setAutonomy,
  // SubAgent
  createSubAgent,
  getSubAgent:     (id) => get('subAgents', id),
  updateSubAgent:  (id, patch) => update('subAgents', id, patch),
  removeSubAgent:  (id) => remove('subAgents', id),
  listSubAgents,
  // Task
  createTask,
  getTask:         (id) => get('tasks', id),
  updateTask:      (id, patch) => update('tasks', id, patch),
  addTaskStep,
  updateTaskStep:  (id, patch) => update('taskSteps', id, patch),
  listTasks,
  listTaskSteps,
  // Approvals
  createApproval,
  getApproval:     (id) => get('approvals', id),
  listPendingApprovals,
  decideApproval,
  // Integrations
  createIntegration,
  getIntegration:  (id) => get('integrations', id),
  removeIntegration: (id) => remove('integrations', id),
  listIntegrations,
  // OAuth
  createOAuthConnection,
  getOAuthConnection: (id) => get('oauthConnections', id),
  // Secrets metadata (vault handles encryption)
  createSecretMeta: (meta) => create('secrets', 'secretId', meta),
  getSecretMeta:    (id) => get('secrets', id),
  removeSecretMeta: (id) => remove('secrets', id),
  listSecretsMeta:  (agentId) => list('secrets', (s) => s.agentId === agentId),
  // Webhooks
  createWebhook,
  getWebhook:      (id) => get('webhooks', id),
  removeWebhook:   (id) => remove('webhooks', id),
  listWebhooks,
  getWebhooksForEvent,
  // Deployments
  createDeployment,
  getDeployment:   (id) => get('deployments', id),
  updateDeployment:(id, patch) => update('deployments', id, patch),
  // External Accounts
  createExternalAccountRequest,
  getExternalAccountRequest: (id) => get('externalAccountRequests', id),
  updateExternalAccountRequest: (id, patch) => update('externalAccountRequests', id, patch),
  // Conversations
  addConversation,
  // Persist
  persistAll,
};
