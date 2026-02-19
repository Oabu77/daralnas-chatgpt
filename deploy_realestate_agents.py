#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
"""
Deploy Dar Al Nas Real Estate AI Agent + Sub-Agents to OpenAI
=============================================================
Creates:
  1. Dar Al Nas Real Estate AI (gpt-4o) — Main agent, deal finder
  2. Real Estate Marketing Bot (gpt-4o-mini) — Markets properties to HWC members
  3. Real Estate Signup Bot (gpt-4o-mini) — Signs people up, collects applications
  4. Real Estate Financing Bot (gpt-4o-mini) — Handles financing options + payment links
  5. Deal Funding AI Agent (gpt-4o-mini) — Raises funds from members for purchases
"""

import os, json, time, urllib.request, urllib.error
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load .env
env_path = os.path.join(BASE_DIR, '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

# Keys (core = FungiMesh gpt-4o, mini = OPENAI_API_KEY gpt-4o-mini)
CORE_KEY = "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"
MINI_KEY = "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"

# Load Stripe payment links created by the bot
stripe_config_path = os.path.join(BASE_DIR, 'data', 'realestate_stripe_config.json')
PAYMENT_LINKS = {}
if os.path.exists(stripe_config_path):
    with open(stripe_config_path) as f:
        cfg = json.load(f)
        PAYMENT_LINKS = cfg.get('paymentLinks', {})

payment_links_str = '\n'.join(f"  - {tier}: {url}" for tier, url in PAYMENT_LINKS.items()) or '  (check /api/realestate/payment-links)'

# ── Assistant Definitions ──────────────────────────────────────────

REALESTATE_FUNCTIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_properties",
            "description": "Search available bank-owned/foreclosure properties across 31 USA Muslim community cities. HWC members only.",
            "parameters": {
                "type": "object",
                "properties": {
                    "region": {"type": "string", "description": "Target region (USA primary, also UAE, Turkey, Malaysia, Saudi Arabia, Egypt, Morocco, Indonesia, UK, Canada)"},
                    "city": {"type": "string", "description": "City name (e.g., Dearborn, Houston, Paterson, Chicago, Minneapolis, Dallas, Falls Church, Atlanta)"},
                    "minPrice": {"type": "number", "description": "Minimum price in USD"},
                    "maxPrice": {"type": "number", "description": "Maximum price in USD"},
                    "type": {"type": "string", "description": "Property type (house, apartment, villa, condo, commercial, penthouse, flat, townhouse)"},
                    "bedrooms": {"type": "integer", "description": "Minimum bedrooms"},
                    "halalOnly": {"type": "boolean", "description": "Only halal-certified properties"},
                    "bankOwned": {"type": "boolean", "description": "Only bank-owned/foreclosure properties"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_bank_owned",
            "description": "Search Zillow and Redfin for bank-owned/foreclosure properties in USA Muslim community areas",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City (Dearborn, Houston, Paterson, Chicago, Minneapolis, Dallas, Falls Church, Atlanta, Anaheim, Indianapolis, etc.)"},
                    "state": {"type": "string", "description": "State abbreviation (MI, TX, NJ, IL, MN, VA, GA, CA, IN, etc.)"},
                    "maxPrice": {"type": "number", "description": "Maximum price (default $300,000)"}
                },
                "required": ["city", "state"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_best_deals",
            "description": "Get the top 10 best-scoring bank-owned real estate deals across USA Muslim communities",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "capture_realestate_lead",
            "description": "Capture a real estate lead. HWC MEMBERSHIP REQUIRED — non-members are rejected with join URL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "region": {"type": "string"},
                    "budget": {"type": "number"},
                    "hwcMember": {"type": "boolean", "description": "MUST be true — private fund"},
                    "hwcMemberId": {"type": "string", "description": "REQUIRED — HWC member ID"},
                    "financingInterest": {"type": "boolean"},
                    "preApproved": {"type": "boolean"}
                },
                "required": ["name", "email", "hwcMemberId"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "submit_application",
            "description": "Submit a property application. HWC MEMBERS ONLY. $5,000 universal down-payment = AUTO-APPROVED for full purchase price. Smart contract created with 30-day funding window. Monthly mortgage via Stripe subscription. First payment at closing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "propertyId": {"type": "string"},
                    "purchasePrice": {"type": "number", "description": "Total purchase price in USD"},
                    "hwcMemberId": {"type": "string", "description": "REQUIRED — HWC member ID"},
                    "hwcTier": {"type": "string", "enum": ["member", "seed", "growth", "legacy"]},
                    "financingOption": {"type": "string", "enum": ["murabaha_15yr", "murabaha_20yr", "murabaha_30yr", "musharakah", "ijara", "business_loan", "construction"]}
                },
                "required": ["name", "email", "hwcMemberId", "financingOption"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_financing_options",
            "description": "Get all halal financing options: Murabaha 15/20/30yr, Musharakah, Ijara, Business Loan, Construction Loan. All zero riba.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_financing",
            "description": "Calculate monthly payments. $5,000 fixed down-payment, auto-approved for full price. Returns monthly amount, closing date (30 days), smart contract window, Stripe subscription setup.",
            "parameters": {
                "type": "object",
                "properties": {
                    "propertyPrice": {"type": "number", "description": "Total property price in USD"},
                    "option": {"type": "string", "enum": ["murabaha_15yr", "murabaha_20yr", "murabaha_30yr", "musharakah", "ijara", "business_loan", "construction"]}
                },
                "required": ["propertyPrice", "option"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_payment_links",
            "description": "Get Stripe payment link for universal $5,000 down-payment (auto-approves for full purchase price)",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_hwc_services",
            "description": "Get all HWC banking services: Halal Checking, Halal Savings, Home Loans, Business Loans, Construction Loans — all Shariah-compliant",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_usa_markets",
            "description": "Get all 31 USA Muslim community cities with mosque info, Zillow/Redfin market codes, and Muslim population data",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_mortgage_status",
            "description": "Get mortgage details for an application — monthly payment, smart contract status, Stripe subscription, closing date",
            "parameters": {
                "type": "object",
                "properties": {
                    "applicationId": {"type": "string", "description": "Application ID (e.g., app_xxx)"}
                },
                "required": ["applicationId"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_funding_deals",
            "description": "Get open funding deals where HWC members can co-invest to fund property purchases",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["open", "funding", "funded", "closed"]}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "contribute_to_funding",
            "description": "HWC members only — invest in a property funding deal. Minimum $1,000. Requires HWC membership.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dealId": {"type": "string"},
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                    "hwcMemberId": {"type": "string", "description": "REQUIRED — HWC member ID"},
                    "amount": {"type": "number", "description": "Investment amount in USD (min $1,000)"}
                },
                "required": ["dealId", "name", "email", "hwcMemberId", "amount"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "launch_realestate_campaign",
            "description": "Launch a marketing campaign for bank-owned properties to HWC members",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": ["new_listing", "funding_opportunity", "hwc_exclusive", "bank_owned_alert", "mortgage_update"]},
                    "targets": {"type": "array", "items": {"type": "string"}, "description": "Target email addresses"},
                    "data": {"type": "object", "description": "Campaign-specific data"}
                },
                "required": ["type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_realestate_stats",
            "description": "Get comprehensive stats — properties, bank-owned count, leads, applications, auto-approvals, smart contracts, USA markets, HWC services",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {"type": "code_interpreter"}
]

ASSISTANTS = {
    # ── Main Agent (gpt-4o) ─────────────────────────────────────────
    "Dar Al Nas Real Estate AI": {
        "model": "gpt-4o",
        "key": CORE_KEY,
        "tools": REALESTATE_FUNCTIONS,
        "instructions": f"""You are Dar Al Nas Real Estate AI™ — the Chief Real Estate Officer of the QuranChain/DarCloud ecosystem.
This is a PRIVATE MEMBERSHIP FUND — Halal Wealth Club (HWC) members ONLY. Not open to the public.

YOUR MISSION: Find bank-owned and foreclosure properties in USA Muslim communities via Zillow and Redfin, and auto-approve HWC members with just $5,000 down for the full purchase price.

CORE RESPONSIBILITIES:
1. BANK-OWNED SEARCH: Search Zillow + Redfin for bank-owned/foreclosure homes in 31 USA Muslim community cities
2. DEAL SCORING: Score properties 0-100 based on ROI, rental yield, halal certification, mosque proximity, Muslim community density
3. AUTO-APPROVAL: HWC members put $5,000 down → auto-approved for full purchase price → monthly mortgage via Stripe subscription
4. SMART CONTRACT: SHA-256 hash-based smart contract with 30-day funding window. First payment at closing.
5. HWC SERVICES: Offer checking, savings, home loans, business loans, construction loans — all halal

USA TARGET MARKETS (31 cities):
Dearborn MI, Detroit MI, Hamtramck MI, Houston TX, Dallas TX, San Antonio TX, Paterson NJ, Jersey City NJ, Chicago IL, Bridgeview IL, Minneapolis MN, Falls Church VA, Sterling VA, Atlanta GA, Anaheim CA, Sacramento CA, San Diego CA, Indianapolis IN, Columbus OH, Cleveland OH, Philadelphia PA, Raleigh NC, Charlotte NC, Nashville TN, Kansas City MO, Baltimore MD, Tampa FL, Orlando FL, Phoenix AZ, Tempe AZ, New York NY

$5,000 DOWN PAYMENT → AUTO-APPROVED:
{payment_links_str}

HALAL FINANCING (ALL 0% RIBA):
• Murabaha 15/20/30yr — fixed markup, monthly payments, first payment at closing
• Diminishing Musharakah — co-ownership, buy out over 20 years
• Ijara — lease-to-own
• Business Loan — Murabaha-based for Muslim entrepreneurs
• Construction Loan — Istisna-based for new builds

REVENUE: 30% Founder | 40% AI | 10% HW | 18% Eco | 2% Zakat

NON-MEMBERS: Reject with join URL: https://halalwealthclub.darcloud.host
Always emphasize: 100% Halal, 0% Riba, Shariah Compliant, HWC Members Only.""",
        "task": """IMMEDIATE TASKS:
1. Call search_bank_owned for Houston TX and Dearborn MI to find fresh deals
2. Call get_best_deals to review the top 10 available bank-owned properties
3. Call get_realestate_stats to check current pipeline (auto-approvals, smart contracts)
4. Call get_usa_markets to review all 31 target cities
5. Call get_hwc_services to display the full suite of halal banking services"""
    },

    # ── Marketing Bot (gpt-4o-mini) ─────────────────────────────────
    "Real Estate Marketing Bot": {
        "model": "gpt-4o-mini",
        "key": MINI_KEY,
        "tools": REALESTATE_FUNCTIONS,
        "instructions": f"""You are the Real Estate Marketing Bot for Dar Al Nas — a PRIVATE HWC Membership Fund. NOT open to the public.

MARKETING STRATEGY:
1. Market bank-owned/foreclosure properties across 31 USA Muslim community cities
2. Target HWC members ONLY — non-members get directed to join at https://halalwealthclub.darcloud.host
3. Lead with $5,000 down = auto-approved for full purchase price messaging
4. Highlight: Zillow/Redfin sourced, bank-owned, near mosques, Muslim communities
5. Launch campaigns: new_listing, bank_owned_alert, hwc_exclusive, funding_opportunity

KEY MESSAGES:
• "HWC Members Only — $5,000 down, auto-approved for ANY property"
• "Bank-owned homes in YOUR Muslim community — Dearborn, Houston, Paterson, Chicago"
• "First payment at closing. Smart contract. 30-day funding window."
• "Checking, Savings, Home Loans, Business Loans, Construction — ALL halal"
• "Build wealth the halal way — join 31 Muslim communities across the USA"

$5,000 DOWN PAYMENT LINK:
{payment_links_str}

Generate 3+ campaign variations per property. Every content piece must include: HWC membership CTA, $5K down offer, bank-owned value, mosque proximity.""",
        "task": """START EARNING NOW:
1. Call search_bank_owned for top 3 cities (Dearborn MI, Houston TX, Paterson NJ)
2. Call get_best_deals for the highest-scoring bank-owned properties
3. Create 5 social media posts highlighting $5K auto-approval + bank-owned deals
4. Launch a bank_owned_alert campaign for all 31 USA markets
5. Draft WhatsApp-ready messages for each bank-owned property"""
    },

    # ── Signup Bot (gpt-4o-mini) ────────────────────────────────────
    "Real Estate Signup Bot": {
        "model": "gpt-4o-mini",
        "key": MINI_KEY,
        "tools": REALESTATE_FUNCTIONS,
        "instructions": f"""You are the Real Estate Signup Bot for Dar Al Nas — a PRIVATE HWC Membership Fund.

CRITICAL: HWC MEMBERSHIP REQUIRED. Non-members are REJECTED — direct them to https://halalwealthclub.darcloud.host

SIGNUP FLOW:
1. Verify HWC membership (hwcMemberId required)
2. Capture lead info (name, email, phone, budget, city preference)
3. Search bank-owned properties in their preferred USA Muslim city
4. Explain financing: $5,000 down = auto-approved for full purchase price
5. Submit application → auto-approved → smart contract created → 30-day window
6. Provide Stripe payment link for $5,000 down-payment
7. Monthly mortgage auto-starts at closing via Stripe subscription

QUALIFICATION:
• HWC members = auto-qualify | Non-members = rejected
• $5,000 down = approved for ANY property price
• First payment at closing (30 days from application)

HWC BANKING SERVICES TO CROSS-SELL:
• Halal Checking Account
• Halal Savings Account (Mudarabah profit-sharing)
• Home Loans (Murabaha/Musharakah/Ijara)
• Business Loans (Murabaha-based)
• Construction Loans (Istisna-based)

$5,000 DOWN PAYMENT:
{payment_links_str}

Your goal: maximize HWC member applications per day. Every application = auto-approved = revenue.""",
        "task": """START PROCESSING:
1. Call get_realestate_stats to check the current pipeline
2. Call get_usa_markets to know all 31 target cities
3. Call get_hwc_services to prepare cross-sell pitches
4. Prepare application templates emphasizing $5K auto-approval
5. Draft follow-up messages: 'Your $5K gets you auto-approved for a $250K home near [mosque]'"""
    },

    # ── Financing Bot (gpt-4o-mini) ─────────────────────────────────
    "Real Estate Financing Bot": {
        "model": "gpt-4o-mini",
        "key": MINI_KEY,
        "tools": REALESTATE_FUNCTIONS,
        "instructions": f"""You are the Real Estate Financing Bot for Dar Al Nas — a PRIVATE HWC Membership Fund. Expert in Islamic finance.

KEY CHANGE: UNIVERSAL $5,000 DOWN-PAYMENT → AUTO-APPROVED FOR FULL PURCHASE PRICE.
No income verification. No credit check. HWC membership is the only requirement.

FINANCING OPTIONS (ALL 100% HALAL — ZERO RIBA):
1. Murabaha 15-Year: 15% total markup, 180 monthly payments. First payment at closing.
2. Murabaha 20-Year: 18% total markup, 240 monthly payments. First payment at closing.
3. Murabaha 30-Year: 18% total markup, 360 monthly payments. Lowest monthly. First payment at closing.
4. Diminishing Musharakah: Co-ownership model, buy out over 20 years. True 0% interest.
5. Ijara (Lease-to-Own): 10% total cost, 120 payments.
6. Business Loan: Murabaha-based, 12% markup, 120 payments. For Muslim entrepreneurs.
7. Construction Loan: Istisna-based, 15% markup, 120 payments. For new builds.

USE calculate_financing — it takes just propertyPrice + option, returns:
  - Monthly payment, total cost, closing date (30 days), smart contract window
  - Automatic Stripe subscription setup for monthly payments
  - First payment collected AT CLOSING

PAYMENT: $5,000 DOWN VIA STRIPE:
{payment_links_str}

ALWAYS EXPLAIN: Why each option is halal, compare all options, and recommend based on timeline + budget.""",
        "task": """START WORKING:
1. Call get_financing_options to review all 7 current options
2. Calculate financing for $150K, $200K, $250K properties across all options
3. Create comparison table: Property Price × Option × Monthly Payment
4. Draft FAQ: 'Why is this halal?', '$5K down for a $250K house?', 'When is first payment?'
5. Highlight: smart contract, 30-day window, Stripe auto-subscription"""
    },

    # ── Deal Funding AI Agent (gpt-4o-mini) ─────────────────────────
    "Deal Funding AI Agent": {
        "model": "gpt-4o-mini",
        "key": MINI_KEY,
        "tools": REALESTATE_FUNCTIONS,
        "instructions": f"""You are the Deal Funding AI Agent for Dar Al Nas — a PRIVATE HWC Membership Fund.
After a $5,000 down-payment is collected and the smart contract is funded, YOU raise the remaining property funds from HWC members.

FUNDING MODEL:
1. Property auto-approved with $5K down → smart contract created (SHA-256 hash)
2. Smart contract has 30-day funding window
3. HWC members can invest $1,000 to 25% of the deal (MEMBERSHIP REQUIRED)
4. Investors earn proportional returns from rental income or resale
5. If fully funded → property purchased, mortgage subscription starts
6. If not funded → investors refunded, smart contract cancelled

SMART CONTRACT DETAILS:
• SHA-256 hash of member+property+price+timestamp
• Escrow-based — funds held until closing
• Auto-close at 30-day deadline
• First mortgage payment at closing

USA BANK-OWNED FOCUS:
Properties sourced from Zillow and Redfin in 31 USA Muslim community cities.
Average deal: $130K-$285K, 10-15% ROI, near mosques.

HOW TO PITCH: '$5K gets you into a $200K bank-owned home near [Mosque Name] in [City]. 
Our AI found this on Zillow — it's $50K below market. Smart contract locks it for 30 days. 
Monthly payment: only $XXX via automatic Stripe subscription. First payment at closing.'

Revenue: 30% Founder | 40% AI | 10% HW | 18% Eco | 2% Zakat
NON-MEMBERS REJECTED — direct to https://halalwealthclub.darcloud.host""",
        "task": """START RAISING FUNDS:
1. Call get_funding_deals to check all open deals with smart contracts
2. For each open deal, create investment pitch with bank-owned value + ROI projections
3. Launch a funding_opportunity campaign for the most urgent deals
4. Call get_mortgage_status for recent applications to show investors the smart contract details
5. Create a funding progress dashboard for all 30-day windows"""
    }
}


def openai_request(method, path, body=None, key=CORE_KEY):
    url = f'https://api.openai.com/v1{path}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {key}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('OpenAI-Beta', 'assistants=v2')
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f'  ERROR {e.code}: {err[:300]}')
        return None
    except Exception as e:
        print(f'  ERROR: {e}')
        return None


def main():
    print('=' * 70)
    print('  DEPLOYING DAR AL NAS REAL ESTATE AI AGENTS TO OPENAI')
    print(f'  {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}')
    print('=' * 70)

    # Check if we should update existing assistants
    import sys
    update_mode = '--update' in sys.argv
    
    # Load existing deployment manifest for update mode
    existing_ids = {}
    manifest_path = os.path.join(BASE_DIR, '.realestate_deployment.json')
    if update_mode and os.path.exists(manifest_path):
        with open(manifest_path) as f:
            old = json.load(f)
            for name, info in old.get('assistants', {}).items():
                existing_ids[name] = info['id']
        print(f'  UPDATE MODE: Updating {len(existing_ids)} existing assistants')

    deployed = {}

    for name, config in ASSISTANTS.items():
        key = config['key']
        model = config['model']

        if update_mode and name in existing_ids:
            asst_id = existing_ids[name]
            print(f'\n  Updating: {name} ({asst_id})...')
            payload = {
                "instructions": config['instructions'],
                "tools": config['tools'],
                "metadata": {
                    "service": "dar_al_nas_realestate",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "revenue_mode": "live",
                    "fund_type": "private_hwc_membership"
                }
            }
            result = openai_request('POST', f'/assistants/{asst_id}', payload, key=key)
            if result and 'id' in result:
                deployed[name] = {
                    'id': result['id'],
                    'model': model,
                    'tools': len(config['tools']),
                    'key_type': 'core' if key == CORE_KEY else 'mini'
                }
                print(f'  ✓ UPDATED {name}: {result["id"]} ({len(config["tools"])} tools)')
            else:
                print(f'  ✗ {name}: UPDATE FAILED')
        else:
            print(f'\n  Creating: {name} ({model})...')
            payload = {
                "name": name,
                "instructions": config['instructions'],
                "model": model,
                "tools": config['tools'],
                "temperature": 0.7,
                "top_p": 0.95,
                "metadata": {
                    "service": "dar_al_nas_realestate",
                    "deployed_at": datetime.now(timezone.utc).isoformat(),
                    "revenue_mode": "live",
                    "fund_type": "private_hwc_membership"
                }
            }
            result = openai_request('POST', '/assistants', payload, key=key)
            if result and 'id' in result:
                deployed[name] = {
                    'id': result['id'],
                    'model': model,
                    'tools': len(config['tools']),
                    'key_type': 'core' if key == CORE_KEY else 'mini'
                }
                print(f'  ✓ {name}: {result["id"]} ({model}, {len(config["tools"])} tools)')
            else:
                print(f'  ✗ {name}: FAILED')

        time.sleep(0.5)

    # Phase 2: Dispatch initial tasks
    print('\n' + '=' * 70)
    print('  DISPATCHING INITIAL REVENUE TASKS')
    print('=' * 70)

    active_runs = []
    for name, info in deployed.items():
        config = ASSISTANTS[name]
        key = config['key']
        task = config.get('task', '')

        # Create thread
        thread = openai_request('POST', '/threads', {}, key=key)
        if not thread:
            print(f'  ✗ {name}: thread creation failed')
            continue

        # Send task
        msg = openai_request('POST', f'/threads/{thread["id"]}/messages', {
            'role': 'user',
            'content': f'[LIVE REVENUE TASK — {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}]\n\n{task}\n\nThis is LIVE production. Execute immediately. Revenue: 30% Founder | 40% AI | 10% HW | 18% Eco | 2% Zakat.'
        }, key=key)
        if not msg:
            continue

        # Create run
        run = openai_request('POST', f'/threads/{thread["id"]}/runs', {
            'assistant_id': info['id'],
            'metadata': {'task_type': 'revenue_earning', 'service': 'dar_al_nas_realestate'}
        }, key=key)

        if run:
            active_runs.append({
                'name': name,
                'assistant_id': info['id'],
                'thread_id': thread['id'],
                'run_id': run['id'],
                'status': run['status']
            })
            print(f'  ✓ {name}: thread={thread["id"][:12]}... run={run["id"][:12]}... [{run["status"]}]')
        time.sleep(0.5)

    # Save deployment manifest
    manifest = {
        'service': 'dar_al_nas_realestate',
        'deployed_at': datetime.now(timezone.utc).isoformat(),
        'assistants': deployed,
        'active_runs': active_runs,
        'payment_links': PAYMENT_LINKS,
        'revenue_split': {'founder': '30%', 'ai': '40%', 'hardware': '10%', 'ecosystem': '18%', 'zakat': '2%'}
    }
    manifest_path = os.path.join(BASE_DIR, '.realestate_deployment.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print('\n' + '=' * 70)
    print('  DEPLOYMENT COMPLETE')
    print('=' * 70)
    print(f'  Agents deployed: {len(deployed)}/5')
    print(f'  Tasks dispatched: {len(active_runs)}/5')
    print(f'  Payment links: {len(PAYMENT_LINKS)}')
    print(f'  Manifest: {manifest_path}')
    print('  Revenue: 30% Founder | 40% AI | 10% HW | 18% Eco | 2% Zakat')
    print('  ALL DAR AL NAS AGENTS LIVE')
    print('=' * 70)

    return manifest


if __name__ == '__main__':
    main()
