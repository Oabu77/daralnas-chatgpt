/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * webhookDispatcher.js  –  Outbound webhook delivery with HMAC signing & retry
 *
 * When an event fires, all matching webhooks for the agent receive an HTTP POST.
 * Payload is signed with HMAC-SHA256 if a secretId is attached to the webhook.
 */

'use strict';

const crypto = require('crypto');
const http   = require('http');
const https  = require('https');
const url    = require('url');

let store = null;       // lazy-loaded to avoid circular deps
let vault = null;

function init(storeRef, vaultRef) {
  store = storeRef;
  vault = vaultRef;
}

// ── Event queue ──────────────────────────────────────────────────────────────
const MAX_RETRIES     = 3;
const RETRY_BASE_MS   = 1000;   // exponential: 1s, 2s, 4s

/**
 * Dispatch an event to all matching webhooks for the agent.
 * @param {string} agentId
 * @param {string} event    e.g. "task.succeeded"
 * @param {object} payload  event data
 */
async function dispatch(agentId, event, payload) {
  if (!store) return;
  const hooks = store.getWebhooksForEvent(agentId, event);
  if (!hooks.length) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  for (const hook of hooks) {
    deliverWithRetry(hook, body, 0).catch((err) => {
      console.error(`[WebhookDispatcher] failed delivery to ${hook.url}:`, err.message);
    });
  }
}

async function deliverWithRetry(hook, body, attempt) {
  try {
    await post(hook.url, body, hook.secretId);
  } catch (err) {
    if (attempt < MAX_RETRIES - 1) {
      const delay = RETRY_BASE_MS * Math.pow(2, attempt);
      await sleep(delay);
      return deliverWithRetry(hook, body, attempt + 1);
    }
    throw err;
  }
}

function post(targetUrl, body, secretId) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? https : http;

    const headers = {
      'Content-Type':   'application/json',
      'Content-Length':  Buffer.byteLength(body),
      'User-Agent':     'QuranChain-Agent-Webhooks/1.0',
    };

    // Sign if secret attached
    if (secretId && vault) {
      const secret = vault.retrieve(secretId);
      if (secret) {
        const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
        headers['X-Webhook-Signature'] = `sha256=${sig}`;
      }
    }

    const req = mod.request(
      {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        headers,
        timeout:  10000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body: data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

module.exports = { init, dispatch };
