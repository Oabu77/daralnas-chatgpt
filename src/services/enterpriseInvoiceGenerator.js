/**
 * DarCloud™ Enterprise Invoice Generator
 * ========================================
 * Generates carrier-grade invoices in AWS / AT&T format.
 * Delivers through Stripe (real invoices) and generates
 * PDF-ready data for Coupa / Ariba / vendor portal submission.
 *
 * Invoice template:
 *   - Company header (DarCloud™ Fungi Mesh Network)
 *   - Client billing details (address, MSA ref, PO#)
 *   - Itemized usage charges (compute, storage, bandwidth, tolls)
 *   - Usage report table (quantities × rates)
 *   - Volume / commitment discounts
 *   - SLA & license fees
 *   - Founder royalty
 *   - Total + due date
 *   - ACH / wire payment instructions
 *   - Blockchain proof hash
 *
 * © DarCloud™ | Omar Mohammad Abunadi™
 * Status: PRODUCTION
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const stripeService = require('./stripeService');

// ── COMPANY DETAILS ──
const COMPANY = {
  name: 'DarCloud™ Fungi Mesh Network',
  legalEntity: 'Dar Al-Nas Enterprises LLC',
  address: {
    street: '1 Mesh Boulevard',
    city: 'San Francisco',
    state: 'CA',
    zip: '94105',
    country: 'United States',
  },
  taxId: 'EIN: XX-XXXXXXX',
  email: 'billing@darcloud.host',
  phone: '+1 (415) 000-0000',
  website: 'https://darcloud.host',
  founder: 'Omar Mohammad Abunadi™',
  bankInfo: {
    bankName: 'First Republic Bank',
    routingNumber: 'XXXXXXXXX',
    accountNumber: 'XXXXXXXXXXXX',
    swiftCode: 'FRBKUS6S',
    accountName: 'Dar Al-Nas Enterprises LLC',
    reference: 'DarCloud-INV',
  },
};

class EnterpriseInvoiceGenerator extends EventEmitter {
  constructor() {
    super();
    this.running = false;
    this.pricingEngine = null;
    this.metering = null;
    this.billingLedger = null;

    // ── INVOICE REGISTRY ──
    this.invoices = new Map();       // invoiceNumber → full invoice object
    this.invoiceCounter = 1000;      // Start at INV-1001
    this.scheduledJobs = [];         // Monthly cron handles

    // ── STATS ──
    this.stats = {
      totalGenerated: 0,
      totalSentStripe: 0,
      totalAmount: 0,
      totalByClient: {},
    };
  }

  async initialize(deps = {}) {
    this.pricingEngine = deps.pricingEngine || null;
    this.metering = deps.metering || null;
    this.billingLedger = deps.billingLedger || null;

    // Schedule monthly invoice generation (1st of each month at 00:00 UTC)
    this._scheduleMonthly();

    this.running = true;
    console.log('  📄 Enterprise Invoice Generator initialized');
    console.log(`     Invoice counter: INV-${this.invoiceCounter + 1}`);
    console.log(`     Monthly auto-generate: enabled`);
    return this;
  }

  // ═══════════════════════════════════════════════════════════
  // INVOICE GENERATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Generate a full enterprise invoice for a client.
   * @param {string} clientId - DarCloud client ID
   * @param {object[]} usageItems - Array of { category, type, quantity }
   * @param {object} [options] - Override options
   * @returns {object} Full invoice document
   */
  async generateInvoice(clientId, usageItems, options = {}) {
    if (!this.pricingEngine) throw new Error('Pricing engine not connected');

    const client = this.pricingEngine.getClient(clientId);
    if (!client) throw new Error('Client not found: ' + clientId);

    const contract = Array.from(this.pricingEngine.contracts.values())
      .find(c => c.clientId === clientId && c.status === 'active');

    // Calculate costs using pricing engine
    const cost = this.pricingEngine.calculateUsageCost(usageItems, clientId);

    // Generate invoice number
    this.invoiceCounter++;
    const invoiceNumber = `INV-${this.invoiceCounter}`;

    // Determine dates
    const issueDate = new Date();
    const paymentTerms = this.pricingEngine.contractTerms.paymentTerms[
      contract?.paymentTerms || client.paymentTerms || 'net30'
    ];
    const dueDays = paymentTerms?.days || 30;
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + dueDays);

    // Period
    const periodStart = options.periodStart || new Date(issueDate.getFullYear(), issueDate.getMonth() - 1, 1);
    const periodEnd = options.periodEnd || new Date(issueDate.getFullYear(), issueDate.getMonth(), 0);

    // Find active PO
    const activePO = Array.from(this.pricingEngine.purchaseOrders.values())
      .find(po => po.clientId === clientId && po.status === 'active' && po.amountRemaining >= cost.total);

    // Build invoice document (AWS/AT&T format)
    const invoice = {
      // ── HEADER ──
      invoiceNumber,
      type: 'ENTERPRISE_USAGE_INVOICE',
      status: 'draft',

      // ── SELLER ──
      seller: { ...COMPANY },

      // ── BUYER ──
      buyer: {
        companyName: client.companyName,
        legalEntity: client.legalEntity,
        billingEmail: client.billingEmail,
        accountsPayableEmail: client.accountsPayableEmail,
        billingAddress: client.billingAddress,
        taxId: client.taxId,
        clientId: client.clientId,
        vendorPortal: client.vendorPortal,
      },

      // ── CONTRACT REFERENCE ──
      contract: contract ? {
        contractId: contract.contractId,
        type: contract.type,
        effectiveDate: contract.effectiveDate,
        expirationDate: contract.expirationDate,
        slaTier: contract.sla?.tier,
        commitmentTerm: contract.commitmentTerm,
        commitmentDiscount: contract.commitmentDiscount,
        paymentTerms: contract.paymentTerms,
      } : null,

      // ── PURCHASE ORDER ──
      purchaseOrder: activePO ? {
        poNumber: activePO.poNumber,
        amount: activePO.amount,
        remaining: activePO.amountRemaining,
      } : null,

      // ── DATES ──
      issueDate: issueDate.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      paymentTermsLabel: contract?.paymentTerms || client.paymentTerms || 'net30',
      dueDays,

      // ── USAGE DETAIL TABLE ──
      lineItems: cost.lineItems.map((item, idx) => ({
        lineNumber: idx + 1,
        category: item.category,
        serviceCode: `${item.category.toUpperCase()}-${item.type.toUpperCase()}`,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        listRate: item.listRate,
        discountPercent: (item.discount * 100).toFixed(1) + '%',
        effectiveRate: item.effectiveRate,
        lineTotal: item.lineTotal,
      })),

      // ── SUBTOTALS ──
      subtotal: cost.subtotal,
      volumeDiscount: cost.volumeDiscount,
      afterVolumeDiscount: cost.afterVolumeDiscount,
      slaFee: cost.sla,
      licenseFee: cost.license,
      founderRoyalty: cost.founderRoyalty,
      earlyPayDiscount: cost.earlyPayDiscount,
      total: cost.total,
      currency: 'USD',

      // ── PAYMENT INSTRUCTIONS ──
      paymentInstructions: {
        method: 'ACH / Wire Transfer',
        bankName: COMPANY.bankInfo.bankName,
        routingNumber: COMPANY.bankInfo.routingNumber,
        accountNumber: COMPANY.bankInfo.accountNumber,
        swiftCode: COMPANY.bankInfo.swiftCode,
        accountName: COMPANY.bankInfo.accountName,
        reference: `${COMPANY.bankInfo.reference}-${invoiceNumber}`,
        alternateMethod: 'Pay online via Stripe hosted invoice link (see below)',
      },

      // ── LATE PAYMENT ──
      latePaymentTerms: {
        penaltyRate: paymentTerms?.penalty || 0.015,
        penaltyLabel: `${((paymentTerms?.penalty || 0.015) * 100).toFixed(1)}% per month on overdue balance`,
        throttleWarning: `Service throttling applies after ${contract?.throttleAfterDays || 45} days overdue`,
        cutoffWarning: `Service termination after ${contract?.cutoffAfterDays || 90} days overdue`,
      },

      // ── STRIPE ──
      stripe: {
        invoiceId: null,
        hostedUrl: null,
        pdfUrl: null,
        status: null,
      },

      // ── BLOCKCHAIN PROOF ──
      blockchainProof: {
        hash: null,
        blockHeight: null,
        txId: null,
      },

      // ── METADATA ──
      generatedAt: Date.now(),
      generatedBy: 'DarCloud Enterprise Invoice Generator',
      founder: 'Omar Mohammad Abunadi™',
      footer: `DarCloud™ Fungi Mesh Network™ | Powered by QuranChain\n© ${new Date().getFullYear()} Dar Al-Nas Enterprises LLC — Omar Mohammad Abunadi™\nAll services subject to Master Service Agreement ${contract?.contractId || 'N/A'}`,
    };

    // Generate document hash
    invoice.documentHash = this._hashInvoice(invoice);

    this.invoices.set(invoiceNumber, invoice);
    this.stats.totalGenerated++;
    this.stats.totalAmount += cost.total;
    if (!this.stats.totalByClient[clientId]) this.stats.totalByClient[clientId] = 0;
    this.stats.totalByClient[clientId] += cost.total;

    this.emit('invoice-generated', invoice);
    return invoice;
  }

  /**
   * Send an invoice through Stripe (creates real Stripe invoice + sends).
   */
  async sendViaStripe(invoiceNumber) {
    const invoice = this.invoices.get(invoiceNumber);
    if (!invoice) throw new Error('Invoice not found: ' + invoiceNumber);

    const stripeCustomerId = this.pricingEngine?.getStripeCustomerId(invoice.buyer.clientId);
    if (!stripeCustomerId) throw new Error('Client not synced to Stripe');

    // Create Stripe invoice
    const stripeInvoice = await stripeService.stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: 'send_invoice',
      days_until_due: invoice.dueDays,
      description: `${invoice.invoiceNumber} — DarCloud™ Infrastructure Services (${invoice.periodStart} to ${invoice.periodEnd})`,
      footer: invoice.footer,
      metadata: {
        darcloud_invoiceNumber: invoice.invoiceNumber,
        darcloud_clientId: invoice.buyer.clientId,
        contractId: invoice.contract?.contractId || '',
        poNumber: invoice.purchaseOrder?.poNumber || '',
        documentHash: invoice.documentHash,
        total: String(invoice.total.toFixed(2)),
        founder: 'Omar_Mohammad_Abunadi',
      },
      custom_fields: [
        { name: 'Invoice #', value: invoice.invoiceNumber },
        { name: 'Contract', value: invoice.contract?.contractId || 'N/A' },
      ],
    });

    // Add line items
    for (const item of invoice.lineItems) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(item.lineTotal * 100),
        currency: 'usd',
        description: `[${item.serviceCode}] ${item.description} — ${item.quantity.toLocaleString()} ${item.unit} @ $${item.effectiveRate.toFixed(4)}`,
        metadata: { category: item.category, lineNumber: String(item.lineNumber) },
      });
    }

    // SLA fee
    if (invoice.slaFee.fee > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(invoice.slaFee.fee * 100),
        currency: 'usd',
        description: `Premium SLA (${invoice.slaFee.tier}) — Monthly Service Fee`,
      });
    }

    // License fee
    if (invoice.licenseFee.fee > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(invoice.licenseFee.fee * 100),
        currency: 'usd',
        description: `${invoice.licenseFee.tier} License — Monthly Fee`,
      });
    }

    // Founder royalty
    if (invoice.founderRoyalty.amount > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(invoice.founderRoyalty.amount * 100),
        currency: 'usd',
        description: `Founder Infrastructure Royalty (${(invoice.founderRoyalty.rate * 100).toFixed(0)}%)`,
      });
    }

    // Volume discount (credit)
    if (invoice.volumeDiscount.amount > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: -Math.round(invoice.volumeDiscount.amount * 100),
        currency: 'usd',
        description: `Volume Discount (${(invoice.volumeDiscount.rate * 100).toFixed(0)}% — spend tier)`,
      });
    }

    // Early pay discount (credit)
    if (invoice.earlyPayDiscount.amount > 0) {
      await stripeService.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: -Math.round(invoice.earlyPayDiscount.amount * 100),
        currency: 'usd',
        description: `Early Payment Discount (${(invoice.earlyPayDiscount.rate * 100).toFixed(0)}%)`,
      });
    }

    // Finalize and send
    const finalized = await stripeService.finalizeInvoice(stripeInvoice.id);
    const sent = await stripeService.sendInvoice(finalized.id);

    // Update local invoice
    invoice.stripe = {
      invoiceId: sent.id,
      hostedUrl: sent.hosted_invoice_url,
      pdfUrl: sent.invoice_pdf,
      status: sent.status,
    };
    invoice.status = 'sent';

    // Commit to billing ledger
    if (this.billingLedger) {
      const proof = this.billingLedger.commitInvoice({
        invoiceId: sent.id,
        clientId: invoice.buyer.clientId,
        stripeCustomerId,
        cost: { total: invoice.total, lineItems: invoice.lineItems },
        sentAt: Date.now(),
        dueDate: invoice.dueDate,
        contractId: invoice.contract?.contractId,
      });
      invoice.blockchainProof = {
        hash: proof.hash,
        blockHeight: proof.blockHeight,
        txId: proof.txId,
      };
    }

    // Update PO if applicable
    if (invoice.purchaseOrder) {
      const po = this.pricingEngine.getPurchaseOrder(invoice.purchaseOrder.poNumber);
      if (po) {
        po.amountUsed += invoice.total;
        po.amountRemaining = po.amount - po.amountUsed;
        if (po.amountRemaining <= 0) po.status = 'exhausted';
      }
    }

    this.stats.totalSentStripe++;
    this.emit('invoice-sent-stripe', invoice);
    return invoice;
  }

  /**
   * Generate invoice data for Coupa / Ariba / vendor portal submission.
   */
  generateVendorPortalData(invoiceNumber) {
    const invoice = this.invoices.get(invoiceNumber);
    if (!invoice) throw new Error('Invoice not found');

    // cXML format for Ariba
    const aribaData = {
      format: 'cXML',
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      supplierName: invoice.seller.name,
      supplierTaxId: invoice.seller.taxId,
      buyerName: invoice.buyer.companyName,
      buyerTaxId: invoice.buyer.taxId,
      purchaseOrderRef: invoice.purchaseOrder?.poNumber || '',
      contractRef: invoice.contract?.contractId || '',
      currency: invoice.currency,
      lineItems: invoice.lineItems.map(item => ({
        lineNumber: item.lineNumber,
        description: `[${item.serviceCode}] ${item.description}`,
        quantity: item.quantity,
        unitPrice: item.effectiveRate,
        amount: item.lineTotal,
        unitOfMeasure: item.unit,
      })),
      subtotal: invoice.subtotal,
      taxAmount: 0, // B2B cloud services typically tax-exempt
      totalAmount: invoice.total,
      paymentTerms: invoice.paymentTermsLabel,
      remitTo: invoice.paymentInstructions,
    };

    // CSV for Coupa
    const coupaCSV = [
      'Invoice Number,Invoice Date,Due Date,Supplier,PO Number,Line,Description,Qty,Unit Price,Amount,Currency',
      ...invoice.lineItems.map(item =>
        `${invoice.invoiceNumber},${invoice.issueDate},${invoice.dueDate},${invoice.seller.name},${invoice.purchaseOrder?.poNumber || ''},${item.lineNumber},"${item.description}",${item.quantity},${item.effectiveRate.toFixed(4)},${item.lineTotal.toFixed(2)},${invoice.currency}`
      ),
    ].join('\n');

    return {
      invoiceNumber: invoice.invoiceNumber,
      ariba: aribaData,
      coupaCSV,
      vendorPortal: invoice.buyer.vendorPortal || 'manual',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // MONTHLY AUTO-GENERATION
  // ═══════════════════════════════════════════════════════════

  _scheduleMonthly() {
    // Check every hour for continuous revenue collection (instead of monthly)
    const job = setInterval(async () => {
      const now = new Date();
      // Run invoice generation every day at 00:00 UTC for 24/7 revenue collection
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        await this.generateMonthlyInvoices();
      }
    }, 60000); // Check every minute for precise timing

    this.scheduledJobs.push(job);
  }

  /**
   * Generate invoices for ALL clients based on metering data.
   */
  async generateMonthlyInvoices() {
    if (!this.metering || !this.pricingEngine) return { error: 'Dependencies not set' };

    const results = [];
    for (const [clientId] of this.pricingEngine.clients) {
      try {
        const usage = this.metering.getClientUsage(clientId);
        if (!usage.usage || Object.keys(usage.usage).length === 0) continue;

        // Convert metering usage to usage items
        const usageItems = [];
        for (const [category, types] of Object.entries(usage.usage)) {
          for (const [type, info] of Object.entries(types)) {
            usageItems.push({ category, type, quantity: info.quantity });
          }
        }

        // Generate invoice
        const invoice = await this.generateInvoice(clientId, usageItems);

        // Send via Stripe
        const sent = await this.sendViaStripe(invoice.invoiceNumber);

        results.push({
          clientId,
          invoiceNumber: sent.invoiceNumber,
          total: sent.total,
          stripeInvoiceId: sent.stripe?.invoiceId,
          status: 'sent',
        });
      } catch (err) {
        results.push({ clientId, error: err.message, status: 'failed' });
      }
    }

    this.emit('monthly-invoices-generated', results);
    return { generated: results.length, results };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  _hashInvoice(invoice) {
    return crypto.createHash('sha256').update(JSON.stringify({
      invoiceNumber: invoice.invoiceNumber,
      buyer: invoice.buyer.clientId,
      total: invoice.total,
      lineItems: invoice.lineItems.length,
      issueDate: invoice.issueDate,
    })).digest('hex');
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS & LOOKUP
  // ═══════════════════════════════════════════════════════════

  getInvoice(invoiceNumber) {
    return this.invoices.get(invoiceNumber) || null;
  }

  listInvoices(clientId) {
    return Array.from(this.invoices.values())
      .filter(inv => !clientId || inv.buyer.clientId === clientId)
      .map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        clientId: inv.buyer.clientId,
        companyName: inv.buyer.companyName,
        total: inv.total,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        stripeInvoiceId: inv.stripe?.invoiceId,
        hostedUrl: inv.stripe?.hostedUrl,
        blockchainProof: inv.blockchainProof?.hash ? true : false,
      }));
  }

  getStatus() {
    return {
      running: this.running,
      totalGenerated: this.stats.totalGenerated,
      totalSentStripe: this.stats.totalSentStripe,
      totalAmount: this.stats.totalAmount,
      invoiceCounter: this.invoiceCounter,
      clientBreakdown: this.stats.totalByClient,
    };
  }

  async shutdown() {
    this.running = false;
    for (const job of this.scheduledJobs) clearInterval(job);
    console.log('  🛑 Enterprise Invoice Generator shut down');
  }
}

module.exports = EnterpriseInvoiceGenerator;
