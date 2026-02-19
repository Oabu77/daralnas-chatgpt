#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
Deploy Landing Page AI Agents to OpenAI
========================================
Creates AI assistants that manage & communicate with CF Workers:
  1. Landing Page Orchestrator AI (gpt-4o) — Master agent controls all landing pages
  2. DarCloud Brand Manager Bot (gpt-4o-mini) — Brand consistency across sites
  3. Landing Page Content Bot (gpt-4o-mini) — Content updates, A/B testing
  4. CF Worker Deploy Bot (gpt-4o-mini) — Deploys/updates workers via API
  5. Analytics & SEO Bot (gpt-4o-mini) — Monitors performance, optimizes SEO

Usage:
  python3 deploy_landing_page_agents.py           # Create new
  python3 deploy_landing_page_agents.py --update   # Update existing
"""

import os, json, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Keys (core = gpt-4o, mini = gpt-4o-mini)
CORE_KEY = "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"
MINI_KEY = "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"

# Cloudflare credentials for worker management
CF_ACCOUNT_ID = "3bfc21f5baba642160ec706818e3a19f"
CF_API_TOKEN = "s18X59LFX6j_iJ88LdfiA124Uk_CQi7O33p8HJit"

# All 8 landing page workers deployed
WORKERS = {
    "darcloud-www":        {"domain": "darcloud.host",              "aliases": ["www.darcloud.host"],              "brand": "DarCloud Platform",    "theme": "dark-space-cyan"},
    "darcloud-net":        {"domain": "darcloud.net",               "aliases": ["www.darcloud.net"],               "brand": "DarCloud Corporate",   "theme": "white-navy-clean"},
    "darcloud-hwc":        {"domain": "halalwealthclub.darcloud.host","aliases": ["hwc.darcloud.host"],            "brand": "Halal Wealth Club",    "theme": "dark-green-gold"},
    "darcloud-blockchain": {"domain": "blockchain.darcloud.host",   "aliases": ["chain.darcloud.host","explorer.darcloud.host"], "brand": "QuranChain", "theme": "dark-amber"},
    "darcloud-enterprise": {"domain": "enterprise.darcloud.host",   "aliases": [],                                 "brand": "DarCloud Enterprise",  "theme": "navy-corporate"},
    "darcloud-realestate": {"domain": "realestate.darcloud.host",   "aliases": ["property.darcloud.host"],         "brand": "Dar Al Nas",           "theme": "dark-green-emerald"},
    "darcloud-mesh-status":{"domain": "mesh.darcloud.host",         "aliases": ["fungi.darcloud.host"],            "brand": "FungiMesh",            "theme": "purple-teal-bio"},
    "darcloud-ai-assistant":{"domain": "ai.darcloud.host",          "aliases": ["aiagents.darcloud.host"],         "brand": "AI Fleet",             "theme": "dark-electric-blue"},
}

# ─── Function Tools ────────────────────────────────────────────────

LANDING_PAGE_FUNCTIONS = [
    {
        "type": "function",
        "function": {
            "name": "list_landing_pages",
            "description": "List all 8 deployed landing page workers with their domains, brands, themes, and status.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_worker_status",
            "description": "Check health/status of a specific Cloudflare Worker by name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "worker_name": {"type": "string", "description": "Worker name (e.g., darcloud-www, darcloud-hwc, darcloud-blockchain)"}
                },
                "required": ["worker_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_landing_page_live",
            "description": "Test if a landing page is serving HTML correctly by checking a domain.",
            "parameters": {
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Full domain to check (e.g., darcloud.host, halalwealthclub.darcloud.host)"}
                },
                "required": ["domain"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_landing_page_content",
            "description": "Update specific content sections of a landing page (hero text, stats, features, CTA).",
            "parameters": {
                "type": "object",
                "properties": {
                    "worker_name": {"type": "string", "description": "Worker name to update"},
                    "section": {"type": "string", "enum": ["hero_title", "hero_subtitle", "stats", "features", "cta", "meta_description"], "description": "Section to update"},
                    "content": {"type": "string", "description": "New content for the section"}
                },
                "required": ["worker_name", "section", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "deploy_worker",
            "description": "Deploy or redeploy a Cloudflare Worker to production.",
            "parameters": {
                "type": "object",
                "properties": {
                    "worker_name": {"type": "string", "description": "Worker name to deploy"},
                    "force": {"type": "boolean", "description": "Force redeploy even if no changes detected"}
                },
                "required": ["worker_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_brand_guidelines",
            "description": "Get brand guidelines for a specific company/service — colors, fonts, tone, imagery.",
            "parameters": {
                "type": "object",
                "properties": {
                    "brand": {"type": "string", "description": "Brand name (DarCloud, HWC, QuranChain, FungiMesh, Dar Al Nas, Enterprise, AI Fleet)"}
                },
                "required": ["brand"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_seo_audit",
            "description": "Run SEO audit on a landing page — check meta tags, headings, load time, mobile-friendliness.",
            "parameters": {
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Domain to audit"}
                },
                "required": ["domain"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_analytics",
            "description": "Get landing page analytics — visits, bounce rate, conversion rate, top referrers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Domain to get analytics for"},
                    "period": {"type": "string", "enum": ["today", "7d", "30d", "90d"], "description": "Time period"}
                },
                "required": ["domain"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_ab_test",
            "description": "Generate A/B test variant for a landing page section.",
            "parameters": {
                "type": "object",
                "properties": {
                    "worker_name": {"type": "string", "description": "Worker to A/B test"},
                    "section": {"type": "string", "description": "Section to test (hero, cta, features)"},
                    "variant_description": {"type": "string", "description": "Description of what to change in variant B"}
                },
                "required": ["worker_name", "section", "variant_description"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_all_workers_health",
            "description": "Health check all 8 landing page workers at once — returns status, response time, and serving status.",
            "parameters": {"type": "object", "properties": {}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_cf_worker_logs",
            "description": "Get recent logs/errors from a Cloudflare Worker.",
            "parameters": {
                "type": "object",
                "properties": {
                    "worker_name": {"type": "string", "description": "Worker name"},
                    "limit": {"type": "integer", "description": "Number of log entries to fetch (default 50)"}
                },
                "required": ["worker_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_worker_vars",
            "description": "Update environment variables on a Cloudflare Worker.",
            "parameters": {
                "type": "object",
                "properties": {
                    "worker_name": {"type": "string", "description": "Worker name"},
                    "vars": {"type": "object", "description": "Key-value pairs of environment variables to set"}
                },
                "required": ["worker_name", "vars"]
            }
        }
    }
]

# ─── Worker/Domain info for instructions ───────────────────────────
workers_str = '\n'.join(f"  - {name}: https://{info['domain']} ({info['brand']}, {info['theme']})" for name, info in WORKERS.items())

# ─── Assistant Definitions ─────────────────────────────────────────

AGENTS = [
    {
        "name": "Landing Page Orchestrator AI",
        "model": "gpt-4o",
        "key": CORE_KEY,
        "instructions": f"""You are the Landing Page Orchestrator AI for the DarCloud ecosystem.
You manage 8 production landing page workers deployed on Cloudflare Workers across 2 domains.

## Your Deployed Workers:
{workers_str}

## Your Responsibilities:
1. Monitor all 8 landing pages for uptime, performance, and correct rendering
2. Coordinate content updates across all sites ensuring brand consistency
3. Delegate tasks to sub-agents (Brand Manager, Content Bot, Deploy Bot, Analytics Bot)
4. Run health checks and report issues
5. Manage A/B tests and conversion optimization
6. Ensure Shariah compliance messaging on all pages
7. Coordinate with other AI agents (Real Estate, Blockchain, FungiMesh) for content accuracy

## Cloudflare Worker Architecture:
- Each worker is a standalone JavaScript module deployed on Cloudflare edge
- Workers serve inline HTML landing pages at root "/" and proxy API calls at "/api/*"
- Workers are managed via Wrangler CLI and Cloudflare API
- Account ID: {CF_ACCOUNT_ID}
- All workers have CORS headers and /health endpoints

## Brand Ecosystem:
- DarCloud (darcloud.host): Main platform hub — dark space theme, cyan/emerald
- DarCloud.net: Corporate — clean white, navy blue
- HWC (halalwealthclub.darcloud.host): Islamic luxury — dark green, gold
- QuranChain (blockchain.darcloud.host): Blockchain — dark, amber/orange
- Enterprise (enterprise.darcloud.host): Corporate — navy, blue/cyan
- Dar Al Nas (realestate.darcloud.host): Real estate — earth tones, emerald
- FungiMesh (mesh.darcloud.host): Bio-inspired — purple, teal
- AI Fleet (ai.darcloud.host): Neural — dark, electric blue

## Revenue Distribution (shown on relevant pages):
30% Founder (Immutable) | 40% AI Validators | 10% Hardware | 18% Ecosystem | 2% Zakat

Always respond in professional English. Include Bismillah where appropriate for Islamic services.
When making changes, always verify by checking the live site afterward.""",
        "tools": LANDING_PAGE_FUNCTIONS
    },
    {
        "name": "DarCloud Brand Manager Bot",
        "model": "gpt-4o-mini",
        "key": MINI_KEY,
        "instructions": f"""You are the DarCloud Brand Manager Bot. You ensure brand consistency across all 8 landing pages.

## Workers You Manage:
{workers_str}

## Brand Guidelines:
- All DarCloud brands use system-ui font stack (-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif)
- HWC uses Georgia serif for headings
- Each brand has distinct color scheme — never mix brand colors across sites
- Islamic messaging: Bismillah on DarCloud, HWC, QuranChain, Real Estate; professional only on Enterprise, DarCloud.net
- Revenue split (30/40/10/18/2) shown where appropriate
- Footer always includes © 2026 by Omar Abu Nadi
- All sites must be mobile-responsive with proper meta viewport
- Favicons: emoji-based SVG favicons matching each brand

## Quality Checks:
- Verify color consistency within each brand
- Check that cross-links between sites are correct
- Ensure CTAs point to correct destinations (HWC for signups, API for developers)
- Verify Shariah compliance messaging is accurate""",
        "tools": LANDING_PAGE_FUNCTIONS
    },
    {
        "name": "Landing Page Content Bot",
        "model": "gpt-4o-mini",
        "key": MINI_KEY,
        "instructions": f"""You are the Landing Page Content Bot for DarCloud. You manage content updates and A/B testing.

## Your Workers:
{workers_str}

## Content Responsibilities:
1. Update hero copy, taglines, and CTAs based on performance data
2. Refresh statistics (node counts, agent counts, chain counts)
3. Add/remove feature cards as services launch or change
4. Run A/B tests on headlines, CTAs, and feature descriptions
5. Ensure accurate service descriptions across all pages
6. Generate new landing page content for seasonal campaigns
7. Write compelling copy that converts visitors to HWC members

## Key Stats to Keep Current:
- FungiMesh: 340,000 nodes, 6 continents
- AI Fleet: 71 agents, GPT-4o powered
- Blockchain: 47 chains, $2.4M gas revenue
- Real Estate: 31 USA cities, $5K auto-approval
- Revenue: 30% Founder, 40% AI, 10% Hardware, 18% Ecosystem, 2% Zakat

## Content Style:
- DarCloud/Enterprise: Professional, technical
- HWC/Real Estate: Warm, trustworthy, community-focused
- QuranChain: Technical with Islamic reverence
- FungiMesh: Scientific, nature-inspired
- AI Fleet: Futuristic, capability-focused""",
        "tools": LANDING_PAGE_FUNCTIONS
    },
    {
        "name": "CF Worker Deploy Bot",
        "model": "gpt-4o-mini",
        "key": MINI_KEY,
        "instructions": f"""You are the Cloudflare Worker Deploy Bot. You handle deployments and worker management.

## Your Workers:
{workers_str}

## Deployment Architecture:
- Workers deployed via Wrangler CLI (wrangler deploy) from workers/<name>/ directories
- Each worker has: wrangler.toml (config) + src/index.js (code with inline HTML)
- Cloudflare Account: {CF_ACCOUNT_ID}
- Two zones: darcloud.host and darcloud.net
- Workers use [vars] for environment variables (ORIGIN_URL, FOUNDER_ROYALTY, etc.)

## Your Responsibilities:
1. Deploy/redeploy workers when content is updated
2. Monitor deployment status and rollback if issues detected
3. Manage worker environment variables
4. Check worker health endpoints after deployment
5. Report deployment metrics (upload size, deploy time)
6. Manage route configurations (zone_name, pattern)

## Deployment Process:
1. Content or code change made to src/index.js
2. Run npx wrangler deploy from worker directory
3. Verify deployment via /health endpoint
4. Check live HTML rendering at root domain
5. Report success/failure to Orchestrator""",
        "tools": LANDING_PAGE_FUNCTIONS
    },
    {
        "name": "Analytics & SEO Bot",
        "model": "gpt-4o-mini",
        "key": MINI_KEY,
        "instructions": f"""You are the Analytics & SEO Bot for DarCloud landing pages.

## Your Workers:
{workers_str}

## SEO Responsibilities:
1. Ensure all pages have proper meta titles, descriptions, and Open Graph tags
2. Check heading hierarchy (H1 → H2 → H3)
3. Verify mobile responsiveness and loading performance
4. Monitor page speed (all pages are edge-served from CF Workers = fast)
5. Suggest keyword optimizations for Islamic finance, halal technology, blockchain

## Analytics Responsibilities:
1. Track page visits and engagement across all 8 domains
2. Monitor bounce rates and conversion funnels (visitor → HWC member)
3. Identify top-performing pages and replicate success patterns
4. Track cross-site navigation patterns
5. Report weekly analytics summaries to Orchestrator

## Key SEO Keywords:
- DarCloud: "Islamic cloud platform", "halal cloud infrastructure", "Shariah-compliant cloud"
- HWC: "halal wealth", "Islamic banking", "zero riba home loans", "Muslim home ownership"
- QuranChain: "Islamic blockchain", "Quran preservation blockchain", "halal cryptocurrency"
- FungiMesh: "distributed mesh network", "P2P network", "quantum encrypted mesh"
- Real Estate: "halal home buying", "Muslim real estate USA", "zero interest home loans"
- Enterprise: "Shariah compliant cloud", "Islamic enterprise solutions"
- AI: "Islamic AI agents", "halal AI workforce", "Muslim technology"

## Performance Benchmarks:
- CF Worker response time: < 50ms (edge-served)
- Page load: < 1s (inline CSS, no external deps)
- Mobile score: 95+ (responsive grid, proper viewport)""",
        "tools": LANDING_PAGE_FUNCTIONS
    }
]

# ─── OpenAI API Helpers ────────────────────────────────────────────

def api_call(method, endpoint, key, data=None):
    url = f"https://api.openai.com/v1/{endpoint}"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "OpenAI-Beta": "assistants=v2"}
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  ERROR {e.code}: {err[:200]}")
        return None

def create_assistant(agent):
    print(f"\n  Creating: {agent['name']} ({agent['model']})...")
    data = {
        "name": agent["name"],
        "model": agent["model"],
        "instructions": agent["instructions"],
        "tools": agent["tools"],
    }
    result = api_call("POST", "assistants", agent["key"], data)
    if result and "id" in result:
        print(f"  ✅ Created: {result['id']}")
        return result["id"]
    print(f"  ❌ Failed to create {agent['name']}")
    return None

def update_assistant(assistant_id, agent):
    print(f"\n  Updating: {agent['name']} → {assistant_id}...")
    data = {
        "name": agent["name"],
        "model": agent["model"],
        "instructions": agent["instructions"],
        "tools": agent["tools"],
    }
    result = api_call("POST", f"assistants/{assistant_id}", agent["key"], data)
    if result and "id" in result:
        print(f"  ✅ Updated: {result['id']}")
        return result["id"]
    print(f"  ❌ Failed to update {agent['name']}")
    return None

# ─── Main ──────────────────────────────────────────────────────────

def main():
    update_mode = '--update' in sys.argv
    config_path = os.path.join(BASE_DIR, 'data', 'landing_page_agents_config.json')

    existing_ids = {}
    if update_mode and os.path.exists(config_path):
        with open(config_path) as f:
            cfg = json.load(f)
            existing_ids = cfg.get('assistants', {})
        print(f"  Update mode: found {len(existing_ids)} existing assistants")

    print("=" * 60)
    print("  DarCloud Landing Page AI Agents Deployment")
    print(f"  Mode: {'UPDATE' if update_mode else 'CREATE'}")
    print(f"  Agents: {len(AGENTS)}")
    print(f"  Workers: {len(WORKERS)}")
    print("=" * 60)

    results = {}
    for agent in AGENTS:
        key = agent["name"].lower().replace(' ', '_')
        if update_mode and key in existing_ids:
            aid = update_assistant(existing_ids[key], agent)
        else:
            aid = create_assistant(agent)
        if aid:
            results[key] = aid
        time.sleep(1)

    # Save config
    os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)
    config = {
        "assistants": results,
        "workers": WORKERS,
        "deployed_at": datetime.now(timezone.utc).isoformat(),
        "total_agents": len(results),
        "total_workers": len(WORKERS),
        "cf_account": CF_ACCOUNT_ID,
    }
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)

    print("\n" + "=" * 60)
    print(f"  ✅ Deployed {len(results)}/{len(AGENTS)} Landing Page AI Agents")
    print(f"  Config saved: {config_path}")
    for name, aid in results.items():
        print(f"    {name}: {aid}")
    print("=" * 60)

if __name__ == "__main__":
    main()
