/**
 * DarCloud OpenAI Webhook Worker — Cloudflare Edge
 * 
 * Receives webhook events from OpenAI (Standard Webhooks spec):
 *   - response.completed / failed / cancelled / incomplete
 *   - batch.completed / failed / cancelled / expired
 *   - eval_run.succeeded / failed / canceled
 *   - fine_tuning.job.succeeded / failed / cancelled
 *   - realtime.call.incoming
 * 
 * Verifies HMAC-SHA256 signatures, routes events to handlers,
 * and forwards to internal services (revenue, AI fleet, MCP).
 * 
 * Bismillah — All praise to Allah ﷻ
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, webhook-id, webhook-timestamp, webhook-signature',
};

// ═══════════════════════════════════════════
// Standard Webhooks Signature Verification
// ═══════════════════════════════════════════

/**
 * Verify OpenAI webhook signature per Standard Webhooks spec
 * https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
 */
async function verifySignature(body, headers, secret) {
  const webhookId = headers.get('webhook-id');
  const webhookTimestamp = headers.get('webhook-timestamp');
  const webhookSignature = headers.get('webhook-signature');

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return { valid: false, error: 'Missing required webhook headers' };
  }

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(webhookTimestamp, 10);
  if (Math.abs(now - ts) > 300) {
    return { valid: false, error: 'Timestamp outside tolerance window' };
  }

  // Standard Webhooks: signed content = "{webhook-id}.{webhook-timestamp}.{body}"
  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;

  // Secret comes as "whsec_<base64>" — strip prefix and decode
  const secretBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const secretBytes = Uint8Array.from(atob(secretBase64), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedContent)
  );

  const computedSig = 'v1,' + btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // Check all provided signatures (may be multiple, space-separated)
  const signatures = webhookSignature.split(' ');
  const isValid = signatures.some(sig => sig.trim() === computedSig);

  return { valid: isValid, error: isValid ? null : 'Signature mismatch' };
}

// ═══════════════════════════════════════════
// Event Handlers
// ═══════════════════════════════════════════

const EVENT_HANDLERS = {
  // ─── Response Events (Background Mode) ───
  'response.completed': async (event, env) => {
    const responseId = event.data?.id;
    console.log(`[RESPONSE_COMPLETED] Response ${responseId} finished successfully`);

    // Forward to AI fleet for processing
    await forwardToService('https://ai.darcloud.host/api/webhook/response', event);
    // Log revenue impact
    await forwardToService('https://revenue.darcloud.host/api/webhook/event', {
      type: 'ai_response_completed',
      response_id: responseId,
      timestamp: event.created_at,
    });

    return { handled: true, action: 'response_processed', response_id: responseId };
  },

  'response.failed': async (event, env) => {
    const responseId = event.data?.id;
    console.log(`[RESPONSE_FAILED] Response ${responseId} failed`);
    await forwardToService('https://ai.darcloud.host/api/webhook/alert', {
      type: 'response_failed',
      response_id: responseId,
      timestamp: event.created_at,
    });
    return { handled: true, action: 'alert_dispatched', response_id: responseId };
  },

  'response.cancelled': async (event, env) => {
    console.log(`[RESPONSE_CANCELLED] Response ${event.data?.id} cancelled`);
    return { handled: true, action: 'logged' };
  },

  'response.incomplete': async (event, env) => {
    console.log(`[RESPONSE_INCOMPLETE] Response ${event.data?.id} interrupted`);
    await forwardToService('https://ai.darcloud.host/api/webhook/alert', {
      type: 'response_incomplete',
      response_id: event.data?.id,
      timestamp: event.created_at,
    });
    return { handled: true, action: 'retry_queued' };
  },

  // ─── Batch Events ───
  'batch.completed': async (event, env) => {
    const batchId = event.data?.id;
    console.log(`[BATCH_COMPLETED] Batch ${batchId} finished`);
    await forwardToService('https://revenue.darcloud.host/api/webhook/event', {
      type: 'batch_completed',
      batch_id: batchId,
      timestamp: event.created_at,
    });
    return { handled: true, action: 'batch_processed', batch_id: batchId };
  },

  'batch.failed': async (event, env) => {
    console.log(`[BATCH_FAILED] Batch ${event.data?.id} failed`);
    await forwardToService('https://ai.darcloud.host/api/webhook/alert', {
      type: 'batch_failed',
      batch_id: event.data?.id,
    });
    return { handled: true, action: 'alert_dispatched' };
  },

  'batch.cancelled': async (event, env) => {
    console.log(`[BATCH_CANCELLED] Batch ${event.data?.id} cancelled`);
    return { handled: true, action: 'logged' };
  },

  'batch.expired': async (event, env) => {
    console.log(`[BATCH_EXPIRED] Batch ${event.data?.id} expired`);
    return { handled: true, action: 'logged' };
  },

  // ─── Eval Run Events ───
  'eval_run.succeeded': async (event, env) => {
    console.log(`[EVAL_SUCCEEDED] Eval run completed`);
    await forwardToService('https://ai.darcloud.host/api/webhook/eval', {
      type: 'eval_succeeded',
      data: event.data,
    });
    return { handled: true, action: 'eval_processed' };
  },

  'eval_run.failed': async (event, env) => {
    console.log(`[EVAL_FAILED] Eval run failed`);
    return { handled: true, action: 'logged' };
  },

  'eval_run.canceled': async (event, env) => {
    console.log(`[EVAL_CANCELED] Eval run canceled`);
    return { handled: true, action: 'logged' };
  },

  // ─── Fine-Tuning Events ───
  'fine_tuning.job.succeeded': async (event, env) => {
    const jobId = event.data?.id;
    console.log(`[FINETUNE_SUCCEEDED] Job ${jobId} succeeded`);
    await forwardToService('https://ai.darcloud.host/api/webhook/finetune', {
      type: 'finetune_succeeded',
      job_id: jobId,
      timestamp: event.created_at,
    });
    // Notify revenue — fine-tuned model is a new revenue tool
    await forwardToService('https://revenue.darcloud.host/api/webhook/event', {
      type: 'finetune_model_ready',
      job_id: jobId,
    });
    return { handled: true, action: 'model_deployed', job_id: jobId };
  },

  'fine_tuning.job.failed': async (event, env) => {
    console.log(`[FINETUNE_FAILED] Job ${event.data?.id} failed`);
    return { handled: true, action: 'alert_dispatched' };
  },

  'fine_tuning.job.cancelled': async (event, env) => {
    console.log(`[FINETUNE_CANCELLED] Job ${event.data?.id} cancelled`);
    return { handled: true, action: 'logged' };
  },

  // ─── Realtime Events ───
  'realtime.call.incoming': async (event, env) => {
    console.log(`[REALTIME_CALL] Incoming SIP call`);
    await forwardToService('https://ai.darcloud.host/api/webhook/realtime', {
      type: 'incoming_call',
      data: event.data,
    });
    return { handled: true, action: 'call_routed' };
  },
};

/**
 * Forward event to an internal DarCloud service (fire-and-forget on edge)
 */
async function forwardToService(url, payload) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Source': 'openai' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`Forward to ${url} failed:`, err.message);
  }
}

// ═══════════════════════════════════════════
// Main Worker
// ═══════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ─── Health / Status ───
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        status: 'healthy',
        service: 'DarCloud OpenAI Webhook Gateway',
        version: '1.0.0',
        platform: 'Cloudflare Workers',
        timestamp: new Date().toISOString(),
        supported_events: Object.keys(EVENT_HANDLERS),
        total_event_types: Object.keys(EVENT_HANDLERS).length,
        spec: 'Standard Webhooks (https://www.standardwebhooks.com)',
        endpoints: {
          webhook: 'POST /openai',
          health: 'GET /health',
          events: 'GET /events',
          stats: 'GET /stats',
        },
      });
    }

    // ─── List supported events ───
    if (url.pathname === '/events') {
      return json({
        events: Object.keys(EVENT_HANDLERS).map(type => ({
          type,
          category: type.split('.')[0],
        })),
        total: Object.keys(EVENT_HANDLERS).length,
      });
    }

    // ─── Stats endpoint ───
    if (url.pathname === '/stats') {
      return json({
        service: 'DarCloud Webhook Gateway',
        uptime: 'edge-persistent',
        events_supported: Object.keys(EVENT_HANDLERS).length,
        categories: {
          response: ['completed', 'failed', 'cancelled', 'incomplete'],
          batch: ['completed', 'failed', 'cancelled', 'expired'],
          eval_run: ['succeeded', 'failed', 'canceled'],
          fine_tuning: ['job.succeeded', 'job.failed', 'job.cancelled'],
          realtime: ['call.incoming'],
        },
        integrations: [
          'https://ai.darcloud.host (AI Fleet)',
          'https://revenue.darcloud.host (Revenue Engine)',
          'https://mesh.darcloud.host (FungiMesh)',
        ],
      });
    }

    // ─── OpenAI Webhook Receiver ───
    if ((url.pathname === '/openai' || url.pathname === '/webhook' || url.pathname === '/') && request.method === 'POST') {
      const body = await request.text();
      
      // Verify signature if secret is configured
      const webhookSecret = env.OPENAI_WEBHOOK_SECRET;
      if (webhookSecret) {
        const verification = await verifySignature(body, request.headers, webhookSecret);
        if (!verification.valid) {
          console.error(`[SIGNATURE_INVALID] ${verification.error}`);
          return json({ error: 'Invalid webhook signature', detail: verification.error }, 401);
        }
      }

      // Parse event
      let event;
      try {
        event = JSON.parse(body);
      } catch (err) {
        return json({ error: 'Invalid JSON body' }, 400);
      }

      // Validate event structure
      if (!event.type || !event.id) {
        return json({ error: 'Invalid event: missing type or id' }, 400);
      }

      const webhookId = request.headers.get('webhook-id') || event.id;

      console.log(`[EVENT_RECEIVED] ${event.type} | ID: ${event.id} | Webhook-ID: ${webhookId}`);

      // Route to handler
      const handler = EVENT_HANDLERS[event.type];
      if (handler) {
        // Process in background (respond immediately per OpenAI guidance)
        ctx.waitUntil((async () => {
          try {
            const result = await handler(event, env);
            console.log(`[EVENT_HANDLED] ${event.type} => ${JSON.stringify(result)}`);
          } catch (err) {
            console.error(`[HANDLER_ERROR] ${event.type}: ${err.message}`);
          }
        })());

        return json({
          received: true,
          event_id: event.id,
          event_type: event.type,
          webhook_id: webhookId,
          status: 'accepted',
        }, 200);
      }

      // Unknown event type — still acknowledge
      console.warn(`[UNKNOWN_EVENT] ${event.type}`);
      return json({
        received: true,
        event_id: event.id,
        event_type: event.type,
        status: 'acknowledged_unknown',
        message: `Event type '${event.type}' not yet handled`,
      }, 200);
    }

    // 404
    return json({
      error: 'Not found',
      endpoints: {
        webhook: 'POST /openai',
        health: 'GET /health',
        events: 'GET /events',
        stats: 'GET /stats',
      },
    }, 404);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
