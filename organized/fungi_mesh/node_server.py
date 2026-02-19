#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
Fungi Mesh Node Server
Individual node that participates in mesh network
"""

import json
import argparse
import time
import logging
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class NodeState:
    def __init__(self, node_id, port):
        self.node_id = node_id
        self.port = port
        self.status = "active"
        self.health = 95
        self.neighbors = []
        self.routes = {}
        self.packets_sent = 0
        self.packets_received = 0
        self.start_time = time.time()
    
    def to_dict(self):
        return {
            "node_id": self.node_id,
            "port": self.port,
            "status": self.status,
            "health": self.health,
            "neighbors": self.neighbors,
            "routes": self.routes,
            "packets_sent": self.packets_sent,
            "packets_received": self.packets_received,
            "uptime_seconds": int(time.time() - self.start_time)
        }

class NodeHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = {"status": "healthy", "node_id": node_state.node_id}
            self.wfile.write(json.dumps(resp).encode())
        
        elif self.path == "/node/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            node_state.packets_received += 1
            self.wfile.write(json.dumps(node_state.to_dict()).encode())
        
        elif self.path == "/mesh/announce":
            node_state.packets_sent += 1
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = {"acked": True, "node_id": node_state.node_id}
            self.wfile.write(json.dumps(resp).encode())
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        logger.info(f"[{node_state.node_id}] " + (format % args))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fungi Mesh Node Server")
    parser.add_argument("--node-id", required=True)
    parser.add_argument("--port", type=int, required=True)
    args = parser.parse_args()
    
    node_state = NodeState(args.node_id, args.port)
    
    logger.info(f"🍄 Node {args.node_id} starting on port {args.port}...")
    
    server = HTTPServer(("localhost", args.port), NodeHandler)
    server.serve_forever()
