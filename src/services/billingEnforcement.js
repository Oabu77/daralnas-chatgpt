/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * DarCloud™ Billing Enforcement Engine
 * ======================================
 * Automated enforcement for enterprise billing:
 *   - Late payment detection
 *   - 45-day throttle (bandwidth reduced to 10%)
 *   - 90-day cutoff (API keys revoked, services suspended)
 *   - 15-day dispute window before enforcement
 *   - Stripe payment retry & dunning
 *   - Auto-reactivation on payment receipt
 *
 * Enforcement levels:
 *   LEVEL 0 — Current (0-30 days) → No action
 *   LEVEL 1 — Warning (31-44 days) → Email warnings
 *   LEVEL 2 — Throttle (45-89 days) → Bandwidth 10%, API rate-limited
 *   LEVEL 3 — Cutoff (90+ days) → API keys revoked, services suspended
 *
 * © DarCloud™ | Omar Mohammad Abunadi™
 * Status: PRODUCTION
 */

const EventEmitter = require('events');
const stripeService = require('./stripeService');

const ENFORCEMENT_LEVELS = {
  CURRENT:  { level: 0, label: 'Current',  daysOverdue: 0,  action: 'none' },
  WARNING:  { level: 1, label: 'Warning',  daysOverdue: 31, action: 'email_warning' },
  THROTTLE: { level: 2, label: 'Throttle', daysOverdue: 45, action: 'throttle_bandwidth' },
  CUTOFF:   { level: 3, label: 'Cutoff',   daysOverdue: 90, action: 'revoke_access' },
};

class BillingEnforcement extends EventEmitter {
  constructor() {
    super();
    this.running = false;
    this.pricingEngine = null;
    this.metering = null;
    this.billingLedger = null;
    this.invoiceGenerator = null;

    // ── ENFORCEMENT STATE ──
    this.clientStates = new Map(); // clientId → { level, lastChecked, warnings[], actions[] }
    this.disputes = new Map();     // disputeId → dispute record
    this.enforcementLog = [];      // Append-only audit trail

    // ── TIMERS ──
    this.checkInterval = null;
    this.DISPUTE_WINDOW_DAYS = 15;

    // ── STATS ──
    this.stats = {
      totalChecks: 0,
      totalWarnings: 0,
      totalThrottles: 0,
      totalCutoffs: 0,
      totalReactivations: 0,
      totalDisputes: 0,
    };
  }

  async initialize(deps = {}) {
    this.pricingEngine = deps.pricingEngine || null;
    this.metering = deps.metering || null;
    this.billingLedger = deps.billingLedger || null;
    this.invoiceGenerator = deps.invoiceGenerator || null;

    // Initialize state for all clients
    if (this.pricingEngine) {
      for (const [clientId] of this.pricingEngine.clients) {
        this.clientStates.set(clientId, {
          level: 0,
          label: 'Current',
          lastChecked: Date.now(),
          overdueInvoices: [],
          totalOverdue: 0,
          daysOverdue: 0,
          warnings: [],
          actions: [],
          throttled: false,
          suspended: false,
          disputeActive: false,
        });
      }
    }

    // Run enforcement check every hour for 24/7 collection
    this.checkInterval = setInterval(() => this.runEnforcementCheck(), 3600_000);

    // Listen for payment events
    if (this.billingLedger) {
      this.billingLedger.on('payment-committed', (entry) => {
        this._handlePaymentReceived(entry.clientId, entry.amount);
      });
    }

    this.running = true;
    console.log('  ⚖️  Billing Enforcement Engine initialized');
    console.log(`     Clients monitored: ${this.clientStates.size}`);
    console.log(`     Enforcement levels: ${Object.keys(ENFORCEMENT_LEVELS).length}`);
    console.log(`     Dispute window: ${this.DISPUTE_WINDOW_DAYS} days`);
    return this;
  }

  // ═══════════════════════════════════════════════════════════
  // ENFORCEMENT CHECK
  // ═══════════════════════════════════════════════════════════

  /**
   * Run enforcement check for all clients.
   * Evaluates overdue invoices and applies appropriate enforcement level.
   */
  async runEnforcementCheck() {
    if (!this.running) return;
    this.stats.totalChecks++;
    const results = [];

    for (const [clientId, state] of this.clientStates) {
      try {
        const result = await this._checkClient(clientId, state);
        results.push(result);
      } catch (err) {
        results.push({ clientId, error: err.message });
      }
    }

    this.emit('enforcement-check-complete', {
      timestamp: Date.now(),
      clientsChecked: results.length,
      results,
    });

    return results;
  }

  async _checkClient(clientId, state) {
    state.lastChecked = Date.now();

    // Skip if dispute is active
    if (state.disputeActive) {
      return { clientId, level: state.level, action: 'dispute_hold', message: 'Dispute active — enforcement paused' };
    }

    // Get overdue invoices from Stripe
    const stripeCustomerId = this.pricingEngine?.getStripeCustomerId(clientId);
    let overdueInvoices = [];
    let maxDaysOverdue = 0;
    let totalOverdue = 0;

    if (stripeCustomerId) {
      try {
        const invoices = await stripeService.stripe.invoices.list({
          customer: stripeCustomerId,
          status: 'open',
          limit: 50,
        });

        const now = Date.now();
        for (const inv of invoices.data) {
          if (inv.due_date && (inv.due_date * 1000) < now) {
            const daysOver = Math.floor((now - inv.due_date * 1000) / (24 * 3600_000));
            overdueInvoices.push({
              invoiceId: inv.id,
              amount: inv.amount_due / 100,
              daysOverdue: daysOver,
              dueDate: new Date(inv.due_date * 1000).toISOString(),
            });
            if (daysOver > maxDaysOverdue) maxDaysOverdue = daysOver;
            totalOverdue += inv.amount_due / 100;
          }
        }
      } catch (err) {
        // Non-fatal — Stripe may be unavailable
      }
    }

    // Also check local invoice generator
    if (this.invoiceGenerator) {
      const localInvoices = this.invoiceGenerator.listInvoices(clientId);
      for (const inv of localInvoices) {
        if (inv.status === 'sent' && inv.dueDate) {
          const dueTs = new Date(inv.dueDate).getTime();
          const daysOver = Math.floor((Date.now() - dueTs) / (24 * 3600_000));
          if (daysOver > 0 && daysOver > maxDaysOverdue) {
            maxDaysOverdue = daysOver;
          }
        }
      }
    }

    state.overdueInvoices = overdueInvoices;
    state.totalOverdue = totalOverdue;
    state.daysOverdue = maxDaysOverdue;

    // Determine enforcement level
    let newLevel = 0;
    let action = 'none';

    if (maxDaysOverdue >= 90) {
      newLevel = 3;
      action = 'revoke_access';
    } else if (maxDaysOverdue >= 45) {
      newLevel = 2;
      action = 'throttle_bandwidth';
    } else if (maxDaysOverdue >= 31) {
      newLevel = 1;
      action = 'email_warning';
    }

    const previousLevel = state.level;
    state.level = newLevel;
    state.label = Object.values(ENFORCEMENT_LEVELS).find(l => l.level === newLevel)?.label || 'Current';

    // Execute enforcement actions (only on level change)
    if (newLevel > previousLevel) {
      await this._executeEnforcement(clientId, state, newLevel, action);
    } else if (newLevel < previousLevel) {
      // De-escalation (payment received)
      await this._deescalate(clientId, state, newLevel);
    }

    return {
      clientId,
      level: newLevel,
      label: state.label,
      action,
      daysOverdue: maxDaysOverdue,
      totalOverdue,
      overdueInvoices: overdueInvoices.length,
      throttled: state.throttled,
      suspended: state.suspended,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ENFORCEMENT ACTIONS
  // ═══════════════════════════════════════════════════════════

  async _executeEnforcement(clientId, state, level, action) {
    const entry = {
      timestamp: Date.now(),
      clientId,
      level,
      action,
      daysOverdue: state.daysOverdue,
      totalOverdue: state.totalOverdue,
    };

    switch (level) {
      case 1: // WARNING
        state.warnings.push({ date: Date.now(), message: 'Payment overdue — warning email sent' });
        this.stats.totalWarnings++;

        // Send Stripe dunning reminder
        try {
          const stripeCustomerId = this.pricingEngine?.getStripeCustomerId(clientId);
          if (stripeCustomerId) {
            for (const inv of state.overdueInvoices) {
              await stripeService.sendInvoice(inv.invoiceId);
            }
          }
        } catch (_) {}

        entry.details = 'Warning email sent, Stripe dunning reminder triggered';
        break;

      case 2: // THROTTLE
        state.throttled = true;
        state.actions.push({ date: Date.now(), action: 'throttle', message: 'Bandwidth throttled to 10%' });
        this.stats.totalThrottles++;

        // Revoke client's metering privileges (rate-limit)
        if (this.metering) {
          const client = this.pricingEngine?.getClient(clientId);
          if (client) {
            // Don't revoke keys yet — just mark as throttled
            client.throttled = true;
            client.throttledAt = Date.now();
          }
        }

        entry.details = 'Bandwidth throttled to 10%, API rate-limited, 15-day dispute window active';
        break;

      case 3: // CUTOFF
        state.suspended = true;
        state.actions.push({ date: Date.now(), action: 'cutoff', message: 'API keys revoked, services suspended' });
        this.stats.totalCutoffs++;

        // Revoke all API keys
        if (this.metering && this.pricingEngine) {
          const client = this.pricingEngine.getClient(clientId);
          if (client) {
            for (const key of client.apiKeys || []) {
              this.metering.revokeApiKey(key);
            }
            client.status = 'suspended';
            client.suspendedAt = Date.now();
          }
        }

        // Cancel Stripe subscriptions
        try {
          const stripeCustomerId = this.pricingEngine?.getStripeCustomerId(clientId);
          if (stripeCustomerId) {
            const subs = await stripeService.stripe.subscriptions.list({
              customer: stripeCustomerId,
              status: 'active',
            });
            for (const sub of subs.data) {
              await stripeService.cancelSubscription(sub.id, false); // immediate cancel
            }
          }
        } catch (_) {}

        entry.details = 'API keys revoked, services suspended, Stripe subscriptions cancelled';
        break;
    }

    this.enforcementLog.push(entry);
    this.emit('enforcement-action', entry);
    return entry;
  }

  /**
   * De-escalate enforcement when payment is received.
   */
  async _deescalate(clientId, state, newLevel) {
    if (newLevel === 0) {
      // Full reactivation
      if (state.throttled || state.suspended) {
        state.throttled = false;
        state.suspended = false;
        this.stats.totalReactivations++;

        // Restore API keys
        if (this.metering && this.pricingEngine) {
          const client = this.pricingEngine.getClient(clientId);
          if (client) {
            for (const key of client.apiKeys || []) {
              this.metering.registerApiKey(key, clientId);
            }
            client.status = 'active';
            client.throttled = false;
            delete client.throttledAt;
            delete client.suspendedAt;
          }
        }

        state.actions.push({ date: Date.now(), action: 'reactivated', message: 'Services fully restored after payment' });

        this.enforcementLog.push({
          timestamp: Date.now(),
          clientId,
          level: 0,
          action: 'reactivated',
          details: 'Payment received — all services restored, API keys reactivated',
        });

        this.emit('client-reactivated', { clientId });
      }
    }
  }

  /**
   * Handle payment received — check if enforcement should de-escalate.
   */
  _handlePaymentReceived(clientId, amount) {
    if (!clientId) return;
    const state = this.clientStates.get(clientId);
    if (!state) return;

    // Re-check this client immediately
    setTimeout(() => this._checkClient(clientId, state), 5000);
  }

  // ═══════════════════════════════════════════════════════════
  // DISPUTE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  /**
   * File a billing dispute. Pauses enforcement for the dispute window.
   */
  fileDispute(clientId, invoiceId, reason) {
    const state = this.clientStates.get(clientId);
    if (!state) return { error: 'Client not found' };

    const disputeId = 'DSP-' + Date.now().toString(36).toUpperCase();
    const dispute = {
      disputeId,
      clientId,
      invoiceId,
      reason,
      status: 'open',
      filedAt: Date.now(),
      windowExpiry: Date.now() + (this.DISPUTE_WINDOW_DAYS * 24 * 3600_000),
      resolution: null,
      resolvedAt: null,
    };

    this.disputes.set(disputeId, dispute);
    state.disputeActive = true;
    this.stats.totalDisputes++;

    // Also commit to billing ledger
    if (this.billingLedger) {
      this.billingLedger.createDispute(clientId, invoiceId, reason);
    }

    this.enforcementLog.push({
      timestamp: Date.now(),
      clientId,
      level: state.level,
      action: 'dispute_filed',
      details: `Dispute ${disputeId}: ${reason}`,
      disputeId,
    });

    this.emit('dispute-filed', dispute);
    return dispute;
  }

  /**
   * Resolve a dispute.
   */
  resolveDispute(disputeId, resolution, creditAmount = 0) {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return { error: 'Dispute not found' };

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.creditAmount = creditAmount;
    dispute.resolvedAt = Date.now();

    // Clear dispute hold
    const state = this.clientStates.get(dispute.clientId);
    if (state) {
      state.disputeActive = false;
    }

    // Issue credit on Stripe if applicable
    if (creditAmount > 0) {
      this._issueStripeCredit(dispute.clientId, creditAmount, `Dispute resolution: ${disputeId}`);
    }

    // Commit to billing ledger
    if (this.billingLedger) {
      this.billingLedger.resolveDispute(disputeId, resolution, creditAmount);
    }

    this.emit('dispute-resolved', dispute);
    return dispute;
  }

  async _issueStripeCredit(clientId, amount, description) {
    const stripeCustomerId = this.pricingEngine?.getStripeCustomerId(clientId);
    if (!stripeCustomerId) return;

    try {
      await stripeService.stripe.customers.createBalanceTransaction(stripeCustomerId, {
        amount: -Math.round(amount * 100), // negative = credit
        currency: 'usd',
        description,
        metadata: {
          type: 'dispute_credit',
          founder: 'Omar_Mohammad_Abunadi',
        },
      });
    } catch (err) {
      console.log(`  ⚠ Stripe credit failed: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // MANUAL OVERRIDES
  // ═══════════════════════════════════════════════════════════

  /**
   * Manually override enforcement level for a client.
   */
  setEnforcementOverride(clientId, level, reason) {
    const state = this.clientStates.get(clientId);
    if (!state) return { error: 'Client not found' };

    state.level = level;
    state.label = Object.values(ENFORCEMENT_LEVELS).find(l => l.level === level)?.label || 'Override';

    this.enforcementLog.push({
      timestamp: Date.now(),
      clientId,
      level,
      action: 'manual_override',
      details: reason,
    });

    this.emit('enforcement-override', { clientId, level, reason });
    return { clientId, level, label: state.label, reason };
  }

  /**
   * Force reactivate a client (admin override).
   */
  async forceReactivate(clientId, reason) {
    const state = this.clientStates.get(clientId);
    if (!state) return { error: 'Client not found' };

    state.level = 0;
    state.label = 'Current';
    await this._deescalate(clientId, state, 0);

    this.enforcementLog.push({
      timestamp: Date.now(),
      clientId,
      level: 0,
      action: 'force_reactivate',
      details: reason || 'Admin override',
    });

    return { clientId, status: 'reactivated', reason };
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS & REPORTS
  // ═══════════════════════════════════════════════════════════

  getClientEnforcement(clientId) {
    return this.clientStates.get(clientId) || null;
  }

  getAllEnforcementStates() {
    const states = {};
    for (const [clientId, state] of this.clientStates) {
      states[clientId] = {
        level: state.level,
        label: state.label,
        daysOverdue: state.daysOverdue,
        totalOverdue: state.totalOverdue,
        throttled: state.throttled,
        suspended: state.suspended,
        disputeActive: state.disputeActive,
        lastChecked: new Date(state.lastChecked).toISOString(),
      };
    }
    return states;
  }

  getEnforcementLog(clientId, limit = 50) {
    let log = this.enforcementLog;
    if (clientId) log = log.filter(e => e.clientId === clientId);
    return log.slice(-limit);
  }

  getStatus() {
    const levelCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const state of this.clientStates.values()) {
      levelCounts[state.level] = (levelCounts[state.level] || 0) + 1;
    }

    return {
      running: this.running,
      clientsMonitored: this.clientStates.size,
      enforcementLevels: {
        current: levelCounts[0],
        warning: levelCounts[1],
        throttled: levelCounts[2],
        cutoff: levelCounts[3],
      },
      activeDisputes: Array.from(this.disputes.values()).filter(d => d.status === 'open').length,
      stats: this.stats,
      disputeWindowDays: this.DISPUTE_WINDOW_DAYS,
    };
  }

  async shutdown() {
    this.running = false;
    if (this.checkInterval) clearInterval(this.checkInterval);
    console.log('  🛑 Billing Enforcement Engine shut down');
  }
}

module.exports = BillingEnforcement;
