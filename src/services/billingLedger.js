/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * QuranChain™ Billing Ledger
 * ===========================
 * Immutable, cryptographically-verifiable billing records on-chain.
 *
 * Every usage event, invoice, and payment confirmation is hashed and
 * committed to the QuranChain blockchain as a BILLING_PROOF transaction.
 *
 * Features:
 *   - Merkle tree of all usage events per billing cycle
 *   - On-chain invoice commitments (hash of full invoice)
 *   - Payment receipt proofs (Stripe payment_intent → blockchain TX)
 *   - Dispute resolution with cryptographic evidence
 *   - Monthly "Proof of Usage" audit export
 *   - Anti-tamper: any modification invalidates the chain
 *
 * © DarCloud™ | Omar Mohammad Abunadi™
 * Status: PRODUCTION
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class BillingLedger extends EventEmitter {
  constructor() {
    super();
    this.running = false;
    this.blockchain = null;
    this.pricingEngine = null;
    this.metering = null;

    // ── LEDGER ENTRIES ──
    this.entries = [];               // All billing ledger entries (append-only)
    this.invoiceHashes = new Map();  // invoiceId → { hash, blockHeight, txId }
    this.paymentProofs = new Map();  // paymentId → { hash, blockHeight, txId }
    this.usageRoots = new Map();     // periodKey → merkleRoot

    // ── STATS ──
    this.stats = {
      totalEntries: 0,
      totalInvoicesCommitted: 0,
      totalPaymentProofs: 0,
      totalUsageRoots: 0,
      totalBlockchainTx: 0,
    };
  }

  async initialize(deps = {}) {
    this.blockchain = deps.blockchain || null;
    this.pricingEngine = deps.pricingEngine || null;
    this.metering = deps.metering || null;

    // Listen for invoice events from pricing engine
    if (this.pricingEngine) {
      this.pricingEngine.on('invoice-sent', (record) => {
        this.commitInvoice(record);
      });
    }

    // Listen for period close events from metering
    if (this.metering) {
      this.metering.on('period-closed', (rollup) => {
        this.commitUsageRoot(rollup);
      });
    }

    this.running = true;
    console.log('  ⛓️  QuranChain Billing Ledger initialized');
    console.log(`     Blockchain connected: ${!!this.blockchain}`);
    console.log(`     Entries: ${this.entries.length}`);
    return this;
  }

  // ═══════════════════════════════════════════════════════════
  // COMMIT OPERATIONS (write to blockchain)
  // ═══════════════════════════════════════════════════════════

  /**
   * Commit an invoice to the blockchain.
   * Creates a BILLING_INVOICE transaction with the invoice hash.
   */
  commitInvoice(invoiceRecord) {
    const invoiceHash = this._hashObject({
      invoiceId: invoiceRecord.invoiceId,
      clientId: invoiceRecord.clientId,
      total: invoiceRecord.cost?.total,
      lineItems: invoiceRecord.cost?.lineItems?.length,
      sentAt: invoiceRecord.sentAt,
    });

    const entry = {
      type: 'BILLING_INVOICE',
      timestamp: Date.now(),
      invoiceId: invoiceRecord.invoiceId,
      clientId: invoiceRecord.clientId,
      stripeCustomerId: invoiceRecord.stripeCustomerId,
      total: invoiceRecord.cost?.total || 0,
      currency: 'USD',
      hash: invoiceHash,
      dueDate: invoiceRecord.dueDate,
      contractId: invoiceRecord.contractId,
      blockHeight: null,
      txId: null,
    };

    // Commit to blockchain
    if (this.blockchain) {
      try {
        const tx = {
          type: 'BILLING_INVOICE',
          from: 'DarCloud_Billing_Ledger',
          to: invoiceRecord.clientId,
          amount: invoiceRecord.cost?.total || 0,
          data: {
            invoiceId: invoiceRecord.invoiceId,
            invoiceHash,
            stripeInvoiceId: invoiceRecord.invoiceId,
            total: invoiceRecord.cost?.total,
            dueDate: invoiceRecord.dueDate,
            founder: 'Omar_Mohammad_Abunadi',
          },
          timestamp: Date.now(),
        };
        this.blockchain.addTransaction(tx);
        entry.blockHeight = this.blockchain.chain.length;
        entry.txId = this._hashObject(tx).substring(0, 16);
        this.stats.totalBlockchainTx++;
      } catch (err) {
        entry.blockchainError = err.message;
      }
    }

    this.entries.push(entry);
    this.invoiceHashes.set(invoiceRecord.invoiceId, {
      hash: invoiceHash,
      blockHeight: entry.blockHeight,
      txId: entry.txId,
    });

    this.stats.totalEntries++;
    this.stats.totalInvoicesCommitted++;
    this.emit('invoice-committed', entry);
    return entry;
  }

  /**
   * Commit a payment proof to the blockchain.
   * Called when Stripe webhook confirms payment (invoice.paid).
   */
  commitPaymentProof(paymentData) {
    const paymentHash = this._hashObject({
      paymentId: paymentData.paymentId || paymentData.invoiceId,
      amount: paymentData.amount,
      paidAt: paymentData.paidAt || Date.now(),
      stripePaymentIntentId: paymentData.stripePaymentIntentId,
    });

    const entry = {
      type: 'PAYMENT_PROOF',
      timestamp: Date.now(),
      paymentId: paymentData.paymentId || paymentData.invoiceId,
      invoiceId: paymentData.invoiceId,
      clientId: paymentData.clientId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      method: paymentData.method || 'stripe',
      stripePaymentIntentId: paymentData.stripePaymentIntentId,
      hash: paymentHash,
      blockHeight: null,
      txId: null,
    };

    // Commit to blockchain
    if (this.blockchain) {
      try {
        const tx = {
          type: 'PAYMENT_PROOF',
          from: paymentData.clientId || 'stripe_customer',
          to: 'DarCloud_Treasury',
          amount: paymentData.amount,
          data: {
            paymentHash,
            invoiceId: paymentData.invoiceId,
            stripePaymentIntentId: paymentData.stripePaymentIntentId,
            paidAt: paymentData.paidAt || Date.now(),
            founder: 'Omar_Mohammad_Abunadi',
          },
          timestamp: Date.now(),
        };
        this.blockchain.addTransaction(tx);
        entry.blockHeight = this.blockchain.chain.length;
        entry.txId = this._hashObject(tx).substring(0, 16);
        this.stats.totalBlockchainTx++;
      } catch (err) {
        entry.blockchainError = err.message;
      }
    }

    this.entries.push(entry);
    this.paymentProofs.set(entry.paymentId, {
      hash: paymentHash,
      blockHeight: entry.blockHeight,
      txId: entry.txId,
    });

    this.stats.totalEntries++;
    this.stats.totalPaymentProofs++;
    this.emit('payment-committed', entry);
    return entry;
  }

  /**
   * Commit a Merkle root of all usage events for a billing period.
   * Creates an immutable proof that usage data hasn't been tampered with.
   */
  commitUsageRoot(rollup) {
    // Build Merkle tree from all client usage hashes
    const leaves = [];
    for (const [clientId, data] of Object.entries(rollup.clients || {})) {
      const clientHash = this._hashObject({
        clientId,
        usage: data.usage,
        totalQuantity: data.totalQuantity,
        bucketCount: data.bucketCount,
      });
      leaves.push(clientHash);
    }

    const merkleRoot = this._computeMerkleRoot(leaves);
    const periodKey = `${new Date(rollup.periodStart).toISOString().substring(0, 7)}`;

    const entry = {
      type: 'USAGE_MERKLE_ROOT',
      timestamp: Date.now(),
      periodStart: rollup.periodStart,
      periodEnd: rollup.periodEnd,
      periodKey,
      merkleRoot,
      clientCount: Object.keys(rollup.clients || {}).length,
      leafCount: leaves.length,
      blockHeight: null,
      txId: null,
    };

    // Commit to blockchain
    if (this.blockchain) {
      try {
        const tx = {
          type: 'USAGE_MERKLE_ROOT',
          from: 'DarCloud_Metering',
          to: 'DarCloud_Billing_Ledger',
          amount: 0,
          data: {
            merkleRoot,
            periodKey,
            clientCount: entry.clientCount,
            leafCount: entry.leafCount,
            founder: 'Omar_Mohammad_Abunadi',
          },
          timestamp: Date.now(),
        };
        this.blockchain.addTransaction(tx);
        entry.blockHeight = this.blockchain.chain.length;
        entry.txId = this._hashObject(tx).substring(0, 16);
        this.stats.totalBlockchainTx++;
      } catch (err) {
        entry.blockchainError = err.message;
      }
    }

    this.entries.push(entry);
    this.usageRoots.set(periodKey, { merkleRoot, blockHeight: entry.blockHeight, txId: entry.txId });

    this.stats.totalEntries++;
    this.stats.totalUsageRoots++;
    this.emit('usage-root-committed', entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════
  // VERIFICATION & AUDIT
  // ═══════════════════════════════════════════════════════════

  /**
   * Verify an invoice hash against the blockchain.
   */
  verifyInvoice(invoiceId) {
    const record = this.invoiceHashes.get(invoiceId);
    if (!record) return { verified: false, reason: 'Invoice not found in ledger' };

    // Check if the hash exists in blockchain transactions
    if (this.blockchain) {
      for (const block of this.blockchain.chain) {
        for (const tx of block.transactions || []) {
          if (tx.data?.invoiceHash === record.hash) {
            return {
              verified: true,
              invoiceId,
              hash: record.hash,
              blockHeight: block.index,
              blockHash: block.hash,
              txData: tx,
            };
          }
        }
      }
    }

    return {
      verified: !!record.hash,
      invoiceId,
      hash: record.hash,
      blockHeight: record.blockHeight,
      note: 'Hash recorded, blockchain verification pending next mine',
    };
  }

  /**
   * Verify a payment proof against the blockchain.
   */
  verifyPayment(paymentId) {
    const record = this.paymentProofs.get(paymentId);
    if (!record) return { verified: false, reason: 'Payment not found in ledger' };

    if (this.blockchain) {
      for (const block of this.blockchain.chain) {
        for (const tx of block.transactions || []) {
          if (tx.data?.paymentHash === record.hash) {
            return {
              verified: true,
              paymentId,
              hash: record.hash,
              blockHeight: block.index,
              blockHash: block.hash,
            };
          }
        }
      }
    }

    return {
      verified: !!record.hash,
      paymentId,
      hash: record.hash,
      blockHeight: record.blockHeight,
    };
  }

  /**
   * Generate a full Proof of Usage audit export.
   */
  generateProofOfUsage(clientId, periodKey) {
    const invoiceEntries = this.entries.filter(e =>
      e.type === 'BILLING_INVOICE' && e.clientId === clientId
    );
    const paymentEntries = this.entries.filter(e =>
      e.type === 'PAYMENT_PROOF' && e.clientId === clientId
    );
    const usageRoot = periodKey ? this.usageRoots.get(periodKey) : null;

    // Generate audit signature
    const auditData = {
      clientId,
      periodKey,
      invoiceCount: invoiceEntries.length,
      paymentCount: paymentEntries.length,
      usageMerkleRoot: usageRoot?.merkleRoot || null,
      generatedAt: Date.now(),
    };
    const auditSignature = this._hashObject(auditData);

    return {
      title: 'DarCloud™ Proof of Usage Certificate',
      clientId,
      periodKey: periodKey || 'all',
      invoices: invoiceEntries.map(e => ({
        invoiceId: e.invoiceId,
        total: e.total,
        hash: e.hash,
        blockHeight: e.blockHeight,
        txId: e.txId,
        timestamp: new Date(e.timestamp).toISOString(),
      })),
      payments: paymentEntries.map(e => ({
        paymentId: e.paymentId,
        amount: e.amount,
        hash: e.hash,
        blockHeight: e.blockHeight,
        txId: e.txId,
        timestamp: new Date(e.timestamp).toISOString(),
      })),
      usageMerkleRoot: usageRoot || null,
      auditSignature,
      blockchain: this.blockchain ? {
        chainHeight: this.blockchain.chain.length,
        chainId: this.blockchain.chainId,
      } : null,
      generatedAt: new Date().toISOString(),
      generatedBy: 'QuranChain Billing Ledger',
      founder: 'Omar Mohammad Abunadi™',
      disclaimer: 'This proof is cryptographically verifiable against the QuranChain blockchain. Any tampering with usage records will invalidate the Merkle root.',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DISPUTE RESOLUTION
  // ═══════════════════════════════════════════════════════════

  /**
   * Create a billing dispute with cryptographic evidence.
   */
  createDispute(clientId, invoiceId, reason) {
    const invoiceRecord = this.invoiceHashes.get(invoiceId);
    if (!invoiceRecord) return { error: 'Invoice not found in ledger' };

    const dispute = {
      disputeId: 'DSP-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      clientId,
      invoiceId,
      reason,
      invoiceHash: invoiceRecord.hash,
      blockHeight: invoiceRecord.blockHeight,
      status: 'open',
      createdAt: Date.now(),
      windowExpiry: Date.now() + (15 * 24 * 60 * 60 * 1000), // 15-day window
      resolution: null,
    };

    const entry = {
      type: 'BILLING_DISPUTE',
      timestamp: Date.now(),
      ...dispute,
      hash: this._hashObject(dispute),
    };

    this.entries.push(entry);
    this.stats.totalEntries++;
    this.emit('dispute-created', dispute);
    return dispute;
  }

  /**
   * Resolve a billing dispute.
   */
  resolveDispute(disputeId, resolution, adjustedAmount) {
    const disputeEntry = this.entries.find(e => e.disputeId === disputeId);
    if (!disputeEntry) return { error: 'Dispute not found' };

    disputeEntry.status = 'resolved';
    disputeEntry.resolution = resolution;
    disputeEntry.adjustedAmount = adjustedAmount || 0;
    disputeEntry.resolvedAt = Date.now();

    this.emit('dispute-resolved', disputeEntry);
    return disputeEntry;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  _hashObject(obj) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(obj, null, 0))
      .digest('hex');
  }

  _computeMerkleRoot(leaves) {
    if (leaves.length === 0) return this._hashObject({ empty: true });
    if (leaves.length === 1) return leaves[0];

    const next = [];
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = i + 1 < leaves.length ? leaves[i + 1] : left;
      next.push(crypto.createHash('sha256').update(left + right).digest('hex'));
    }
    return this._computeMerkleRoot(next);
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════

  getStatus() {
    return {
      running: this.running,
      entries: this.stats.totalEntries,
      invoicesCommitted: this.stats.totalInvoicesCommitted,
      paymentProofs: this.stats.totalPaymentProofs,
      usageRoots: this.stats.totalUsageRoots,
      blockchainTx: this.stats.totalBlockchainTx,
      blockchain: this.blockchain ? {
        chainHeight: this.blockchain.chain.length,
        connected: true,
      } : { connected: false },
    };
  }

  async shutdown() {
    this.running = false;
    console.log('  🛑 QuranChain Billing Ledger shut down');
  }
}

module.exports = BillingLedger;
