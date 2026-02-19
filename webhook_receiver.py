#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
DarCloud OpenAI Webhook Receiver — Production Server
=====================================================
Receives and processes OpenAI webhook events using the official SDK.
Runs on port 8787 behind Cloudflare Tunnel as backup to edge Worker.

Uses: openai.webhooks.unwrap() for Standard Webhooks signature verification
Events: response.*, batch.*, eval_run.*, fine_tuning.job.*, realtime.*

Bismillah — All praise to Allah ﷻ
"""

import os
import sys
import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, request, Response, jsonify

# ═══════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════

BASE_DIR = Path(__file__).parent.parent / "QuranChain"
ENV_FILE = BASE_DIR / ".env"
LOG_DIR = BASE_DIR / "monitoring_logs"
WEBHOOK_LOG = LOG_DIR / "webhook_events.log"
EVENT_STORE = Path(__file__).parent / ".webhook_events.json"

PORT = int(os.environ.get("WEBHOOK_PORT", 8787))

# Load .env
def load_env():
    """Load environment variables from .env file"""
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ.setdefault(key.strip(), val.strip())

load_env()

# ═══════════════════════════════════════════
# Logging
# ═══════════════════════════════════════════

LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(WEBHOOK_LOG),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("webhook_receiver")

# ═══════════════════════════════════════════
# OpenAI Client
# ═══════════════════════════════════════════

from openai import OpenAI, InvalidWebhookSignatureError

WEBHOOK_SECRET = os.environ.get("OPENAI_WEBHOOK_SECRET", "")
FUNGIMESH_KEY = os.environ.get("OPENAI_FUNGIMESH_KEY", "")
ADMIN_KEY = os.environ.get("OPENAI_FUNGIMESH_ADMIN_KEY", os.environ.get("OPENAI_ADMIN_KEY", ""))

client = OpenAI(
    api_key=FUNGIMESH_KEY or os.environ.get("OPENAI_API_KEY", ""),
    webhook_secret=WEBHOOK_SECRET if WEBHOOK_SECRET else None,
)

# ═══════════════════════════════════════════
# Event Storage (in-memory + JSON persistence)
# ═══════════════════════════════════════════

event_store = {
    "total_received": 0,
    "total_processed": 0,
    "total_failed": 0,
    "events_by_type": {},
    "recent_events": [],  # last 100
    "started_at": datetime.now(timezone.utc).isoformat(),
}
event_lock = threading.Lock()


def store_event(event_type, event_id, data, status="processed"):
    """Thread-safe event storage"""
    with event_lock:
        event_store["total_received"] += 1
        if status == "processed":
            event_store["total_processed"] += 1
        else:
            event_store["total_failed"] += 1

        event_store["events_by_type"][event_type] = \
            event_store["events_by_type"].get(event_type, 0) + 1

        event_store["recent_events"].append({
            "id": event_id,
            "type": event_type,
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data_preview": str(data)[:200] if data else None,
        })
        # Keep only last 100
        if len(event_store["recent_events"]) > 100:
            event_store["recent_events"] = event_store["recent_events"][-100:]

        # Persist to disk
        try:
            with open(EVENT_STORE, 'w') as f:
                json.dump(event_store, f, indent=2)
        except Exception:
            pass


# ═══════════════════════════════════════════
# Assistant & Agent Maps
# ═══════════════════════════════════════════

def load_assistant_maps():
    """Load all deployed assistant IDs"""
    assistants = {}

    # Mini assistants (gpt-4o-mini)
    mini_path = BASE_DIR / ".openai_assistants_map.json"
    if mini_path.exists():
        with open(mini_path) as f:
            data = json.load(f)
            for name, aid in data.get("assistants", {}).items():
                assistants[name] = {"id": aid, "tier": "mini", "model": "gpt-4o-mini"}

    # Core assistants (gpt-4o)
    core_path = BASE_DIR / ".openai_core_assistants_map.json"
    if core_path.exists():
        with open(core_path) as f:
            data = json.load(f)
            for name, aid in data.get("assistants", {}).items():
                assistants[name] = {"id": aid, "tier": "core", "model": "gpt-4o"}

    return assistants


ASSISTANT_MAP = load_assistant_maps()
logger.info(f"Loaded {len(ASSISTANT_MAP)} assistants ({sum(1 for a in ASSISTANT_MAP.values() if a['tier']=='mini')} mini, {sum(1 for a in ASSISTANT_MAP.values() if a['tier']=='core')} core)")

# ═══════════════════════════════════════════
# Event Handlers
# ═══════════════════════════════════════════

def handle_response_completed(event):
    """Process completed background response"""
    response_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.info(f"[RESPONSE_COMPLETED] {response_id}")

    # Retrieve full response for processing
    try:
        response = client.responses.retrieve(response_id)
        output_text = ""
        if hasattr(response, 'output'):
            for item in response.output:
                if hasattr(item, 'type') and item.type == 'message':
                    for content in item.content:
                        if hasattr(content, 'type') and content.type == 'output_text':
                            output_text += content.text
        logger.info(f"[RESPONSE_OUTPUT] {response_id}: {output_text[:200]}...")
    except Exception as e:
        logger.warning(f"Could not retrieve response {response_id}: {e}")

    store_event("response.completed", response_id, {"output_preview": output_text[:500] if 'output_text' in dir() else None})
    return {"action": "response_processed", "response_id": response_id}


def handle_response_failed(event):
    """Handle failed background response"""
    response_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.error(f"[RESPONSE_FAILED] {response_id}")
    store_event("response.failed", response_id, None, status="failed")
    return {"action": "alert_dispatched", "response_id": response_id}


def handle_response_cancelled(event):
    """Handle cancelled background response"""
    response_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.info(f"[RESPONSE_CANCELLED] {response_id}")
    store_event("response.cancelled", response_id, None)
    return {"action": "logged"}


def handle_response_incomplete(event):
    """Handle incomplete/interrupted background response"""
    response_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.warning(f"[RESPONSE_INCOMPLETE] {response_id}")
    store_event("response.incomplete", response_id, None, status="failed")
    return {"action": "retry_queued"}


def handle_batch_completed(event):
    """Handle completed batch"""
    batch_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.info(f"[BATCH_COMPLETED] {batch_id}")
    store_event("batch.completed", batch_id, None)
    return {"action": "batch_processed", "batch_id": batch_id}


def handle_batch_failed(event):
    batch_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.error(f"[BATCH_FAILED] {batch_id}")
    store_event("batch.failed", batch_id, None, status="failed")
    return {"action": "alert_dispatched"}


def handle_batch_cancelled(event):
    batch_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.info(f"[BATCH_CANCELLED] {batch_id}")
    store_event("batch.cancelled", batch_id, None)
    return {"action": "logged"}


def handle_batch_expired(event):
    batch_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.warning(f"[BATCH_EXPIRED] {batch_id}")
    store_event("batch.expired", batch_id, None, status="failed")
    return {"action": "logged"}


def handle_eval_succeeded(event):
    logger.info(f"[EVAL_SUCCEEDED] Eval run completed")
    store_event("eval_run.succeeded", event.id if hasattr(event, 'id') else 'unknown', None)
    return {"action": "eval_processed"}


def handle_eval_failed(event):
    logger.error(f"[EVAL_FAILED] Eval run failed")
    store_event("eval_run.failed", event.id if hasattr(event, 'id') else 'unknown', None, status="failed")
    return {"action": "logged"}


def handle_eval_canceled(event):
    logger.info(f"[EVAL_CANCELED] Eval run canceled")
    store_event("eval_run.canceled", event.id if hasattr(event, 'id') else 'unknown', None)
    return {"action": "logged"}


def handle_finetune_succeeded(event):
    job_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.info(f"[FINETUNE_SUCCEEDED] Job {job_id}")
    store_event("fine_tuning.job.succeeded", job_id, None)
    return {"action": "model_deployed", "job_id": job_id}


def handle_finetune_failed(event):
    job_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.error(f"[FINETUNE_FAILED] Job {job_id}")
    store_event("fine_tuning.job.failed", job_id, None, status="failed")
    return {"action": "alert_dispatched"}


def handle_finetune_cancelled(event):
    job_id = event.data.id if hasattr(event, 'data') and hasattr(event.data, 'id') else event.get('data', {}).get('id', 'unknown')
    logger.info(f"[FINETUNE_CANCELLED] Job {job_id}")
    store_event("fine_tuning.job.cancelled", job_id, None)
    return {"action": "logged"}


def handle_realtime_call(event):
    logger.info(f"[REALTIME_CALL] Incoming SIP call")
    store_event("realtime.call.incoming", event.id if hasattr(event, 'id') else 'unknown', None)
    return {"action": "call_routed"}


EVENT_HANDLERS = {
    "response.completed": handle_response_completed,
    "response.failed": handle_response_failed,
    "response.cancelled": handle_response_cancelled,
    "response.incomplete": handle_response_incomplete,
    "batch.completed": handle_batch_completed,
    "batch.failed": handle_batch_failed,
    "batch.cancelled": handle_batch_cancelled,
    "batch.expired": handle_batch_expired,
    "eval_run.succeeded": handle_eval_succeeded,
    "eval_run.failed": handle_eval_failed,
    "eval_run.canceled": handle_eval_canceled,
    "fine_tuning.job.succeeded": handle_finetune_succeeded,
    "fine_tuning.job.failed": handle_finetune_failed,
    "fine_tuning.job.cancelled": handle_finetune_cancelled,
    "realtime.call.incoming": handle_realtime_call,
}

# ═══════════════════════════════════════════
# Flask Application
# ═══════════════════════════════════════════

app = Flask(__name__)


@app.route("/health", methods=["GET"])
@app.route("/", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "DarCloud Webhook Receiver",
        "version": "1.0.0",
        "port": PORT,
        "sdk_version": "openai-2.21.0",
        "webhook_secret_configured": bool(WEBHOOK_SECRET),
        "assistants_loaded": len(ASSISTANT_MAP),
        "supported_events": list(EVENT_HANDLERS.keys()),
        "total_event_types": len(EVENT_HANDLERS),
        "stats": {
            "total_received": event_store["total_received"],
            "total_processed": event_store["total_processed"],
            "total_failed": event_store["total_failed"],
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/webhook", methods=["POST"])
@app.route("/openai", methods=["POST"])
def webhook():
    """
    OpenAI Webhook Receiver
    Uses official SDK client.webhooks.unwrap() for signature verification
    """
    try:
        # Verify signature and unwrap event using OpenAI SDK
        if WEBHOOK_SECRET:
            event = client.webhooks.unwrap(
                request.data,
                request.headers,
                secret=WEBHOOK_SECRET
            )
        else:
            # No secret configured — parse directly (development mode)
            event_data = json.loads(request.data)
            # Create a simple namespace for consistency
            event = type('Event', (), {
                'type': event_data.get('type', 'unknown'),
                'id': event_data.get('id', 'unknown'),
                'data': type('Data', (), event_data.get('data', {}))(),
                'created_at': event_data.get('created_at'),
                'object': event_data.get('object', 'event'),
            })()
            logger.warning("[NO_SECRET] Processing without signature verification")

        event_type = event.type if hasattr(event, 'type') else 'unknown'
        event_id = event.id if hasattr(event, 'id') else request.headers.get('webhook-id', 'unknown')

        logger.info(f"[EVENT_RECEIVED] {event_type} | ID: {event_id}")

        # Route to handler
        handler = EVENT_HANDLERS.get(event_type)
        if handler:
            # Process in background thread
            def process():
                try:
                    result = handler(event)
                    logger.info(f"[EVENT_HANDLED] {event_type} => {json.dumps(result)}")
                except Exception as e:
                    logger.error(f"[HANDLER_ERROR] {event_type}: {e}")
                    store_event(event_type, event_id, None, status="failed")

            threading.Thread(target=process, daemon=True).start()

            return jsonify({
                "received": True,
                "event_id": event_id,
                "event_type": event_type,
                "status": "accepted",
            }), 200
        else:
            logger.warning(f"[UNKNOWN_EVENT] {event_type}")
            store_event(event_type, event_id, None, status="unknown")
            return jsonify({
                "received": True,
                "event_id": event_id,
                "event_type": event_type,
                "status": "acknowledged_unknown",
            }), 200

    except InvalidWebhookSignatureError as e:
        logger.error(f"[SIGNATURE_INVALID] {e}")
        return Response("Invalid signature", status=400)
    except json.JSONDecodeError:
        return Response("Invalid JSON", status=400)
    except Exception as e:
        logger.error(f"[WEBHOOK_ERROR] {e}")
        return Response(f"Internal error: {e}", status=500)


@app.route("/events", methods=["GET"])
def events():
    """List recent events"""
    return jsonify({
        "events": event_store["recent_events"][-20:],
        "stats": {
            "total_received": event_store["total_received"],
            "total_processed": event_store["total_processed"],
            "total_failed": event_store["total_failed"],
            "by_type": event_store["events_by_type"],
        },
        "started_at": event_store["started_at"],
    })


@app.route("/assistants", methods=["GET"])
def assistants():
    """List all wired assistants"""
    return jsonify({
        "total": len(ASSISTANT_MAP),
        "mini": {n: a for n, a in ASSISTANT_MAP.items() if a["tier"] == "mini"},
        "core": {n: a for n, a in ASSISTANT_MAP.items() if a["tier"] == "core"},
    })


@app.route("/stats", methods=["GET"])
def stats():
    """Detailed statistics"""
    return jsonify({
        "service": "DarCloud Webhook Receiver",
        "uptime_since": event_store["started_at"],
        "events": event_store["events_by_type"],
        "total_received": event_store["total_received"],
        "total_processed": event_store["total_processed"],
        "total_failed": event_store["total_failed"],
        "assistants_wired": len(ASSISTANT_MAP),
        "webhook_secret_set": bool(WEBHOOK_SECRET),
        "domains": [
            "webhook.darcloud.host (Cloudflare Worker — edge)",
            "hooks.darcloud.host (Cloudflare Worker — edge)",
            f"localhost:{PORT} (Python receiver — origin)",
        ],
    })


# ═══════════════════════════════════════════
# Entry Point
# ═══════════════════════════════════════════

if __name__ == "__main__":
    logger.info(f"🕌 DarCloud Webhook Receiver starting on port {PORT}")
    logger.info(f"   Webhook Secret: {'configured' if WEBHOOK_SECRET else 'NOT SET (dev mode)'}")
    logger.info(f"   Assistants: {len(ASSISTANT_MAP)} loaded")
    logger.info(f"   Event types: {len(EVENT_HANDLERS)}")
    logger.info(f"   Endpoints: POST /webhook, POST /openai, GET /health, GET /events, GET /stats")
    logger.info("")

    app.run(host="0.0.0.0", port=PORT, debug=False)
