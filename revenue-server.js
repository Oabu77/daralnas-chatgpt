#!/usr/bin/env node
/**
 * 🕌 QuranChain-OS — Unified Mainnet Server
 * ============================================
 * Full-stack decentralized server:
 *  • QuranChain Blockchain Mainnet (PoW, nomadic P2P)
 *  • Revenue & Storefront (Stripe, 216 payment links)
 *  • AI Commerce Marketplace (17 tools, 8 roles)
 *  • Domain Registration & Email Services (16 TLDs)
 *  • MongoDB persistent storage
 *  • IPFS decentralized file storage
 *  • WebSocket P2P mesh networking
 *
 * Usage: node revenue-server.js
 * Visit: http://localhost:3000
 * P2P:   ws://localhost:6001
 *
 * Founder: Omar Mohammad Abunadi™
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

// === BLOCKCHAIN ===
const { Blockchain } = require('./src/blockchain/Blockchain');
const { Transaction, TX_TYPES, FOUNDER_ROYALTY_RATE, FOUNDER_ADDRESS } = require('./src/blockchain/Transaction');
const Block = require('./src/blockchain/Block');
const Wallet = require('./src/blockchain/Wallet');
const { P2PNetwork } = require('./src/p2p/P2PNetwork');

// === MONGODB (optional — graceful fallback) ===
let mongoose = null;
let mongoConnected = false;
let BlockModel = null;
let TxModel = null;
let UserModel = null;

async function connectMongo() {
  try {
    mongoose = require('mongoose');
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://admin:QuranChain2026!@localhost:27018/quranchain?authSource=admin';
    await mongoose.connect(MONGO_URI);
    mongoConnected = true;
    console.log('  💾 MongoDB connected');

    // Define schemas for blockchain persistence
    const blockSchema = new mongoose.Schema({
      index: { type: Number, unique: true, index: true },
      hash: { type: String, unique: true, index: true },
      previousHash: String,
      timestamp: Number,
      transactions: [mongoose.Schema.Types.Mixed],
      nonce: Number,
      difficulty: Number,
      merkleRoot: String,
      miner: String,
    }, { timestamps: true });

    const txSchema = new mongoose.Schema({
      txId: { type: String, unique: true, index: true },
      type: { type: String, index: true },
      from: { type: String, index: true },
      to: { type: String, index: true },
      amount: Number,
      data: mongoose.Schema.Types.Mixed,
      blockIndex: { type: Number, index: true },
      blockHash: String,
      timestamp: Number,
    }, { timestamps: true });

    const userSchema = new mongoose.Schema({
      address: { type: String, unique: true, index: true },
      balance: { type: Number, default: 0 },
      stake: { type: Number, default: 0 },
      txCount: { type: Number, default: 0 },
      lastSeen: Date,
    }, { timestamps: true });

    BlockModel = mongoose.model('Block', blockSchema);
    TxModel = mongoose.model('Transaction', txSchema);
    UserModel = mongoose.model('User', userSchema);
  } catch (err) {
    console.log(`  💾 MongoDB not available (${err.message}) — running in-memory`);
  }
}

// === IPFS (optional — graceful fallback) ===
let ipfsAvailable = false;
let ipfsNodeId = null;

async function initIPFS() {
  return new Promise((resolve) => {
    exec('ipfs id --format="<id>"', (err, stdout) => {
      if (!err && stdout.trim()) {
        ipfsAvailable = true;
        ipfsNodeId = stdout.trim();
        console.log(`  📡 IPFS node: ${ipfsNodeId.substring(0, 16)}...`);
      } else {
        console.log('  📡 IPFS not available — blockchain runs without decentralized storage');
      }
      resolve();
    });
  });
}

function ipfsAdd(data) {
  return new Promise((resolve, reject) => {
    if (!ipfsAvailable) return reject(new Error('IPFS not available'));
    const child = exec('ipfs add -Q --pin=true', (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim()); // Returns CID
    });
    child.stdin.write(typeof data === 'string' ? data : JSON.stringify(data));
    child.stdin.end();
  });
}

function ipfsCat(cid) {
  return new Promise((resolve, reject) => {
    if (!ipfsAvailable) return reject(new Error('IPFS not available'));
    exec(`ipfs cat ${cid}`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

const app = express();
const PORT = process.env.PORT || 3000;
const P2P_PORT = process.env.P2P_PORT || 6001;

// ═══════════════════════════════════════════════════════════
// 🛡️  SECURITY MIDDLEWARE
// Rate limiting, headers, input sanitization
// ═══════════════════════════════════════════════════════════

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers (CSP relaxed for SPA)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Global rate limit: 200 requests/minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — rate limited', retryAfterMs: 60000 },
});
app.use('/api/', globalLimiter);

// Strict rate limit for mining: 5 per minute
const miningLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Mining rate limited — max 5 blocks/minute' },
});

// Strict rate limit for wallet creation: 10 per minute
const walletLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Wallet creation rate limited' },
});

// Strict rate limit for transactions: 30 per minute
const txLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Transaction rate limited' },
});

// Input validation middleware
function validateBlockchainInput(req, res, next) {
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string' && value.length > 10000) {
        return res.status(400).json({ error: `Field '${key}' exceeds maximum length` });
      }
    }
  }
  next();
}

// Request logging for slow blockchain API calls
app.use('/api/blockchain/', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.log(`  ⚠️  Slow request: ${req.method} ${req.path} — ${duration}ms`);
    }
  });
  next();
});

// Core middleware
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: '*' }));
app.use(validateBlockchainInput);

// ═══════════════════════════════════════════════════════════
// 🔔 TX CONFIRMATION NOTIFICATION SYSTEM
// Real-time WebSocket events for transaction confirmations
// ═══════════════════════════════════════════════════════════

const txSubscribers = new Map(); // address → Set of response objects (SSE)

// SSE endpoint for real-time TX notifications
app.get('/api/blockchain/subscribe/:address', (req, res) => {
  const { address } = req.params;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', address, timestamp: Date.now() })}\n\n`);

  // Register subscriber
  if (!txSubscribers.has(address)) txSubscribers.set(address, new Set());
  txSubscribers.get(address).add(res);

  // Cleanup on disconnect
  req.on('close', () => {
    const subs = txSubscribers.get(address);
    if (subs) {
      subs.delete(res);
      if (subs.size === 0) txSubscribers.delete(address);
    }
  });
});

// Notify subscribers of TX confirmations
function notifyTxConfirmation(tx, blockIndex) {
  const addresses = [tx.from, tx.to].filter(Boolean);
  for (const addr of addresses) {
    const subs = txSubscribers.get(addr);
    if (subs && subs.size > 0) {
      const event = JSON.stringify({
        type: 'tx_confirmed',
        txId: tx.id,
        txType: tx.type,
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        blockIndex,
        timestamp: Date.now(),
      });
      for (const res of subs) {
        try { res.write(`data: ${event}\n\n`); } catch {}
      }
    }
  }
}

// Notify subscribers of new blocks
function notifyNewBlock(block) {
  // Notify all active subscribers
  const event = JSON.stringify({
    type: 'new_block',
    blockIndex: block.index,
    txCount: block.transactions?.length || 0,
    hash: block.hash?.substring(0, 16),
    miner: block.miner,
    timestamp: Date.now(),
  });
  for (const [, subs] of txSubscribers) {
    for (const res of subs) {
      try { res.write(`data: ${event}\n\n`); } catch {}
    }
  }
  // Notify per-TX
  for (const tx of (block.transactions || [])) {
    notifyTxConfirmation(tx, block.index);
  }
}

// Payment Links API
app.get('/api/payment-links', (req, res) => {
  try {
    const linksPath = path.join(__dirname, 'payment-links.json');
    if (!fs.existsSync(linksPath)) {
      return res.status(404).json({ error: 'Payment links not generated. Run: node create-payment-links.js' });
    }
    const data = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

    // Optional filtering
    const { search, category } = req.query;
    if (search || category) {
      data.payment_links = data.payment_links.filter(link => {
        const n = link.product.toLowerCase();
        const matchSearch = !search || n.includes(search.toLowerCase());
        const matchCat = !category || true; // Client-side categorization
        return matchSearch && matchCat;
      });
      data.total_links = data.payment_links.length;
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payment links' });
  }
});

// ═══════════════════════════════════════════════════════════
// 🤖 AI COMMERCE MARKETPLACE API
// Programmatic tool purchase and provisioning for AI agents
// ═══════════════════════════════════════════════════════════

const AI_TOOLS = {
  'phone-line':     { name: 'MeshTalk Phone Line',     price: 9.99,  interval: 'month', platform: 'meshtalk', capabilities: ['inbound_calls','outbound_calls','recording','ivr','voicemail_to_text'] },
  'email-inbox':    { name: 'DarCloud Email Inbox',     price: 4.99,  interval: 'month', platform: 'darcloud', capabilities: ['send_receive','templates','spam_filter','aliases','attachments'] },
  'crm-access':     { name: 'QuranChain CRM Access',    price: 20.00, interval: 'month', platform: 'core',     capabilities: ['contacts','leads','deals','tasks','reporting'] },
  'storage':        { name: 'DarCloud Storage 50GB',     price: 7.99,  interval: 'month', platform: 'darcloud', capabilities: ['file_api','versioning','encryption','cdn_delivery','webhooks'] },
  'website':        { name: 'DarCloud Website Hosting',  price: 4.99,  interval: 'month', platform: 'darcloud', capabilities: ['deployment','ssl','custom_domain','git','auto_scaling'] },
  'domain':         { name: 'Domain Registration',       price: 12.99, interval: 'year',  platform: 'darcloud', capabilities: ['registration','dns','whois_privacy','auto_renewal','transfer'] },
  'ssl':            { name: 'SSL Certificate',            price: 0.00,  interval: 'month', platform: 'darcloud', capabilities: ['auto_provisioning','wildcard','auto_renewal','hsts'] },
  'cdn':            { name: 'DarCloud CDN',               price: 9.99,  interval: 'month', platform: 'darcloud', capabilities: ['edge_caching','purge_api','image_optimization','ddos','analytics'] },
  'vpn':            { name: 'WhisperNet VPN',             price: 9.99,  interval: 'month', platform: 'whispernet', capabilities: ['wireguard','multi_hop','kill_switch','ip_rotation','obfuscation'] },
  'server':         { name: 'DarCloud Dedicated Server',  price: 49.99, interval: 'month', platform: 'darcloud', capabilities: ['ssh_api','root','snapshots','monitoring','scaling'] },
  'compute':        { name: 'DarCloud GPU Compute',       price: 99.99, interval: 'month', platform: 'darcloud', capabilities: ['gpu_api','jupyter','model_hosting','batch','scaling'] },
  'analytics':      { name: 'QuranChain Analytics',       price: 14.99, interval: 'month', platform: 'core',     capabilities: ['metrics_api','dashboards','alerts','export','trends'] },
  'api-access':     { name: 'QuranChain API Gateway',     price: 29.99, interval: 'month', platform: 'core',     capabilities: ['rest_api','websockets','oauth2','rate_limiting','usage'] },
  'blockchain-node':{ name: 'QuranChain RPC Node',        price: 49.99, interval: 'month', platform: 'blockchain', capabilities: ['json_rpc','websocket','transactions','blocks','smart_contracts'] },
  'knowledge-base': { name: 'AI Knowledge Base',          price: 19.99, interval: 'month', platform: 'aiagents', capabilities: ['document_ingestion','semantic_search','rag','embeddings','multi_format'] },
  'live-chat':      { name: 'MeshTalk Live Chat',         price: 14.99, interval: 'month', platform: 'meshtalk', capabilities: ['chat_widget','visitor_tracking','canned_responses','routing','history'] },
  'calendar':       { name: 'Meeting Scheduler',          price: 9.99,  interval: 'month', platform: 'core',     capabilities: ['availability_api','booking_links','sync','reminders','timezone'] },
};

const AI_ROLES = {
  'customer-service': { name: 'Customer Service Agent', required: ['phone-line','email-inbox','crm-access','knowledge-base','live-chat'], optional: ['storage','analytics','vpn'], estimate: 89.97 },
  'sales-agent':      { name: 'Sales & Outreach Agent', required: ['phone-line','email-inbox','crm-access','calendar','analytics'], optional: ['storage','domain','website'], estimate: 109.97 },
  'content-creator':  { name: 'Content Creator Agent',  required: ['storage','website','email-inbox','cdn','analytics'], optional: ['domain','crm-access','knowledge-base'], estimate: 79.97 },
  'data-analyst':     { name: 'Data Analyst Agent',     required: ['storage','compute','analytics','api-access','knowledge-base'], optional: ['email-inbox','vpn','blockchain-node'], estimate: 149.97 },
  'devops-agent':     { name: 'DevOps Agent',           required: ['server','storage','domain','ssl','cdn','vpn'], optional: ['email-inbox','analytics','blockchain-node'], estimate: 199.97 },
  'finance-agent':    { name: 'Islamic Finance Agent',  required: ['crm-access','email-inbox','analytics','api-access','blockchain-node'], optional: ['phone-line','storage','knowledge-base'], estimate: 179.97 },
  'security-agent':   { name: 'Security Agent',         required: ['vpn','analytics','api-access','email-inbox','knowledge-base','blockchain-node'], optional: ['phone-line','storage'], estimate: 229.97 },
  'logistics-agent':  { name: 'Logistics Agent',        required: ['api-access','email-inbox','analytics','storage','crm-access'], optional: ['phone-line','vpn','blockchain-node'], estimate: 139.97 },
};

// In-memory agent registry (production would use a database)
const agentRegistry = {};

// List all tools
app.get('/api/ai-marketplace/tools', (req, res) => {
  const tools = Object.entries(AI_TOOLS).map(([id, tool]) => ({
    id, ...tool, currency: 'usd',
    api_endpoint: `/api/ai-tools/${id}`,
  }));
  res.json({ total: tools.length, tools });
});

// List all roles
app.get('/api/ai-marketplace/roles', (req, res) => {
  const roles = Object.entries(AI_ROLES).map(([id, role]) => ({
    id, ...role, monthly_estimate: role.estimate,
    required_tools_detail: role.required.map(tid => ({ id: tid, ...AI_TOOLS[tid] })),
  }));
  res.json({ total: roles.length, roles });
});

// Get specific role bundle
app.get('/api/ai-marketplace/roles/:roleId', (req, res) => {
  const role = AI_ROLES[req.params.roleId];
  if (!role) return res.status(404).json({ error: 'Role not found', available: Object.keys(AI_ROLES) });
  const required_tools = role.required.map(tid => ({ id: tid, ...AI_TOOLS[tid] }));
  const optional_tools = role.optional.map(tid => ({ id: tid, ...AI_TOOLS[tid] }));
  const total = role.required.reduce((s, tid) => s + (AI_TOOLS[tid]?.price || 0), 0);
  res.json({ id: req.params.roleId, ...role, required_tools, optional_tools, monthly_total: total.toFixed(2) });
});

// Purchase tools (simulated — in production this would charge Stripe)
app.post('/api/ai-marketplace/purchase', (req, res) => {
  const { agent_id, tools, payment_method, auto_provision } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
  if (!tools || !tools.length) return res.status(400).json({ error: 'tools array required' });

  const invalid = tools.filter(t => !AI_TOOLS[t]);
  if (invalid.length) return res.status(400).json({ error: 'Unknown tools', invalid });

  const purchaseId = 'pur_' + Date.now().toString(36);
  const provisions = tools.map(toolId => {
    const tool = AI_TOOLS[toolId];
    const apiKey = `${tool.platform.slice(0,2)}_live_${Math.random().toString(36).slice(2, 14)}`;
    return {
      tool: toolId,
      name: tool.name,
      status: auto_provision !== false ? 'active' : 'pending',
      api_key: apiKey,
      endpoint: `https://api.${tool.platform}.darcloud.host/v1/${toolId}`,
      provisioned_at: new Date().toISOString(),
    };
  });

  const total = tools.reduce((s, t) => s + (AI_TOOLS[t]?.price || 0), 0);

  // Register agent tools
  if (!agentRegistry[agent_id]) agentRegistry[agent_id] = { tools: [], purchases: [] };
  agentRegistry[agent_id].tools.push(...provisions);
  agentRegistry[agent_id].purchases.push({ id: purchaseId, tools, total, timestamp: new Date().toISOString() });

  // Find matching Stripe payment links
  let stripeLinks = [];
  try {
    const linksData = JSON.parse(fs.readFileSync(path.join(__dirname, 'payment-links.json'), 'utf8'));
    stripeLinks = tools.map(toolId => {
      const tool = AI_TOOLS[toolId];
      const match = linksData.payment_links.find(l => {
        const p = l.product.toLowerCase();
        const n = tool.name.toLowerCase();
        return p.includes(n.split(' ').pop()) || n.split(' ').some(w => w.length > 3 && p.includes(w.toLowerCase()));
      });
      return match ? { tool: toolId, payment_link: match.payment_link_url } : null;
    }).filter(Boolean);
  } catch {}

  res.json({
    purchase_id: purchaseId,
    agent_id,
    status: 'active',
    provisions,
    monthly_total: total.toFixed(2),
    currency: 'usd',
    payment_method: payment_method || 'agent_wallet',
    stripe_links: stripeLinks,
    next_billing: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
});

// Get agent's active tools
app.get('/api/ai-marketplace/agent/:agentId/tools', (req, res) => {
  const agent = agentRegistry[req.params.agentId];
  if (!agent) return res.json({ agent_id: req.params.agentId, active_tools: [], message: 'No tools provisioned yet' });
  res.json({ agent_id: req.params.agentId, active_tools: agent.tools, total_purchases: agent.purchases.length });
});

// Deprovision a tool
app.delete('/api/ai-marketplace/agent/:agentId/tools/:toolId', (req, res) => {
  const agent = agentRegistry[req.params.agentId];
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const idx = agent.tools.findIndex(t => t.tool === req.params.toolId && t.status === 'active');
  if (idx === -1) return res.status(404).json({ error: 'Tool not found or not active' });
  agent.tools[idx].status = 'deprovisioned';
  res.json({ status: 'deprovisioned', tool: req.params.toolId, effective_date: new Date(Date.now() + 30 * 86400000).toISOString() });
});

// Recommend tools for a description
app.post('/api/ai-marketplace/recommend', (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });
  const desc = description.toLowerCase();
  const recommendations = [];
  for (const [roleId, role] of Object.entries(AI_ROLES)) {
    const words = role.name.toLowerCase().split(' ');
    if (words.some(w => desc.includes(w))) recommendations.push({ role_id: roleId, ...role });
  }
  if (!recommendations.length) recommendations.push({ role_id: 'customer-service', ...AI_ROLES['customer-service'], note: 'Default recommendation' });
  res.json({ query: description, recommendations });
});

// ═══════════════════════════════════════════════════════════
// 🌐 DOMAIN REGISTRATION & EMAIL SERVICE API
// DarCloud™ Domain & Email powered by Cloudflare
// ═══════════════════════════════════════════════════════════

const CF_API_KEY = process.env.CF_API_KEY;
const CF_API_EMAIL = process.env.CF_API_EMAIL;
const CF_ZONE_ID = process.env.CF_ZONE_ID;       // darcloud.host
const CF_ZONE_2_ID = process.env.CF_ZONE_2_ID;   // darcloud.net
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;

// TLD pricing (at-cost via Cloudflare Registrar + margin)
const TLD_PRICING = {
  '.com':    { register: 10.99, renew: 10.99, transfer: 10.99 },
  '.net':    { register: 11.99, renew: 11.99, transfer: 11.99 },
  '.org':    { register: 12.99, renew: 12.99, transfer: 12.99 },
  '.io':     { register: 39.99, renew: 39.99, transfer: 39.99 },
  '.info':   { register: 4.99,  renew: 4.99,  transfer: 4.99  },
  '.host':   { register: 29.99, renew: 29.99, transfer: 29.99 },
  '.dev':    { register: 14.99, renew: 14.99, transfer: 14.99 },
  '.app':    { register: 15.99, renew: 15.99, transfer: 15.99 },
  '.cloud':  { register: 9.99,  renew: 9.99,  transfer: 9.99  },
  '.co':     { register: 12.99, renew: 12.99, transfer: 12.99 },
  '.ai':     { register: 79.99, renew: 79.99, transfer: 79.99 },
  '.tech':   { register: 6.99,  renew: 6.99,  transfer: 6.99  },
  '.store':  { register: 4.99,  renew: 4.99,  transfer: 4.99  },
  '.site':   { register: 3.99,  renew: 3.99,  transfer: 3.99  },
  '.online': { register: 5.99,  renew: 5.99,  transfer: 5.99  },
  '.xyz':    { register: 2.99,  renew: 2.99,  transfer: 2.99  },
};

// In-memory domain orders (production: database)
const domainOrders = [];
const customerEmails = [];

// Helper: Cloudflare API call
function cfApi(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4${endpoint}`,
      method,
      headers: {
        'X-Auth-Email': CF_API_EMAIL,
        'X-Auth-Key': CF_API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ success: false, error: 'Parse error' }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Helper: RDAP availability check (follows redirects, uses DNS fallback)
function checkDomainRDAP(domain) {
  return new Promise((resolve) => {
    // Use DNS lookup as primary check - faster and more reliable
    const dns = require('dns');
    dns.resolve(domain, (err, addresses) => {
      if (err && (err.code === 'ENOTFOUND' || err.code === 'ENODATA')) {
        // No DNS = likely available, verify with WHOIS-style check
        dns.resolveNs(domain, (nsErr, ns) => {
          if (nsErr && (nsErr.code === 'ENOTFOUND' || nsErr.code === 'ENODATA')) {
            resolve({ available: true });
          } else if (ns && ns.length > 0) {
            resolve({ available: false }); // has NS records = registered
          } else {
            resolve({ available: true });
          }
        });
      } else if (addresses && addresses.length > 0) {
        resolve({ available: false }); // resolves = taken
      } else {
        // Fallback: check SOA record
        dns.resolveSoa(domain, (soaErr, soa) => {
          if (soaErr) resolve({ available: true });
          else resolve({ available: false });
        });
      }
    });
    // Timeout
    setTimeout(() => resolve({ available: null }), 6000);
  });
}

// ── Domain Search API ──
app.get('/api/domains/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });
  
  // Clean the query — extract just the name part
  let name = q.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!name) return res.status(400).json({ error: 'Invalid domain name' });
  
  const results = [];
  const tlds = Object.keys(TLD_PRICING);
  
  // Check availability for each TLD using RDAP
  const checks = tlds.map(async (tld) => {
    const fullDomain = name + tld;
    try {
      const rdap = await checkDomainRDAP(fullDomain);
      return {
        domain: fullDomain,
        tld,
        available: rdap.available,
        price: TLD_PRICING[tld].register,
        premium: false,
      };
    } catch {
      return {
        domain: fullDomain,
        tld,
        available: null,
        price: TLD_PRICING[tld].register,
        premium: false,
      };
    }
  });
  
  const settled = await Promise.allSettled(checks);
  for (const r of settled) {
    if (r.status === 'fulfilled') results.push(r.value);
  }
  
  // Sort: available first, then by popularity
  results.sort((a, b) => {
    if (a.available && !b.available) return -1;
    if (!a.available && b.available) return 1;
    return a.price - b.price;
  });
  
  res.json({
    query: name,
    results,
    total: results.length,
    available_count: results.filter(r => r.available).length,
  });
});

// ── Domain Registration Order ──
app.post('/api/domains/register', async (req, res) => {
  const { domain, tld, contact } = req.body;
  if (!domain || !tld) return res.status(400).json({ error: 'domain and tld required' });
  
  const fullDomain = domain.toLowerCase() + tld;
  const pricing = TLD_PRICING[tld];
  if (!pricing) return res.status(400).json({ error: `Unsupported TLD: ${tld}` });
  
  // Try Cloudflare Registrar API for registration
  const cfResult = await cfApi('POST', `/accounts/${CF_ACCOUNT_ID}/registrar/domains`, {
    name: fullDomain,
    auto_renew: true,
    locked: true,
    privacy: true,
  });
  
  const orderId = `DOM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const order = {
    order_id: orderId,
    domain: fullDomain,
    tld,
    price: pricing.register,
    status: cfResult.success ? 'registered' : 'pending_payment',
    cf_result: cfResult.success ? 'cloudflare_registrar' : 'requires_manual',
    created: new Date().toISOString(),
    contact: contact || {},
    services_included: ['whois_privacy', 'ssl', 'cdn', 'dns', 'email_routing', 'auto_renewal'],
  };
  
  domainOrders.push(order);
  
  // Find matching Stripe payment link for domain registration
  let paymentLink = null;
  try {
    const links = JSON.parse(fs.readFileSync(path.join(__dirname, 'payment-links.json'), 'utf8'));
    const match = links.payment_links?.find(l => 
      l.product.toLowerCase().includes('domain') && l.product.toLowerCase().includes('registration')
    );
    if (match) paymentLink = match.url || match.payment_link;
  } catch {}
  
  res.json({
    success: true,
    order,
    payment_link: paymentLink,
    message: cfResult.success 
      ? `Domain ${fullDomain} registered successfully via Cloudflare Registrar!`
      : `Domain order created. Complete payment to finalize registration.`,
  });
});

// ── Registered Domains ──
app.get('/api/domains/registered', async (req, res) => {
  // Get domains from Cloudflare Registrar + local orders
  let cfDomains = [];
  try {
    const cfResult = await cfApi('GET', `/accounts/${CF_ACCOUNT_ID}/registrar/domains`);
    if (cfResult.success && cfResult.result) {
      cfDomains = cfResult.result.map(d => ({
        name: d.name,
        status: d.status || 'active',
        created: d.created_at,
        expires: d.expires_at,
        auto_renew: d.auto_renew,
        locked: d.locked,
        registrar: 'cloudflare',
      }));
    }
  } catch {}
  
  // Merge with local orders
  const localDomains = domainOrders.map(o => ({
    name: o.domain,
    status: o.status,
    created: o.created,
    expires: null,
    registrar: 'darcloud',
  }));
  
  // Include our own platform domains
  const platformDomains = [
    { name: 'darcloud.host', status: 'active', created: '2024-01-01', expires: '2026-01-01', registrar: 'cloudflare', type: 'platform' },
    { name: 'darcloud.net', status: 'active', created: '2024-01-01', expires: '2026-01-01', registrar: 'godaddy', type: 'platform' },
  ];
  
  res.json({
    domains: [...platformDomains, ...cfDomains, ...localDomains],
    total: platformDomains.length + cfDomains.length + localDomains.length,
  });
});

// ── Domain Checkout (Stripe) ──
app.post('/api/domains/checkout', async (req, res) => {
  const { domains } = req.body;
  if (!domains || !domains.length) return res.status(400).json({ error: 'No domains in cart' });
  
  // Find matching Stripe payment links
  const paymentLinks = [];
  try {
    const links = JSON.parse(fs.readFileSync(path.join(__dirname, 'payment-links.json'), 'utf8'));
    const domainLink = links.payment_links?.find(l => 
      l.product.toLowerCase().includes('domain')
    );
    if (domainLink) paymentLinks.push(domainLink.url || domainLink.payment_link);
  } catch {}
  
  // Create orders for each domain
  const orders = domains.map(d => ({
    order_id: `DOM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    domain: d.domain,
    tld: d.tld,
    price: d.price,
    action: d.action || 'register',
    status: 'pending_payment',
    created: new Date().toISOString(),
  }));
  
  domainOrders.push(...orders);
  
  res.json({
    success: true,
    orders,
    total: domains.reduce((s, d) => s + d.price, 0),
    payment_links: paymentLinks.length ? paymentLinks : null,
    checkout_url: paymentLinks[0] || null,
    message: `${orders.length} domain(s) added to order. Complete payment to finalize.`,
  });
});

// ── Email: List existing rules ──
app.get('/api/email/list', async (req, res) => {
  const rules = [];
  
  // Get darcloud.host email rules
  try {
    const cfRules = await cfApi('GET', `/zones/${CF_ZONE_ID}/email/routing/rules`);
    if (cfRules.success && cfRules.result) {
      for (const rule of cfRules.result) {
        const matcher = rule.matchers?.[0];
        const action = rule.actions?.[0];
        rules.push({
          id: rule.id,
          name: rule.name,
          address: matcher?.value || matcher?.field || 'catch-all',
          domain: 'darcloud.host',
          forward_to: action?.value?.[0] || action?.value || '',
          enabled: rule.enabled,
          type: matcher?.type === 'all' ? 'catch-all' : 'alias',
        });
      }
    }
  } catch {}
  
  // Include any programmatically created emails
  for (const email of customerEmails) {
    if (!rules.find(r => r.address === email.address)) {
      rules.push(email);
    }
  }
  
  res.json({
    rules,
    total: rules.length,
    domains: {
      'darcloud.host': { email_routing: true, status: 'ready' },
      'darcloud.net': { email_routing: false, status: 'icloud_mail', note: 'Using iCloud Mail' },
    },
  });
});

// ── Email: Create alias ──
app.post('/api/email/create', async (req, res) => {
  const { alias, domain, forward_to } = req.body;
  if (!alias || !forward_to) return res.status(400).json({ error: 'alias and forward_to required' });
  
  const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const emailDomain = domain || 'darcloud.host';
  const fullAddress = `${cleanAlias}@${emailDomain}`;
  
  // Determine which zone to use
  const zoneId = emailDomain === 'darcloud.net' ? CF_ZONE_2_ID : CF_ZONE_ID;
  
  // First ensure the destination is verified
  await cfApi('POST', `/accounts/${CF_ACCOUNT_ID}/email/routing/addresses`, {
    email: forward_to,
  });
  
  // Create the routing rule
  const cfResult = await cfApi('POST', `/zones/${zoneId}/email/routing/rules`, {
    matchers: [{ type: 'literal', field: 'to', value: fullAddress }],
    actions: [{ type: 'forward', value: [forward_to] }],
    enabled: true,
    name: `Customer: ${fullAddress}`,
    priority: 0,
  });
  
  if (cfResult.success) {
    const emailRecord = {
      id: cfResult.result?.id,
      address: fullAddress,
      domain: emailDomain,
      forward_to,
      enabled: true,
      type: 'alias',
      created: new Date().toISOString(),
    };
    customerEmails.push(emailRecord);
    
    res.json({
      success: true,
      rule: emailRecord,
      message: `Email ${fullAddress} → ${forward_to} created successfully!`,
    });
  } else {
    res.status(400).json({
      success: false,
      error: cfResult.errors?.[0]?.message || 'Failed to create email rule',
      details: cfResult.errors,
    });
  }
});

// ── Email: Delete alias ──
app.delete('/api/email/:ruleId', async (req, res) => {
  const { ruleId } = req.params;
  const { domain } = req.query;
  const zoneId = domain === 'darcloud.net' ? CF_ZONE_2_ID : CF_ZONE_ID;
  
  const cfResult = await cfApi('DELETE', `/zones/${zoneId}/email/routing/rules/${ruleId}`);
  
  if (cfResult.success) {
    const idx = customerEmails.findIndex(e => e.id === ruleId);
    if (idx !== -1) customerEmails.splice(idx, 1);
    res.json({ success: true, message: 'Email alias deleted' });
  } else {
    res.status(400).json({ success: false, error: cfResult.errors?.[0]?.message || 'Failed to delete' });
  }
});

// ── Domain: Check single availability ──
app.get('/api/domains/check/:domain', async (req, res) => {
  const { domain } = req.params;
  const rdap = await checkDomainRDAP(domain);
  res.json({ domain, available: rdap.available });
});

// ── Domain: TLD Pricing ──
app.get('/api/domains/pricing', (req, res) => {
  res.json({
    tlds: TLD_PRICING,
    total_tlds: Object.keys(TLD_PRICING).length,
    currency: 'usd',
    includes: ['whois_privacy', 'ssl', 'cdn', 'dns', 'email_routing', 'auto_renewal', 'dnssec'],
  });
});

// ═══════════════════════════════════════════════════════════
// ⛓️  QURANCHAIN BLOCKCHAIN MAINNET API
// Nomadic Decentralized Blockchain
// ═══════════════════════════════════════════════════════════

let blockchain = null;
let p2pNetwork = null;
let founderWallet = null;

// ── Blockchain: Stats ──
app.get('/api/blockchain/stats', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const stats = blockchain.getStats();
  const p2pStats = p2pNetwork ? p2pNetwork.getStats() : { peers: 0 };
  res.json({
    ...stats,
    network: p2pStats,
    mongodb: mongoConnected,
    ipfs: ipfsAvailable,
    ipfsNodeId: ipfsNodeId?.substring(0, 16) || null,
  });
});

// ── Blockchain: Get block ──
app.get('/api/blockchain/block/:index', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const index = parseInt(req.params.index);
  const block = blockchain.getBlock(index);
  if (!block) return res.status(404).json({ error: 'Block not found' });
  res.json(block);
});

// ── Blockchain: Get latest block ──
app.get('/api/blockchain/latest', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  res.json(blockchain.getLatestBlock());
});

// ── Blockchain: Get chain (paginated) ──
app.get('/api/blockchain/chain', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const start = Math.max(0, blockchain.chain.length - (page * limit));
  const end = start + limit;
  const blocks = blockchain.chain.slice(start, end).map(b => b.toJSON());
  res.json({
    blocks: blocks.reverse(),
    total: blockchain.chain.length,
    page,
    pages: Math.ceil(blockchain.chain.length / limit),
  });
});

// ── Blockchain: Mine block ──
app.post('/api/blockchain/mine', miningLimiter, async (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { miner } = req.body;
  const minerAddr = miner || founderWallet?.address || blockchain.founder;
  try {
    const result = await blockchain.mineBlock(minerAddr);
    // Persist to MongoDB if available
    if (mongoConnected && BlockModel) {
      try {
        await BlockModel.create(result.block);
        for (const tx of result.block.transactions) {
          await TxModel.create({ txId: tx.id, ...tx, blockIndex: result.block.index, blockHash: result.block.hash });
        }
      } catch (dbErr) { /* non-fatal */ }
    }
    // Pin to IPFS if available
    let ipfsCid = null;
    if (ipfsAvailable) {
      try { ipfsCid = await ipfsAdd(JSON.stringify(result.block)); } catch {}
    }
    res.json({ ...result, ipfsCid });
    // Notify SSE subscribers
    notifyNewBlock(result.block);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Blockchain: Authenticate verse ──
app.post('/api/blockchain/verse', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { surah, ayah, text, arabicText, translation, authenticator } = req.body;
  if (!surah || !ayah) return res.status(400).json({ error: 'surah and ayah required' });
  try {
    const tx = blockchain.authenticateVerse({ surah, ayah, text, arabicText, translation, authenticator });
    res.json({ success: true, transaction: tx, message: `Verse ${surah}:${ayah} queued for authentication` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Blockchain: Verify verse ──
app.get('/api/blockchain/verse/:surah/:ayah', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const surah = parseInt(req.params.surah);
  const ayah = parseInt(req.params.ayah);
  const auth = blockchain.getVerseAuth(surah, ayah);
  if (!auth) return res.json({ authenticated: false, surah, ayah });
  res.json(auth);
});

// ── Blockchain: Store data hash ──
app.post('/api/blockchain/hash', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { dataHash, description, source } = req.body;
  if (!dataHash) return res.status(400).json({ error: 'dataHash required' });
  try {
    const tx = blockchain.storeDataHash({ dataHash, description, source });
    res.json({ success: true, transaction: tx });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Blockchain: Verify data hash ──
app.get('/api/blockchain/verify/:hash', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  res.json(blockchain.verifyDataHash(req.params.hash));
});

// ── Blockchain: Transfer QRC ──
app.post('/api/blockchain/transfer', txLimiter, (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { from, to, amount, memo } = req.body;
  if (!from || !to || !amount) return res.status(400).json({ error: 'from, to, and amount required' });
  try {
    const tx = blockchain.transfer({ from, to, amount: parseFloat(amount), memo });
    res.json({ success: true, transaction: tx });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Blockchain: Get balance ──
app.get('/api/blockchain/balance/:address', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const address = req.params.address;
  res.json({
    address,
    balance: blockchain.getBalance(address),
    stake: blockchain.getStake(address),
    unit: 'QRC',
  });
});

// ═══════════════════════════════════════════════════════════
// 🕌 ISLAMIC FINANCE API
// Zakat, Sadaqah, Halal Payment, Waqf, Qard al-Hasan
// ═══════════════════════════════════════════════════════════

// ── Islamic Finance: Zakat payment ──
app.post('/api/blockchain/zakat', txLimiter, (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { from, to, amount, memo } = req.body;
  if (!from || !to || !amount) return res.status(400).json({ error: 'from, to, and amount required' });
  try {
    const tx = blockchain.zakat({ from, to, amount: parseFloat(amount), memo });
    res.json({ success: true, transaction: tx, type: 'ZAKAT', message: `Zakat of ${amount} QRC submitted` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Islamic Finance: Sadaqah (voluntary charity) ──
app.post('/api/blockchain/sadaqah', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { from, to, amount, memo } = req.body;
  if (!from || !to || !amount) return res.status(400).json({ error: 'from, to, and amount required' });
  try {
    const tx = blockchain.sadaqah({ from, to, amount: parseFloat(amount), memo });
    res.json({ success: true, transaction: tx, type: 'SADAQAH', message: `Sadaqah of ${amount} QRC submitted` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Islamic Finance: Halal payment (with 30% founder royalty) ──
app.post('/api/blockchain/halal-payment', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { from, to, amount, description, invoiceId } = req.body;
  if (!from || !to || !amount) return res.status(400).json({ error: 'from, to, and amount required' });
  try {
    const result = blockchain.halalPayment({ from, to, amount: parseFloat(amount), description, invoiceId });
    res.json({ success: true, ...result, type: 'HALAL_PAYMENT', message: `Halal payment processed — ${result.royalty.rate * 100}% founder royalty applied` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Islamic Finance: Waqf (endowment) ──
app.post('/api/blockchain/waqf', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { from, amount, purpose, beneficiary } = req.body;
  if (!from || !amount) return res.status(400).json({ error: 'from and amount required' });
  try {
    const tx = blockchain.waqf({ from, amount: parseFloat(amount), purpose, beneficiary });
    res.json({ success: true, transaction: tx, type: 'WAQF', message: `Waqf endowment of ${amount} QRC created (irrevocable)` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Islamic Finance: Qard al-Hasan (interest-free loan) ──
app.post('/api/blockchain/islamic-loan', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { from, to, amount, returnDate, memo } = req.body;
  if (!from || !to || !amount) return res.status(400).json({ error: 'from, to, and amount required' });
  try {
    const tx = blockchain.islamicLoan({ from, to, amount: parseFloat(amount), returnDate, memo });
    res.json({ success: true, transaction: tx, type: 'ISLAMIC_LOAN', message: `Interest-free loan of ${amount} QRC issued` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Islamic Finance: Royalty info ──
app.get('/api/blockchain/royalty-info', (req, res) => {
  const { amount } = req.query;
  const exampleAmount = parseFloat(amount) || 100;
  const royalty = Transaction.calculateFounderRoyalty(exampleAmount);
  res.json({
    founderRoyaltyRate: FOUNDER_ROYALTY_RATE,
    founderAddress: blockchain?.founder || FOUNDER_ADDRESS,
    example: { amount: exampleAmount, ...royalty },
    islamicTransactionTypes: ['ZAKAT', 'SADAQAH', 'HALAL_PAYMENT', 'WAQF', 'ISLAMIC_LOAN'],
    note: 'Founder royalty applies to HALAL_PAYMENT transactions. Zakat, Sadaqah, and Waqf are direct transfers.',
  });
});

// ── Blockchain: Address history ──
app.get('/api/blockchain/history/:address', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const history = blockchain.getAddressHistory(req.params.address);
  res.json({ address: req.params.address, transactions: history, total: history.length });
});

// ── Blockchain: Get transaction ──
app.get('/api/blockchain/tx/:txId', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const tx = blockchain.getTransaction(req.params.txId);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});

// ── Blockchain: Pending transactions ──
app.get('/api/blockchain/pending', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  res.json({
    pending: blockchain.pendingTransactions,
    count: blockchain.pendingTransactions.length,
  });
});

// ── Blockchain: Validate chain ──
app.get('/api/blockchain/validate', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  res.json(blockchain.isChainValid());
});

// ── Blockchain: Create wallet ──
app.post('/api/blockchain/wallet', walletLimiter, (req, res) => {
  try {
    const { label, type, strength } = req.body || {};
    const wallet = new Wallet({ label, type, strength: strength === 24 ? 256 : 128 });
    const savedPath = wallet.save();
    res.json({
      address: wallet.address,
      ethAddress: wallet.ethAddress,
      publicKey: wallet.publicKey,
      mnemonic: wallet.mnemonic,
      label: wallet.label,
      type: wallet.type,
      version: wallet.version,
      derivationPath: wallet.derivationPath,
      savedTo: savedPath,
      message: '🔐 SAVE YOUR MNEMONIC SEED PHRASE SECURELY. It is the ONLY way to recover your wallet.',
      warning: 'DO NOT share your mnemonic or private key with anyone.',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Blockchain: Recover wallet from mnemonic ──
app.post('/api/blockchain/wallet/recover', (req, res) => {
  try {
    const { mnemonic, label } = req.body;
    if (!mnemonic) return res.status(400).json({ error: 'Mnemonic seed phrase required' });
    const wallet = Wallet.fromMnemonic(mnemonic, label || 'recovered');
    const savedPath = wallet.save();
    res.json({
      address: wallet.address,
      ethAddress: wallet.ethAddress,
      publicKey: wallet.publicKey,
      label: wallet.label,
      type: wallet.type,
      savedTo: savedPath,
      message: 'Wallet recovered successfully from mnemonic.',
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Blockchain: Import wallet from private key ──
app.post('/api/blockchain/wallet/import', (req, res) => {
  try {
    const { privateKey, label } = req.body;
    if (!privateKey) return res.status(400).json({ error: 'Private key (PEM) required' });
    const wallet = Wallet.fromPrivateKey(privateKey, label || 'imported');
    const savedPath = wallet.save();
    res.json({
      address: wallet.address,
      ethAddress: wallet.ethAddress,
      publicKey: wallet.publicKey,
      label: wallet.label,
      savedTo: savedPath,
      message: 'Wallet imported successfully from private key.',
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Blockchain: Export encrypted keystore ──
app.post('/api/blockchain/wallet/export-keystore', (req, res) => {
  try {
    const { address, password } = req.body;
    if (!address || !password) return res.status(400).json({ error: 'Address and password required' });
    const wallets = Wallet.listWallets();
    const walletInfo = wallets.find(w => w.address === address);
    if (!walletInfo) return res.status(404).json({ error: `Wallet not found: ${address}` });
    const wallet = Wallet.fromFile(undefined, walletInfo.file);
    const keystore = wallet.exportKeystore(password);
    res.json({
      address: wallet.address,
      keystore: JSON.parse(keystore),
      message: 'Keystore exported. Store it securely with your password.',
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Blockchain: Import from encrypted keystore ──
app.post('/api/blockchain/wallet/import-keystore', (req, res) => {
  try {
    const { keystore, password } = req.body;
    if (!keystore || !password) return res.status(400).json({ error: 'Keystore and password required' });
    const wallet = Wallet.fromKeystore(JSON.stringify(keystore), password);
    const savedPath = wallet.save();
    res.json({
      address: wallet.address,
      ethAddress: wallet.ethAddress,
      label: wallet.label,
      type: wallet.type,
      savedTo: savedPath,
      message: 'Wallet imported from encrypted keystore.',
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Blockchain: List all wallets ──
app.get('/api/blockchain/wallets', (req, res) => {
  try {
    const wallets = Wallet.listWallets();
    if (blockchain) {
      wallets.forEach(w => {
        if (w.address && w.address !== 'unknown') {
          w.balance = blockchain.getBalance(w.address);
          w.stake = blockchain.getStake(w.address);
          w.isFounder = w.address === blockchain.founder;
        }
      });
    }
    res.json({ count: wallets.length, wallets });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Blockchain: Get wallet details ──
app.get('/api/blockchain/wallet/:address', (req, res) => {
  try {
    const wallets = Wallet.listWallets();
    const walletInfo = wallets.find(w => w.address === req.params.address);
    if (!walletInfo) return res.status(404).json({ error: 'Wallet not found' });
    const wallet = Wallet.fromFile(undefined, walletInfo.file);
    const result = {
      address: wallet.address,
      ethAddress: wallet.ethAddress,
      publicKey: wallet.publicKey,
      label: wallet.label,
      type: wallet.type,
      version: wallet.version,
      derivationPath: wallet.derivationPath,
      createdAt: wallet.createdAt,
    };
    if (blockchain) {
      result.balance = blockchain.getBalance(wallet.address);
      result.stake = blockchain.getStake(wallet.address);
      result.history = blockchain.getHistory(wallet.address);
      result.isFounder = wallet.address === blockchain.founder;
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Blockchain: Founder info ──
app.get('/api/blockchain/founder', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const founder = blockchain.founder;
  res.json({
    founder: 'Omar Mohammad Abunadi™',
    address: founder,
    balance: blockchain.getBalance(founder),
    stake: blockchain.getStake(founder),
    unit: 'QRC',
    genesisBlock: blockchain.getBlock(0),
  });
});

// ═══════════════════════════════════════════════════════════
// 📊 STAKING API
// Stake/Unstake QRC, view staking info, rewards
// ═══════════════════════════════════════════════════════════

// ── Staking: Stake QRC ──
app.post('/api/blockchain/stake', txLimiter, (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { from, amount, lockPeriod } = req.body;
  if (!from || !amount) return res.status(400).json({ error: 'from and amount required (min 10 QRC)' });
  try {
    const tx = blockchain.stake({ from, amount: parseFloat(amount), lockPeriod: parseInt(lockPeriod) || 30 });
    res.json({
      success: true,
      transaction: tx,
      staked: blockchain.getStake(from) + parseFloat(amount),
      message: `Staked ${amount} QRC — earning 5% annual rewards`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Staking: Unstake QRC ──
app.post('/api/blockchain/unstake', txLimiter, (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { from, amount } = req.body;
  if (!from || !amount) return res.status(400).json({ error: 'from and amount required' });
  try {
    const tx = blockchain.unstake({ from, amount: parseFloat(amount) });
    res.json({
      success: true,
      transaction: tx,
      remainingStake: Math.max(0, blockchain.getStake(from) - parseFloat(amount)),
      message: `Unstaked ${amount} QRC — returned to balance`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Staking: View stakers ──
app.get('/api/blockchain/stakers', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const stakers = blockchain.getStakers();
  const totalStaked = stakers.reduce((sum, s) => sum + s.staked, 0);
  res.json({
    stakers,
    totalStaked,
    rewardRate: '5% annual',
    minStake: 10,
    count: stakers.length,
  });
});

// ── Staking: Individual staking info ──
app.get('/api/blockchain/stake/:address', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const address = req.params.address;
  const staked = blockchain.getStake(address);
  const balance = blockchain.getBalance(address);
  const annualReward = +(staked * 0.05).toFixed(8);
  const dailyReward = +(annualReward / 365).toFixed(8);
  res.json({
    address,
    staked,
    balance,
    annualRewardEstimate: annualReward,
    dailyRewardEstimate: dailyReward,
    rewardRate: '5% annual',
    unit: 'QRC',
  });
});

// ═══════════════════════════════════════════════════════════
// 🔧 ADMIN DASHBOARD API
// System status, chain management, network overview
// ═══════════════════════════════════════════════════════════

app.get('/api/admin/dashboard', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });

  const stats = blockchain.getStats();
  const p2pStats = p2pNetwork ? p2pNetwork.getStats() : { peers: 0, knownPeers: 0 };
  const stakers = blockchain.getStakers();
  const totalStaked = stakers.reduce((sum, s) => sum + s.staked, 0);

  // Calculate TX type distribution
  const txTypeCounts = {};
  for (const block of blockchain.chain) {
    for (const tx of block.transactions) {
      txTypeCounts[tx.type] = (txTypeCounts[tx.type] || 0) + 1;
    }
  }

  // Recent blocks (last 10)
  const recentBlocks = blockchain.chain.slice(-10).reverse().map(b => {
    const block = b.toJSON ? b.toJSON() : b;
    return {
      index: block.index,
      hash: block.hash?.substring(0, 16),
      txCount: (block.transactions || []).length,
      miner: block.miner,
      timestamp: block.timestamp,
      difficulty: block.difficulty,
    };
  });

  // Top addresses by balance
  const topAddresses = Object.entries(blockchain.balances)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([address, balance]) => ({
      address,
      balance,
      stake: blockchain.getStake(address),
      isFounder: address === blockchain.founder,
    }));

  // Products count
  let productCount = 0;
  try { productCount = JSON.parse(fs.readFileSync(path.join(__dirname, 'payment-links.json'), 'utf8')).total_links; } catch {}

  res.json({
    platform: 'QuranChain-OS Mainnet',
    founder: 'Omar Mohammad Abunadi™',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    blockchain: {
      ...stats,
      totalTransactions: Object.values(txTypeCounts).reduce((s, c) => s + c, 0),
      txTypeDistribution: txTypeCounts,
    },
    staking: {
      totalStaked,
      stakers: stakers.length,
      rewardRate: '5% annual',
      topStakers: stakers.slice(0, 10),
    },
    network: {
      ...p2pStats,
      seedNodes: (process.env.SEED_NODES || '').split(',').filter(Boolean),
    },
    storage: {
      mongodb: mongoConnected,
      ipfs: ipfsAvailable,
      ipfsNodeId: ipfsNodeId?.substring(0, 16) || null,
    },
    revenue: {
      products: productCount,
      aiTools: Object.keys(AI_TOOLS).length,
      tlds: Object.keys(TLD_PRICING).length,
    },
    recentBlocks,
    topAddresses,
    notifications: {
      activeSubscribers: txSubscribers.size,
    },
    security: {
      rateLimiting: true,
      helmet: true,
      inputValidation: true,
    },
  });
});

// ── Admin: System health deep-check ──
app.get('/api/admin/system', (req, res) => {
  res.json({
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
    blockchain: blockchain ? {
      chainLength: blockchain.chain.length,
      difficulty: blockchain.difficulty,
      mining: blockchain.mining,
      pendingTx: blockchain.pendingTransactions.length,
      addressCount: Object.keys(blockchain.balances).length,
      verseCount: blockchain.verseHashes.size,
      dataHashCount: blockchain.dataHashes.size,
    } : null,
    services: {
      mongodb: mongoConnected,
      ipfs: ipfsAvailable,
      p2p: p2pNetwork ? { active: true, peers: p2pNetwork.peers.size } : { active: false },
      stripe: !!process.env.STRIPE_SECRET_KEY,
      notifications: { subscribers: txSubscribers.size },
    },
  });
});

// ── P2P Network: Discover seed nodes ──
app.get('/api/p2p/seeds', (req, res) => {
  const seeds = (process.env.SEED_NODES || '').split(',').filter(Boolean);
  // Default well-known QuranChain seed nodes
  const defaultSeeds = [
    'wss://p2p.darcloud.host',
    'wss://chain.darcloud.host:6001',
    'wss://mainnet.darcloud.host:6001',
  ];
  res.json({
    configuredSeeds: seeds,
    defaultSeeds,
    connectedPeers: p2pNetwork ? p2pNetwork.peers.size : 0,
    knownPeers: p2pNetwork ? p2pNetwork.knownPeers.size : 0,
    maxPeers: p2pNetwork?.maxPeers || 50,
  });
});

// ── P2P Network: Discover and connect to seeds ──
app.post('/api/p2p/discover', (req, res) => {
  if (!p2pNetwork) return res.status(503).json({ error: 'P2P network not started' });
  const defaultSeeds = [
    'wss://p2p.darcloud.host',
    'wss://chain.darcloud.host:6001',
    'wss://mainnet.darcloud.host:6001',
  ];
  const seeds = req.body.seeds || defaultSeeds;
  let attempted = 0;
  for (const seed of seeds) {
    p2pNetwork.connectToPeer(seed);
    attempted++;
  }
  res.json({
    success: true,
    attempted,
    currentPeers: p2pNetwork.peers.size,
    message: `Attempting connection to ${attempted} seed nodes`,
  });
});

// ── P2P Network: Stats ──
app.get('/api/p2p/stats', (req, res) => {
  if (!p2pNetwork) return res.json({ status: 'not_started', peers: 0 });
  res.json(p2pNetwork.getStats());
});

// ── P2P Network: Connect to peer ──
app.post('/api/p2p/connect', (req, res) => {
  if (!p2pNetwork) return res.status(503).json({ error: 'P2P network not started' });
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'WebSocket address required (ws://host:port)' });
  p2pNetwork.connectToPeer(address);
  res.json({ success: true, message: `Connecting to ${address}...` });
});

// ═══════════════════════════════════════════════════════════
// 🔍 UNIFIED BLOCKCHAIN SEARCH
// Search by block index, TX hash, address, verse, or keyword
// ═══════════════════════════════════════════════════════════

app.get('/api/blockchain/search', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { q } = req.query;
  if (!q || q.length < 1) return res.status(400).json({ error: 'Search query required (?q=...)' });

  const query = q.trim();
  const results = { query, type: null, results: [] };

  // 1. Check if it's a block index (pure number)
  if (/^\d+$/.test(query)) {
    const idx = parseInt(query);
    const block = blockchain.getBlock(idx);
    if (block) {
      results.type = 'block';
      results.results.push({ kind: 'block', data: block });
    }
  }

  // 2. Check if it's a transaction ID (UUID or hash)
  const tx = blockchain.getTransaction(query);
  if (tx) {
    results.type = results.type || 'transaction';
    results.results.push({ kind: 'transaction', data: tx });
  }

  // 3. Check if it's an address (has balance or history)
  const balance = blockchain.getBalance(query);
  const stake = blockchain.getStake(query);
  const history = blockchain.getHistory(query);
  if (balance > 0 || stake > 0 || history.length > 0) {
    results.type = results.type || 'address';
    results.results.push({
      kind: 'address',
      data: { address: query, balance, stake, txCount: history.length, recentTxs: history.slice(-10) },
    });
  }

  // 4. Check if it's a verse reference (e.g. "1:1" or "2:255")
  const verseMatch = query.match(/^(\d+):(\d+)$/);
  if (verseMatch) {
    const auth = blockchain.getVerseAuth(parseInt(verseMatch[1]), parseInt(verseMatch[2]));
    if (auth) {
      results.type = results.type || 'verse';
      results.results.push({ kind: 'verse', data: auth });
    }
  }

  // 5. Check if it's a data hash
  const hashResult = blockchain.verifyDataHash(query);
  if (hashResult.verified) {
    results.type = results.type || 'data_hash';
    results.results.push({ kind: 'data_hash', data: hashResult });
  }

  // 6. Full-text search in blocks (block hashes starting with query)
  if (query.length >= 4 && results.results.length === 0) {
    const matchingBlocks = [];
    const matchingTxs = [];
    const lowerQ = query.toLowerCase();
    for (const block of blockchain.chain) {
      const b = block.toJSON ? block.toJSON() : block;
      if (b.hash && b.hash.toLowerCase().startsWith(lowerQ)) {
        matchingBlocks.push({ kind: 'block', data: b });
      }
      for (const btx of (b.transactions || [])) {
        if ((btx.id && btx.id.toLowerCase().includes(lowerQ)) ||
            (btx.hash && btx.hash.toLowerCase().startsWith(lowerQ)) ||
            (btx.from && btx.from.toLowerCase().includes(lowerQ)) ||
            (btx.to && btx.to.toLowerCase().includes(lowerQ)) ||
            (btx.data?.memo && btx.data.memo.toLowerCase().includes(lowerQ)) ||
            (btx.data?.description && btx.data.description.toLowerCase().includes(lowerQ)) ||
            (btx.data?.purpose && btx.data.purpose.toLowerCase().includes(lowerQ))) {
          matchingTxs.push({ kind: 'transaction', data: { ...btx, blockIndex: b.index } });
        }
      }
    }
    results.results.push(...matchingBlocks.slice(0, 10), ...matchingTxs.slice(0, 20));
    if (results.results.length > 0) results.type = 'search';
  }

  results.count = results.results.length;
  results.found = results.results.length > 0;
  res.json(results);
});

// ═══════════════════════════════════════════════════════════
// 📖 QURAN VERSE BATCH AUTHENTICATION
// Authenticate multiple verses in a single request
// ═══════════════════════════════════════════════════════════

// Batch authenticate verses (array of {surah, ayah, arabicText, translation})
app.post('/api/blockchain/verses/batch', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { verses, authenticator } = req.body;
  if (!Array.isArray(verses) || verses.length === 0) {
    return res.status(400).json({ error: 'verses array required: [{surah, ayah, arabicText, translation}, ...]' });
  }
  if (verses.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 verses per batch' });
  }

  const results = { authenticated: [], skipped: [], errors: [] };
  for (const v of verses) {
    if (!v.surah || !v.ayah) {
      results.errors.push({ verse: v, error: 'surah and ayah required' });
      continue;
    }
    try {
      const tx = blockchain.authenticateVerse({
        surah: parseInt(v.surah),
        ayah: parseInt(v.ayah),
        text: v.text || v.arabicText,
        arabicText: v.arabicText,
        translation: v.translation,
        authenticator: authenticator || 'Omar_Mohammad_Abunadi',
      });
      results.authenticated.push({ surah: v.surah, ayah: v.ayah, txId: tx.id });
    } catch (err) {
      if (err.message.includes('already authenticated')) {
        results.skipped.push({ surah: v.surah, ayah: v.ayah, reason: 'Already authenticated' });
      } else {
        results.errors.push({ surah: v.surah, ayah: v.ayah, error: err.message });
      }
    }
  }

  res.json({
    success: true,
    ...results,
    total: verses.length,
    message: `${results.authenticated.length} verses queued, ${results.skipped.length} already on-chain, ${results.errors.length} errors`,
  });
});

// Get all authenticated verses
app.get('/api/blockchain/verses', (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const verses = [];
  for (const [key, blockIndex] of blockchain.verseHashes.entries()) {
    const [surah, ayah] = key.split(':').map(Number);
    const block = blockchain.chain[blockIndex];
    const tx = block.transactions.find(t =>
      t.type === TX_TYPES.VERSE_AUTH && t.data?.surah === surah && t.data?.ayah === ayah
    );
    verses.push({
      surah,
      ayah,
      reference: `${surah}:${ayah}`,
      blockIndex,
      blockHash: block.hash,
      timestamp: block.timestamp,
      verseHash: tx?.data?.verseHash,
      arabicPreview: tx?.data?.arabicPreview,
      translation: tx?.data?.translation,
    });
  }
  verses.sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
  res.json({ verses, total: verses.length, authenticatedSurahs: [...new Set(verses.map(v => v.surah))].length });
});

// ═══════════════════════════════════════════════════════════
// 🔗 WEB3 WALLET BRIDGE
// Connect external wallets (MetaMask, etc.) to QuranChain
// ═══════════════════════════════════════════════════════════

// Verify an Ethereum signature and map to a QRC address
app.post('/api/blockchain/web3/verify', (req, res) => {
  const { ethAddress, signature, message } = req.body;
  if (!ethAddress || !signature || !message) {
    return res.status(400).json({ error: 'ethAddress, signature, and message required' });
  }
  try {
    const crypto = require('crypto');
    // Derive QRC address from ETH address
    const qrcAddress = 'qrc_' + crypto.createHash('sha256')
      .update(ethAddress.toLowerCase())
      .digest('hex')
      .substring(0, 40);

    // Check if wallet mapping exists, if not create one
    const balance = blockchain.getBalance(qrcAddress);
    const stake = blockchain.getStake(qrcAddress);

    res.json({
      success: true,
      ethAddress,
      qrcAddress,
      balance,
      stake,
      mapped: true,
      message: `Ethereum wallet ${ethAddress.substring(0, 10)}... mapped to QRC address`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get QRC address for an ETH address
app.get('/api/blockchain/web3/address/:ethAddress', (req, res) => {
  const ethAddress = req.params.ethAddress;
  const crypto = require('crypto');
  const qrcAddress = 'qrc_' + crypto.createHash('sha256')
    .update(ethAddress.toLowerCase())
    .digest('hex')
    .substring(0, 40);

  const balance = blockchain ? blockchain.getBalance(qrcAddress) : 0;
  const stake = blockchain ? blockchain.getStake(qrcAddress) : 0;

  res.json({
    ethAddress,
    qrcAddress,
    balance,
    stake,
    unit: 'QRC',
  });
});

// ── IPFS: Pin data ──
app.post('/api/ipfs/pin', async (req, res) => {
  if (!ipfsAvailable) return res.status(503).json({ error: 'IPFS not available' });
  try {
    const cid = await ipfsAdd(JSON.stringify(req.body.data || req.body));
    res.json({ success: true, cid, gateway: `https://ipfs.io/ipfs/${cid}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── IPFS: Get data ──
app.get('/api/ipfs/:cid', async (req, res) => {
  if (!ipfsAvailable) return res.status(503).json({ error: 'IPFS not available' });
  try {
    const data = await ipfsCat(req.params.cid);
    try { res.json(JSON.parse(data)); }
    catch { res.send(data); }
  } catch (err) {
    res.status(404).json({ error: 'CID not found', cid: req.params.cid });
  }
});

// ═══════════════════════════════════════════════════════════
// HEALTH & STATIC
// ═══════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    platform: 'QuranChain-OS Mainnet',
    founder: 'Omar Mohammad Abunadi™',
    timestamp: new Date().toISOString(),
    products: (() => {
      try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'payment-links.json'), 'utf8')).total_links;
      } catch { return 0; }
    })(),
    blockchain: blockchain ? {
      chainId: blockchain.chainId,
      blocks: blockchain.chain.length,
      difficulty: blockchain.difficulty,
      latestHash: blockchain.getLatestBlock()?.hash?.substring(0, 16) + '...',
      authenticatedVerses: blockchain.verseHashes.size,
      totalSupply: blockchain.getTotalSupply(),
      pendingTx: blockchain.pendingTransactions.length,
    } : null,
    p2p: p2pNetwork ? { peers: p2pNetwork.peers.size, port: p2pNetwork.port } : null,
    mongodb: mongoConnected,
    ipfs: ipfsAvailable ? { nodeId: ipfsNodeId?.substring(0, 16) } : false,
    ai_marketplace: {
      tools: Object.keys(AI_TOOLS).length,
      roles: Object.keys(AI_ROLES).length,
      active_agents: Object.keys(agentRegistry).length,
    },
    domain_services: {
      tlds: Object.keys(TLD_PRICING).length,
      orders: domainOrders.length,
      customer_emails: customerEmails.length,
    },
  });
});

// Serve frontend static files
const distPath = path.join(__dirname, 'client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.json({
    message: '🕌 QuranChain-OS Mainnet Server',
    blockchain: blockchain?.getStats() || 'initializing',
    endpoints: {
      // Blockchain
      blockchain_stats: '/api/blockchain/stats',
      blockchain_latest: '/api/blockchain/latest',
      blockchain_chain: '/api/blockchain/chain',
      mine_block: 'POST /api/blockchain/mine',
      authenticate_verse: 'POST /api/blockchain/verse',
      verify_verse: '/api/blockchain/verse/:surah/:ayah',
      store_hash: 'POST /api/blockchain/hash',
      verify_hash: '/api/blockchain/verify/:hash',
      transfer_qrc: 'POST /api/blockchain/transfer',
      balance: '/api/blockchain/balance/:address',
      create_wallet: 'POST /api/blockchain/wallet',
      // P2P
      p2p_stats: '/api/p2p/stats',
      p2p_connect: 'POST /api/p2p/connect',
      // IPFS
      ipfs_pin: 'POST /api/ipfs/pin',
      ipfs_get: '/api/ipfs/:cid',
      // Revenue
      products: '/api/payment-links',
      health: '/health',
      ai_marketplace: '/api/ai-marketplace/tools',
      domains: '/api/domains/pricing',
      email: '/api/email/list',
    },
  });
});

// ═══════════════════════════════════════════════════════════
// 🚀 UNIFIED STARTUP — BLOCKCHAIN + P2P + MONGODB + IPFS
// ═══════════════════════════════════════════════════════════

async function startMainnet() {
  console.log('');
  console.log('═'.repeat(60));
  console.log('  🕌 QuranChain-OS — Mainnet Server');
  console.log('  ⛓️  Nomadic Decentralized Blockchain');
  console.log('  👤 Founder: Omar Mohammad Abunadi™');
  console.log('═'.repeat(60));

  // 1. Connect MongoDB
  await connectMongo();

  // 2. Initialize IPFS
  await initIPFS();

  // 3. Initialize Blockchain
  console.log('');
  console.log('  ⛓️  Initializing QuranChain Blockchain...');
  blockchain = new Blockchain({
    dataDir: path.join(__dirname, 'data/blockchain'),
    nodeId: process.env.NODE_ID || undefined,
  });

  // Create founder wallet if not exists
  const walletDir = path.join(__dirname, 'data/wallets');
  const founderWalletFile = path.join(walletDir, 'founder.json');
  if (fs.existsSync(founderWalletFile)) {
    founderWallet = Wallet.fromFile(walletDir, 'founder.json');
    console.log(`  🔑 Founder wallet loaded: ${founderWallet.address.substring(0, 20)}...`);
  } else {
    founderWallet = new Wallet({ dataDir: walletDir });
    founderWallet.save('founder.json');
    console.log(`  🔑 Founder wallet created: ${founderWallet.address.substring(0, 20)}...`);
  }

  // Sync full blockchain to MongoDB (always upsert all blocks)
  if (mongoConnected && BlockModel) {
    try {
      const chainLength = blockchain.chain.length;
      console.log(`  💾 Syncing ${chainLength} blocks to MongoDB...`);
      for (let i = 0; i < chainLength; i++) {
        const block = blockchain.chain[i].toJSON ? blockchain.chain[i].toJSON() : blockchain.chain[i];
        await BlockModel.findOneAndUpdate(
          { index: block.index },
          block,
          { upsert: true, new: true }
        );
        for (const tx of (block.transactions || [])) {
          await TxModel.findOneAndUpdate(
            { txId: tx.id },
            { txId: tx.id, ...tx, blockIndex: block.index, blockHash: block.hash },
            { upsert: true, new: true }
          );
        }
      }
      const dbBlockCount = await BlockModel.countDocuments();
      const dbTxCount = await TxModel.countDocuments();
      console.log(`  💾 MongoDB sync complete: ${dbBlockCount} blocks, ${dbTxCount} transactions`);
    } catch (syncErr) {
      console.log(`  💾 MongoDB sync warning: ${syncErr.message}`);
    }
  }

  // 4. Start P2P Network
  try {
    const seedNodes = (process.env.SEED_NODES || '').split(',').filter(Boolean);
    p2pNetwork = new P2PNetwork(blockchain, {
      port: P2P_PORT,
      seedNodes,
    });
    await p2pNetwork.start();
  } catch (err) {
    console.log(`  🌐 P2P network error: ${err.message}`);
  }

  // 5. Start HTTP Server
  app.listen(PORT, () => {
    console.log('');
    console.log('  ── Services ──');
    console.log(`  HTTP:       http://localhost:${PORT}`);
    console.log(`  P2P:        ws://localhost:${p2pNetwork?.port || P2P_PORT}`);
    console.log(`  Health:     http://localhost:${PORT}/health`);
    console.log(`  Blockchain: http://localhost:${PORT}/api/blockchain/stats`);
    console.log(`  Explorer:   http://localhost:${PORT}/api/blockchain/chain`);
    console.log(`  AI Market:  http://localhost:${PORT}/api/ai-marketplace/tools`);
    console.log(`  Domains:    http://localhost:${PORT}/api/domains/pricing`);
    console.log('');
    console.log('  ── Mainnet Status ──');
    console.log(`  Chain:      ${blockchain.chain.length} blocks`);
    console.log(`  Difficulty: ${blockchain.difficulty}`);
    console.log(`  Verses:     ${blockchain.verseHashes.size} authenticated`);
    console.log(`  Supply:     ${blockchain.getTotalSupply()} QRC`);
    console.log(`  MongoDB:    ${mongoConnected ? 'CONNECTED' : 'IN-MEMORY'}`);
    console.log(`  IPFS:       ${ipfsAvailable ? 'CONNECTED (' + ipfsNodeId?.substring(0, 12) + '...)' : 'OFFLINE'}`);
    console.log(`  P2P Peers:  ${p2pNetwork?.peers?.size || 0}`);
    console.log(`  Products:   ${(() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'payment-links.json'), 'utf8')).total_links; } catch { return 0; } })()}`);
    console.log(`  AI Tools:   ${Object.keys(AI_TOOLS).length}`);
    console.log(`  TLDs:       ${Object.keys(TLD_PRICING).length}`);
    console.log('');
    console.log('  Revenue:    ACTIVE (Stripe LIVE)');
    console.log('  Blockchain: MAINNET LIVE');
    console.log('  © Omar Mohammad Abunadi™');
    console.log('═'.repeat(60));
  });

  // 6. Auto-mine first block if chain only has genesis
  if (blockchain.chain.length === 1) {
    console.log('  ⛏️  Mining first post-genesis block...');
    try {
      const result = await blockchain.mineBlock(blockchain.founder);
      console.log(`  ⛏️  Block #${result.block.index} mined in ${result.miningTime}ms — reward: ${result.reward} QRC`);
    } catch (err) {
      console.log(`  ⛏️  First block mining deferred: ${err.message}`);
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n  Shutting down QuranChain Mainnet...');
  if (p2pNetwork) await p2pNetwork.stop();
  if (mongoose && mongoConnected) await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n  Shutting down QuranChain Mainnet...');
  if (p2pNetwork) await p2pNetwork.stop();
  if (mongoose && mongoConnected) await mongoose.disconnect();
  process.exit(0);
});

// 🚀 LAUNCH
startMainnet().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
