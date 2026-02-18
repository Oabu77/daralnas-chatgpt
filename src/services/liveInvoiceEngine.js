/**
 * Live Invoice Engine — REAL Stripe Invoicing System
 * ====================================================
 * Creates, finalizes, and sends REAL invoices via Stripe.
 * Handles recurring billing, toll invoices, subscription invoices,
 * and one-time service invoices.
 *
 * ALL invoices are REAL — sent to real email addresses, collected via Stripe.
 * NO simulated data. NO imaginary numbers.
 *
 * Founder: Omar Mohammad Abunadi™
 * Status: LIVE PRODUCTION
 */

const EventEmitter = require('events');
const stripeService = require('./stripeService');
const crypto = require('crypto');

class LiveInvoiceEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.founderRoyaltyRate = 0.30;
    this.founderAddress = 'Omar_Mohammad_Abunadi';
    this.running = false;

    // Invoice tracking
    this.invoices = new Map(); // invoiceId → invoice record
    this.metrics = {
      totalCreated: 0,
      totalFinalized: 0,
      totalSent: 0,
      totalPaid: 0,
      totalAmount: 0,
      totalCollected: 0,
      totalFounderRoyalty: 0,
      startedAt: null,
    };

    // Auto-billing intervals
    this._billingIntervals = [];
  }

  /**
   * Initialize the Live Invoice Engine
   */
  async initialize() {
    console.log('\n' + '═'.repeat(70));
    console.log('  📄 LIVE INVOICE ENGINE — LAUNCHING');
    console.log('  💳 Real Stripe invoices | Real billing | Real collection');
    console.log('  🚫 NO simulated data | NO imaginary numbers');
    console.log('  👑 30% Founder Royalty on all invoices');
    console.log('═'.repeat(70));

    this.metrics.startedAt = Date.now();
    this.running = true;

    console.log('  ✅ Live Invoice Engine ACTIVE');
    console.log('═'.repeat(70) + '\n');

    this.emit('engine-started', { timestamp: new Date().toISOString() });
    return this;
  }

  /**
   * Create a REAL invoice for a customer
   */
  async createInvoice(params) {
    const { customerId, items, daysUntilDue = 30, memo, metadata = {} } = params;

    if (!customerId) throw new Error('customerId required for real invoice');
    if (!items || items.length === 0) throw new Error('At least one line item required');

    try {
      // Create Stripe invoice
      const invoice = await stripeService.createInvoice({
        customerId,
        autoAdvance: false, // We control finalization
        collectionMethod: 'send_invoice',
        daysUntilDue,
        description: memo || 'QuranChain Services Invoice',
        metadata: {
          ...metadata,
          founderRoyaltyRate: String(this.founderRoyaltyRate),
          founderAddress: this.founderAddress,
          createdBy: 'LiveInvoiceEngine',
        },
      });

      // Add line items
      let totalAmount = 0;
      for (const item of items) {
        await stripeService.stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoice.id,
          amount: Math.round((item.amount || 0) * 100), // Convert to cents
          currency: item.currency || 'usd',
          description: item.description || 'QuranChain Service',
        });
        totalAmount += item.amount || 0;
      }

      // Add founder royalty line item (visible on invoice)
      const royalty = totalAmount * this.founderRoyaltyRate;
      await stripeService.stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        amount: Math.round(royalty * 100),
        currency: 'usd',
        description: `Founder Royalty (${this.founderRoyaltyRate * 100}%) — Omar Mohammad Abunadi™`,
      });

      // Track
      const record = {
        invoiceId: invoice.id,
        customerId,
        items: items.length,
        subtotal: totalAmount,
        founderRoyalty: royalty,
        total: totalAmount + royalty,
        status: 'draft',
        createdAt: Date.now(),
        finalizedAt: null,
        sentAt: null,
        paidAt: null,
      };
      this.invoices.set(invoice.id, record);
      this.metrics.totalCreated++;
      this.metrics.totalAmount += totalAmount + royalty;

      this.emit('invoice-created', record);
      return record;
    } catch (error) {
      console.error('  ❌ Invoice creation error:', error.message);
      throw error;
    }
  }

  /**
   * Finalize and send a REAL invoice
   */
  async finalizeAndSend(invoiceId) {
    try {
      // Finalize
      const finalized = await stripeService.finalizeInvoice(invoiceId);
      this.metrics.totalFinalized++;

      const record = this.invoices.get(invoiceId);
      if (record) {
        record.status = 'finalized';
        record.finalizedAt = Date.now();
      }

      // Send to customer's email
      const sent = await stripeService.sendInvoice(invoiceId);
      this.metrics.totalSent++;

      if (record) {
        record.status = 'sent';
        record.sentAt = Date.now();
      }

      this.emit('invoice-sent', { invoiceId, status: 'sent' });

      return {
        invoiceId,
        status: 'sent',
        hostedUrl: finalized.hosted_invoice_url,
        pdfUrl: finalized.invoice_pdf,
      };
    } catch (error) {
      console.error('  ❌ Invoice send error:', error.message);
      throw error;
    }
  }

  /**
   * Create, finalize, and send in one call
   */
  async createAndSend(params) {
    const record = await this.createInvoice(params);
    const sent = await this.finalizeAndSend(record.invoiceId);
    return { ...record, ...sent };
  }

  /**
   * Create a toll invoice from Gas Toll Highway data
   */
  async createTollInvoice(customerId, tolls, period = 'monthly') {
    if (!tolls || tolls.length === 0) return { status: 'no_tolls' };

    // Group tolls by category + type
    const grouped = {};
    for (const toll of tolls) {
      const key = `${toll.category}:${toll.tollType}`;
      if (!grouped[key]) {
        grouped[key] = { amount: 0, quantity: 0, description: toll.description || key };
      }
      grouped[key].amount += toll.amount;
      grouped[key].quantity += toll.quantity;
    }

    const items = Object.entries(grouped).map(([key, data]) => ({
      amount: data.amount,
      description: `${data.description} (x${data.quantity}) — ${period}`,
      currency: 'usd',
    }));

    return this.createAndSend({
      customerId,
      items,
      daysUntilDue: 30,
      memo: `QuranChain Gas Toll Highway — ${period} invoice`,
      metadata: {
        type: 'gas_toll_invoice',
        period,
        tollCount: String(tolls.length),
      },
    });
  }

  /**
   * Create a subscription invoice
   */
  async createSubscriptionInvoice(customerId, plan, amount) {
    return this.createAndSend({
      customerId,
      items: [{
        amount,
        description: `QuranChain ${plan} Subscription`,
        currency: 'usd',
      }],
      daysUntilDue: 7,
      memo: `QuranChain ${plan} — Monthly Subscription`,
      metadata: { type: 'subscription_invoice', plan },
    });
  }

  /**
   * Create a service invoice (one-time)
   */
  async createServiceInvoice(customerId, services) {
    return this.createAndSend({
      customerId,
      items: services.map(s => ({
        amount: s.amount,
        description: s.description || s.name,
        currency: s.currency || 'usd',
      })),
      daysUntilDue: 30,
      memo: 'QuranChain Professional Services',
      metadata: { type: 'service_invoice' },
    });
  }

  /**
   * Handle webhook: invoice paid
   */
  handleInvoicePaid(invoiceId, amountPaid) {
    const record = this.invoices.get(invoiceId);
    if (record) {
      record.status = 'paid';
      record.paidAt = Date.now();
      record.amountPaid = amountPaid;
      this.metrics.totalPaid++;
      this.metrics.totalCollected += amountPaid;
      this.metrics.totalFounderRoyalty += amountPaid * this.founderRoyaltyRate;
      this.emit('invoice-paid', record);
    }
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      engine: {
        running: this.running,
        startedAt: this.metrics.startedAt ? new Date(this.metrics.startedAt).toISOString() : null,
        uptimeSeconds: this.metrics.startedAt ? Math.floor((Date.now() - this.metrics.startedAt) / 1000) : 0,
      },
      metrics: {
        totalCreated: this.metrics.totalCreated,
        totalFinalized: this.metrics.totalFinalized,
        totalSent: this.metrics.totalSent,
        totalPaid: this.metrics.totalPaid,
        totalAmount: this.metrics.totalAmount,
        totalCollected: this.metrics.totalCollected,
        totalFounderRoyalty: this.metrics.totalFounderRoyalty,
      },
      recentInvoices: Array.from(this.invoices.values()).slice(-20).map(r => ({
        invoiceId: r.invoiceId,
        customerId: r.customerId,
        total: r.total,
        status: r.status,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      })),
      founder: {
        address: this.founderAddress,
        royaltyRate: this.founderRoyaltyRate,
        totalRoyalty: this.metrics.totalFounderRoyalty,
      },
    };
  }

  /**
   * Shutdown
   */
  async shutdown() {
    this.running = false;
    for (const i of this._billingIntervals) clearInterval(i);
    this._billingIntervals = [];
    console.log('  🛑 Live Invoice Engine shut down');
  }
}

module.exports = LiveInvoiceEngine;
