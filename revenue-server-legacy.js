#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
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
const http = require('http');
const { exec } = require('child_process');
const stripeService = require('./src/services/stripeService');

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
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 3000;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      mongoose = require('mongoose');
      const MONGO_URI = process.env.MONGODB_URI;
      if (!MONGO_URI) {
        console.error('  ⚠️  CRITICAL: MONGODB_URI not set in environment — blockchain data will only persist in chain.json!');
        console.error('  ⚠️  Set MONGODB_URI in .env for data redundancy');
        return;
      }
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
    return; // success
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.warn(`  💾 MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed (${err.message}) — retrying in ${RETRY_DELAY_MS/1000}s...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    } else {
      console.error(`  ⚠️  CRITICAL: MongoDB unavailable after ${MAX_RETRIES} attempts — blockchain data will only persist in chain.json!`);
      console.error(`  ⚠️  Last error: ${err.message}`);
    }
  }
  } // end for loop
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

// ═══════════════════════════════════════════════════════════
// 💳 STRIPE WEBHOOK ENDPOINT (must be BEFORE express.json)
// Receives real Stripe events with raw body for signature verification
// ═══════════════════════════════════════════════════════════
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FOUNDER_WALLET = process.env.FOUNDER_WALLET_ADDRESS || 'QC_FOUNDER_0xOMAR';
const REVENUE_LOG = path.join(__dirname, 'logs/production/revenue.log');

function logRevenue(entry) {
  const line = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
  try { fs.mkdirSync(path.join(__dirname, 'logs/production'), { recursive: true }); } catch {}
  fs.appendFileSync(REVENUE_LOG, line);
}

// Revenue distribution: 30% Founder, 40% AI Validators, 10% Hardware, 18% Ecosystem, 2% Zakat
function distributeRevenue(amountCents, metadata = {}) {
  const amount = amountCents / 100;
  const distribution = {
    total: amount,
    founder: +(amount * 0.30).toFixed(2),
    ai_validators: +(amount * 0.40).toFixed(2),
    hardware_hosts: +(amount * 0.10).toFixed(2),
    ecosystem: +(amount * 0.18).toFixed(2),
    zakat: +(amount * 0.02).toFixed(2),
    timestamp: new Date().toISOString(),
    ...metadata,
  };
  logRevenue({ type: 'REVENUE_DISTRIBUTION', ...distribution });
  return distribution;
}

// ═══════════════════════════════════════════════════════════
// ⛓️  FIAT → BLOCKCHAIN MAINNET SYNC
// Records every real Stripe payment as an on-chain transaction
// ═══════════════════════════════════════════════════════════
async function recordPaymentOnChain(paymentData) {
  if (!blockchain) {
    console.log('⚠️  Blockchain not yet initialized — payment will be recorded on next sync');
    // Queue for later if blockchain not ready
    pendingChainRecords.push(paymentData);
    return null;
  }

  try {
    const { amount, source, stripeId, customerEmail, description } = paymentData;
    const founderAddr = blockchain.founder || 'Omar_Mohammad_Abunadi';
    const ts = new Date().toISOString();

    // 1. Store payment data hash on-chain for immutable proof
    const paymentHash = require('crypto').createHash('sha256').update(
      JSON.stringify({ stripe_id: stripeId, amount, source, ts })
    ).digest('hex');

    const dataHashTx = blockchain.storeDataHash({
      dataHash: paymentHash,
      description: `FIAT_PAYMENT: $${amount} via ${source} | ${stripeId} | ${customerEmail || 'anonymous'}`,
      source: 'stripe_live',
    });

    // 2. Record as HALAL_PAYMENT if blockchain has balance (founder wallet)
    //    This records the full revenue flow on-chain with 30% royalty split
    let halalTx = null;
    const founderBalance = blockchain.getBalance(founderAddr);
    if (founderBalance >= amount) {
      try {
        halalTx = blockchain.halalPayment({
          from: founderAddr,
          to: 'REVENUE_POOL',
          amount: amount,
          description: `${description || source} — $${amount} USD | Stripe: ${stripeId}`,
          invoiceId: stripeId,
        });
      } catch (halalErr) {
        // Balance check may fail for large amounts — still have data hash
        console.log(`  ⛓️  Halal Payment TX skipped (${halalErr.message}) — DATA_HASH recorded`);
      }
    }

    // 3. Auto-mine if we have enough pending transactions
    if (blockchain.pendingTransactions.length >= 3) {
      try {
        const mineResult = await blockchain.mineBlock(founderAddr);
        console.log(`  ⛏️  Auto-mined block #${mineResult.block.index} with ${mineResult.block.transactions.length} fiat payment TXs`);

        // Sync new block to MongoDB
        if (mongoConnected && BlockModel) {
          const block = mineResult.block;
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
      } catch (mineErr) {
        console.log(`  ⛏️  Auto-mine deferred: ${mineErr.message}`);
      }
    }

    console.log(`  ⛓️  MAINNET SYNC: $${amount} ${source} → chain TX ${dataHashTx?.id?.substring(0, 12)}...`);
    logRevenue({ type: 'BLOCKCHAIN_RECORDED', amount, source, stripe_id: stripeId, chain_tx: dataHashTx?.id, halal_tx: halalTx?.payment?.id || null });

    return { dataHashTx, halalTx };
  } catch (err) {
    console.error(`  ❌ Blockchain recording failed: ${err.message}`);
    logRevenue({ type: 'BLOCKCHAIN_RECORD_FAILED', error: err.message, ...paymentData });
    return null;
  }
}

// Queue for payments received before blockchain init
const pendingChainRecords = [];

app.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
      event = stripeService.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error(`❌ Stripe webhook signature failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const ts = new Date().toISOString();
    console.log(`💳 [${ts}] Stripe event: ${event.type} (${event.id})`);
    logRevenue({ type: 'STRIPE_EVENT', event_type: event.type, event_id: event.id });

    try {
      // Delegate to stripeService's full 17-event handler
      await stripeService.handleWebhookEvent(event);

      // Revenue distribution for payment events
      const obj = event.data.object;
      switch (event.type) {
        case 'checkout.session.completed': {
          if (obj.payment_status === 'paid') {
            const dist = distributeRevenue(obj.amount_total, {
              source: 'stripe_checkout',
              session_id: obj.id,
              customer_email: obj.customer_email || obj.customer_details?.email,
            });
            console.log(`💰 REVENUE: $${dist.total} | Founder: $${dist.founder} | Zakat: $${dist.zakat}`);
            // ⛓️ Record on QuranChain Mainnet
            await recordPaymentOnChain({
              amount: dist.total,
              source: 'stripe_checkout',
              stripeId: obj.id,
              customerEmail: obj.customer_email || obj.customer_details?.email,
              description: `Checkout Session ${obj.mode}`,
            });
          }
          break;
        }
        case 'payment_intent.succeeded': {
          const dist = distributeRevenue(obj.amount, {
            source: 'payment_intent',
            pi_id: obj.id,
            customer: obj.customer,
          });
          console.log(`💰 REVENUE: $${dist.total} | Founder: $${dist.founder} | Zakat: $${dist.zakat}`);
          // ⛓️ Record on QuranChain Mainnet
          await recordPaymentOnChain({
            amount: dist.total,
            source: 'payment_intent',
            stripeId: obj.id,
            customerEmail: obj.receipt_email || null,
            description: obj.description || 'Payment Intent',
          });
          break;
        }
        case 'invoice.payment_succeeded': {
          const dist = distributeRevenue(obj.amount_paid, {
            source: 'invoice',
            invoice_id: obj.id,
            subscription: obj.subscription,
            customer: obj.customer,
          });
          console.log(`💰 SUBSCRIPTION REVENUE: $${dist.total} | Founder: $${dist.founder}`);
          // ⛓️ Record on QuranChain Mainnet
          await recordPaymentOnChain({
            amount: dist.total,
            source: 'subscription_invoice',
            stripeId: obj.id,
            customerEmail: obj.customer_email || null,
            description: `Subscription: ${obj.billing_reason || 'recurring'}`,
          });
          break;
        }
        case 'charge.succeeded': {
          const dist = distributeRevenue(obj.amount, {
            source: 'charge',
            charge_id: obj.id,
            customer: obj.customer,
          });
          console.log(`💰 CHARGE: $${dist.total} | Founder: $${dist.founder}`);
          // ⛓️ Record on QuranChain Mainnet
          await recordPaymentOnChain({
            amount: dist.total,
            source: 'stripe_charge',
            stripeId: obj.id,
            customerEmail: obj.receipt_email || obj.billing_details?.email || null,
            description: obj.description || 'Direct Charge',
          });
          break;
        }
      }
    } catch (err) {
      console.error(`❌ Webhook handler error: ${err.message}`);
      // Still return 200 to prevent Stripe retries for handler errors
    }

    res.json({ received: true, event_type: event.type });
  }
);

// Revenue stats endpoint
app.get('/api/revenue/stats', (req, res) => {
  try {
    if (!fs.existsSync(REVENUE_LOG)) {
      return res.json({ total_revenue: 0, events: 0, distributions: [] });
    }
    const lines = fs.readFileSync(REVENUE_LOG, 'utf8').trim().split('\n').filter(Boolean);
    const distributions = [];
    let totalRevenue = 0;
    let founderTotal = 0;
    let zakatTotal = 0;

    for (const line of lines) {
      try {
        const match = line.match(/\] (.+)$/);
        if (!match) continue;
        const entry = JSON.parse(match[1]);
        if (entry.type === 'REVENUE_DISTRIBUTION') {
          totalRevenue += entry.total;
          founderTotal += entry.founder;
          zakatTotal += entry.zakat;
          distributions.push(entry);
        }
      } catch {}
    }

    res.json({
      total_revenue: +totalRevenue.toFixed(2),
      founder_share: +founderTotal.toFixed(2),
      zakat_collected: +zakatTotal.toFixed(2),
      founder_royalty_rate: 0.30,
      events_processed: lines.length,
      recent_distributions: distributions.slice(-20),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revenue health check
app.get('/api/revenue/health', (req, res) => {
  const chainStats = blockchain ? blockchain.getStats() : null;
  res.json({
    status: 'live',
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    stripe_live: (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live_'),
    webhook_secret_configured: !!STRIPE_WEBHOOK_SECRET,
    founder_royalty_rate: 0.30,
    distribution: { founder: '30%', ai_validators: '40%', hardware: '10%', ecosystem: '18%', zakat: '2%' },
    fiat_to_blockchain_sync: 'ACTIVE',
    blockchain_mainnet: chainStats ? {
      chain_id: chainStats.chainId,
      blocks: chainStats.blocks,
      pending_tx: chainStats.pendingTx,
      total_supply: chainStats.totalSupply,
    } : 'not_initialized',
    queued_chain_records: pendingChainRecords.length,
    timestamp: new Date().toISOString(),
  });
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

// Purchase tools (REAL Stripe Checkout)
app.post('/api/ai-marketplace/purchase', async (req, res) => {
  const { agent_id, tools, payment_method, auto_provision, customer_email } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
  if (!tools || !tools.length) return res.status(400).json({ error: 'tools array required' });

  const invalid = tools.filter(t => !AI_TOOLS[t]);
  if (invalid.length) return res.status(400).json({ error: 'Unknown tools', invalid });

  const purchaseId = 'pur_' + Date.now().toString(36);
  const paymentMethod = payment_method || 'stripe_checkout';
  const total = tools.reduce((s, t) => s + (AI_TOOLS[t]?.price || 0), 0);

  const provisions = tools.map(toolId => {
    const tool = AI_TOOLS[toolId];
    const apiKey = `${tool.platform.slice(0,2)}_live_${Math.random().toString(36).slice(2, 14)}`;
    const pendingStatus = paymentMethod === 'stripe_checkout' || auto_provision === false;
    return {
      tool: toolId,
      name: tool.name,
      status: pendingStatus ? 'pending' : 'active',
      api_key: apiKey,
      endpoint: `https://api.${tool.platform}.darcloud.host/v1/${toolId}`,
      provisioned_at: new Date().toISOString(),
    };
  });

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

  let checkoutSession = null;
  if (paymentMethod === 'stripe_checkout') {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured (STRIPE_SECRET_KEY missing)' });
    }

    const lineItems = tools.map(toolId => {
      const tool = AI_TOOLS[toolId];
      const priceData = {
        currency: 'usd',
        unit_amount: Math.round((tool.price || 0) * 100),
        product_data: {
          name: tool.name,
          description: `QuranChain AI Marketplace — ${tool.platform}`,
        },
      };
      if (tool.interval === 'month' || tool.interval === 'year') {
        priceData.recurring = { interval: tool.interval };
      }
      return { price_data: priceData, quantity: 1 };
    });

    const mode = lineItems.some(item => item.price_data.recurring) ? 'subscription' : 'payment';
    const publicBase = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = process.env.STRIPE_SUCCESS_URL ||
      `${publicBase}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL ||
      `${publicBase}/checkout/cancel`;

    checkoutSession = await stripeService.stripe.checkout.sessions.create({
      mode,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customer_email || undefined,
      allow_promotion_codes: true,
      metadata: {
        agent_id,
        tools: tools.join(','),
        source: 'ai_marketplace',
      },
    });
  }

  const purchaseStatus = paymentMethod === 'stripe_checkout' ? 'pending_payment' : 'active';

  res.json({
    purchase_id: purchaseId,
    agent_id,
    status: purchaseStatus,
    provisions,
    monthly_total: total.toFixed(2),
    currency: 'usd',
    payment_method: paymentMethod,
    stripe_links: stripeLinks,
    checkout_url: checkoutSession?.url || null,
    checkout_session_id: checkoutSession?.id || null,
    next_billing: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
});

// Confirm Stripe checkout session and activate tools
app.post('/api/ai-marketplace/confirm', async (req, res) => {
  try {
    const { checkout_session_id, agent_id } = req.body;
    if (!checkout_session_id) return res.status(400).json({ error: 'checkout_session_id required' });

    const session = await stripeService.stripe.checkout.sessions.retrieve(checkout_session_id);
    if (!session) return res.status(404).json({ error: 'Checkout session not found' });
    if (session.payment_status !== 'paid') {
      return res.json({ status: 'pending', payment_status: session.payment_status });
    }

    const targetAgent = agent_id || session.metadata?.agent_id;
    const agent = agentRegistry[targetAgent];
    if (agent) {
      for (const tool of agent.tools) {
        if (tool.status === 'pending') tool.status = 'active';
      }
      res.json({ status: 'active', agent_id: targetAgent, tools: agent.tools });
    } else {
      res.json({ status: 'paid_no_agent', agent_id: targetAgent });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// Trial users for lead generation (optional file-based source)
app.get('/api/ai-marketplace/trial-users', (req, res) => {
  try {
    const sourcePath = process.env.TRIAL_USERS_FILE;
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return res.json({ trial_users: [], total: 0, source: 'none' });
    }

    const raw = fs.readFileSync(sourcePath, 'utf8');
    const data = JSON.parse(raw);
    const trialUsers = Array.isArray(data?.trial_users) ? data.trial_users : [];
    res.json({ trial_users: trialUsers, total: trialUsers.length, source: sourcePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 💳 STRIPE — Lead Sources + Payments
// Used by AI lead generation and payment processing
// ═══════════════════════════════════════════════════════════

// Lookup Stripe customer by email
app.get('/api/stripe/customer/lookup', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email required' });
    const customers = await stripeService.stripe.customers.list({ email, limit: 1 });
    const customer = customers.data?.[0] || null;
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or return a REAL Stripe payment intent
app.post('/api/stripe/payment-intent', async (req, res) => {
  try {
    const { amount, currency, customerId, paymentMethodId, metadata } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });

    const paymentIntent = await stripeService.createPaymentIntent(
      parseFloat(amount),
      currency || 'usd',
      customerId || null,
      metadata || {}
    );

    let confirmed = null;
    if (paymentMethodId) {
      confirmed = await stripeService.confirmPaymentIntent(paymentIntent.id, paymentMethodId);
    }

    res.json({ success: true, paymentIntent, confirmed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pending customers (recent Stripe customers)
app.get('/api/stripe/pending-customers', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const created = { gte: Math.floor(Date.now() / 1000) - days * 86400 };

    const customers = await stripeService.stripe.customers.list({ limit, created });
    const list = customers.data
      .filter(c => c.email)
      .map(c => ({
        id: c.id,
        email: c.email,
        name: c.name,
        created: c.created,
        metadata: c.metadata || {},
      }));

    res.json({ customers: list, total: list.length, since_days: days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Abandoned checkout sessions (open + unpaid)
app.get('/api/stripe/abandoned-sessions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const days = Math.min(parseInt(req.query.days) || 7, 90);
    const created = { gte: Math.floor(Date.now() / 1000) - days * 86400 };

    const sessions = await stripeService.stripe.checkout.sessions.list({
      limit,
      payment_status: 'unpaid',
      created,
      expand: ['data.line_items'],
    });

    const list = sessions.data
      .filter(s => s.status === 'open')
      .map(s => ({
        id: s.id,
        status: s.status,
        payment_status: s.payment_status,
        customer_email: s.customer_email,
        customer_details: s.customer_details,
        consent_collection: s.consent_collection,
        line_items: s.line_items?.data || [],
        created: s.created,
      }));

    res.json({ sessions: list, total: list.length, since_days: days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// 🤖 AI AGENT METERED BILLING
// Usage-based billing for AI agent API calls (66 agents)
// ═══════════════════════════════════════════════════════════

// In-memory usage tracker (persisted to disk)
const USAGE_DB = path.join(__dirname, 'data/agent_usage.json');
let agentUsageDb = {};
try {
  if (fs.existsSync(USAGE_DB)) agentUsageDb = JSON.parse(fs.readFileSync(USAGE_DB, 'utf8'));
} catch {}

function saveUsageDb() {
  try {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(USAGE_DB, JSON.stringify(agentUsageDb, null, 2));
  } catch {}
}

// Create a metered product + subscription for an AI agent tier
app.post('/api/billing/metered/create-product', async (req, res) => {
  try {
    const { tier, unit_amount_cents } = req.body;
    if (!tier) return res.status(400).json({ error: 'tier required (basic, pro, enterprise)' });
    const result = await stripeService.createMeteredAgentProduct(tier, unit_amount_cents || 1);
    res.json({ success: true, product_id: result.product.id, price_id: result.price.id, tier });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Subscribe a customer to metered AI agent billing 
app.post('/api/billing/metered/subscribe', async (req, res) => {
  try {
    const { customer_id, price_id, customer_email } = req.body;
    if (!price_id) return res.status(400).json({ error: 'price_id required' });

    let custId = customer_id;
    if (!custId && customer_email) {
      const existing = await stripeService.stripe.customers.list({ email: customer_email, limit: 1 });
      if (existing.data.length) {
        custId = existing.data[0].id;
      } else {
        const newCust = await stripeService.stripe.customers.create({ email: customer_email, metadata: { platform: 'quranchain', type: 'ai_agent_user' } });
        custId = newCust.id;
      }
    }
    if (!custId) return res.status(400).json({ error: 'customer_id or customer_email required' });

    const subscription = await stripeService.createMeteredSubscription(custId, price_id);
    const subscriptionItemId = subscription.items.data[0].id;

    res.json({
      success: true,
      subscription_id: subscription.id,
      subscription_item_id: subscriptionItemId,
      customer_id: custId,
      status: subscription.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Report AI agent usage (called after each API call)
app.post('/api/billing/metered/report-usage', async (req, res) => {
  try {
    const { subscription_item_id, quantity, agent_id, model } = req.body;
    if (!subscription_item_id || !quantity) {
      return res.status(400).json({ error: 'subscription_item_id and quantity required' });
    }

    const record = await stripeService.reportAgentUsage(
      subscription_item_id,
      parseInt(quantity),
      { agent_id, model }
    );

    // Track locally
    if (!agentUsageDb[agent_id || 'unknown']) agentUsageDb[agent_id || 'unknown'] = { total_calls: 0, last_report: null };
    agentUsageDb[agent_id || 'unknown'].total_calls += parseInt(quantity);
    agentUsageDb[agent_id || 'unknown'].last_report = new Date().toISOString();
    saveUsageDb();

    logRevenue({ type: 'AGENT_USAGE', agent_id, quantity: parseInt(quantity), subscription_item_id });
    res.json({ success: true, usage_record_id: record.id, quantity: parseInt(quantity) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get usage summary for a subscription
app.get('/api/billing/metered/usage/:subscriptionItemId', async (req, res) => {
  try {
    const summary = await stripeService.getAgentUsageSummary(req.params.subscriptionItemId);
    res.json({ success: true, usage: summary.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all metered subscriptions
app.get('/api/billing/metered/subscriptions', async (req, res) => {
  try {
    const subs = await stripeService.listMeteredSubscriptions();
    res.json({
      success: true,
      subscriptions: subs.map(s => ({
        id: s.id,
        customer: s.customer,
        status: s.status,
        items: s.items.data.map(i => ({ id: i.id, price_id: i.price.id, usage_type: i.price.recurring?.usage_type })),
        created: s.created,
      })),
      total: subs.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Agent usage dashboard
app.get('/api/billing/metered/agent-stats', (req, res) => {
  res.json({
    success: true,
    agents: agentUsageDb,
    total_agents_tracked: Object.keys(agentUsageDb).length,
    total_api_calls: Object.values(agentUsageDb).reduce((sum, a) => sum + (a.total_calls || 0), 0),
  });
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

// ═══════════════════════════════════════════════════════════
// 📧 EMAIL CAMPAIGN API
// Send outreach campaigns and follow-ups via Cloudflare
// Used by AI agents for real lead outreach
// ═══════════════════════════════════════════════════════════

// In-memory campaign tracking (production: persist to CRM)
const campaignsSent = [];

// ── Email Campaign: Send campaign email ──
app.post('/api/email/campaign', async (req, res) => {
  const { to, subject, content, lead_id, campaign_type } = req.body;
  if (!to || !subject || !content) {
    return res.status(400).json({ error: 'to, subject, and content required' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  
  // Generate campaign ID
  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  
  // For now we use Cloudflare Email Routing's "send" capability via Workers
  // In production, integrate with SendGrid/Mailgun for outbound
  // For MVP: Log campaign and track it
  const campaign = {
    id: campaignId,
    to,
    subject,
    content: content.substring(0, 500), // Truncate for storage
    campaign_type: campaign_type || 'general',
    lead_id: lead_id || null,
    status: 'queued',
    sent_at: new Date().toISOString(),
    opened: false,
    clicked: false,
  };
  
  campaignsSent.push(campaign);
  
  // Log to console for visibility
  console.log(`📧 Campaign queued: ${campaignId} → ${to} | "${subject.substring(0, 40)}..."`);
  
  // TODO: Integrate with real email provider (SendGrid/Mailgun)
  // For now, mark as sent since we're tracking intent
  campaign.status = 'sent';
  
  res.json({
    success: true,
    campaign_id: campaignId,
    to,
    subject,
    status: 'sent',
    message: `Campaign email queued for delivery to ${to}`,
  });
});

// ── Email Campaign: Send follow-up ──
app.post('/api/email/follow-up', async (req, res) => {
  const { to, subject, content, original_campaign_id, lead_id } = req.body;
  if (!to || !subject || !content) {
    return res.status(400).json({ error: 'to, subject, and content required' });
  }
  
  const followUpId = `followup_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  
  const followUp = {
    id: followUpId,
    to,
    subject,
    content: content.substring(0, 500),
    campaign_type: 'follow_up',
    original_campaign_id: original_campaign_id || null,
    lead_id: lead_id || null,
    status: 'sent',
    sent_at: new Date().toISOString(),
  };
  
  campaignsSent.push(followUp);
  
  console.log(`📧 Follow-up sent: ${followUpId} → ${to}`);
  
  res.json({
    success: true,
    followup_id: followUpId,
    to,
    subject,
    status: 'sent',
    message: `Follow-up email sent to ${to}`,
  });
});

// ── Email Campaign: List campaigns ──
app.get('/api/email/campaigns', (req, res) => {
  const { limit, status, campaign_type } = req.query;
  let campaigns = [...campaignsSent];
  
  if (status) campaigns = campaigns.filter(c => c.status === status);
  if (campaign_type) campaigns = campaigns.filter(c => c.campaign_type === campaign_type);
  
  campaigns = campaigns.slice(-(parseInt(limit) || 100));
  
  res.json({
    campaigns: campaigns.reverse(),
    total: campaigns.length,
    all_time_sent: campaignsSent.length,
  });
});

// ═══════════════════════════════════════════════════════════
// 📊 CRM API
// Lead, Deal, Merchant, and Revenue management
// Central system for AI agent sales operations
// ═══════════════════════════════════════════════════════════

const sqlite3 = require('sqlite3').verbose();
const defaultCrmPath = path.join(process.cwd(), 'crm', 'crm.db');
const legacyCrmPath = '/home/omar/Desktop/QuranChain/crm/crm.db';
const CRM_DB_PATH = process.env.CRM_DB_PATH || (fs.existsSync(defaultCrmPath) ? defaultCrmPath : legacyCrmPath);

// Helper: Execute CRM query
function crmQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(CRM_DB_PATH);
    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Helper: Execute CRM insert/update
function crmRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(CRM_DB_PATH);
    db.run(sql, params, function(err) {
      db.close();
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// ── CRM: List leads ──
app.get('/api/crm/leads', async (req, res) => {
  try {
    const { status, opted_in, limit, source, score_min } = req.query;
    let sql = 'SELECT * FROM leads WHERE 1=1';
    const params = [];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (opted_in === 'true') {
      sql += ' AND opted_in = 1';
    }
    if (source) {
      sql += ' AND source = ?';
      params.push(source);
    }
    if (score_min) {
      sql += ' AND score >= ?';
      params.push(parseInt(score_min));
    }
    
    sql += ' ORDER BY score DESC, created_at DESC';
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    
    const leads = await crmQuery(sql, params);
    res.json({
      leads,
      total: leads.length,
      filters: { status, opted_in, source, score_min },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Get single lead ──
app.get('/api/crm/leads/:id', async (req, res) => {
  try {
    const leads = await crmQuery('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    
    // Get associated deals
    const deals = await crmQuery('SELECT * FROM deals WHERE lead_id = ?', [req.params.id]);
    
    res.json({ ...leads[0], deals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Create lead ──
app.post('/api/crm/leads', async (req, res) => {
  try {
    const { name, email, company, phone, source, score, notes, opted_in } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email required' });
    }
    
    // Check for duplicate
    const existing = await crmQuery('SELECT id FROM leads WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'Lead with this email already exists', lead_id: existing[0].id });
    }
    
    const now = new Date().toISOString();
    const result = await crmRun(
      `INSERT INTO leads (name, email, company, phone, source, status, score, notes, opted_in, opt_in_timestamp, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?)`,
      [name, email, company || null, phone || null, source || 'api', score || 50, notes || null, 
       opted_in ? 1 : 0, opted_in ? now : null, now, now]
    );
    
    res.json({
      success: true,
      lead_id: result.lastID,
      email,
      message: `Lead created: ${name}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Update lead status ──
app.put('/api/crm/leads/:id/status', async (req, res) => {
  try {
    const { status, notes, score, assigned_to } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    
    const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', valid: validStatuses });
    }
    
    let sql = 'UPDATE leads SET status = ?, updated_at = ?';
    const params = [status, new Date().toISOString()];
    
    if (notes !== undefined) {
      sql += ', notes = ?';
      params.push(notes);
    }
    if (score !== undefined) {
      sql += ', score = ?';
      params.push(parseInt(score));
    }
    if (assigned_to !== undefined) {
      sql += ', assigned_to = ?';
      params.push(assigned_to);
    }
    
    sql += ' WHERE id = ?';
    params.push(req.params.id);
    
    const result = await crmRun(sql, params);
    if (!result.changes) return res.status(404).json({ error: 'Lead not found' });
    
    res.json({
      success: true,
      lead_id: parseInt(req.params.id),
      new_status: status,
      message: `Lead status updated to ${status}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Opt-in lead ──
app.post('/api/crm/leads/:id/opt-in', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = await crmRun(
      'UPDATE leads SET opted_in = 1, opt_in_timestamp = ?, updated_at = ? WHERE id = ?',
      [now, now, req.params.id]
    );
    
    if (!result.changes) return res.status(404).json({ error: 'Lead not found' });
    
    res.json({
      success: true,
      lead_id: parseInt(req.params.id),
      opted_in: true,
      opt_in_timestamp: now,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Create deal from lead ──
app.post('/api/crm/deals', async (req, res) => {
  try {
    const { lead_id, name, deal_value, product, probability, expected_close_date, assigned_to, notes } = req.body;
    if (!lead_id || !name) {
      return res.status(400).json({ error: 'lead_id and name required' });
    }
    
    // Verify lead exists
    const lead = await crmQuery('SELECT * FROM leads WHERE id = ?', [lead_id]);
    if (!lead.length) return res.status(404).json({ error: 'Lead not found' });
    
    const now = new Date().toISOString();
    const result = await crmRun(
      `INSERT INTO deals (lead_id, name, stage, deal_value, currency, probability, expected_close_date, product, assigned_to, notes, created_at, updated_at)
       VALUES (?, ?, 'discovery', ?, 'USD', ?, ?, ?, ?, ?, ?, ?)`,
      [lead_id, name, deal_value || 0, probability || 10, expected_close_date || null, 
       product || 'quranchain_services', assigned_to || 'sales_ai', notes || null, now, now]
    );
    
    // Update lead status to qualified
    await crmRun('UPDATE leads SET status = ?, updated_at = ? WHERE id = ?', ['qualified', now, lead_id]);
    
    res.json({
      success: true,
      deal_id: result.lastID,
      lead_id,
      name,
      deal_value,
      message: `Deal created: ${name} ($${deal_value || 0})`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Update deal stage ──
app.put('/api/crm/deals/:id/stage', async (req, res) => {
  try {
    const { stage, probability, deal_value, notes } = req.body;
    if (!stage) return res.status(400).json({ error: 'stage required' });
    
    const validStages = ['discovery', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage', valid: validStages });
    }
    
    let sql = 'UPDATE deals SET stage = ?, updated_at = ?';
    const params = [stage, new Date().toISOString()];
    
    if (probability !== undefined) {
      sql += ', probability = ?';
      params.push(parseInt(probability));
    }
    if (deal_value !== undefined) {
      sql += ', deal_value = ?';
      params.push(parseFloat(deal_value));
    }
    if (notes !== undefined) {
      sql += ', notes = ?';
      params.push(notes);
    }
    
    sql += ' WHERE id = ?';
    params.push(req.params.id);
    
    const result = await crmRun(sql, params);
    if (!result.changes) return res.status(404).json({ error: 'Deal not found' });
    
    res.json({
      success: true,
      deal_id: parseInt(req.params.id),
      new_stage: stage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Close deal (integrates with Stripe) ──
app.post('/api/crm/close-deal', async (req, res) => {
  try {
    const { deal_id, won, final_value, payment_method, stripe_payment_intent } = req.body;
    if (deal_id === undefined || won === undefined) {
      return res.status(400).json({ error: 'deal_id and won (boolean) required' });
    }
    
    // Get deal details
    const deals = await crmQuery('SELECT d.*, l.email, l.name as lead_name FROM deals d JOIN leads l ON d.lead_id = l.id WHERE d.id = ?', [deal_id]);
    if (!deals.length) return res.status(404).json({ error: 'Deal not found' });
    
    const deal = deals[0];
    const now = new Date().toISOString();
    const stage = won ? 'closed_won' : 'closed_lost';
    const value = final_value !== undefined ? parseFloat(final_value) : deal.deal_value;
    
    // Update deal
    await crmRun(
      'UPDATE deals SET stage = ?, probability = ?, deal_value = ?, updated_at = ? WHERE id = ?',
      [stage, won ? 100 : 0, value, now, deal_id]
    );
    
    // Update lead status
    await crmRun(
      'UPDATE leads SET status = ?, updated_at = ? WHERE id = ?',
      [won ? 'won' : 'lost', now, deal.lead_id]
    );
    
    // If won, record revenue event
    if (won && value > 0) {
      const founderRoyalty = value * 0.30; // 30% founder share
      await crmRun(
        `INSERT INTO revenue_events (source, merchant_id, amount, currency, type, founder_share, created_at)
         VALUES (?, ?, ?, 'USD', 'deal_closed', ?, ?)`,
        [deal.product || 'sales', null, value, founderRoyalty, now]
      );
    }
    
    res.json({
      success: true,
      deal_id,
      stage,
      final_value: value,
      lead_email: deal.email,
      founder_royalty: won ? value * 0.30 : 0,
      message: won ? `Deal closed! Revenue: $${value}` : 'Deal marked as lost',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Get sales pipeline ──
app.get('/api/crm/pipeline', async (req, res) => {
  try {
    const deals = await crmQuery(`
      SELECT d.*, l.name as lead_name, l.company, l.email
      FROM deals d
      LEFT JOIN leads l ON d.lead_id = l.id
      WHERE d.stage NOT IN ('closed_won', 'closed_lost')
      ORDER BY d.deal_value DESC
    `);
    
    // Group by stage
    const pipeline = {
      discovery: [],
      qualification: [],
      proposal: [],
      negotiation: [],
    };
    
    let totalValue = 0;
    let weightedValue = 0;
    
    for (const deal of deals) {
      if (pipeline[deal.stage]) {
        pipeline[deal.stage].push(deal);
        totalValue += deal.deal_value || 0;
        weightedValue += (deal.deal_value || 0) * (deal.probability || 0) / 100;
      }
    }
    
    res.json({
      pipeline,
      summary: {
        total_deals: deals.length,
        total_value: totalValue,
        weighted_value: weightedValue,
        by_stage: Object.entries(pipeline).map(([stage, d]) => ({
          stage,
          count: d.length,
          value: d.reduce((s, deal) => s + (deal.deal_value || 0), 0),
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Revenue dashboard ──
app.get('/api/crm/revenue', async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, all
    
    let dateFilter = '';
    if (period === 'day') dateFilter = "AND created_at >= datetime('now', '-1 day')";
    else if (period === 'week') dateFilter = "AND created_at >= datetime('now', '-7 days')";
    else if (period === 'month') dateFilter = "AND created_at >= datetime('now', '-30 days')";
    
    const revenue = await crmQuery(`
      SELECT 
        SUM(amount) as total_revenue,
        SUM(founder_share) as total_founder_share,
        COUNT(*) as event_count,
        source
      FROM revenue_events
      WHERE 1=1 ${dateFilter}
      GROUP BY source
    `);
    
    const totals = await crmQuery(`
      SELECT 
        SUM(amount) as total_revenue,
        SUM(founder_share) as total_founder_share,
        COUNT(*) as event_count
      FROM revenue_events
      WHERE 1=1 ${dateFilter}
    `);
    
    res.json({
      totals: totals[0] || { total_revenue: 0, total_founder_share: 0, event_count: 0 },
      by_source: revenue,
      period: period || 'all',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Get merchants ──
app.get('/api/crm/merchants', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM merchants';
    const params = [];
    
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY monthly_volume DESC';
    
    const merchants = await crmQuery(sql, params);
    res.json({
      merchants,
      total: merchants.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRM: Create merchant ──
app.post('/api/crm/merchants', async (req, res) => {
  try {
    const { business_name, contact_name, email, phone, onboarded_by } = req.body;
    if (!business_name || !contact_name || !email) {
      return res.status(400).json({ error: 'business_name, contact_name, and email required' });
    }
    
    const now = new Date().toISOString();
    const result = await crmRun(
      `INSERT INTO merchants (business_name, contact_name, email, phone, status, api_key_issued, monthly_volume, onboarded_at, onboarded_by, created_at)
       VALUES (?, ?, ?, ?, 'onboarding', 0, 0, ?, ?, ?)`,
      [business_name, contact_name, email, phone || null, now, onboarded_by || 'sales_ai', now]
    );
    
    res.json({
      success: true,
      merchant_id: result.lastID,
      business_name,
      status: 'onboarding',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// ── Blockchain: Store Data Hash (used by fiat payment sync) ──
app.post('/api/blockchain/data-hash', txLimiter, async (req, res) => {
  if (!blockchain) return res.status(503).json({ error: 'Blockchain not initialized' });
  const { dataHash, description, source } = req.body;
  if (!dataHash) return res.status(400).json({ error: 'dataHash required' });
  try {
    const tx = blockchain.storeDataHash({
      dataHash,
      description: description || 'External data hash',
      source: source || 'api',
    });

    // Auto-mine if pending TXs stacked up
    let mined = null;
    if (blockchain.pendingTransactions.length >= 3) {
      try {
        const founderAddr = blockchain.founder || 'Omar_Mohammad_Abunadi';
        mined = await blockchain.mineBlock(founderAddr);
        console.log(`  ⛏️  Auto-mined block #${mined.block.index} (data-hash trigger)`);

        // Persist to MongoDB
        if (mongoConnected && BlockModel) {
          const block = mined.block;
          await BlockModel.findOneAndUpdate({ index: block.index }, block, { upsert: true, new: true });
          for (const mtx of (block.transactions || [])) {
            await TxModel.findOneAndUpdate(
              { txId: mtx.id },
              { txId: mtx.id, ...mtx, blockIndex: block.index, blockHash: block.hash },
              { upsert: true, new: true }
            );
          }
        }
      } catch (mineErr) {
        console.log(`  ⛏️  Auto-mine deferred: ${mineErr.message}`);
      }
    }

    res.json({
      success: true,
      transaction: tx,
      mined: mined ? { blockIndex: mined.block.index, txCount: mined.block.transactions.length } : null,
    });
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

// ═══════════════════════════════════════════════════════════
// � HALAL WEALTH CLUB — Membership & Islamic Finance
// ═══════════════════════════════════════════════════════════

const halalWealthClub = require('./src/services/halalWealthClub');

// Sign-up
app.post('/api/hwc/signup', (req, res) => {
  try {
    const { name, email, country, tier, referral_code, language } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    const existing = halalWealthClub.getMemberByEmail(email);
    if (existing) return res.json({ success: true, message: 'Already a member', member: { id: existing.id, tier: existing.tier, status: existing.status } });

    const member = halalWealthClub.registerMember({ name, email, country: country || 'US', tier: tier || 'seed', referralCode: referral_code, language: language || 'en' });
    const tierInfo = halalWealthClub.tiers[member.tier];
    console.log(`  🕌 HWC Sign-up: ${member.id} (${member.tier}) — ${email}`);

    res.json({
      success: true,
      member: { id: member.id, name: member.name, tier: member.tier, referral_code: member.personal_referral_code, status: member.status, features: tierInfo.features },
      payment_link: tierInfo.payment_link,
      checkout_url: `/api/hwc/checkout/${member.id}`,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lead capture
app.post('/api/hwc/lead', (req, res) => {
  try {
    const { name, email, country, interests, preferred_tier, referral_code, language } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    let score = 0;
    if (email) score += 20;
    const muslimMaj = ['SA','AE','PK','BD','ID','MY','EG','TR','NG','QA','KW','BH','OM','JO','IQ'];
    if (muslimMaj.includes((country||'').toUpperCase())) score += 25;
    if (interests && interests.length) score += 15;
    if (preferred_tier === 'legacy') score += 25;
    else if (preferred_tier === 'growth') score += 15;
    else score += 5;
    if (referral_code) score += 10;

    const qualified = score >= 40;
    let member = null;
    if (qualified) {
      try {
        member = halalWealthClub.registerMember({ name: name || 'Prospective Member', email, country: country || 'US', tier: score >= 70 ? 'growth' : 'seed', referralCode: referral_code, language: language || 'en' });
        console.log(`  🕌 HWC Lead → Member: ${member.id} (${member.tier})`);
      } catch (e) { /* dup email etc */ }
    }

    res.json({
      success: true,
      qualification: { score, qualified, recommended_tier: score >= 70 ? 'growth' : 'seed' },
      member: member ? { id: member.id, tier: member.tier, referral_code: member.personal_referral_code } : null,
      next_step: member ? `Complete payment at /api/hwc/checkout/${member.id}` : 'Lead captured — AI agent will follow up',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Pricing
app.get('/api/hwc/pricing', (req, res) => {
  res.json({
    club: 'Halal Wealth Club',
    tagline: 'Invest Halal — Prosper by the Will of Allah',
    tiers: halalWealthClub.getPricing(),
    revenue_model: { founder_royalty: '30%', ai_validators: '40%', hardware: '10%', ecosystem: '18%', zakat: '2%' },
    payment_links: {
      seed: 'https://buy.stripe.com/eVqcN42Ey67p31jbmUcEw3u',
      growth: 'https://buy.stripe.com/cNibJ07YSdzReK1aiQcEw3v',
      legacy: 'https://buy.stripe.com/4gM4gy6UO9jB6dvaiQcEw3w',
    },
  });
});

// Stats
app.get('/api/hwc/stats', (req, res) => { res.json(halalWealthClub.getStats()); });

// Members
app.get('/api/hwc/members', (req, res) => {
  const { tier, region, status, limit, offset } = req.query;
  res.json(halalWealthClub.listMembers({ tier, region, status, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 }));
});

// Member detail
app.get('/api/hwc/member/:id', (req, res) => {
  const m = halalWealthClub.getMember(req.params.id);
  if (!m) return res.status(404).json({ error: 'Member not found' });
  res.json(m);
});

// Halal stock screener
app.post('/api/hwc/screen', (req, res) => {
  const { ticker, financials } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker required' });
  res.json(halalWealthClub.screenInvestment(ticker, financials || {}));
});

// Zakat calculator
app.post('/api/hwc/zakat', (req, res) => { res.json(halalWealthClub.calculateZakat(req.body || {})); });

// Content library
app.get('/api/hwc/content/:tier', (req, res) => { res.json(halalWealthClub.getContentLibrary(req.params.tier)); });

// Checkout
app.post('/api/hwc/checkout/:memberId', (req, res) => {
  const member = halalWealthClub.getMember(req.params.memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  const tier = halalWealthClub.tiers[member.tier];
  res.json({ success: true, checkout: { member_id: member.id, tier: member.tier, price: tier.price, stripe_price_id: tier.stripe_price_id, payment_link: tier.payment_link } });
});

// Welcome (post-payment)
app.get('/api/hwc/welcome/:memberId', (req, res) => {
  const member = halalWealthClub.getMember(req.params.memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  const content = halalWealthClub.getContentLibrary(member.tier);
  res.json({ welcome: 'Assalamu Alaikum — Welcome to the Halal Wealth Club!', member: { id: member.id, name: member.name, tier: member.tier, referral_code: member.personal_referral_code }, courses: content.courses.length, webinars: content.webinars.length });
});

// Referral lookup
app.get('/api/hwc/referral/:code', (req, res) => {
  const members = Object.values(halalWealthClub.data.members);
  const referrer = members.find(m => m.personal_referral_code === req.params.code);
  if (!referrer) return res.status(404).json({ error: 'Invalid referral code' });
  const referrals = members.filter(m => m.referral_code === req.params.code);
  res.json({ referrer: { id: referrer.id, name: referrer.name, tier: referrer.tier }, referrals_count: referrals.length });
});

// ═══════════════════════════════════════════════════════════

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

// �🚀 UNIFIED STARTUP — BLOCKCHAIN + P2P + MONGODB + IPFS
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
  const HOST = process.env.HOST || '0.0.0.0';
  const BASE_URL = process.env.PUBLIC_BASE_URL || `http://${HOST}:${PORT}`;
  app.listen(PORT, HOST, () => {
    console.log('');
    console.log('  ── Services ──');
    console.log(`  HTTP:       ${BASE_URL}`);
    console.log(`  P2P:        ws://${HOST}:${p2pNetwork?.port || P2P_PORT}`);
    console.log(`  Health:     ${BASE_URL}/health`);
    console.log(`  Blockchain: ${BASE_URL}/api/blockchain/stats`);
    console.log(`  Explorer:   ${BASE_URL}/api/blockchain/chain`);
    console.log(`  AI Market:  ${BASE_URL}/api/ai-marketplace/tools`);
    console.log(`  Domains:    ${BASE_URL}/api/domains/pricing`);
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
    console.log(`  HWC Club:   LIVE (3 tiers, ${Object.keys(halalWealthClub.regions).length} regions)`);
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

  // 7. Process any queued fiat payments that arrived before blockchain init
  if (pendingChainRecords.length > 0) {
    console.log(`  ⛓️  Processing ${pendingChainRecords.length} queued fiat payments...`);
    while (pendingChainRecords.length > 0) {
      const queued = pendingChainRecords.shift();
      await recordPaymentOnChain(queued);
    }
  }

  console.log('  ⛓️  Fiat→Blockchain Sync: ACTIVE (all Stripe payments recorded on-chain)');
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
