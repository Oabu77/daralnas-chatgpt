/**
 * DarCloud™ Enterprise Pricing Engine
 * =====================================
 * AWS / AT&T / Carrier-grade pricing model for the Fungi Mesh Network™.
 *
 * Rate cards for:
 *   - Compute (vCPU, GPU, RAM)
 *   - Storage (replication tiers x2/x3/x5)
 *   - Bandwidth (egress, transit, peering)
 *   - Congestion offload toll fees
 *   - Priority routing / premium SLA
 *   - Dedicated node reservations
 *   - Government & Carrier license tiers
 *
 * © DarCloud™ | Omar Mohammad Abunadi™
 * Status: PRODUCTION
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const stripeService = require('./stripeService');

// ═══════════════════════════════════════════════════════════════════
// RATE CARD — Enterprise Pricing (USD)
// ═══════════════════════════════════════════════════════════════════

const RATE_CARD = {
  // ── COMPUTE ──
  compute: {
    vcpuHour:       { unit: 'vCPU-hour',   rate: 0.0416, description: 'Mesh vCPU hour (equiv. c5.large)' },
    vcpuHourSpot:   { unit: 'vCPU-hour',   rate: 0.0125, description: 'Spot / preemptible vCPU hour' },
    gpuHourT4:      { unit: 'GPU-hour',    rate: 0.526,  description: 'NVIDIA T4-equivalent GPU hour' },
    gpuHourA100:    { unit: 'GPU-hour',    rate: 3.40,   description: 'NVIDIA A100-equivalent GPU hour' },
    gpuHourH100:    { unit: 'GPU-hour',    rate: 8.50,   description: 'NVIDIA H100-equivalent GPU hour' },
    ramGBHour:      { unit: 'GB-hour',     rate: 0.0055, description: 'RAM per GB per hour' },
    inferenceReq:   { unit: 'request',     rate: 0.003,  description: 'AI inference request' },
    batchCompute:   { unit: 'vCPU-hour',   rate: 0.030,  description: 'Batch / async compute hour' },
  },

  // ── STORAGE ──
  storage: {
    standardGB:     { unit: 'GB/month',    rate: 0.023,  description: 'Standard mesh-replicated storage (x2)' },
    redundantGB:    { unit: 'GB/month',    rate: 0.035,  description: 'Redundant mesh storage (x3)' },
    ultraGB:        { unit: 'GB/month',    rate: 0.065,  description: 'Ultra-redundant mesh storage (x5)' },
    archiveGB:      { unit: 'GB/month',    rate: 0.004,  description: 'Cold archive storage' },
    snapshotGB:     { unit: 'GB/month',    rate: 0.010,  description: 'Incremental snapshot storage' },
    objectStorePut: { unit: 'per 1K req',  rate: 0.005,  description: 'Object store PUT/COPY/POST' },
    objectStoreGet: { unit: 'per 1K req',  rate: 0.0004, description: 'Object store GET/SELECT' },
  },

  // ── BANDWIDTH ──
  bandwidth: {
    egressGB:            { unit: 'GB',     rate: 0.085,  description: 'Egress to public internet' },
    egressDiscountTB:    { unit: 'GB',     rate: 0.065,  description: 'Egress >10 TB/month (volume)' },
    egressBulk100TB:     { unit: 'GB',     rate: 0.045,  description: 'Egress >100 TB/month (bulk)' },
    transitGB:           { unit: 'GB',     rate: 0.020,  description: 'Transit between mesh regions' },
    peeringGB:           { unit: 'GB',     rate: 0.010,  description: 'Private peering exchange' },
    ingressGB:           { unit: 'GB',     rate: 0.000,  description: 'Ingress (free)' },
    cdnGB:               { unit: 'GB',     rate: 0.040,  description: 'CDN edge delivery per GB' },
    acceleratedTransfer: { unit: 'GB',     rate: 0.120,  description: 'Accelerated / priority transfer' },
  },

  // ── CONGESTION OFFLOAD TOLL (Telecom Highway Model) ──
  congestionToll: {
    standardOffload:     { unit: 'GB',     rate: 0.15,   description: 'Standard congestion offload' },
    premiumOffload:      { unit: 'GB',     rate: 0.35,   description: 'Premium low-latency offload' },
    burstOffload:        { unit: 'GB',     rate: 0.50,   description: 'Burst / peak-hour offload' },
    carrierTransit:      { unit: 'GB',     rate: 0.08,   description: 'Carrier-to-carrier transit' },
    mobileEdgeOffload:   { unit: 'GB',     rate: 0.25,   description: 'Mobile edge (MEC) offload' },
    iotMicroCell:        { unit: 'per 1K', rate: 0.10,   description: 'IoT micro-cell relay (per 1K msgs)' },
  },

  // ── PRIORITY ROUTING / PREMIUM SLA ──
  premiumSLA: {
    standard:    { unit: 'month', rate: 0,       description: 'Standard SLA (99.9% uptime)' },
    enhanced:    { unit: 'month', rate: 2500,    description: 'Enhanced SLA (99.95%, 15-min response)' },
    premium:     { unit: 'month', rate: 10000,   description: 'Premium SLA (99.99%, 5-min response, dedicated TAM)' },
    missionCrit: { unit: 'month', rate: 50000,   description: 'Mission-Critical SLA (99.999%, 24/7 NOC, hot-failover)' },
    govFedRAMP:  { unit: 'month', rate: 75000,   description: 'Government FedRAMP-equivalent SLA' },
  },

  // ── DEDICATED NODE RESERVATIONS ──
  reservations: {
    dedicatedNode1Y:  { unit: 'node/month', rate: 850,   description: '1-year reserved dedicated mesh node' },
    dedicatedNode3Y:  { unit: 'node/month', rate: 550,   description: '3-year reserved dedicated mesh node' },
    gpuCluster1Y:     { unit: 'GPU/month',  rate: 2200,  description: '1-year reserved GPU cluster node' },
    gpuCluster3Y:     { unit: 'GPU/month',  rate: 1500,  description: '3-year reserved GPU cluster node' },
    edgePOP:          { unit: 'POP/month',  rate: 5000,  description: 'Dedicated edge POP deployment' },
    meshRegion:       { unit: 'region/mo',  rate: 25000,  description: 'Full mesh region reservation' },
  },

  // ── GOVERNMENT & CARRIER LICENSE TIERS ──
  licenseTiers: {
    carrierStarter:   { unit: 'month', rate: 15000,   description: 'Carrier Starter (up to 10 Gbps)' },
    carrierPro:       { unit: 'month', rate: 75000,   description: 'Carrier Professional (up to 100 Gbps)' },
    carrierEnterprise:{ unit: 'month', rate: 250000,  description: 'Carrier Enterprise (unlimited)' },
    govTier1:         { unit: 'month', rate: 50000,   description: 'Government Tier 1 (civilian agencies)' },
    govTier2:         { unit: 'month', rate: 150000,  description: 'Government Tier 2 (defense / classified)' },
    mvnoLicense:      { unit: 'month', rate: 35000,   description: 'MVNO sublicense (mobile virtual operator)' },
    ispPeering:       { unit: 'month', rate: 10000,   description: 'ISP peering agreement license' },
  },
};

// ── CONTRACT TERMS ──
const CONTRACT_TERMS = {
  paymentTerms: {
    net30: { days: 30, discount: 0, penalty: 0.015 },        // 1.5% late fee/month
    net60: { days: 60, discount: 0, penalty: 0.015 },
    net15: { days: 15, discount: 0.02, penalty: 0.02 },      // 2% early-pay discount
    prepaid: { days: 0, discount: 0.05, penalty: 0 },        // 5% discount
  },
  commitmentDiscounts: {
    '1year':  0.15,   // 15% off
    '3year':  0.30,   // 30% off
    '5year':  0.40,   // 40% off
  },
  volumeDiscounts: [
    { minSpend: 0,        discount: 0 },
    { minSpend: 10000,    discount: 0.05 },   // 5% off >$10K/mo
    { minSpend: 50000,    discount: 0.10 },   // 10% off >$50K/mo
    { minSpend: 100000,   discount: 0.15 },   // 15% off >$100K/mo
    { minSpend: 500000,   discount: 0.20 },   // 20% off >$500K/mo
    { minSpend: 1000000,  discount: 0.25 },   // 25% off >$1M/mo
  ],
  founderRoyalty: 0.30,
};

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE CLIENT PROFILES
// ═══════════════════════════════════════════════════════════════════

class EnterprisePricingEngine extends EventEmitter {
  constructor() {
    super();
    this.rateCard = RATE_CARD;
    this.contractTerms = CONTRACT_TERMS;
    this.clients = new Map();         // clientId → client profile
    this.contracts = new Map();       // contractId → contract
    this.purchaseOrders = new Map();  // poNumber → PO record
    this.stripeProducts = new Map();  // rateKey → { productId, priceId }
    this.stripeCustomers = new Map(); // clientId → stripeCustomerId
    this.running = false;
  }

  async initialize() {
    this.running = true;
    // Sync rate card to Stripe products
    await this._syncRateCardToStripe();
    console.log('  💲 Enterprise Pricing Engine initialized (Stripe-integrated)');
    console.log(`     Rate categories: ${Object.keys(RATE_CARD).length}`);
    console.log(`     Total line items: ${Object.values(RATE_CARD).reduce((s, c) => s + Object.keys(c).length, 0)}`);
    console.log(`     Stripe products synced: ${this.stripeProducts.size}`);
    return this;
  }

  // ── STRIPE PRODUCT SYNC ──

  async _syncRateCardToStripe() {
    this.stripeProducts = new Map();   // rateKey → { productId, priceId }
    this.stripeCustomers = new Map();  // clientId → stripeCustomerId

    for (const [category, items] of Object.entries(RATE_CARD)) {
      for (const [type, entry] of Object.entries(items)) {
        const rateKey = `${category}.${type}`;
        try {
          if (entry.rate === 0) continue; // skip free tiers
          const result = await stripeService.createProduct({
            name: `DarCloud™ ${category}/${type}`,
            description: entry.description,
            metadata: {
              darcloud: 'enterprise',
              category,
              type,
              unit: entry.unit,
              listRate: String(entry.rate),
              founder: 'Omar_Mohammad_Abunadi',
            },
            price: Math.round(entry.rate * 100), // cents
            currency: 'usd',
          });
          this.stripeProducts.set(rateKey, {
            productId: result.product.id,
            priceId: result.price?.id || null,
            rate: entry.rate,
          });
        } catch (err) {
          // Non-fatal — product may already exist or Stripe rate-limited
          console.log(`     ⚠ Stripe sync skip ${rateKey}: ${err.message?.substring(0, 60)}`);
        }
      }
    }
  }

  // ── STRIPE-INTEGRATED CLIENT MANAGEMENT ──

  async registerClientWithStripe(clientData) {
    // Register locally first
    const client = this.registerClient(clientData);

    // Create real Stripe customer
    try {
      const stripeCustomer = await stripeService.stripe.customers.create({
        email: clientData.billingEmail,
        name: clientData.companyName,
        phone: clientData.phone || undefined,
        address: clientData.billingAddress ? {
          line1: clientData.billingAddress.street || clientData.billingAddress.line1 || '',
          city: clientData.billingAddress.city || '',
          state: clientData.billingAddress.state || '',
          postal_code: clientData.billingAddress.zip || clientData.billingAddress.postal_code || '',
          country: clientData.billingAddress.country || 'US',
        } : undefined,
        metadata: {
          darcloud_clientId: client.clientId,
          legalEntity: clientData.legalEntity || clientData.companyName,
          taxId: clientData.taxId || '',
          vendorPortal: clientData.vendorPortal || 'manual',
          paymentTerms: clientData.paymentTerms || 'net30',
          slaTier: clientData.slaTier || 'standard',
          licenseTier: clientData.licenseTier || '',
          founder: 'Omar_Mohammad_Abunadi',
          platform: 'DarCloud_QuranChain',
        },
        invoice_settings: {
          custom_fields: [
            { name: 'DarCloud Client ID', value: client.clientId },
            { name: 'Payment Terms', value: clientData.paymentTerms || 'Net 30' },
          ],
        },
      });

      client.stripeCustomerId = stripeCustomer.id;
      this.stripeCustomers.set(client.clientId, stripeCustomer.id);
      this.emit('client-stripe-synced', { clientId: client.clientId, stripeCustomerId: stripeCustomer.id });
    } catch (err) {
      console.log(`  ⚠ Stripe customer creation failed for ${client.clientId}: ${err.message}`);
    }

    return client;
  }

  getStripeCustomerId(clientId) {
    const client = this.clients.get(clientId);
    return client?.stripeCustomerId || this.stripeCustomers.get(clientId) || null;
  }

  // ── STRIPE-INTEGRATED CONTRACT ──

  async activateContractStripe(contractId) {
    const contract = this.signContract(contractId);
    const client = this.clients.get(contract.clientId);
    const stripeCustomerId = this.getStripeCustomerId(contract.clientId);

    if (!stripeCustomerId) return contract;

    // Create Stripe subscriptions for reservations and licenses
    try {
      // SLA subscription
      const slaTier = contract.sla?.tier;
      const slaKey = `premiumSLA.${slaTier}`;
      const slaProduct = this.stripeProducts.get(slaKey);
      if (slaProduct && slaProduct.priceId) {
        const sub = await stripeService.createSubscription(stripeCustomerId, slaProduct.priceId, {
          metadata: {
            darcloud_contractId: contractId,
            type: 'sla',
            tier: slaTier,
            founder: 'Omar_Mohammad_Abunadi',
          },
        });
        contract.stripeSLASubscription = sub.id;
      }

      // License subscription
      const licenseTier = client?.licenseTier;
      if (licenseTier) {
        const licKey = `licenseTiers.${licenseTier}`;
        const licProduct = this.stripeProducts.get(licKey);
        if (licProduct && licProduct.priceId) {
          const sub = await stripeService.createSubscription(stripeCustomerId, licProduct.priceId, {
            metadata: {
              darcloud_contractId: contractId,
              type: 'license',
              tier: licenseTier,
              founder: 'Omar_Mohammad_Abunadi',
            },
          });
          contract.stripeLicenseSubscription = sub.id;
        }
      }

      // Reservation subscriptions
      for (const res of contract.reservations || []) {
        const resKey = `reservations.${res.type}`;
        const resProduct = this.stripeProducts.get(resKey);
        if (resProduct && resProduct.priceId) {
          const sub = await stripeService.createSubscription(stripeCustomerId, resProduct.priceId, {
            metadata: {
              darcloud_contractId: contractId,
              type: 'reservation',
              reservationType: res.type,
              quantity: String(res.quantity || 1),
              founder: 'Omar_Mohammad_Abunadi',
            },
          });
          if (!contract.stripeReservationSubs) contract.stripeReservationSubs = [];
          contract.stripeReservationSubs.push(sub.id);
        }
      }

      this.emit('contract-stripe-activated', { contractId, stripeCustomerId });
    } catch (err) {
      console.log(`  ⚠ Stripe contract activation partial for ${contractId}: ${err.message}`);
    }

    return contract;
  }

  // ── CREATE STRIPE INVOICE FOR USAGE ──

  async createUsageInvoice(clientId, usageItems, options = {}) {
    const stripeCustomerId = this.getStripeCustomerId(clientId);
    if (!stripeCustomerId) throw new Error('Client not synced to Stripe: ' + clientId);

    const cost = this.calculateUsageCost(usageItems, clientId);
    const client = this.clients.get(clientId);
    const contract = Array.from(this.contracts.values())
      .find(c => c.clientId === clientId && c.status === 'active');

    // Create Stripe invoice with line items
    const invoice = await stripeService.stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: CONTRACT_TERMS.paymentTerms[contract?.paymentTerms || 'net30']?.days || 30,
      description: options.description || `DarCloud™ Infrastructure Services — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      metadata: {
        darcloud_clientId: clientId,
        darcloud_contractId: contract?.contractId || '',
        invoiceType: 'enterprise_usage',
        subtotal: String(cost.subtotal.toFixed(2)),
        volumeDiscount: String(cost.volumeDiscount.amount.toFixed(2)),
        slaFee: String(cost.sla.fee.toFixed(2)),
        licenseFee: String(cost.license.fee.toFixed(2)),
        founderRoyalty: String(cost.founderRoyalty.amount.toFixed(2)),
        total: String(cost.total.toFixed(2)),
        founder: 'Omar_Mohammad_Abunadi',
        platform: 'DarCloud_QuranChain',
      },
      footer: 'DarCloud™ Fungi Mesh Network™ — Powered by QuranChain | © Omar Mohammad Abunadi™',
    });

    // Add line items for each usage category
    for (const item of cost.lineItems) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: invoice.id,
        amount: Math.round(item.lineTotal * 100), // cents
        currency: 'usd',
        description: `${item.description} — ${item.quantity} ${item.unit} @ $${item.effectiveRate.toFixed(4)}/${item.unit}${item.discount > 0 ? ` (${(item.discount * 100).toFixed(0)}% discount)` : ''}`,
        metadata: {
          category: item.category,
          type: item.type,
          quantity: String(item.quantity),
          listRate: String(item.listRate),
          effectiveRate: String(item.effectiveRate),
        },
      });
    }

    // SLA fee line item
    if (cost.sla.fee > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: invoice.id,
        amount: Math.round(cost.sla.fee * 100),
        currency: 'usd',
        description: `Premium SLA (${cost.sla.tier}) — Monthly Service Fee`,
      });
    }

    // License fee line item
    if (cost.license.fee > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: invoice.id,
        amount: Math.round(cost.license.fee * 100),
        currency: 'usd',
        description: `${cost.license.tier} License — Monthly Fee`,
      });
    }

    // Founder royalty line item
    if (cost.founderRoyalty.amount > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: invoice.id,
        amount: Math.round(cost.founderRoyalty.amount * 100),
        currency: 'usd',
        description: `Founder Infrastructure Royalty (${(cost.founderRoyalty.rate * 100).toFixed(0)}%)`,
      });
    }

    // Volume discount credit
    if (cost.volumeDiscount.amount > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: invoice.id,
        amount: -Math.round(cost.volumeDiscount.amount * 100), // negative = credit
        currency: 'usd',
        description: `Volume Discount (${(cost.volumeDiscount.rate * 100).toFixed(0)}% off — spend tier)`,
      });
    }

    // Early pay discount credit
    if (cost.earlyPayDiscount.amount > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: invoice.id,
        amount: -Math.round(cost.earlyPayDiscount.amount * 100),
        currency: 'usd',
        description: `Early Payment Discount (${(cost.earlyPayDiscount.rate * 100).toFixed(0)}%)`,
      });
    }

    // Finalize and send
    const finalized = await stripeService.finalizeInvoice(invoice.id);
    const sent = await stripeService.sendInvoice(finalized.id);

    const record = {
      invoiceId: sent.id,
      clientId,
      stripeCustomerId,
      contractId: contract?.contractId || null,
      cost,
      status: 'sent',
      sentAt: Date.now(),
      dueDate: sent.due_date ? new Date(sent.due_date * 1000).toISOString() : null,
      hostedUrl: sent.hosted_invoice_url,
      pdfUrl: sent.invoice_pdf,
    };

    this.emit('invoice-sent', record);
    return record;
  }

  // ── CLIENT MANAGEMENT ──

  registerClient(clientData) {
    const clientId = 'dc_' + crypto.randomBytes(8).toString('hex');
    const client = {
      clientId,
      companyName: clientData.companyName,
      legalEntity: clientData.legalEntity || clientData.companyName,
      billingEmail: clientData.billingEmail,
      billingAddress: clientData.billingAddress || {},
      accountsPayableEmail: clientData.accountsPayableEmail,
      taxId: clientData.taxId || null,
      vendorPortal: clientData.vendorPortal || null,    // 'coupa', 'ariba', 'manual'
      paymentTerms: clientData.paymentTerms || 'net30',
      commitmentTerm: clientData.commitmentTerm || null, // '1year', '3year', '5year'
      slaTier: clientData.slaTier || 'standard',
      licenseTier: clientData.licenseTier || null,
      wireInstructions: clientData.wireInstructions || null,
      status: 'active',
      apiKeys: [this._generateApiKey(clientData.companyName)],
      onboarded: Date.now(),
      metadata: clientData.metadata || {},
    };

    this.clients.set(clientId, client);
    this.emit('client-registered', client);
    return client;
  }

  getClient(clientId) {
    return this.clients.get(clientId);
  }

  listClients() {
    return Array.from(this.clients.values()).map(c => ({
      clientId: c.clientId,
      companyName: c.companyName,
      slaTier: c.slaTier,
      paymentTerms: c.paymentTerms,
      status: c.status,
      apiKeys: c.apiKeys.length,
    }));
  }

  _generateApiKey(prefix) {
    const clean = (prefix || 'dc').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toLowerCase();
    return `dcsk_${clean}_${crypto.randomBytes(24).toString('hex')}`;
  }

  // ── CONTRACT MANAGEMENT ──

  createContract(clientId, contractData) {
    const client = this.clients.get(clientId);
    if (!client) throw new Error('Client not found: ' + clientId);

    const contractId = 'MSA-' + new Date().getFullYear() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const contract = {
      contractId,
      clientId,
      clientName: client.companyName,
      type: contractData.type || 'MSA',  // MSA, SOF, AMENDMENT
      status: 'draft',

      // Master Service Agreement fields
      effectiveDate: contractData.effectiveDate || new Date().toISOString().split('T')[0],
      termMonths: contractData.termMonths || 12,
      expirationDate: null,
      autoRenew: contractData.autoRenew !== false,

      // SLA
      sla: {
        tier: contractData.slaTier || client.slaTier || 'standard',
        uptimeGuarantee: this._slaUptime(contractData.slaTier || client.slaTier),
        responseTimeSLA: this._slaResponse(contractData.slaTier || client.slaTier),
        creditPolicy: 'Service credits for downtime exceeding SLA (10% per 0.1% below target)',
        escalationPath: ['NOC', 'Engineering Lead', 'VP Infrastructure', 'Founder'],
      },

      // Pricing
      commitmentTerm: contractData.commitmentTerm || null,
      commitmentDiscount: contractData.commitmentTerm
        ? this.contractTerms.commitmentDiscounts[contractData.commitmentTerm] || 0 : 0,
      paymentTerms: contractData.paymentTerms || client.paymentTerms || 'net30',
      minimumMonthly: contractData.minimumMonthly || 0,
      reservations: contractData.reservations || [],

      // Legal
      governingLaw: contractData.governingLaw || 'State of California, United States',
      arbitration: 'JAMS arbitration, San Francisco, CA',
      confidentiality: true,
      dataProcessingAddendum: true,
      liabilityCapMultiplier: contractData.liabilityCapMultiplier || 12, // 12x monthly fees

      // Payment
      latePenaltyRate: this.contractTerms.paymentTerms[
        contractData.paymentTerms || client.paymentTerms || 'net30'
      ]?.penalty || 0.015,

      // Throttling / cutoff
      throttleAfterDays: 45,      // Throttle bandwidth to 10% after 45 days unpaid
      cutoffAfterDays: 90,        // Revoke API keys after 90 days unpaid
      disputeWindowDays: 15,      // 15 days to dispute before enforcement

      createdAt: Date.now(),
      signedAt: null,
      serviceOrders: [],
    };

    // Calculate expiration
    const start = new Date(contract.effectiveDate);
    start.setMonth(start.getMonth() + contract.termMonths);
    contract.expirationDate = start.toISOString().split('T')[0];

    this.contracts.set(contractId, contract);
    this.emit('contract-created', contract);
    return contract;
  }

  signContract(contractId) {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');
    contract.status = 'active';
    contract.signedAt = Date.now();
    return contract;
  }

  // ── SERVICE ORDER FORM (SOF) ──

  createServiceOrder(contractId, orderData) {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error('Contract not found');

    const sofId = 'SOF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const sof = {
      sofId,
      contractId,
      clientId: contract.clientId,
      description: orderData.description,
      lineItems: (orderData.lineItems || []).map(item => {
        const category = this.rateCard[item.category];
        if (!category) throw new Error(`Unknown category: ${item.category}`);
        const rateEntry = category[item.type];
        if (!rateEntry) throw new Error(`Unknown type: ${item.type} in ${item.category}`);

        const discount = contract.commitmentDiscount || 0;
        const effectiveRate = rateEntry.rate * (1 - discount);

        return {
          category: item.category,
          type: item.type,
          description: rateEntry.description,
          unit: rateEntry.unit,
          listRate: rateEntry.rate,
          discount,
          effectiveRate,
          estimatedQuantity: item.estimatedQuantity || 0,
          estimatedMonthly: effectiveRate * (item.estimatedQuantity || 0),
        };
      }),
      status: 'active',
      createdAt: Date.now(),
    };

    contract.serviceOrders.push(sof);
    return sof;
  }

  // ── PURCHASE ORDER MANAGEMENT ──

  recordPurchaseOrder(clientId, poData) {
    const client = this.clients.get(clientId);
    if (!client) throw new Error('Client not found');

    const po = {
      poNumber: poData.poNumber,
      clientId,
      clientName: client.companyName,
      contractId: poData.contractId || null,
      amount: poData.amount,
      currency: poData.currency || 'USD',
      description: poData.description || 'DarCloud Infrastructure Services',
      issuedDate: poData.issuedDate || new Date().toISOString().split('T')[0],
      expirationDate: poData.expirationDate || null,
      status: 'active',
      amountUsed: 0,
      amountRemaining: poData.amount,
      createdAt: Date.now(),
    };

    this.purchaseOrders.set(po.poNumber, po);
    this.emit('po-recorded', po);
    return po;
  }

  getPurchaseOrder(poNumber) {
    return this.purchaseOrders.get(poNumber);
  }

  listPurchaseOrders(clientId) {
    return Array.from(this.purchaseOrders.values())
      .filter(po => !clientId || po.clientId === clientId);
  }

  // ── PRICING CALCULATIONS ──

  calculateUsageCost(usageItems, clientId) {
    const client = clientId ? this.clients.get(clientId) : null;
    const contract = client ? Array.from(this.contracts.values())
      .find(c => c.clientId === clientId && c.status === 'active') : null;

    const commitDiscount = contract?.commitmentDiscount || 0;
    let subtotal = 0;
    const lineItems = [];

    for (const item of usageItems) {
      const category = this.rateCard[item.category];
      if (!category) continue;
      const rateEntry = category[item.type];
      if (!rateEntry) continue;

      const listRate = rateEntry.rate;
      const effectiveRate = listRate * (1 - commitDiscount);
      const lineTotal = effectiveRate * (item.quantity || 0);

      lineItems.push({
        category: item.category,
        type: item.type,
        description: rateEntry.description,
        unit: rateEntry.unit,
        quantity: item.quantity,
        listRate,
        discount: commitDiscount,
        effectiveRate,
        lineTotal,
      });
      subtotal += lineTotal;
    }

    // Volume discount
    let volumeDiscount = 0;
    for (const tier of [...this.contractTerms.volumeDiscounts].reverse()) {
      if (subtotal >= tier.minSpend) { volumeDiscount = tier.discount; break; }
    }
    const volumeDiscountAmount = subtotal * volumeDiscount;
    const afterVolume = subtotal - volumeDiscountAmount;

    // SLA fee
    const slaTier = contract?.sla?.tier || client?.slaTier || 'standard';
    const slaFee = this.rateCard.premiumSLA[slaTier]?.rate || 0;

    // License fee
    const licenseTier = client?.licenseTier;
    const licenseFee = licenseTier ? (this.rateCard.licenseTiers[licenseTier]?.rate || 0) : 0;

    // Founder royalty
    const founderRoyalty = (afterVolume + slaFee + licenseFee) * this.contractTerms.founderRoyalty;

    // Payment discount
    const payTerms = this.contractTerms.paymentTerms[contract?.paymentTerms || client?.paymentTerms || 'net30'];
    const earlyPayDiscount = payTerms?.discount || 0;
    const earlyPayAmount = (afterVolume + slaFee + licenseFee + founderRoyalty) * earlyPayDiscount;

    const total = afterVolume + slaFee + licenseFee + founderRoyalty - earlyPayAmount;

    return {
      lineItems,
      subtotal,
      volumeDiscount: { rate: volumeDiscount, amount: volumeDiscountAmount },
      afterVolumeDiscount: afterVolume,
      sla: { tier: slaTier, fee: slaFee },
      license: { tier: licenseTier, fee: licenseFee },
      founderRoyalty: { rate: this.contractTerms.founderRoyalty, amount: founderRoyalty },
      earlyPayDiscount: { rate: earlyPayDiscount, amount: earlyPayAmount },
      total,
      currency: 'USD',
    };
  }

  // ── HELPERS ──

  _slaUptime(tier) {
    const map = { standard: '99.9%', enhanced: '99.95%', premium: '99.99%', missionCrit: '99.999%', govFedRAMP: '99.999%' };
    return map[tier] || '99.9%';
  }

  _slaResponse(tier) {
    const map = { standard: '4 hours', enhanced: '15 minutes', premium: '5 minutes', missionCrit: '1 minute', govFedRAMP: '1 minute' };
    return map[tier] || '4 hours';
  }

  // ── STATUS ──

  getStatus() {
    return {
      running: this.running,
      clients: this.clients.size,
      contracts: this.contracts.size,
      purchaseOrders: this.purchaseOrders.size,
      rateCategories: Object.keys(this.rateCard).length,
      totalRateItems: Object.values(this.rateCard).reduce((s, c) => s + Object.keys(c).length, 0),
    };
  }

  getRateCard() {
    return JSON.parse(JSON.stringify(this.rateCard));
  }

  getContractTerms() {
    return JSON.parse(JSON.stringify(this.contractTerms));
  }

  async shutdown() {
    this.running = false;
    console.log('  🛑 Enterprise Pricing Engine shut down');
  }
}

module.exports = { EnterprisePricingEngine, RATE_CARD, CONTRACT_TERMS };
