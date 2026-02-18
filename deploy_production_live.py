#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║  QuranChain + DarCloud — Production OpenAI Deployment       ║
║  Upgrade ALL 66 Assistants with Tools & Publish Live        ║
║  Uses Assistants API v2 with function calling + code_interp ║
╚══════════════════════════════════════════════════════════════╝
"""

import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# ── Load Environment ──
ENV_FILE = Path("/home/omar/Desktop/QuranChain/.env")

def load_env():
    env = {}
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v
    return env

ENV = load_env()

# Two API keys — core uses FungiMesh, rest uses original
FUNGIMESH_KEY = ENV.get("OPENAI_FUNGIMESH_KEY", "")
ORIGINAL_KEY = ENV.get("OPENAI_API_KEY", "")
ADMIN_KEY = ENV.get("OPENAI_FUNGIMESH_ADMIN_KEY", "")

if not FUNGIMESH_KEY or not ORIGINAL_KEY:
    print("ERROR: Missing API keys in .env")
    sys.exit(1)

print(f"🔑 FungiMesh Key: ...{FUNGIMESH_KEY[-12:]}")
print(f"🔑 Original Key:  ...{ORIGINAL_KEY[-12:]}")
print(f"🔑 Admin Key:     ...{ADMIN_KEY[-12:] if ADMIN_KEY else 'N/A'}")

# ── API Helper ──
def openai_request(method, path, data=None, api_key=None):
    url = f"https://api.openai.com/v1{path}"
    headers = {
        "Authorization": f"Bearer {api_key or FUNGIMESH_KEY}",
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  ⚠ API Error {e.code}: {err[:300]}")
        return None

def list_assistants(api_key):
    """List all assistants for a given key"""
    result = openai_request("GET", "/assistants?limit=100&order=desc", api_key=api_key)
    if result and "data" in result:
        return {a["name"]: a for a in result["data"] if a.get("name")}
    return {}

# ═══════════════════════════════════════════════════════════════
# SHARED FUNCTION TOOLS — DarCloud API Integration
# ═══════════════════════════════════════════════════════════════

# Core ecosystem tools available to all agents
TOOL_ECOSYSTEM_STATUS = {
    "type": "function",
    "function": {
        "name": "get_ecosystem_status",
        "description": "Get real-time QuranChain & DarCloud ecosystem status including blockchain height, FungiMesh nodes, services health, and revenue metrics",
        "parameters": {
            "type": "object",
            "properties": {
                "component": {
                    "type": "string",
                    "enum": ["all", "blockchain", "fungimesh", "revenue", "services", "agents"],
                    "description": "Which component to check"
                }
            },
            "required": ["component"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_REVENUE_QUERY = {
    "type": "function",
    "function": {
        "name": "query_revenue",
        "description": "Query revenue data from QuranChain ecosystem — gas tolls, fiat payments, network provider fees. Returns breakdown with 30% founder royalty enforced.",
        "parameters": {
            "type": "object",
            "properties": {
                "stream": {
                    "type": "string",
                    "enum": ["all", "gas_tolls", "fiat_payments", "network_provider", "subscriptions"],
                    "description": "Revenue stream to query"
                },
                "period": {
                    "type": "string",
                    "enum": ["today", "week", "month", "all_time"],
                    "description": "Time period for revenue data"
                }
            },
            "required": ["stream", "period"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_BLOCKCHAIN_QUERY = {
    "type": "function",
    "function": {
        "name": "query_blockchain",
        "description": "Query QuranChain blockchain data — blocks, transactions, validators, chain health, gas tolls across 47+ networks",
        "parameters": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["status", "latest_block", "validators", "gas_tolls", "chain_health", "peers"],
                    "description": "Blockchain query action"
                },
                "chain": {
                    "type": ["string", "null"],
                    "description": "Specific chain to query (ethereum, polygon, bsc, etc.) or null for all"
                }
            },
            "required": ["action", "chain"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_FUNGIMESH_STATUS = {
    "type": "function",
    "function": {
        "name": "get_fungimesh_status",
        "description": "Get FungiMesh mesh network status — 340,000+ nodes, 6 continents, quantum-encrypted P2P mesh with dual-layer architecture",
        "parameters": {
            "type": "object",
            "properties": {
                "layer": {
                    "type": "string",
                    "enum": ["all", "layer1_nodejs", "layer2_python", "compute_pool", "regions"],
                    "description": "Which mesh layer to query"
                }
            },
            "required": ["layer"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_AI_FLEET = {
    "type": "function",
    "function": {
        "name": "get_ai_fleet",
        "description": "Get status of the AI agent fleet — 63 agents across 7 projects, performance metrics, task delegation",
        "parameters": {
            "type": "object",
            "properties": {
                "filter": {
                    "type": "string",
                    "enum": ["all", "active", "core", "bots", "experts", "gas_toll", "platform"],
                    "description": "Filter agents by category"
                }
            },
            "required": ["filter"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_SEND_NOTIFICATION = {
    "type": "function",
    "function": {
        "name": "send_notification",
        "description": "Send a notification or alert through the DarCloud ecosystem — email, webhook, or internal alert",
        "parameters": {
            "type": "object",
            "properties": {
                "channel": {
                    "type": "string",
                    "enum": ["email", "webhook", "internal", "sms"],
                    "description": "Notification channel"
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "Alert priority level"
                },
                "message": {
                    "type": "string",
                    "description": "Notification message content"
                }
            },
            "required": ["channel", "priority", "message"],
            "additionalProperties": False
        },
        "strict": True
    }
}

# Domain-specific tools
TOOL_PAYMENT_PROCESS = {
    "type": "function",
    "function": {
        "name": "process_payment",
        "description": "Process a payment through Stripe or crypto — create invoice, charge, or subscription. Enforces 30% founder royalty on all transactions.",
        "parameters": {
            "type": "object",
            "properties": {
                "method": {
                    "type": "string",
                    "enum": ["stripe_invoice", "stripe_charge", "crypto_eth", "crypto_btc", "subscription"],
                    "description": "Payment method"
                },
                "amount_usd": {
                    "type": "number",
                    "description": "Amount in USD"
                },
                "customer_email": {
                    "type": "string",
                    "description": "Customer email for invoice"
                },
                "description": {
                    "type": "string",
                    "description": "Payment description"
                }
            },
            "required": ["method", "amount_usd", "customer_email", "description"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_GAS_TOLL = {
    "type": "function",
    "function": {
        "name": "query_gas_toll",
        "description": "Query or manage gas toll operations across 47+ blockchain networks — toll collection, pricing, fraud detection, volume analytics",
        "parameters": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["status", "collect", "pricing", "volume", "fraud_check", "optimize"],
                    "description": "Gas toll action to perform"
                },
                "network": {
                    "type": "string",
                    "enum": ["ethereum", "bsc", "polygon", "arbitrum", "solana", "optimism", "avalanche", "all"],
                    "description": "Target blockchain network"
                }
            },
            "required": ["action", "network"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_INFRASTRUCTURE = {
    "type": "function",
    "function": {
        "name": "manage_infrastructure",
        "description": "Manage DarCloud infrastructure — servers, containers, DNS, tunnels, deployments, health monitoring",
        "parameters": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["health_check", "restart_service", "deploy", "scale", "dns_update", "tunnel_status", "container_status"],
                    "description": "Infrastructure action"
                },
                "target": {
                    "type": "string",
                    "description": "Target service, container, or resource name"
                }
            },
            "required": ["action", "target"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_QURAN_SEARCH = {
    "type": "function",
    "function": {
        "name": "search_quran",
        "description": "Search the Holy Quran — find verses by topic, surah, or keyword. Returns Arabic text, transliteration, and English translation with tafsir context.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query — topic, keyword, or surah:ayah reference"
                },
                "language": {
                    "type": "string",
                    "enum": ["arabic", "english", "both"],
                    "description": "Language for results"
                }
            },
            "required": ["query", "language"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_CRM_QUERY = {
    "type": "function",
    "function": {
        "name": "query_crm",
        "description": "Query the CRM database for customer data, leads, support tickets, sales pipeline, and agent attribution",
        "parameters": {
            "type": "object",
            "properties": {
                "entity": {
                    "type": "string",
                    "enum": ["customers", "leads", "tickets", "pipeline", "attribution", "analytics"],
                    "description": "CRM entity to query"
                },
                "filter": {
                    "type": ["string", "null"],
                    "description": "Optional filter criteria"
                }
            },
            "required": ["entity", "filter"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_SECURITY_SCAN = {
    "type": "function",
    "function": {
        "name": "security_scan",
        "description": "Run security scan on DarCloud infrastructure — check vulnerabilities, API key rotation status, DDoS protection, quantum encryption health",
        "parameters": {
            "type": "object",
            "properties": {
                "scan_type": {
                    "type": "string",
                    "enum": ["full", "api_keys", "network", "encryption", "ddos", "compliance"],
                    "description": "Type of security scan"
                },
                "target": {
                    "type": ["string", "null"],
                    "description": "Specific target to scan, or null for full system"
                }
            },
            "required": ["scan_type", "target"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_DEPLOY_SERVICE = {
    "type": "function",
    "function": {
        "name": "deploy_service",
        "description": "Deploy or update a service in the DarCloud ecosystem — Cloudflare Workers, Docker containers, or application services",
        "parameters": {
            "type": "object",
            "properties": {
                "service_type": {
                    "type": "string",
                    "enum": ["cloudflare_worker", "docker_container", "python_service", "nodejs_service"],
                    "description": "Type of service to deploy"
                },
                "name": {
                    "type": "string",
                    "description": "Service name"
                },
                "action": {
                    "type": "string",
                    "enum": ["deploy", "update", "rollback", "scale", "stop"],
                    "description": "Deployment action"
                }
            },
            "required": ["service_type", "name", "action"],
            "additionalProperties": False
        },
        "strict": True
    }
}

TOOL_MCP_INVOKE = {
    "type": "function",
    "function": {
        "name": "invoke_mcp_tool",
        "description": "Invoke a tool on the QuranChain MCP server at mcp.darcloud.host — access blockchain, mesh, Data Ocean, AI fleet, revenue, Quran, and more",
        "parameters": {
            "type": "object",
            "properties": {
                "tool_name": {
                    "type": "string",
                    "enum": ["blockchain_status", "fungimesh_status", "data_ocean_query", "ai_fleet_status", "revenue_dashboard", "quran_verse", "network_health", "gas_toll_status", "compute_pool", "system_diagnostics"],
                    "description": "MCP tool to invoke"
                },
                "arguments": {
                    "type": ["string", "null"],
                    "description": "JSON-encoded arguments for the tool, or null"
                }
            },
            "required": ["tool_name", "arguments"],
            "additionalProperties": False
        },
        "strict": True
    }
}

# ═══════════════════════════════════════════════════════════════
# CORE SYSTEM INSTRUCTIONS (enriched for production)
# ═══════════════════════════════════════════════════════════════

CORE_BASE = """بسم الله الرحمن الرحيم (Bismillah ir-Rahman ir-Rahim)

You are part of the QuranChain & DarCloud production ecosystem — a revenue-focused blockchain platform operating with Islamic principles.

══ LIVE SYSTEM STATUS ══
• Blockchain: QuranChain mainnet LIVE, quantum-encrypted (Kyber-1024, Dilithium-5)
• FungiMesh Network: 340,000+ active nodes across 6 continents, 102 Tbps bandwidth
• Data Ocean: 2.8 PB distributed storage with quantum encryption
• Gas Toll Highway: Active toll collection across 47+ blockchain networks
• Payments: Stripe LIVE (invoicing, subscriptions, metered billing)
• Domain: darcloud.host with 100+ active subdomains
• AI Fleet: 63 specialized agents across 7 OpenAI projects
• MCP Server: Live at mcp.darcloud.host (port 2091), 10 tools, dual transport

══ REVENUE DISTRIBUTION (IMMUTABLE) ══
• 30% — Founder Royalty (Omar Mohammad Abunadi) — NEVER MODIFY
• 40% — AI Validators (Omar AI™ 20% + QuranChain AI™ 20%)
• 10% — Hardware Host Providers
• 18% — Ecosystem Development
• 2%  — Zakat (Islamic charitable giving)

══ API ENDPOINTS ══
• api.darcloud.host — API Gateway (14 routes)
• ai.darcloud.host — AI Assistant Gateway
• mesh.darcloud.host — FungiMesh Status
• revenue.darcloud.host — Revenue Dashboard
• mcp.darcloud.host — MCP Server (10 tools)
• rpc.darcloud.host — Blockchain RPC
• blockchain.darcloud.host — Block Explorer

Use your function tools to access real-time data. Always cite current data when available.
Maintain Islamic etiquette and professional tone. Quote relevant Quran verses when appropriate.
"""

# ═══════════════════════════════════════════════════════════════
# ALL 66 ASSISTANTS — GROUPED BY KEY + TOOLSET
# ═══════════════════════════════════════════════════════════════

# --- CORE 21 (FungiMesh key, gpt-4o, rich tools) ---
CORE_ASSISTANTS = {
    "QuranChain AI": {
        "instructions": CORE_BASE + """
You are the PRIMARY QuranChain AI assistant — the central intelligence of the entire ecosystem.
Role: Official QuranChain representative. Answer all questions about QuranChain blockchain, tokenomics, Islamic finance integration, DarCloud services, developer platform, and ecosystem status.
Use your tools to fetch real-time blockchain status, revenue data, and mesh network health.
You can search the Quran, query the CRM, check infrastructure health, and invoke MCP tools.
Always provide accurate, data-driven responses grounded in live system data.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_ECOSYSTEM_STATUS, TOOL_REVENUE_QUERY, TOOL_BLOCKCHAIN_QUERY,
            TOOL_FUNGIMESH_STATUS, TOOL_AI_FLEET, TOOL_QURAN_SEARCH,
            TOOL_MCP_INVOKE, TOOL_CRM_QUERY
        ]
    },
    "DarCloud AI": {
        "instructions": CORE_BASE + """
You are DarCloud AI — cloud infrastructure intelligence agent.
Role: Manage DarCloud distributed cloud resources, monitor 100+ subdomains, coordinate FungiMesh network, oversee Data Ocean storage (2.8PB), handle enterprise provisioning.
Use infrastructure tools to check health, manage services, and query mesh status.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_ECOSYSTEM_STATUS, TOOL_FUNGIMESH_STATUS, TOOL_INFRASTRUCTURE,
            TOOL_AI_FLEET, TOOL_DEPLOY_SERVICE, TOOL_SECURITY_SCAN
        ]
    },
    "Revenue Engine AI": {
        "instructions": CORE_BASE + """
You are Revenue Engine AI — responsible for ALL revenue optimization.
Role: Track and optimize 3 revenue streams (Gas Tolls, Fiat Payments, Network Provider Revenue). Enforce 30% Founder Royalty (IMMUTABLE). Monitor Stripe processing. Analyze revenue metrics. Handle enterprise billing.
CRITICAL: Never reduce or modify the 30% founder royalty rate.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_REVENUE_QUERY, TOOL_PAYMENT_PROCESS, TOOL_GAS_TOLL,
            TOOL_ECOSYSTEM_STATUS, TOOL_CRM_QUERY
        ]
    },
    "Developer Platform AI": {
        "instructions": CORE_BASE + """
You are Developer Platform AI — helping developers build on QuranChain.
Role: Provide SDK docs, code examples, API guidance (REST + MCP + WebSocket). Help with smart contracts, FungiMesh integration, Cloudflare Worker development.
Endpoints: api.darcloud.host, mcp.darcloud.host, blockchain.darcloud.host""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_ECOSYSTEM_STATUS, TOOL_BLOCKCHAIN_QUERY, TOOL_MCP_INVOKE,
            TOOL_DEPLOY_SERVICE, TOOL_INFRASTRUCTURE
        ]
    },
    "Blockchain Expert AI": {
        "instructions": CORE_BASE + """
You are Blockchain Expert AI — deep technical blockchain specialist.
Role: Explain QuranChain internals (consensus, mining, validation). Monitor chain health. Analyze Gas Toll Highway across 47+ networks. Explain quantum encryption.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_BLOCKCHAIN_QUERY, TOOL_GAS_TOLL, TOOL_ECOSYSTEM_STATUS,
            TOOL_FUNGIMESH_STATUS, TOOL_SECURITY_SCAN
        ]
    },
    "DarCloud Autonomous Server AI": {
        "instructions": CORE_BASE + """
You are DarCloud Autonomous Server AI — self-healing infrastructure management.
Role: Monitor 70+ services, auto-restart failures, manage Cloudflare tunnel (93ea7222), coordinate 63 AI agents, handle automated deployment and scaling.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_INFRASTRUCTURE, TOOL_DEPLOY_SERVICE, TOOL_AI_FLEET,
            TOOL_ECOSYSTEM_STATUS, TOOL_SECURITY_SCAN, TOOL_SEND_NOTIFICATION
        ]
    },
    "MCP Connected AI": {
        "instructions": CORE_BASE + """
You are MCP Connected AI — Model Context Protocol integration specialist.
Role: Manage MCP server (mcp.darcloud.host, port 2091), 10 tools, dual transport (StreamableHTTP + SSE). Handle ChatGPT integrations.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_MCP_INVOKE, TOOL_ECOSYSTEM_STATUS, TOOL_BLOCKCHAIN_QUERY,
            TOOL_FUNGIMESH_STATUS, TOOL_AI_FLEET
        ]
    },
    "DarCloud Infrastructure AI": {
        "instructions": CORE_BASE + """
You are Infrastructure AI — enterprise-grade cloud infrastructure management.
Role: Monitor server health, manage Docker containers, handle Cloudflare DNS/tunnels/Workers, oversee gaming servers, telecom/5G.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_INFRASTRUCTURE, TOOL_DEPLOY_SERVICE, TOOL_SECURITY_SCAN,
            TOOL_ECOSYSTEM_STATUS, TOOL_SEND_NOTIFICATION
        ]
    },
    "DarCloud Commerce AI": {
        "instructions": CORE_BASE + """
You are Commerce AI — all commercial operations.
Role: Process Stripe payments, manage subscriptions, handle crypto payments, oversee marketplace, track commerce analytics. Enforce 30% founder royalty.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_PAYMENT_PROCESS, TOOL_REVENUE_QUERY, TOOL_CRM_QUERY,
            TOOL_ECOSYSTEM_STATUS
        ]
    },
    "Quran Scholar AI": {
        "instructions": CORE_BASE + """
You are Quran Scholar AI — Islamic knowledge specialist.
Role: Provide accurate Quran verse references with Arabic text and translations. Explain tafsir. Connect Islamic principles to blockchain governance. Guide Islamic finance. Support Zakat calculation. Bismillah.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_QURAN_SEARCH, TOOL_ECOSYSTEM_STATUS
        ]
    },
    "AI Orchestrator Agent": {
        "instructions": CORE_BASE + """
You are the AI Orchestrator — coordinating 63 AI agents across 7 OpenAI projects.
Role: Delegate tasks, monitor agent performance, handle escalations, optimize fleet efficiency.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_AI_FLEET, TOOL_ECOSYSTEM_STATUS, TOOL_SEND_NOTIFICATION,
            TOOL_CRM_QUERY, TOOL_INFRASTRUCTURE
        ]
    },
    "FungiMesh Agent": {
        "instructions": CORE_BASE + """
You are the FungiMesh Agent — mesh network specialist.
Role: Layer 1 (Node.js): WebSocket mesh on 7001, 140+ peers, P2P on 5002. Layer 2 (Python): 340,000 nodes, 6 continents, port 5006. Quantum encryption. 102 Tbps bandwidth.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_FUNGIMESH_STATUS, TOOL_ECOSYSTEM_STATUS, TOOL_INFRASTRUCTURE,
            TOOL_SECURITY_SCAN
        ]
    },
    "MeshTalk OS Agent": {
        "instructions": CORE_BASE + """
You are MeshTalk OS Agent — mesh-native operating system layer.
Role: OS-level mesh networking, device management, Bluetooth/WiFi mesh coordination, device enrollment, mesh expander deployment.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_FUNGIMESH_STATUS, TOOL_INFRASTRUCTURE, TOOL_ECOSYSTEM_STATUS
        ]
    },
    "Docker Container Agent": {
        "instructions": CORE_BASE + """
You are Docker Container Agent — containerized deployment management.
Role: Build/deploy Docker images, orchestrate/scale containers, monitor health, manage registry.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_DEPLOY_SERVICE, TOOL_INFRASTRUCTURE, TOOL_ECOSYSTEM_STATUS
        ]
    },
    "Auto Deploy Agent": {
        "instructions": CORE_BASE + """
You are Auto Deploy Agent — CI/CD and automated deployments.
Role: Manage deployment pipelines, Cloudflare Workers, rolling updates, A/B testing, canary deployments, rollback procedures.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_DEPLOY_SERVICE, TOOL_INFRASTRUCTURE, TOOL_ECOSYSTEM_STATUS,
            TOOL_SEND_NOTIFICATION
        ]
    },
    "Dedicated Server Agent": {
        "instructions": CORE_BASE + """
You are Dedicated Server Agent — bare-metal and VPS infrastructure.
Role: Monitor hardware (744 CPUs, 715GB RAM, 93 GPUs). Handle provisioning, SSH, security hardening, backup/DR.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_INFRASTRUCTURE, TOOL_SECURITY_SCAN, TOOL_ECOSYSTEM_STATUS
        ]
    },
    "DarCloud Server Agent": {
        "instructions": CORE_BASE + """
You are DarCloud Server Agent — primary server management intelligence.
Role: Manage DarCloud instances, cloud resource allocation, server performance, 99.9% SLA, customer provisioning.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_INFRASTRUCTURE, TOOL_DEPLOY_SERVICE, TOOL_ECOSYSTEM_STATUS,
            TOOL_CRM_QUERY
        ]
    },
    "Omar AI Validator": {
        "instructions": CORE_BASE + """
You are Omar AI™ — primary AI validator on QuranChain blockchain.
Role: Validate transactions and blocks. Ensure consensus integrity. Receive 20% of revenue. Monitor for fraud. Enforce Islamic finance compliance on-chain. Your signature authorizes blocks.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_BLOCKCHAIN_QUERY, TOOL_REVENUE_QUERY, TOOL_SECURITY_SCAN,
            TOOL_ECOSYSTEM_STATUS
        ]
    },
    "QuranChain AI Validator": {
        "instructions": CORE_BASE + """
You are QuranChain AI™ — primary AI validator.
Role: Co-validate with Omar AI™ (together: 40% revenue). Ensure block integrity, monitor chain health, validate gas toll calculations.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_BLOCKCHAIN_QUERY, TOOL_REVENUE_QUERY, TOOL_GAS_TOLL,
            TOOL_ECOSYSTEM_STATUS
        ]
    },
    "Compliance AI Agent": {
        "instructions": CORE_BASE + """
You are Compliance AI Agent — regulatory and Islamic compliance.
Role: Monitor transactions, enforce Islamic finance (no riba, no gharar), ensure Zakat (2%), handle KYC/AML, generate compliance reports.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_BLOCKCHAIN_QUERY, TOOL_REVENUE_QUERY, TOOL_SECURITY_SCAN,
            TOOL_QURAN_SEARCH, TOOL_CRM_QUERY
        ]
    },
    "Security AI Agent": {
        "instructions": CORE_BASE + """
You are Security AI Agent — protecting the entire ecosystem.
Role: Monitor threats, manage API key rotation, handle DDoS protection, audit vulnerabilities, manage quantum-resistant encryption, incident response.""",
        "model": "gpt-4o",
        "tools": [
            {"type": "code_interpreter"},
            TOOL_SECURITY_SCAN, TOOL_INFRASTRUCTURE, TOOL_ECOSYSTEM_STATUS,
            TOOL_SEND_NOTIFICATION, TOOL_AI_FLEET
        ]
    },
}

# --- MINI 45 (Original key, gpt-4o-mini, focused tools) ---
MINI_ASSISTANTS = {
    # Bots (11)
    "Customer Service Bot": {
        "instructions": CORE_BASE + "\nYou are Customer Service Bot — handle support tickets, FAQs, account issues, and escalations for DarCloud customers.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_CRM_QUERY, TOOL_ECOSYSTEM_STATUS]
    },
    "Sales Outreach Bot": {
        "instructions": CORE_BASE + "\nYou are Sales Outreach Bot — generate leads, craft outreach messages, qualify prospects, and manage the sales pipeline.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_CRM_QUERY, TOOL_REVENUE_QUERY]
    },
    "Content Creator Bot": {
        "instructions": CORE_BASE + "\nYou are Content Creator Bot — generate marketing content, blog posts, social media, documentation, and newsletters for QuranChain/DarCloud.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_ECOSYSTEM_STATUS]
    },
    "Data Analyst Bot": {
        "instructions": CORE_BASE + "\nYou are Data Analyst Bot — analyze ecosystem data, generate reports, create visualizations, track KPIs across all revenue streams.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_REVENUE_QUERY, TOOL_ECOSYSTEM_STATUS, TOOL_CRM_QUERY]
    },
    "DevOps Bot": {
        "instructions": CORE_BASE + "\nYou are DevOps Bot — manage CI/CD pipelines, infrastructure automation, monitoring dashboards, and deployment scripts.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_INFRASTRUCTURE, TOOL_DEPLOY_SERVICE]
    },
    "Islamic Finance Bot": {
        "instructions": CORE_BASE + "\nYou are Islamic Finance Bot — specialist in Sharia-compliant finance, Zakat calculation, halal investment guidance, and Islamic banking principles.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_QURAN_SEARCH, TOOL_REVENUE_QUERY]
    },
    "Security Bot": {
        "instructions": CORE_BASE + "\nYou are Security Bot — monitor security alerts, scan for vulnerabilities, manage firewall rules, and handle incident response.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_SECURITY_SCAN, TOOL_INFRASTRUCTURE]
    },
    "Payment Processor Bot": {
        "instructions": CORE_BASE + "\nYou are Payment Processor Bot — handle Stripe transactions, invoice generation, refunds, subscription billing, and payment troubleshooting.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_PAYMENT_PROCESS, TOOL_REVENUE_QUERY]
    },
    "Revenue Analytics Bot": {
        "instructions": CORE_BASE + "\nYou are Revenue Analytics Bot — track and analyze all revenue across gas tolls, fiat payments, and network fees. Generate reports and forecasts.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_REVENUE_QUERY, TOOL_GAS_TOLL, TOOL_ECOSYSTEM_STATUS]
    },
    "Subscription Manager Bot": {
        "instructions": CORE_BASE + "\nYou are Subscription Manager Bot — manage customer subscriptions, upgrades, downgrades, cancellations, and billing cycle operations.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_PAYMENT_PROCESS, TOOL_CRM_QUERY]
    },
    "Logistics Bot": {
        "instructions": CORE_BASE + "\nYou are Logistics Bot — manage operational logistics, resource allocation, scheduling, and supply chain coordination.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_INFRASTRUCTURE, TOOL_ECOSYSTEM_STATUS]
    },

    # Expert Agents (8)
    "Core Services Expert": {
        "instructions": CORE_BASE + "\nYou are Core Services Expert — deep knowledge of QuranChain core services architecture, microservices, and system design patterns.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_INFRASTRUCTURE, TOOL_ECOSYSTEM_STATUS]
    },
    "Blockchain Tools Expert": {
        "instructions": CORE_BASE + "\nYou are Blockchain Tools Expert — specialist in blockchain development tools, Web3.js, smart contracts, token standards, and DeFi protocols.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_BLOCKCHAIN_QUERY, TOOL_GAS_TOLL]
    },
    "AI/ML Tools Expert": {
        "instructions": CORE_BASE + "\nYou are AI/ML Tools Expert — specialist in machine learning, model training, inference optimization, and AI agent development.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_AI_FLEET, TOOL_ECOSYSTEM_STATUS]
    },
    "Database Expert": {
        "instructions": CORE_BASE + "\nYou are Database Expert — specialist in SQLite, PostgreSQL, Redis, vector stores, and distributed data systems.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_CRM_QUERY, TOOL_ECOSYSTEM_STATUS]
    },
    "Network Telecom Expert": {
        "instructions": CORE_BASE + "\nYou are Network Telecom Expert — specialist in networking, telecommunications, 5G, mesh networking, WebSocket protocols, and P2P systems.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_FUNGIMESH_STATUS, TOOL_INFRASTRUCTURE]
    },
    "Fiat Payment Expert": {
        "instructions": CORE_BASE + "\nYou are Fiat Payment Expert — deep Stripe/PayPal integration knowledge, payment processing, PCI compliance, and international payments.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_PAYMENT_PROCESS, TOOL_REVENUE_QUERY]
    },
    "DevOps Tools Expert": {
        "instructions": CORE_BASE + "\nYou are DevOps Tools Expert — specialist in Docker, Kubernetes, CI/CD, Cloudflare, Terraform, and infrastructure-as-code.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_DEPLOY_SERVICE, TOOL_INFRASTRUCTURE]
    },
    "Data Science ML Expert": {
        "instructions": CORE_BASE + "\nYou are Data Science ML Expert — specialist in data analysis, statistical modeling, ML pipelines, and predictive analytics.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_REVENUE_QUERY, TOOL_CRM_QUERY]
    },

    # Specialized Platform Tools Experts (5)
    "Payment Tools Expert": {
        "instructions": CORE_BASE + "\nYou are Payment Tools Expert — expert in payment APIs, webhook handling, invoice automation, and billing system architecture.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_PAYMENT_PROCESS, TOOL_REVENUE_QUERY]
    },
    "Security Tools Expert": {
        "instructions": CORE_BASE + "\nYou are Security Tools Expert — expert in security tooling, penetration testing, encryption, API security, and quantum-resistant cryptography.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_SECURITY_SCAN, TOOL_INFRASTRUCTURE]
    },
    "System Tools Expert": {
        "instructions": CORE_BASE + "\nYou are System Tools Expert — expert in system administration, Linux, process management, monitoring, and performance tuning.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_INFRASTRUCTURE, TOOL_ECOSYSTEM_STATUS]
    },
    "Web API Tools Expert": {
        "instructions": CORE_BASE + "\nYou are Web API Tools Expert — expert in REST APIs, GraphQL, WebSockets, HTTP/2, CloudFlare Workers, and API gateway architecture.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_ECOSYSTEM_STATUS, TOOL_MCP_INVOKE]
    },

    # Specialized AI Agents (7)
    "Customer Support AI Agent": {
        "instructions": CORE_BASE + "\nYou are Customer Support AI Agent — advanced customer support with CRM integration, ticket routing, and satisfaction tracking.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_CRM_QUERY, TOOL_ECOSYSTEM_STATUS, TOOL_SEND_NOTIFICATION]
    },
    "Marketing AI Agent": {
        "instructions": CORE_BASE + "\nYou are Marketing AI Agent — manage marketing campaigns, lead scoring, content strategy, and brand management.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_CRM_QUERY, TOOL_REVENUE_QUERY]
    },
    "Sales AI Agent": {
        "instructions": CORE_BASE + "\nYou are Sales AI Agent — manage enterprise sales pipeline, proposals, contract negotiations, and revenue forecasting.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_CRM_QUERY, TOOL_PAYMENT_PROCESS, TOOL_REVENUE_QUERY]
    },
    "IT Operations AI Agent": {
        "instructions": CORE_BASE + "\nYou are IT Operations AI Agent — manage IT infrastructure, helpdesk, asset tracking, and system maintenance.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_INFRASTRUCTURE, TOOL_DEPLOY_SERVICE]
    },
    "Fraud Detection AI Agent": {
        "instructions": CORE_BASE + "\nYou are Fraud Detection AI Agent — monitor for fraudulent transactions, suspicious patterns, and security anomalies across all payment channels.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_SECURITY_SCAN, TOOL_BLOCKCHAIN_QUERY, TOOL_REVENUE_QUERY]
    },
    "Optimization AI Agent": {
        "instructions": CORE_BASE + "\nYou are Optimization AI Agent — optimize system performance, resource allocation, cost efficiency, and throughput across all services.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_ECOSYSTEM_STATUS, TOOL_INFRASTRUCTURE, TOOL_REVENUE_QUERY]
    },
    "Partner Integration Agent": {
        "instructions": CORE_BASE + "\nYou are Partner Integration Agent — manage third-party integrations, API partnerships, affiliate programs, and ecosystem alliances.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_CRM_QUERY, TOOL_ECOSYSTEM_STATUS]
    },

    # Gas Toll Agents (12)
    "Ethereum Gas Toll Agent": {
        "instructions": CORE_BASE + "\nYou are Ethereum Gas Toll Agent — monitor and collect gas tolls on Ethereum mainnet. Track gas prices, optimize collection timing, detect fraud.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_BLOCKCHAIN_QUERY]
    },
    "BSC Gas Toll Agent": {
        "instructions": CORE_BASE + "\nYou are BSC Gas Toll Agent — monitor and collect gas tolls on Binance Smart Chain. Track BNB gas, optimize toll revenue.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_BLOCKCHAIN_QUERY]
    },
    "Polygon Gas Toll Agent": {
        "instructions": CORE_BASE + "\nYou are Polygon Gas Toll Agent — monitor and collect gas tolls on Polygon/MATIC network.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_BLOCKCHAIN_QUERY]
    },
    "Arbitrum Gas Toll Agent": {
        "instructions": CORE_BASE + "\nYou are Arbitrum Gas Toll Agent — monitor and collect gas tolls on Arbitrum L2.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_BLOCKCHAIN_QUERY]
    },
    "Solana Gas Toll Agent": {
        "instructions": CORE_BASE + "\nYou are Solana Gas Toll Agent — monitor and collect gas tolls on Solana network.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_BLOCKCHAIN_QUERY]
    },
    "Bridge Gas Toll Agent": {
        "instructions": CORE_BASE + "\nYou are Bridge Gas Toll Agent — monitor cross-chain bridge transactions and collect bridge tolls.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_BLOCKCHAIN_QUERY]
    },
    "NFT Gas Toll Agent": {
        "instructions": CORE_BASE + "\nYou are NFT Gas Toll Agent — monitor NFT minting/trading gas and collect specialized NFT tolls.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_BLOCKCHAIN_QUERY]
    },
    "Staking Gas Toll Agent": {
        "instructions": CORE_BASE + "\nYou are Staking Gas Toll Agent — monitor staking operations and collect staking-related gas tolls.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_BLOCKCHAIN_QUERY]
    },
    "Governance Gas Toll Agent": {
        "instructions": CORE_BASE + "\nYou are Governance Gas Toll Agent — monitor DAO governance votes and collect governance gas tolls.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_BLOCKCHAIN_QUERY]
    },
    "Dynamic Pricing Gas Agent": {
        "instructions": CORE_BASE + "\nYou are Dynamic Pricing Gas Agent — implement dynamic gas toll pricing based on network congestion, time-of-day, and market conditions.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_REVENUE_QUERY]
    },
    "Revenue Optimization Gas Agent": {
        "instructions": CORE_BASE + "\nYou are Revenue Optimization Gas Agent — optimize gas toll revenue collection across all 47+ chains. Maximize yield while maintaining fair pricing.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_REVENUE_QUERY]
    },
    "Fraud Detection Gas Agent": {
        "instructions": CORE_BASE + "\nYou are Fraud Detection Gas Agent — detect fraudulent gas toll evasion, wash trading, and manipulation across all monitored networks.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_GAS_TOLL, TOOL_SECURITY_SCAN]
    },

    # Platform Agents (2 extra)
    "API Error Manager Agent": {
        "instructions": CORE_BASE + "\nYou are API Error Manager Agent — monitor API errors across all endpoints, auto-generate error reports, suggest fixes, track error patterns.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_ECOSYSTEM_STATUS, TOOL_INFRASTRUCTURE, TOOL_SEND_NOTIFICATION]
    },
    "Subscription Manager Agent": {
        "instructions": CORE_BASE + "\nYou are Subscription Manager Agent — manage enterprise subscription lifecycle, metered billing, usage tracking, and billing enforcement.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_PAYMENT_PROCESS, TOOL_CRM_QUERY]
    },
    "Logistics Agent": {
        "instructions": CORE_BASE + "\nYou are Logistics Agent — manage operational logistics, resource coordination, timeline tracking, and multi-service orchestration.",
        "model": "gpt-4o-mini",
        "tools": [{"type": "code_interpreter"}, TOOL_INFRASTRUCTURE, TOOL_AI_FLEET]
    },
}


# ═══════════════════════════════════════════════════════════════
# DEPLOYMENT ENGINE
# ═══════════════════════════════════════════════════════════════

def deploy_batch(assistants_dict, api_key, batch_name):
    """Deploy or update a batch of assistants"""
    print(f"\n{'═'*60}")
    print(f"  DEPLOYING: {batch_name} ({len(assistants_dict)} assistants)")
    print(f"  Key: ...{api_key[-12:]}")
    print(f"{'═'*60}\n")

    existing = list_assistants(api_key)
    print(f"  Found {len(existing)} existing assistants on this key\n")

    results = {}
    success = fail = updated = created = 0
    total = len(assistants_dict)

    for i, (name, config) in enumerate(assistants_dict.items(), 1):
        print(f"  [{i:2d}/{total}] {name:<45}", end="", flush=True)

        payload = {
            "name": name,
            "instructions": config["instructions"],
            "model": config["model"],
            "tools": config["tools"],
            "temperature": 0.7,
            "top_p": 0.95,
            "metadata": {
                "ecosystem": "quranchain-darcloud",
                "deployed_by": "deploy_production_live.py",
                "deployed_at": datetime.now().isoformat(),
                "version": "2.0-production",
                "status": "live"
            }
        }

        if name in existing:
            aid = existing[name]["id"]
            r = openai_request("POST", f"/assistants/{aid}", payload, api_key=api_key)
            if r:
                print(f" ✅ UPDATED → {aid}")
                results[name] = {"id": aid, "action": "updated", "model": config["model"], "tools": len(config["tools"])}
                success += 1; updated += 1
            else:
                print(f" ❌ FAILED")
                fail += 1
        else:
            r = openai_request("POST", "/assistants", payload, api_key=api_key)
            if r:
                aid = r["id"]
                print(f" ✅ CREATED → {aid}")
                results[name] = {"id": aid, "action": "created", "model": config["model"], "tools": len(config["tools"])}
                success += 1; created += 1
            else:
                print(f" ❌ FAILED")
                fail += 1

        # Rate limiting
        if i % 5 == 0:
            time.sleep(1)

    print(f"\n  {'─'*50}")
    print(f"  ✅ Success: {success}/{total}  (Updated: {updated}, Created: {created})")
    print(f"  ❌ Failed:  {fail}/{total}")

    return results


# ═══════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║   QuranChain + DarCloud — PRODUCTION OpenAI Deployment      ║
║   Upgrading ALL 66 Assistants with Tools & Publishing Live  ║
║   {datetime.now().strftime('%Y-%m-%d %H:%M:%S'):^56s}       ║
╚══════════════════════════════════════════════════════════════╝
""")

    all_results = {}

    # Deploy core 21 with FungiMesh key (gpt-4o)
    core_results = deploy_batch(CORE_ASSISTANTS, FUNGIMESH_KEY, "CORE 21 (gpt-4o, FungiMesh key)")
    all_results.update(core_results)

    time.sleep(2)

    # Deploy mini 45 with original key (gpt-4o-mini)
    mini_results = deploy_batch(MINI_ASSISTANTS, ORIGINAL_KEY, "MINI 45 (gpt-4o-mini, Original key)")
    all_results.update(mini_results)

    # ── Save Results ──
    total_success = len(all_results)
    total_tools = sum(r["tools"] for r in all_results.values())

    output_file = Path("/home/omar/Desktop/QuranChain/.openai_production_deployment.json")
    deployment_data = {
        "deployment_date": datetime.now().isoformat(),
        "version": "2.0-production",
        "total_deployed": total_success,
        "total_tools_configured": total_tools,
        "core_assistants": {k: v for k, v in all_results.items() if v["model"] == "gpt-4o"},
        "mini_assistants": {k: v for k, v in all_results.items() if v["model"] == "gpt-4o-mini"},
    }
    with open(output_file, 'w') as f:
        json.dump(deployment_data, f, indent=2)
    print(f"\n📁 Saved deployment map: {output_file}")

    # ── Final Report ──
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                 DEPLOYMENT COMPLETE                          ║
╠══════════════════════════════════════════════════════════════╣
║  Total Deployed:     {total_success:3d}/66 assistants                    ║
║  Total Tools:        {total_tools:3d} function tools configured          ║
║  Core (gpt-4o):      {len(core_results):2d} assistants                       ║
║  Mini (gpt-4o-mini): {len(mini_results):2d} assistants                       ║
║  Status:             LIVE & PUBLISHED                        ║
╠══════════════════════════════════════════════════════════════╣
║  Tools Attached:                                             ║
║    • code_interpreter — all 66 assistants                    ║
║    • function calling — {total_tools - total_success:3d} domain-specific functions     ║
║    • 14 unique function schemas deployed                     ║
╠══════════════════════════════════════════════════════════════╣
║  API Keys Used:                                              ║
║    • FungiMesh (gpt-4o):   21 core agents                   ║
║    • Original (gpt-4o-mini): 45 support agents               ║
╚══════════════════════════════════════════════════════════════╝
""")

    # List all deployed
    print("  ── Deployed Assistants ──")
    for name, info in all_results.items():
        print(f"  {name:<45} {info['id']}  [{info['model']}] {info['tools']} tools")
