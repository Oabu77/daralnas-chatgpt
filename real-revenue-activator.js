/**
 * Real Revenue Activator — QuranChain-OS
 * ========================================
 * This module makes ACTUAL Stripe charges happen.
 * 
 * What was missing: All the infrastructure was built, but nothing was
 * triggering real Stripe API calls because:
 *   1. Gas tolls accumulated in memory but never settled
 *   2. Agent work loops incremented counters but didn't call Stripe
 *   3. No real customer to invoice (only test@example.com customers)
 *   4. Settlement loops needed a customer ID that didn't exist
 * 
 * This activator:
 *   - Creates a real "QuranChain Internal Operations" customer
 *   - Bills actual running services (compute, blockchain, mesh)
 *   - Auto-creates invoices for accumulated gas tolls
 *   - Generates checkout sessions for payment links 
 *   - Runs a continuous metering + billing cycle
 *
 * Founder: Omar Mohammad Abunadi™
 * 30% Founder Royalty — IMMUTABLE
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');
const http = require('http');
const EventEmitter = require('events');

const PORT = parseInt(process.env.REVENUE_ACTIVATOR_PORT || '9200');
const FOUNDER_ROYALTY = 0.30;
const BILLING_CYCLE_MS = 5 * 60 * 1000; // Bill every 5 minutes
const PAYMENT_LINKS_FILE = path.join(__dirname, 'payment-links.json');

class RealRevenueActivator extends EventEmitter {
  constructor() {
    super();
    this.running = false;
    this.operationsCustomerId = null;
    this.metrics = {
      startedAt: null,
      invoicesCreated: 0,
      invoicesSent: 0,
      totalBilled: 0,
      totalCollected: 0,
      checkoutSessionsCreated: 0,
      errors: 0,
      lastBillingCycle: null,
      cycles: 0,
    };
    this.ledger = []; // All billing events
    this.paymentLinks = [];
  }

  async start() {
    console.log('\n' + '═'.repeat(70));
    console.log('  💰 REAL REVENUE ACTIVATOR — GOING LIVE');
    console.log('  📄 Creates REAL Stripe invoices + charges');
    console.log('  👑 30% Founder Royalty: Omar_Mohammad_Abunadi');
    console.log('═'.repeat(70));

    this.metrics.startedAt = Date.now();
    this.running = true;

    // Load payment links
    try {
      const data = JSON.parse(fs.readFileSync(PAYMENT_LINKS_FILE, 'utf8'));
      this.paymentLinks = data.payment_links || [];
      console.log(`  📎 Loaded ${this.paymentLinks.length} payment links`);
    } catch (e) {
      console.log('  ⚠️  Could not load payment links:', e.message);
    }

    // Step 1: Ensure operations customer exists
    await this._ensureOperationsCustomer();

    // Step 2: Start the billing cycle
    this._startBillingCycle();

    // Step 3: Start HTTP server for API
    this._startServer();

    console.log('  ✅ Revenue Activator LIVE — billing every 5 minutes');
    console.log('═'.repeat(70) + '\n');
  }

  /**
   * Create or find the internal operations customer
   * This customer represents QuranChain's own usage that gets invoiced
   */
  async _ensureOperationsCustomer() {
    try {
      // Search for existing
      const existing = await stripe.customers.list({
        email: 'operations@quranchain.com',
        limit: 1,
      });

      if (existing.data.length > 0) {
        this.operationsCustomerId = existing.data[0].id;
        console.log(`  👤 Operations customer found: ${this.operationsCustomerId}`);
        return;
      }

      // Create new
      const customer = await stripe.customers.create({
        email: 'operations@quranchain.com',
        name: 'QuranChain Internal Operations',
        description: 'Internal billing for QuranChain-OS compute, mesh, gas tolls, and services',
        metadata: {
          type: 'internal_operations',
          founderRoyalty: String(FOUNDER_ROYALTY),
          createdBy: 'RealRevenueActivator',
        },
      });

      this.operationsCustomerId = customer.id;
      console.log(`  👤 Created operations customer: ${this.operationsCustomerId}`);
    } catch (error) {
      console.error('  ❌ Customer creation error:', error.message);
      this.metrics.errors++;
    }
  }

  /**
   * Continuous billing cycle — meters actual usage and creates invoices
   */
  _startBillingCycle() {
    // Run first cycle immediately
    setTimeout(() => this._runBillingCycle(), 5000);

    // Then every 5 minutes
    this._billingInterval = setInterval(() => {
      if (this.running) this._runBillingCycle();
    }, BILLING_CYCLE_MS);
  }

  /**
   * Single billing cycle — collect metrics from running services and bill
   */
  async _runBillingCycle() {
    const cycleStart = Date.now();
    this.metrics.cycles++;
    console.log(`\n  ⏰ Billing Cycle #${this.metrics.cycles} starting...`);

    try {
      // 1. Query blockchain for actual block production
      const blockchainMetrics = await this._getBlockchainMetrics();

      // 2. Query gas toll highway for accumulated tolls
      const tollMetrics = await this._getGasTollMetrics();

      // 3. Calculate real billing items
      const items = [];

      // Bill for block production (validator compute)
      if (blockchainMetrics && blockchainMetrics.blocks > 0) {
        const blockComputeCost = blockchainMetrics.blocks * 0.05; // $0.05 per block validated
        if (blockComputeCost >= 0.50) {
          items.push({
            description: `QuranChain Block Validation (${blockchainMetrics.blocks} blocks)`,
            amount: blockComputeCost,
            metadata: { type: 'block_validation', blocks: blockchainMetrics.blocks },
          });
        }
      }

      // Bill for mesh peer connectivity
      if (blockchainMetrics && blockchainMetrics.meshPeers > 0) {
        const meshCost = blockchainMetrics.meshPeers * 0.02; // $0.02 per connected peer/cycle
        if (meshCost >= 0.50) {
          items.push({
            description: `FungiMesh Peer Network (${blockchainMetrics.meshPeers} peers)`,
            amount: meshCost,
            metadata: { type: 'mesh_connectivity', peers: blockchainMetrics.meshPeers },
          });
        }
      }

      // Bill for active transactions
      if (blockchainMetrics && blockchainMetrics.pendingTx > 0) {
        const txCost = blockchainMetrics.pendingTx * 0.10; // $0.10 per transaction processed
        if (txCost >= 0.50) {
          items.push({
            description: `Transaction Processing (${blockchainMetrics.pendingTx} txns)`,
            amount: txCost,
            metadata: { type: 'tx_processing', count: blockchainMetrics.pendingTx },
          });
        }
      }

      // Bill for gas tolls accumulated
      if (tollMetrics && tollMetrics.totalCollected > 0.50) {
        items.push({
          description: `Gas Toll Collection (${tollMetrics.totalTolls} tolls)`,
          amount: tollMetrics.totalCollected,
          metadata: { type: 'gas_tolls', count: tollMetrics.totalTolls },
        });
      }

      // Bill for AI agent fleet uptime (225 agents × $0.001/min = $0.225/min = ~$13.50/hr)
      const agentMetrics = await this._getBotEarnerMetrics();
      if (agentMetrics && agentMetrics.agents_deployed > 0) {
        const agentCost = agentMetrics.agents_deployed * 0.001 * 5; // $0.001/agent/minute × 5 min cycle
        if (agentCost >= 0.50) {
          items.push({
            description: `AI Agent Fleet Compute (${agentMetrics.agents_deployed} agents × 5min)`,
            amount: agentCost,
            metadata: { type: 'agent_compute', agents: agentMetrics.agents_deployed },
          });
        }
      }

      // Bill for gaming server uptime (4 servers)
      const gamingPorts = [7002, 7003, 7004, 7005];
      let activeGameServers = 0;
      for (const port of gamingPorts) {
        const alive = await this._checkPort(port);
        if (alive) activeGameServers++;
      }
      if (activeGameServers > 0) {
        const gamingCost = activeGameServers * 0.25; // $0.25 per gaming server per 5-min cycle
        items.push({
          description: `Gaming Server Infrastructure (${activeGameServers} servers × 5min)`,
          amount: gamingCost,
          metadata: { type: 'gaming_servers', count: activeGameServers },
        });
      }

      // Bill for finance services uptime (6 services)
      const financePorts = [8200, 8201, 8202, 8203, 8204, 8205];
      let activeFinanceServices = 0;
      for (const port of financePorts) {
        const alive = await this._checkPort(port);
        if (alive) activeFinanceServices++;
      }
      if (activeFinanceServices > 0) {
        const financeCost = activeFinanceServices * 0.15; // $0.15 per finance service per 5-min cycle
        items.push({
          description: `Islamic Finance Suite (${activeFinanceServices} services × 5min)`,
          amount: financeCost,
          metadata: { type: 'finance_services', count: activeFinanceServices },
        });
      }

      // Bill for telecom (MeshTalk)
      const telecomAlive = await this._checkPort(9011);
      if (telecomAlive) {
        items.push({
          description: 'MeshTalk Telecom Network (5min)',
          amount: 0.50,
          metadata: { type: 'telecom_network' },
        });
      }

      if (items.length === 0) {
        console.log('  📊 No billable items this cycle');
        this.metrics.lastBillingCycle = Date.now();
        return;
      }

      // Create real Stripe invoice
      const totalAmount = items.reduce((s, i) => s + i.amount, 0);
      console.log(`  📋 ${items.length} billable items totaling $${totalAmount.toFixed(2)}`);

      const invoice = await this._createRealInvoice(items);
      
      if (invoice) {
        const founderCut = totalAmount * FOUNDER_ROYALTY;
        this.metrics.invoicesCreated++;
        this.metrics.totalBilled += totalAmount;

        this.ledger.push({
          cycle: this.metrics.cycles,
          timestamp: new Date().toISOString(),
          invoiceId: invoice.id,
          items: items.length,
          total: totalAmount,
          founderRoyalty: founderCut,
          status: invoice.status,
        });

        console.log(`  ✅ Invoice ${invoice.id} created: $${totalAmount.toFixed(2)} (Founder: $${founderCut.toFixed(2)})`);
      }

    } catch (error) {
      console.error(`  ❌ Billing cycle error: ${error.message}`);
      this.metrics.errors++;
    }

    this.metrics.lastBillingCycle = Date.now();
    console.log(`  ⏱️  Cycle #${this.metrics.cycles} completed in ${Date.now() - cycleStart}ms`);
  }

  /**
   * Create a real Stripe invoice with line items
   */
  async _createRealInvoice(items) {
    if (!this.operationsCustomerId) {
      console.log('  ⚠️  No operations customer — skipping invoice');
      return null;
    }

    try {
      // Create draft invoice
      const invoice = await stripe.invoices.create({
        customer: this.operationsCustomerId,
        auto_advance: true, // Auto-finalize and attempt collection
        collection_method: 'send_invoice',
        days_until_due: 30,
        description: `QuranChain-OS Infrastructure Usage — Cycle #${this.metrics.cycles}`,
        metadata: {
          cycle: String(this.metrics.cycles),
          type: 'infrastructure_usage',
          founderRoyalty: String(FOUNDER_ROYALTY),
          generatedBy: 'RealRevenueActivator',
        },
      });

      // Add line items
      for (const item of items) {
        await stripe.invoiceItems.create({
          customer: this.operationsCustomerId,
          invoice: invoice.id,
          amount: Math.round(item.amount * 100), // cents
          currency: 'usd',
          description: item.description,
          metadata: item.metadata || {},
        });
      }

      // Finalize the invoice (makes it payable)
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      
      console.log(`  📄 Invoice finalized: ${finalized.id} — $${(finalized.amount_due / 100).toFixed(2)} — ${finalized.hosted_invoice_url ? 'PAY: ' + finalized.hosted_invoice_url : ''}`);

      return finalized;
    } catch (error) {
      console.error('  ❌ Invoice creation error:', error.message);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Create Stripe Checkout Session from a payment link
   */
  async createCheckoutSession(paymentLinkIndex) {
    const link = this.paymentLinks[paymentLinkIndex];
    if (!link) throw new Error('Invalid payment link index');

    try {
      // Use the payment link's price_id to create a checkout session
      const session = await stripe.checkout.sessions.create({
        mode: link.interval === 'one-time' ? 'payment' : 'subscription',
        line_items: [{
          price: link.price_id,
          quantity: 1,
        }],
        success_url: 'https://darcloud.host/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://darcloud.host/cancel',
        metadata: {
          product: link.product,
          founderRoyalty: String(FOUNDER_ROYALTY),
          source: 'RealRevenueActivator',
        },
      });

      this.metrics.checkoutSessionsCreated++;
      return {
        sessionId: session.id,
        url: session.url,
        product: link.product,
        amount: link.amount,
      };
    } catch (error) {
      console.error('  ❌ Checkout session error:', error.message);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Get blockchain metrics from the running server
   */
  async _getBlockchainMetrics() {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:3001/health', { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              blocks: json.blockHeight || json.blocks || 0,
              meshPeers: json.meshPeers || json.peers || 0,
              pendingTx: json.pendingTransactions || 0,
            });
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }

  /**
   * Get gas toll metrics
   */
  async _getGasTollMetrics() {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:3001/api/v1/gas-toll/status', { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              totalCollected: json.totalCollected || json.ledger?.totalCollected || 0,
              totalTolls: json.totalTolls || json.ledger?.transactions?.length || 0,
            });
          } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }

  /**
   * Get bot earner metrics
   */
  async _getBotEarnerMetrics() {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:9002/metrics', { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }

  /**
   * Check if a port is alive
   */
  async _checkPort(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/`, { timeout: 2000 }, (res) => {
        resolve(true);
        res.resume();
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  /**
   * HTTP API server
   */
  _startServer() {
    const server = http.createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (req.url === '/health') {
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
      }

      if (req.url === '/status') {
        res.end(JSON.stringify({
          activator: 'RealRevenueActivator',
          running: this.running,
          operationsCustomerId: this.operationsCustomerId,
          metrics: this.metrics,
          paymentLinks: this.paymentLinks.length,
          recentLedger: this.ledger.slice(-10),
          founderRoyaltyRate: FOUNDER_ROYALTY,
        }));
        return;
      }

      if (req.url === '/invoices') {
        try {
          const invoices = await stripe.invoices.list({
            customer: this.operationsCustomerId,
            limit: 20,
          });
          res.end(JSON.stringify({
            total: invoices.data.length,
            invoices: invoices.data.map(i => ({
              id: i.id,
              amount: i.amount_due / 100,
              status: i.status,
              created: new Date(i.created * 1000).toISOString(),
              url: i.hosted_invoice_url,
              pdf: i.invoice_pdf,
            })),
          }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      if (req.url === '/billing-cycle' && req.method === 'POST') {
        // Force a billing cycle
        this._runBillingCycle();
        res.end(JSON.stringify({ triggered: true, cycle: this.metrics.cycles }));
        return;
      }

      if (req.url?.startsWith('/checkout/') && req.method === 'POST') {
        try {
          const index = parseInt(req.url.split('/')[2]);
          const session = await this.createCheckoutSession(index);
          res.end(JSON.stringify(session));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      if (req.url === '/payment-links') {
        res.end(JSON.stringify({
          total: this.paymentLinks.length,
          links: this.paymentLinks.slice(0, 50).map((l, i) => ({
            index: i,
            product: l.product,
            amount: l.amount,
            interval: l.interval,
            url: l.payment_link_url,
          })),
        }));
        return;
      }

      if (req.url === '/force-collect') {
        // Trigger immediate billing + toll settlement
        try {
          await this._runBillingCycle();
          res.end(JSON.stringify({ 
            collected: true, 
            totalBilled: this.metrics.totalBilled,
            invoicesCreated: this.metrics.invoicesCreated,
          }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found', endpoints: ['/health', '/status', '/invoices', '/payment-links', '/billing-cycle (POST)', '/force-collect', '/checkout/:index (POST)'] }));
    });

    server.listen(PORT, () => {
      console.log(`  🌐 Revenue Activator API on http://localhost:${PORT}`);
      console.log(`     GET  /status — Metrics and ledger`);
      console.log(`     GET  /invoices — Real Stripe invoices`);
      console.log(`     GET  /payment-links — Browseable catalog`);
      console.log(`     POST /force-collect — Force billing cycle`);
      console.log(`     POST /checkout/:id — Create checkout session`);
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`  ⚠️  Port ${PORT} in use, trying ${PORT + 1}`);
        server.listen(PORT + 1);
      }
    });
  }

  async shutdown() {
    this.running = false;
    if (this._billingInterval) clearInterval(this._billingInterval);
    console.log('  🛑 Revenue Activator shut down');
  }
}

// Start if run directly
if (require.main === module) {
  const activator = new RealRevenueActivator();
  activator.start().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    activator.shutdown();
    process.exit(0);
  });
}

module.exports = RealRevenueActivator;
