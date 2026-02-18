/**
 * DarCloud™ Enterprise Metering & Usage System
 * =============================================
 * Tracks real-time usage per enterprise client by API key.
 * Attributes compute, storage, bandwidth, tolls to the correct account.
 * Feeds into Stripe metered billing and QuranChain Billing Ledger.
 *
 * Metering sources:
 *   - API gateway (authenticated requests)
 *   - Mesh node telemetry (CPU/GPU/RAM utilization)
 *   - Storage subsystem (object puts/gets, GB stored)
 *   - Network stack (egress/ingress/transit bytes)
 *   - Toll highway (congestion offload, cross-chain, AI compute)
 *
 * © DarCloud™ | Omar Mohammad Abunadi™
 * Status: PRODUCTION
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const stripeService = require('./stripeService');

class EnterpriseMetering extends EventEmitter {
  constructor() {
    super();
    this.running = false;
    this.pricingEngine = null;

    // ── USAGE BUCKETS ──
    // Map<clientId, Map<category.type, { quantity, events[] }>>
    this.currentPeriod = new Map();
    this.periodStart = null;
    this.periodEnd = null;

    // ── API KEY → CLIENT MAPPING ──
    this.apiKeyIndex = new Map();  // apiKey → clientId

    // ── METERING LOG (append-only audit trail) ──
    this.meterLog = [];  // { ts, clientId, category, type, quantity, source, hash }

    // ── AGGREGATION ──
    this.rollups = [];   // completed period rollups
    this.aggregationInterval = null;

    // ── STATS ──
    this.stats = {
      totalEvents: 0,
      totalClients: 0,
      totalPeriods: 0,
      lastRollup: null,
    };
  }

  async initialize(deps = {}) {
    this.pricingEngine = deps.pricingEngine || null;
    this.blockchain = deps.blockchain || null;
    this.fungiMesh = deps.fungiMesh || null;
    this.gasTollHighway = deps.gasTollHighway || null;

    // Build API key index from pricing engine clients
    if (this.pricingEngine) {
      for (const [clientId, client] of this.pricingEngine.clients) {
        for (const key of client.apiKeys || []) {
          this.apiKeyIndex.set(key, clientId);
        }
      }
    }

    // Start current billing period
    this._startNewPeriod();

    // Aggregate every 60 seconds (flush high-freq events into buckets)
    this.aggregationInterval = setInterval(() => this._aggregate(), 60_000);

    // Hook into toll highway events
    if (this.gasTollHighway) {
      this.gasTollHighway.on('toll-collected', (toll) => {
        if (toll.metadata?.clientId) {
          this.recordUsage(toll.metadata.clientId, toll.category, toll.tollType, toll.quantity || 1, 'toll-highway');
        }
      });
    }

    // Hook into mesh node telemetry
    if (this.fungiMesh) {
      this.fungiMesh.on('task-completed', (task) => {
        if (task.clientId || task.metadata?.clientId) {
          const cid = task.clientId || task.metadata.clientId;
          this.recordUsage(cid, 'compute', task.type === 'gpu' ? 'gpuHourT4' : 'vcpuHour',
            task.duration ? task.duration / 3600 : 0.01, 'mesh-telemetry');
        }
      });
    }

    this.running = true;
    console.log('  📊 Enterprise Metering System initialized');
    console.log(`     API keys indexed: ${this.apiKeyIndex.size}`);
    console.log(`     Period: ${new Date(this.periodStart).toISOString().split('T')[0]} → ${new Date(this.periodEnd).toISOString().split('T')[0]}`);
    return this;
  }

  // ═══════════════════════════════════════════════════════════
  // RECORD USAGE
  // ═══════════════════════════════════════════════════════════

  /**
   * Record a usage event for a client.
   * @param {string} clientId - DarCloud client ID
   * @param {string} category - Rate card category (compute, storage, bandwidth, etc.)
   * @param {string} type - Rate card type (vcpuHour, egressGB, etc.)
   * @param {number} quantity - Amount of usage
   * @param {string} source - Where the event came from (api, mesh-telemetry, toll-highway, etc.)
   */
  recordUsage(clientId, category, type, quantity, source = 'api') {
    if (!this.running) return null;

    const ts = Date.now();
    const eventHash = crypto.createHash('sha256')
      .update(`${ts}:${clientId}:${category}:${type}:${quantity}:${source}`)
      .digest('hex').substring(0, 16);

    const event = { ts, clientId, category, type, quantity, source, hash: eventHash };

    // Append to audit log
    this.meterLog.push(event);

    // Update current period bucket
    if (!this.currentPeriod.has(clientId)) {
      this.currentPeriod.set(clientId, new Map());
    }
    const clientBucket = this.currentPeriod.get(clientId);
    const key = `${category}.${type}`;
    if (!clientBucket.has(key)) {
      clientBucket.set(key, { quantity: 0, events: 0, firstEvent: ts, lastEvent: ts });
    }
    const bucket = clientBucket.get(key);
    bucket.quantity += quantity;
    bucket.events += 1;
    bucket.lastEvent = ts;

    this.stats.totalEvents++;
    this.emit('usage-recorded', event);
    return event;
  }

  /**
   * Record usage by API key (resolves to clientId automatically).
   */
  recordUsageByKey(apiKey, category, type, quantity, source = 'api') {
    const clientId = this.apiKeyIndex.get(apiKey);
    if (!clientId) {
      this.emit('unknown-key', { apiKey, category, type, quantity });
      return null;
    }
    return this.recordUsage(clientId, category, type, quantity, source);
  }

  /**
   * Record a batch of usage events (e.g., from periodic mesh telemetry flush).
   */
  recordBatch(events) {
    const results = [];
    for (const e of events) {
      results.push(this.recordUsage(e.clientId, e.category, e.type, e.quantity, e.source || 'batch'));
    }
    return results;
  }

  // ═══════════════════════════════════════════════════════════
  // PERIOD MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  _startNewPeriod() {
    const now = new Date();
    this.periodStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    this.periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    this.currentPeriod = new Map();
  }

  /**
   * Close the current period and create a rollup.
   * Returns usage summary per client, ready for invoicing.
   */
  closePeriod() {
    const rollup = {
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      closedAt: Date.now(),
      clients: {},
    };

    for (const [clientId, buckets] of this.currentPeriod) {
      const clientUsage = {};
      let clientTotal = 0;
      for (const [key, bucket] of buckets) {
        const [category, type] = key.split('.');
        if (!clientUsage[category]) clientUsage[category] = {};
        clientUsage[category][type] = {
          quantity: bucket.quantity,
          events: bucket.events,
          firstEvent: bucket.firstEvent,
          lastEvent: bucket.lastEvent,
        };
        clientTotal += bucket.quantity;
      }
      rollup.clients[clientId] = {
        usage: clientUsage,
        totalQuantity: clientTotal,
        bucketCount: buckets.size,
      };
    }

    this.rollups.push(rollup);
    this.stats.totalPeriods++;
    this.stats.lastRollup = Date.now();

    // Start fresh period
    this._startNewPeriod();

    this.emit('period-closed', rollup);
    return rollup;
  }

  // ═══════════════════════════════════════════════════════════
  // STRIPE METERED BILLING INTEGRATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Generate Stripe invoices for all clients based on current period usage.
   * Uses the pricing engine to calculate costs and create real Stripe invoices.
   */
  async generateAllInvoices() {
    if (!this.pricingEngine) throw new Error('Pricing engine not connected');

    const rollup = this.closePeriod();
    const results = [];

    for (const [clientId, data] of Object.entries(rollup.clients)) {
      try {
        // Convert usage buckets to pricing engine format
        const usageItems = [];
        for (const [category, types] of Object.entries(data.usage)) {
          for (const [type, info] of Object.entries(types)) {
            usageItems.push({ category, type, quantity: info.quantity });
          }
        }

        if (usageItems.length === 0) continue;

        // Use pricing engine to create Stripe invoice
        const invoice = await this.pricingEngine.createUsageInvoice(clientId, usageItems, {
          description: `DarCloud™ Usage Invoice — ${new Date(rollup.periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        });

        results.push({
          clientId,
          invoiceId: invoice.invoiceId,
          total: invoice.cost.total,
          status: 'sent',
          hostedUrl: invoice.hostedUrl,
        });
      } catch (err) {
        results.push({
          clientId,
          error: err.message,
          status: 'failed',
        });
      }
    }

    this.emit('invoices-generated', { count: results.length, results });
    return { periodStart: rollup.periodStart, periodEnd: rollup.periodEnd, invoices: results };
  }

  /**
   * Send Stripe usage records for metered subscriptions.
   * For clients that have active metered Stripe subscriptions.
   */
  async reportStripeUsageRecords(clientId) {
    const stripeCustomerId = this.pricingEngine?.getStripeCustomerId(clientId);
    if (!stripeCustomerId) return { error: 'No Stripe customer for ' + clientId };

    const buckets = this.currentPeriod.get(clientId);
    if (!buckets) return { reported: 0 };

    let reported = 0;
    for (const [key, bucket] of buckets) {
      try {
        // Report metered usage to Stripe subscription items
        // This works for metered billing subscriptions
        const [category, type] = key.split('.');
        const stripeProduct = this.pricingEngine.stripeProducts.get(key);
        if (!stripeProduct) continue;

        // Find active subscription item for this product
        const subs = await stripeService.stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active',
          limit: 100,
        });

        for (const sub of subs.data) {
          for (const item of sub.items.data) {
            if (item.price?.product === stripeProduct.productId) {
              await stripeService.stripe.subscriptionItems.createUsageRecord(item.id, {
                quantity: Math.ceil(bucket.quantity),
                timestamp: Math.floor(bucket.lastEvent / 1000),
                action: 'set',
              });
              reported++;
            }
          }
        }
      } catch (err) {
        // Non-fatal
      }
    }

    return { clientId, reported };
  }

  // ═══════════════════════════════════════════════════════════
  // AGGREGATION & REPORTING
  // ═══════════════════════════════════════════════════════════

  _aggregate() {
    // Trim old audit log entries (keep last 100K)
    if (this.meterLog.length > 100000) {
      this.meterLog = this.meterLog.slice(-50000);
    }
  }

  /**
   * Get real-time usage summary for a client.
   */
  getClientUsage(clientId) {
    const buckets = this.currentPeriod.get(clientId);
    if (!buckets) return { clientId, usage: {}, periodStart: this.periodStart, periodEnd: this.periodEnd };

    const usage = {};
    for (const [key, bucket] of buckets) {
      const [category, type] = key.split('.');
      if (!usage[category]) usage[category] = {};
      usage[category][type] = {
        quantity: bucket.quantity,
        events: bucket.events,
        lastEvent: new Date(bucket.lastEvent).toISOString(),
      };
    }

    // Calculate estimated cost using pricing engine
    let estimatedCost = null;
    if (this.pricingEngine) {
      const usageItems = [];
      for (const [key, bucket] of buckets) {
        const [category, type] = key.split('.');
        usageItems.push({ category, type, quantity: bucket.quantity });
      }
      try {
        estimatedCost = this.pricingEngine.calculateUsageCost(usageItems, clientId);
      } catch (_) {}
    }

    return {
      clientId,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      usage,
      estimatedCost: estimatedCost ? { total: estimatedCost.total, currency: 'USD' } : null,
    };
  }

  /**
   * Get usage for all clients.
   */
  getAllUsage() {
    const result = {};
    for (const clientId of this.currentPeriod.keys()) {
      result[clientId] = this.getClientUsage(clientId);
    }
    return {
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      clientCount: this.currentPeriod.size,
      clients: result,
    };
  }

  /**
   * Generate audit-proof usage report with hashes.
   */
  generateAuditReport(clientId, startTs, endTs) {
    const events = this.meterLog.filter(e =>
      e.clientId === clientId &&
      e.ts >= (startTs || 0) &&
      e.ts <= (endTs || Date.now())
    );

    // Create Merkle-like hash chain for audit proof
    let chainHash = crypto.createHash('sha256').update('genesis').digest('hex');
    const auditEntries = events.map(e => {
      chainHash = crypto.createHash('sha256')
        .update(`${chainHash}:${e.hash}`)
        .digest('hex');
      return { ...e, chainHash };
    });

    const reportHash = crypto.createHash('sha256')
      .update(JSON.stringify(auditEntries.map(e => e.hash)))
      .digest('hex');

    return {
      clientId,
      periodStart: startTs || this.periodStart,
      periodEnd: endTs || Date.now(),
      eventCount: auditEntries.length,
      reportHash,
      finalChainHash: chainHash,
      events: auditEntries,
      generatedAt: Date.now(),
      generatedBy: 'DarCloud Enterprise Metering System',
      founder: 'Omar Mohammad Abunadi™',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // API KEY MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  registerApiKey(apiKey, clientId) {
    this.apiKeyIndex.set(apiKey, clientId);
  }

  revokeApiKey(apiKey) {
    this.apiKeyIndex.delete(apiKey);
  }

  getClientByApiKey(apiKey) {
    return this.apiKeyIndex.get(apiKey) || null;
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS & SHUTDOWN
  // ═══════════════════════════════════════════════════════════

  getStatus() {
    return {
      running: this.running,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      activeClients: this.currentPeriod.size,
      apiKeysIndexed: this.apiKeyIndex.size,
      currentPeriodEvents: this.stats.totalEvents,
      completedPeriods: this.stats.totalPeriods,
      lastRollup: this.stats.lastRollup,
      auditLogSize: this.meterLog.length,
    };
  }

  async shutdown() {
    this.running = false;
    if (this.aggregationInterval) clearInterval(this.aggregationInterval);
    console.log('  🛑 Enterprise Metering System shut down');
  }
}

module.exports = EnterpriseMetering;
