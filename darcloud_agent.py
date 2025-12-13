import json
import logging
import os
import socket
import subprocess
import time
import uuid
from pathlib import Path

from flask import Flask, jsonify, request

APP_PORT = 7788
LOG_DIR = Path.home() / "darcloud_agent"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "agent.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(),
    ],
)

app = Flask(__name__)


def get_agent_identity():
    agent_id = socket.gethostname()
    wallet = os.environ.get("QURANCHAIN_WALLET", "UNSET")
    return agent_id, wallet


@app.route("/status", methods=["GET"])
def status():
    agent_id, wallet = get_agent_identity()
    return jsonify(
        {
            "agent_id": agent_id,
            "wallet": wallet,
            "status": "ONLINE",
            "timestamp": int(time.time()),
        }
    )


@app.route("/execute", methods=["POST"])
def execute_command():
    agent_id, wallet = get_agent_identity()
    payload = request.get_json(silent=True) or {}
    command = payload.get("command")

    if not command or not isinstance(command, str):
        logging.warning("Invalid execute request from %s: %s", request.remote_addr, payload)
        return jsonify({"error": "command is required"}), 400

    task_id = str(uuid.uuid4())
    timestamp = int(time.time())

    logging.info(
        "[EXECUTE REQUEST] agent_id=%s wallet=%s task_id=%s command=%s",
        agent_id,
        wallet,
        task_id,
        command,
    )

    try:
        completed = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300,
        )
        success = completed.returncode == 0
        stdout = completed.stdout.strip()
        stderr = completed.stderr.strip()
        output_parts = [part for part in [stdout, stderr] if part]
        output = "\n".join(output_parts)
    except Exception as exc:  # pragma: no cover - defensive guard
        success = False
        output = f"Execution error: {exc}"
        logging.exception("Execution failure for task_id=%s", task_id)

    receipt = {
        "task_id": task_id,
        "command": command,
        "output": output,
        "success": success,
        "timestamp": timestamp,
        "agent_id": agent_id,
        "wallet": wallet,
    }

    logging.info(
        "[EXECUTE RECEIPT] agent_id=%s wallet=%s task_id=%s success=%s",
        agent_id,
        wallet,
        task_id,
        success,
    )
    logging.debug("[EXECUTE OUTPUT] %s", json.dumps(receipt))

    status_code = 200 if success else 500
    return jsonify(receipt), status_code


if __name__ == "__main__":
    agent_id, wallet = get_agent_identity()
    logging.info("Starting DarCloud agent on port %s as %s (wallet=%s)", APP_PORT, agent_id, wallet)
    app.run(host="0.0.0.0", port=APP_PORT)
