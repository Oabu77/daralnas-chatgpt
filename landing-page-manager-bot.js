#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * Landing Page Manager Bot — Agent Server on port 9025
 * ====================================================
 * AI-powered landing page management bot that:
 * 1. Communicates with all 8 Cloudflare Workers (health checks, content updates)
 * 2. Uses OpenAI assistants for intelligent page management
 * 3. Provides REST API for webhook receiver integration
 * 4. Monitors all landing pages and deploys updates
 *
 * Port: 9025
 * Workers: 8 CF Workers across darcloud.host + darcloud.net
 * Agents: 5 OpenAI assistants (1 core gpt-4o + 4 mini gpt-4o-mini)
 */

const http = require('http');
const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 9025;
const BASE_DIR = __dirname;

// ─── Credentials ──────────────────────────────────────────────────
const CORE_KEY = "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";
const MINI_KEY = "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";
const CF_ACCOUNT = "3bfc21f5baba642160ec706818e3a19f";
const CF_TOKEN = "s18X59LFX6j_iJ88LdfiA124Uk_CQi7O33p8HJit";

// ─── Load Agent Config ────────────────────────────────────────────
let AGENTS_CONFIG = {};
const configPath = path.join(BASE_DIR, 'data', 'landing_page_agents_config.json');
try { AGENTS_CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { console.log('⚠️ No agent config found, run deploy_landing_page_agents.py first'); }

// ─── Workers Registry ─────────────────────────────────────────────
const WORKERS = {
    'darcloud-www':         { domain: 'darcloud.host',               port: null,  brand: 'DarCloud Platform' },
    'darcloud-net':         { domain: 'darcloud.net',                port: null,  brand: 'DarCloud Corporate' },
    'darcloud-hwc':         { domain: 'halalwealthclub.darcloud.host', port: 3000, brand: 'Halal Wealth Club' },
    'darcloud-blockchain':  { domain: 'blockchain.darcloud.host',    port: 3001,  brand: 'QuranChain' },
    'darcloud-enterprise':  { domain: 'enterprise.darcloud.host',    port: 8200,  brand: 'Enterprise' },
    'darcloud-realestate':  { domain: 'realestate.darcloud.host',    port: 9020,  brand: 'Dar Al Nas' },
    'darcloud-mesh-status': { domain: 'mesh.darcloud.host',          port: null,  brand: 'FungiMesh' },
    'darcloud-ai-assistant':{ domain: 'ai.darcloud.host',            port: null,  brand: 'AI Fleet' },
};

// ─── HTTP/HTTPS Fetch Helper ──────────────────────────────────────
function fetchUrl(url, options = {}) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const opts = { method: options.method || 'GET', timeout: 10000 };
        if (options.headers) opts.headers = options.headers;

        const req = mod.request(url, opts, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        if (options.body) req.write(options.body);
        req.end();
    });
}

// ─── Cloudflare API ───────────────────────────────────────────────
async function cfApi(endpoint, method = 'GET', data = null) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/${endpoint}`;
    const opts = {
        method,
        headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
    };
    if (data) opts.body = JSON.stringify(data);
    return fetchUrl(url, opts).then(r => JSON.parse(r.body));
}

// ─── OpenAI Chat ──────────────────────────────────────────────────
async function chatWithAgent(agentKey, message) {
    const assistantId = AGENTS_CONFIG?.assistants?.[agentKey];
    const key = agentKey === 'landing_page_orchestrator_ai' ? CORE_KEY : MINI_KEY;
    if (!assistantId) return { error: `Agent ${agentKey} not found`, available: Object.keys(AGENTS_CONFIG?.assistants || {}) };

    try {
        // Create thread
        const threadRes = await fetchUrl('https://api.openai.com/v1/threads', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
            body: JSON.stringify({})
        });
        const thread = JSON.parse(threadRes.body);

        // Add message
        await fetchUrl(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
            body: JSON.stringify({ role: 'user', content: message })
        });

        // Run
        const runRes = await fetchUrl(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
            body: JSON.stringify({ assistant_id: assistantId })
        });
        const run = JSON.parse(runRes.body);

        // Poll for completion (max 30s)
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const statusRes = await fetchUrl(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
            });
            const statusData = JSON.parse(statusRes.body);

            if (statusData.status === 'completed') {
                const msgsRes = await fetchUrl(`https://api.openai.com/v1/threads/${thread.id}/messages?order=desc&limit=1`, {
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
                });
                const msgs = JSON.parse(msgsRes.body);
                const reply = msgs.data?.[0]?.content?.[0]?.text?.value || 'No response';
                return { agent: agentKey, assistant_id: assistantId, response: reply, thread_id: thread.id };
            }

            if (statusData.status === 'requires_action') {
                // Handle function calls
                const toolCalls = statusData.required_action?.submit_tool_outputs?.tool_calls || [];
                const toolOutputs = [];
                for (const tc of toolCalls) {
                    const args = JSON.parse(tc.function.arguments || '{}');
                    const result = await executeFunction(tc.function.name, args);
                    toolOutputs.push({ tool_call_id: tc.id, output: JSON.stringify(result) });
                }
                await fetchUrl(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}/submit_tool_outputs`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
                    body: JSON.stringify({ tool_outputs: toolOutputs })
                });
            }

            if (['failed', 'cancelled', 'expired'].includes(statusData.status)) {
                return { error: `Run ${statusData.status}`, details: statusData.last_error };
            }
        }
        return { error: 'Timeout waiting for response' };
    } catch (e) {
        return { error: e.message };
    }
}

// ─── Function Execution (called by OpenAI tool_calls) ─────────────
async function executeFunction(name, args) {
    switch (name) {
        case 'list_landing_pages':
            return { workers: Object.entries(WORKERS).map(([k, v]) => ({ name: k, ...v, url: `https://${v.domain}` })), total: Object.keys(WORKERS).length };

        case 'get_worker_status':
            try {
                const w = WORKERS[args.worker_name];
                if (!w) return { error: `Unknown worker: ${args.worker_name}` };
                const r = await fetchUrl(`https://${w.domain}/health`);
                return { worker: args.worker_name, domain: w.domain, status: r.status, health: JSON.parse(r.body) };
            } catch (e) { return { worker: args.worker_name, status: 'error', error: e.message }; }

        case 'check_landing_page_live':
            try {
                const r = await fetchUrl(`https://${args.domain}`);
                const isHtml = r.body.includes('<!DOCTYPE html>') || r.body.includes('<html');
                return { domain: args.domain, status: r.status, serving_html: isHtml, content_length: r.body.length, title_match: r.body.match(/<title>(.*?)<\/title>/)?.[1] || 'none' };
            } catch (e) { return { domain: args.domain, error: e.message }; }

        case 'check_all_workers_health':
            const results = {};
            for (const [name, w] of Object.entries(WORKERS)) {
                try {
                    const start = Date.now();
                    const r = await fetchUrl(`https://${w.domain}/health`);
                    results[name] = { status: r.status, latency_ms: Date.now() - start, healthy: r.status === 200 };
                } catch (e) { results[name] = { status: 'error', error: e.message }; }
            }
            return results;

        case 'deploy_worker':
            try {
                const workerDir = path.join(BASE_DIR, 'workers', args.worker_name.replace('darcloud-', ''));
                if (!fs.existsSync(workerDir)) {
                    // Try exact name
                    const altDir = path.join(BASE_DIR, 'workers', args.worker_name);
                    if (!fs.existsSync(altDir)) return { error: `Worker dir not found: ${args.worker_name}` };
                }
                const output = execSync(`cd "${workerDir}" && npx wrangler deploy 2>&1`, { timeout: 60000 }).toString();
                return { worker: args.worker_name, deployed: true, output: output.slice(-500) };
            } catch (e) { return { worker: args.worker_name, deployed: false, error: e.message.slice(0, 300) }; }

        case 'get_brand_guidelines':
            const brands = {
                'DarCloud': { colors: { bg: '#07090f', primary: '#00d4ff', accent: '#10b981', gold: '#f59e0b' }, font: 'system-ui sans-serif', tone: 'Technical, aspirational', theme: 'dark-space-cyan' },
                'HWC': { colors: { bg: '#060d06', primary: '#d4af37', accent: '#22c55e' }, font: 'Georgia serif + system-ui', tone: 'Trustworthy, Islamic luxury', theme: 'dark-green-gold' },
                'QuranChain': { colors: { bg: '#0a0a0f', primary: '#f59e0b', accent: '#f97316' }, font: 'system-ui', tone: 'Technical, reverent', theme: 'dark-amber' },
                'FungiMesh': { colors: { bg: '#0a0618', primary: '#00d4aa', accent: '#8b5cf6' }, font: 'system-ui', tone: 'Scientific, nature-inspired', theme: 'purple-teal-bio' },
                'Dar Al Nas': { colors: { bg: '#0d1209', primary: '#2ecc71', accent: '#d4af37' }, font: 'system-ui', tone: 'Community-focused, warm', theme: 'dark-green-emerald' },
                'Enterprise': { colors: { bg: '#0a1628', primary: '#3b82f6', accent: '#06b6d4' }, font: 'system-ui', tone: 'Professional, corporate', theme: 'navy-corporate' },
                'AI Fleet': { colors: { bg: '#060a14', primary: '#0096ff', accent: '#00d4ff' }, font: 'system-ui', tone: 'Futuristic, capability-driven', theme: 'dark-electric-blue' },
            };
            return brands[args.brand] || { error: `Unknown brand: ${args.brand}`, available: Object.keys(brands) };

        case 'run_seo_audit':
            try {
                const r = await fetchUrl(`https://${args.domain}`);
                const html = r.body;
                return {
                    domain: args.domain,
                    status: r.status,
                    has_title: /<title>/.test(html),
                    title: html.match(/<title>(.*?)<\/title>/)?.[1],
                    has_meta_desc: /name="description"/.test(html),
                    has_viewport: /name="viewport"/.test(html),
                    has_h1: /<h1/.test(html),
                    has_favicon: /rel="icon"/.test(html),
                    content_length: html.length,
                    has_structured_data: /application\/ld\+json/.test(html),
                    mobile_ready: /width=device-width/.test(html),
                };
            } catch (e) { return { error: e.message }; }

        case 'get_analytics': return { domain: args.domain, period: args.period || '7d', note: 'Analytics via Cloudflare dashboard — link to CF analytics for this zone' };
        case 'update_landing_page_content': return { status: 'queued', worker: args.worker_name, section: args.section, note: 'Content update queued — deploy bot will handle' };
        case 'generate_ab_test': return { status: 'plan_generated', worker: args.worker_name, section: args.section, variant: args.variant_description };
        case 'get_cf_worker_logs': return { note: 'Use wrangler tail for live logs', worker: args.worker_name };
        case 'update_worker_vars': return { note: 'Use wrangler secret put for sensitive vars', worker: args.worker_name };
        default: return { error: `Unknown function: ${name}` };
    }
}

// ─── Request Handler ──────────────────────────────────────────────
function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', ...cors }); res.end(JSON.stringify(data)); };

    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }

    // ─── Health ───────────────────────────────────────────────────
    if (url.pathname === '/health' || url.pathname === '/') {
        return json({
            service: 'landing-page-manager',
            status: 'running',
            port: PORT,
            workers: Object.keys(WORKERS).length,
            agents: Object.keys(AGENTS_CONFIG?.assistants || {}).length,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    }

    // ─── List all workers ─────────────────────────────────────────
    if (url.pathname === '/api/landing/workers') {
        return json({ workers: Object.entries(WORKERS).map(([k, v]) => ({ name: k, ...v, url: `https://${v.domain}` })) });
    }

    // ─── Health check all workers ─────────────────────────────────
    if (url.pathname === '/api/landing/health-all') {
        const results = await executeFunction('check_all_workers_health', {});
        return json(results);
    }

    // ─── Check specific landing page ──────────────────────────────
    if (url.pathname === '/api/landing/check' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = await executeFunction('check_landing_page_live', { domain: body.domain });
        return json(result);
    }

    // ─── SEO audit ────────────────────────────────────────────────
    if (url.pathname === '/api/landing/seo-audit' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = await executeFunction('run_seo_audit', { domain: body.domain });
        return json(result);
    }

    // ─── Deploy a worker ──────────────────────────────────────────
    if (url.pathname === '/api/landing/deploy' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = await executeFunction('deploy_worker', { worker_name: body.worker_name });
        return json(result);
    }

    // ─── Brand guidelines ─────────────────────────────────────────
    if (url.pathname === '/api/landing/brand') {
        const brand = url.searchParams.get('brand') || 'DarCloud';
        const result = await executeFunction('get_brand_guidelines', { brand });
        return json(result);
    }

    // ─── Chat with AI agent ───────────────────────────────────────
    if (url.pathname === '/api/landing/chat' && req.method === 'POST') {
        const body = await parseBody(req);
        const agent = body.agent || 'landing_page_orchestrator_ai';
        const message = body.message || body.content;
        if (!message) return json({ error: 'message required' }, 400);
        const result = await chatWithAgent(agent, message);
        return json(result);
    }

    // ─── List agents ──────────────────────────────────────────────
    if (url.pathname === '/api/landing/agents') {
        return json({
            agents: Object.entries(AGENTS_CONFIG?.assistants || {}).map(([key, id]) => ({
                key, assistant_id: id,
                chat_endpoint: `POST /api/landing/chat { agent: "${key}", message: "..." }`
            })),
            total: Object.keys(AGENTS_CONFIG?.assistants || {}).length
        });
    }

    // ─── Deploy ALL workers ───────────────────────────────────────
    if (url.pathname === '/api/landing/deploy-all' && req.method === 'POST') {
        const results = {};
        for (const name of Object.keys(WORKERS)) {
            results[name] = await executeFunction('deploy_worker', { worker_name: name });
        }
        return json({ deployed: results, total: Object.keys(WORKERS).length });
    }

    json({ error: 'Not found', endpoints: [
        'GET  /health',
        'GET  /api/landing/workers',
        'GET  /api/landing/health-all',
        'GET  /api/landing/agents',
        'GET  /api/landing/brand?brand=DarCloud',
        'POST /api/landing/chat { agent, message }',
        'POST /api/landing/check { domain }',
        'POST /api/landing/seo-audit { domain }',
        'POST /api/landing/deploy { worker_name }',
        'POST /api/landing/deploy-all',
    ] }, 404);
});

server.listen(PORT, () => {
    console.log(`\n🌐 Landing Page Manager Bot running on port ${PORT}`);
    console.log(`   Workers: ${Object.keys(WORKERS).length}`);
    console.log(`   Agents: ${Object.keys(AGENTS_CONFIG?.assistants || {}).length}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Workers list: http://localhost:${PORT}/api/landing/workers`);
    console.log(`   Chat: POST http://localhost:${PORT}/api/landing/chat`);
    console.log(`   Deploy all: POST http://localhost:${PORT}/api/landing/deploy-all\n`);
});
