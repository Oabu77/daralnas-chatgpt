#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * QuranChain Agent Webhook Receiver
 * ==================================
 * Receives function call requests from OpenAI assistants and routes them
 * to the live revenue-server endpoints. This bridges AI agents to real revenue.
 * 
 * Revenue Split: 30% Founder | 40% AI Validators | 10% Hardware | 18% Ecosystem | 2% Zakat
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.AGENT_WEBHOOK_PORT || 3456;
const REVENUE_SERVER = process.env.REVENUE_SERVER || 'http://localhost:3000';
const REALESTATE_SERVER = 'http://localhost:9020';
const PAYMENT_GATEWAY = 'http://localhost:8450';

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
    });
}

// Dual keys: core assistants under FungiMesh project, mini under OPENAI_API_KEY
const CORE_KEY = process.env.OPENAI_FUNGIMESH_KEY || 
    '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';
const MINI_KEY = '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';
const OPENAI_KEYS = [CORE_KEY, MINI_KEY];

// ── Function routing table ─────────────────────────────────────────
const FUNCTION_ROUTES = {
    // Revenue & Stats
    'get_revenue_stats':         { method: 'GET',  path: '/api/revenue/stats' },
    'check_service_health':      { method: 'GET',  path: '/api/revenue/health' },
    'get_admin_dashboard':       { method: 'GET',  path: '/api/admin/dashboard' },
    'get_system_info':           { method: 'GET',  path: '/api/admin/system' },
    
    // HWC (Halal Wealth Club)
    'hwc_signup':                { method: 'POST', path: '/api/hwc/signup' },
    'hwc_capture_lead':          { method: 'POST', path: '/api/hwc/lead' },
    'hwc_get_pricing':           { method: 'GET',  path: '/api/hwc/pricing' },
    'hwc_get_stats':             { method: 'GET',  path: '/api/hwc/stats' },
    'hwc_get_members':           { method: 'GET',  path: '/api/hwc/members' },
    'hwc_screen_stock':          { method: 'POST', path: '/api/hwc/screen' },
    'hwc_calculate_zakat':       { method: 'POST', path: '/api/hwc/zakat' },
    'hwc_get_content':           { method: 'GET',  path: '/api/hwc/content/{tier}' },
    'hwc_checkout':              { method: 'POST', path: '/api/hwc/checkout/{memberId}' },

    // CRM
    'crm_get_leads':             { method: 'GET',  path: '/api/crm/leads' },
    'crm_create_lead':           { method: 'POST', path: '/api/crm/leads' },
    'crm_update_lead_status':    { method: 'PUT',  path: '/api/crm/leads/{id}/status' },
    'crm_opt_in_lead':           { method: 'POST', path: '/api/crm/leads/{id}/opt-in' },
    'crm_create_deal':           { method: 'POST', path: '/api/crm/deals' },
    'crm_update_deal_stage':     { method: 'PUT',  path: '/api/crm/deals/{id}/stage' },
    'crm_close_deal':            { method: 'POST', path: '/api/crm/close-deal' },
    'crm_get_pipeline':          { method: 'GET',  path: '/api/crm/pipeline' },

    // Stripe Payments
    'stripe_create_payment':     { method: 'POST', path: '/api/stripe/payment-intent' },
    'stripe_lookup_customer':    { method: 'GET',  path: '/api/stripe/customer/lookup' },
    'stripe_pending_customers':  { method: 'GET',  path: '/api/stripe/pending-customers' },
    'stripe_abandoned_sessions': { method: 'GET',  path: '/api/stripe/abandoned-sessions' },
    'get_payment_links':         { method: 'GET',  path: '/api/payment-links', server: PAYMENT_GATEWAY },

    // Agent Payment Gateway (port 8450) — ALL agents use these
    'process_payment':           { method: 'POST', path: '/api/process-payment', server: PAYMENT_GATEWAY },
    'get_product_catalog':       { method: 'GET',  path: '/api/products',        server: PAYMENT_GATEWAY },
    'create_checkout_session':   { method: 'POST', path: '/api/checkout',        server: PAYMENT_GATEWAY },
    'get_revenue_stats':         { method: 'GET',  path: '/api/stats',           server: PAYMENT_GATEWAY },

    // Billing (Metered)
    'billing_create_product':     { method: 'POST', path: '/api/billing/metered/create-product' },
    'billing_subscribe':          { method: 'POST', path: '/api/billing/metered/subscribe' },
    'billing_report_usage':       { method: 'POST', path: '/api/billing/metered/report-usage' },
    'billing_get_subscriptions':  { method: 'GET',  path: '/api/billing/metered/subscriptions' },
    'billing_agent_stats':        { method: 'GET',  path: '/api/billing/metered/agent-stats' },

    // Domains
    'domain_search':              { method: 'GET',  path: '/api/domains/search' },
    'domain_register':            { method: 'POST', path: '/api/domains/register' },
    'domain_checkout':            { method: 'POST', path: '/api/domains/checkout' },
    'domain_pricing':             { method: 'GET',  path: '/api/domains/pricing' },
    'domain_list_registered':     { method: 'GET',  path: '/api/domains/registered' },

    // Email Campaigns
    'email_list':                 { method: 'GET',  path: '/api/email/list' },
    'email_create':               { method: 'POST', path: '/api/email/create' },
    'email_campaign':             { method: 'POST', path: '/api/email/campaign' },
    'email_follow_up':            { method: 'POST', path: '/api/email/follow-up' },
    'email_campaigns':            { method: 'GET',  path: '/api/email/campaigns' },

    // Blockchain
    'blockchain_stats':           { method: 'GET',  path: '/api/blockchain/stats' },
    'blockchain_mine':            { method: 'POST', path: '/api/blockchain/mine' },
    'blockchain_stake':           { method: 'POST', path: '/api/blockchain/stake' },
    'blockchain_validate':        { method: 'GET',  path: '/api/blockchain/validate' },
    'blockchain_pending':         { method: 'GET',  path: '/api/blockchain/pending' },
    'blockchain_latest':          { method: 'GET',  path: '/api/blockchain/latest' },
    'blockchain_zakat':           { method: 'POST', path: '/api/blockchain/zakat' },
    'blockchain_halal_payment':   { method: 'POST', path: '/api/blockchain/halal-payment' },
    'blockchain_royalty_info':    { method: 'GET',  path: '/api/blockchain/royalty-info' },
    'blockchain_stakers':         { method: 'GET',  path: '/api/blockchain/stakers' },
    'blockchain_verse':           { method: 'POST', path: '/api/blockchain/verse' },

    // AI Marketplace
    'marketplace_tools':          { method: 'GET',  path: '/api/ai-marketplace/tools' },
    'marketplace_roles':          { method: 'GET',  path: '/api/ai-marketplace/roles' },
    'marketplace_purchase':       { method: 'POST', path: '/api/ai-marketplace/purchase' },
    'marketplace_recommend':      { method: 'POST', path: '/api/ai-marketplace/recommend' },

    // Dar Al Nas Real Estate — Private HWC Membership Fund
    'search_properties':          { method: 'GET',  path: '/api/realestate/properties' },
    'search_bank_owned':          { method: 'GET',  path: '/api/realestate/bank-owned' },
    'get_best_deals':             { method: 'GET',  path: '/api/realestate/deals/best' },
    'capture_realestate_lead':    { method: 'POST', path: '/api/realestate/leads' },
    'submit_application':         { method: 'POST', path: '/api/realestate/apply' },
    'get_financing_options':      { method: 'GET',  path: '/api/realestate/financing/options' },
    'calculate_financing':        { method: 'POST', path: '/api/realestate/financing/calculate' },
    'get_payment_links_realestate': { method: 'GET', path: '/api/realestate/payment-links' },
    'get_hwc_services':           { method: 'GET',  path: '/api/realestate/hwc-services' },
    'get_usa_markets':            { method: 'GET',  path: '/api/realestate/bank-owned/markets' },
    'get_mortgage_status':        { method: 'GET',  path: '/api/realestate/mortgage/{applicationId}' },
    'get_funding_deals':          { method: 'GET',  path: '/api/realestate/funding' },
    'contribute_to_funding':      { method: 'POST', path: '/api/realestate/funding/contribute' },
    'launch_realestate_campaign': { method: 'POST', path: '/api/realestate/campaign' },
    'get_realestate_stats':       { method: 'GET',  path: '/api/realestate/stats' },

    // Landing Page Management (proxied to landing-page-manager-bot:9025)
    'list_landing_pages':         { method: 'GET',  path: '/api/landing/workers',    server: 'http://localhost:9025' },
    'get_worker_status':          { method: 'POST', path: '/api/landing/check',      server: 'http://localhost:9025' },
    'check_landing_page_live':    { method: 'POST', path: '/api/landing/check',      server: 'http://localhost:9025' },
    'update_landing_page_content':{ method: 'POST', path: '/api/landing/chat',       server: 'http://localhost:9025' },
    'deploy_worker':              { method: 'POST', path: '/api/landing/deploy',     server: 'http://localhost:9025' },
    'get_brand_guidelines':       { method: 'GET',  path: '/api/landing/brand',      server: 'http://localhost:9025' },
    'run_seo_audit':              { method: 'POST', path: '/api/landing/seo-audit',  server: 'http://localhost:9025' },
    'get_analytics':              { method: 'POST', path: '/api/landing/check',      server: 'http://localhost:9025' },
    'generate_ab_test':           { method: 'POST', path: '/api/landing/chat',       server: 'http://localhost:9025' },
    'check_all_workers_health':   { method: 'GET',  path: '/api/landing/health-all', server: 'http://localhost:9025' },
    'get_cf_worker_logs':         { method: 'POST', path: '/api/landing/chat',       server: 'http://localhost:9025' },
    'update_worker_vars':         { method: 'POST', path: '/api/landing/chat',       server: 'http://localhost:9025' },
};

// ── Helper: proxy request to revenue server ────────────────────────
function proxyToRevenue(route, params, body) {
    return new Promise((resolve, reject) => {
        let urlPath = route.path;
        // Replace path params
        if (params) {
            Object.keys(params).forEach(key => {
                urlPath = urlPath.replace(`{${key}}`, encodeURIComponent(params[key]));
            });
        }
        // Add query params for GET
        if (route.method === 'GET' && body && Object.keys(body).length) {
            const qs = new URLSearchParams(body).toString();
            urlPath += '?' + qs;
        }

        const baseUrl = route.server ? route.server : (urlPath.startsWith('/api/realestate') ? REALESTATE_SERVER : REVENUE_SERVER);
        const url = new URL(urlPath, baseUrl);
        const bodyStr = (route.method !== 'GET' && body) ? JSON.stringify(body) : null;
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: route.method,
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        };
        if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);

        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve({ raw: data });
                }
            });
        });
        req.on('error', err => reject(err));
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        
        if (bodyStr) {
            req.write(bodyStr);
        }
        req.end();
    });
}

// ── Helper: submit tool output back to OpenAI ──────────────────────
function submitToolOutput(threadId, runId, toolCallId, output, keyIndex = 0) {
    return new Promise((resolve, reject) => {
        const apiKey = OPENAI_KEYS[keyIndex] || CORE_KEY;
        const body = JSON.stringify({
            tool_outputs: [{
                tool_call_id: toolCallId,
                output: typeof output === 'string' ? output : JSON.stringify(output)
            }]
        });

        const req = https.request({
            hostname: 'api.openai.com',
            path: `/v1/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // If 401/404 with first key, try second key
                if ((res.statusCode === 401 || res.statusCode === 404) && keyIndex === 0) {
                    submitToolOutput(threadId, runId, toolCallId, output, 1).then(resolve).catch(reject);
                    return;
                }
                try { resolve(JSON.parse(data)); } 
                catch { resolve({ raw: data }); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Helper: check run status and handle function calls ─────────────
function checkRun(threadId, runId, keyIndex = 0) {
    return new Promise((resolve, reject) => {
        const apiKey = OPENAI_KEYS[keyIndex] || CORE_KEY;
        const req = https.request({
            hostname: 'api.openai.com',
            path: `/v1/threads/${threadId}/runs/${runId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // If 401/404 with first key, try second key
                if ((res.statusCode === 401 || res.statusCode === 404) && keyIndex === 0) {
                    checkRun(threadId, runId, 1).then(resolve).catch(reject);
                    return;
                }
                try { resolve(JSON.parse(data)); }
                catch { resolve({ raw: data }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// ── Main: poll and handle function calls ───────────────────────────
async function handleFunctionCalls(threadId, runId) {
    const run = await checkRun(threadId, runId);
    
    if (run.status !== 'requires_action') {
        return { status: run.status, handled: 0 };
    }

    const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls || [];
    let handled = 0;

    for (const call of toolCalls) {
        const fnName = call.function.name;
        const args = JSON.parse(call.function.arguments || '{}');
        const route = FUNCTION_ROUTES[fnName];

        if (!route) {
            await submitToolOutput(threadId, runId, call.id, 
                JSON.stringify({ error: `Unknown function: ${fnName}` }));
            continue;
        }

        try {
            const result = await proxyToRevenue(route, args, args);
            await submitToolOutput(threadId, runId, call.id, result);
            handled++;
            console.log(`  ✓ ${fnName} → ${route.method} ${route.path}`);
        } catch (err) {
            await submitToolOutput(threadId, runId, call.id,
                JSON.stringify({ error: err.message }));
            console.log(`  ✗ ${fnName} → ${err.message}`);
        }
    }

    return { status: 'tool_outputs_submitted', handled };
}

// ── HTTP Server: webhook endpoint ──────────────────────────────────
const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    // Health check
    if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'active',
            service: 'agent-webhook-receiver',
            routes: Object.keys(FUNCTION_ROUTES).length,
            uptime: process.uptime(),
            revenue_mode: 'live'
        }));
        return;
    }

    // Handle function call webhook
    if (url.pathname === '/webhook/function-call' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { thread_id, run_id } = JSON.parse(body);
                const result = await handleFunctionCalls(thread_id, run_id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Poll all active runs
    if (url.pathname === '/webhook/poll-runs' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { runs } = JSON.parse(body);
                const results = [];
                for (const run of (runs || [])) {
                    const result = await handleFunctionCalls(run.thread_id, run.run_id);
                    results.push({ ...run, ...result });
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ processed: results.length, results }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Direct function call proxy (for testing)
    if (url.pathname.startsWith('/api/agent/call/') && req.method === 'POST') {
        const fnName = url.pathname.split('/').pop();
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const route = FUNCTION_ROUTES[fnName];
            if (!route) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Unknown function: ${fnName}` }));
                return;
            }
            try {
                const args = JSON.parse(body || '{}');
                const result = await proxyToRevenue(route, args, args);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // List all routes
    if (url.pathname === '/routes') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            total: Object.keys(FUNCTION_ROUTES).length,
            functions: Object.entries(FUNCTION_ROUTES).map(([name, route]) => ({
                name, method: route.method, path: route.path
            }))
        }));
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log('═'.repeat(60));
    console.log('  QuranChain Agent Webhook Receiver');
    console.log(`  Port: ${PORT}`);
    console.log(`  Revenue Server: ${REVENUE_SERVER}`);
    console.log(`  Functions Mapped: ${Object.keys(FUNCTION_ROUTES).length}`);
    console.log(`  Core Key: ...${(CORE_KEY || '').slice(-8)}`);
    console.log(`  Mini Key: ...${(MINI_KEY || '').slice(-8)}`);
    console.log('  Status: LIVE - Routing agent function calls to revenue');
    console.log('═'.repeat(60));
});
