#!/usr/bin/env python3
"""Dar Al-Nas Treasury Service - Port 8201"""
import http.server
import json
from datetime import datetime
import threading

PORT = 8201
SERVICE_NAME = "dar_treasury_service"

class TreasuryService:
    def __init__(self):
        self.reserves = 0.0
        self.founder_royalty_rate = 0.30
        self.allocations = {"community": 0, "development": 0, "operations": 0}
        self.transactions = []
    
    def allocate_funds(self, amount: float, category: str):
        """Allocate treasury funds"""
        founder_share = amount * self.founder_royalty_rate
        allocation = amount - founder_share
        
        if category in self.allocations:
            self.allocations[category] += allocation
        
        self.transactions.append({
            "timestamp": datetime.now().isoformat(),
            "type": "ALLOCATION",
            "amount": amount,
            "founder_royalty": founder_share,
            "category": category,
            "net_allocation": allocation
        })
        return {"status": "success", "founder_royalty": founder_share}
    
    def get_status(self):
        return {
            "service": SERVICE_NAME,
            "allocations": self.allocations,
            "founder_royalty_rate": self.founder_royalty_rate,
            "transactions": len(self.transactions)
        }

class Handler(http.server.BaseHTTPRequestHandler):
    service = None
    def handle(self):
        try:
            request = self.request.recv(1024).decode()
            response = b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
            response += json.dumps(self.service.get_status()).encode()
            self.request.sendall(response)
        except: pass

def start():
    print(f"💰 {SERVICE_NAME} starting on port {PORT}...")
    service = TreasuryService()
    Handler.service = service
    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"✅ {SERVICE_NAME} running on port {PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"❌ {SERVICE_NAME} shutdown")

if __name__ == "__main__":
    start()
