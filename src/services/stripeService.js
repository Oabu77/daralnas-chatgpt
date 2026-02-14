const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const winston = require('../config/logger');

class StripeService {
  constructor() {
    this.stripe = stripe;
  }

  // Customer Management
  async createCustomer(userData) {
    try {
      const customer = await this.stripe.customers.create({
        email: userData.email,
        name: userData.username,
        metadata: {
          userId: userData._id.toString(),
        },
      });

      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(userData._id, {
        stripeCustomerId: customer.id,
      });

      return customer;
    } catch (error) {
      winston.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  async getCustomer(customerId) {
    try {
      return await this.stripe.customers.retrieve(customerId);
    } catch (error) {
      winston.error('Error retrieving Stripe customer:', error);
      throw error;
    }
  }

  async updateCustomer(customerId, updateData) {
    try {
      return await this.stripe.customers.update(customerId, updateData);
    } catch (error) {
      winston.error('Error updating Stripe customer:', error);
      throw error;
    }
  }

  // Product and Price Management
  async createProduct(productData) {
    try {
      const product = await this.stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: productData.metadata || {},
        ...(productData.images && { images: productData.images }),
      });

      if (productData.price) {
        const price = await this.stripe.prices.create({
          product: product.id,
          unit_amount: productData.price,
          currency: productData.currency || 'usd',
          ...(productData.recurring && { recurring: productData.recurring }),
        });

        return { product, price };
      }

      return { product };
    } catch (error) {
      winston.error('Error creating Stripe product:', error);
      throw error;
    }
  }

  // Enhanced Product and Price Management
  async updateProduct(productId, updates) {
    try {
      return await this.stripe.products.update(productId, updates);
    } catch (error) {
      winston.error('Error updating Stripe product:', error);
      throw error;
    }
  }

  async archiveProduct(productId) {
    try {
      return await this.stripe.products.update(productId, { active: false });
    } catch (error) {
      winston.error('Error archiving Stripe product:', error);
      throw error;
    }
  }

  async createPrice(productId, priceData) {
    try {
      return await this.stripe.prices.create({
        product: productId,
        ...priceData,
      });
    } catch (error) {
      winston.error('Error creating Stripe price:', error);
      throw error;
    }
  }

  async updatePrice(priceId, updates) {
    try {
      return await this.stripe.prices.update(priceId, updates);
    } catch (error) {
      winston.error('Error updating Stripe price:', error);
      throw error;
    }
  }

  async getPrice(priceId) {
    try {
      return await this.stripe.prices.retrieve(priceId);
    } catch (error) {
      winston.error('Error retrieving Stripe price:', error);
      throw error;
    }
  }

  // Subscription Management
  async createSubscription(customerId, priceId, options = {}) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        ...options,
      });

      return subscription;
    } catch (error) {
      winston.error('Error creating subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });

      // Update user subscription status
      const user = await User.findOne({ stripeCustomerId: subscription.customer });
      if (user) {
        await User.findByIdAndUpdate(user._id, {
          cancelAtPeriodEnd,
          subscriptionStatus: cancelAtPeriodEnd ? 'active' : 'canceled',
        });
      }

      return subscription;
    } catch (error) {
      winston.error('Error canceling subscription:', error);
      throw error;
    }
  }

  async updateSubscription(subscriptionId, updates) {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, updates);
    } catch (error) {
      winston.error('Error updating subscription:', error);
      throw error;
    }
  }

  async resumeSubscription(subscriptionId) {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      winston.error('Error resuming subscription:', error);
      throw error;
    }
  }

  async changeSubscriptionPrice(subscriptionId, newPriceId, prorationBehavior = 'create_prorations') {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: (await this.getSubscription(subscriptionId)).items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: prorationBehavior,
      });
    } catch (error) {
      winston.error('Error changing subscription price:', error);
      throw error;
    }
  }

  async getSubscription(subscriptionId) {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      winston.error('Error retrieving subscription:', error);
      throw error;
    }
  }

  // Payment Intents for one-time payments
  async createPaymentIntent(amount, currency = 'usd', customerId = null, metadata = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      winston.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId, paymentMethodId = null) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      return paymentIntent;
    } catch (error) {
      winston.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  // Invoice Management
  async createInvoice(customerId, subscriptionId = null, items = []) {
    try {
      const invoiceData = {
        customer: customerId,
      };

      if (subscriptionId) {
        invoiceData.subscription = subscriptionId;
      } else if (items.length > 0) {
        invoiceData.items = items;
      }

      const invoice = await this.stripe.invoices.create(invoiceData);
      return invoice;
    } catch (error) {
      winston.error('Error creating invoice:', error);
      throw error;
    }
  }

  async finalizeInvoice(invoiceId) {
    try {
      return await this.stripe.invoices.finalizeInvoice(invoiceId);
    } catch (error) {
      winston.error('Error finalizing invoice:', error);
      throw error;
    }
  }

  async sendInvoice(invoiceId) {
    try {
      return await this.stripe.invoices.sendInvoice(invoiceId);
    } catch (error) {
      winston.error('Error sending invoice:', error);
      throw error;
    }
  }

  // Webhook handling
  constructEvent(payload, signature, webhookSecret) {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      winston.error('Error constructing webhook event:', error);
      throw error;
    }
  }

  // Handle webhook events
  async handleWebhookEvent(event) {
    try {
      const { type, data } = event;

      switch (type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(data.object);
          break;
        case 'customer.subscription.trial_will_end':
          await this.handleSubscriptionTrialWillEnd(data.object);
          break;
        case 'invoice.created':
          await this.handleInvoiceCreated(data.object);
          break;
        case 'invoice.finalized':
          await this.handleInvoiceFinalized(data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(data.object);
          break;
        case 'invoice.payment_action_required':
          await this.handleInvoicePaymentActionRequired(data.object);
          break;
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(data.object);
          break;
        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(data.object);
          break;
        case 'charge.dispute.created':
          await this.handleChargeDisputeCreated(data.object);
          break;
        case 'customer.created':
          await this.handleCustomerCreated(data.object);
          break;
        case 'customer.updated':
          await this.handleCustomerUpdated(data.object);
          break;
        case 'customer.deleted':
          await this.handleCustomerDeleted(data.object);
          break;
        default:
          winston.info(`Unhandled event type: ${type}`);
      }
    } catch (error) {
      winston.error('Error handling webhook event:', error);
      throw error;
    }
  }

  // Event handlers
  async handleSubscriptionCreated(subscription) {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }
  }

  async handleSubscriptionUpdated(subscription) {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }
  }

  async handleSubscriptionDeleted(subscription) {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'canceled',
        subscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }
  }

  async handleInvoicePaymentSucceeded(invoice) {
    winston.info(`Invoice payment succeeded: ${invoice.id}`);
    // Handle successful payment - could trigger additional business logic
  }

  async handleInvoicePaymentFailed(invoice) {
    winston.error(`Invoice payment failed: ${invoice.id}`);
    // Handle failed payment - could send notifications, update user status, etc.
  }

  async handlePaymentIntentSucceeded(paymentIntent) {
    winston.info(`Payment intent succeeded: ${paymentIntent.id}`);
    // Handle successful one-time payment
  }

  async getRevenueAnalytics(startDate, endDate) {
    try {
      const balanceTransactions = await this.stripe.balanceTransactions.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
        limit: 100,
      });

      const charges = await this.stripe.charges.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
        limit: 100,
      });

      return {
        balanceTransactions: balanceTransactions.data,
        charges: charges.data,
        totalRevenue: balanceTransactions.data
          .filter(tx => tx.type === 'charge')
          .reduce((sum, tx) => sum + tx.amount, 0) / 100,
        totalRefunds: balanceTransactions.data
          .filter(tx => tx.type === 'refund')
          .reduce((sum, tx) => sum + tx.amount, 0) / 100,
        netRevenue: balanceTransactions.data
          .filter(tx => tx.type === 'charge')
          .reduce((sum, tx) => sum + tx.amount, 0) / 100 -
          balanceTransactions.data
            .filter(tx => tx.type === 'refund')
            .reduce((sum, tx) => sum + tx.amount, 0) / 100,
      };
    } catch (error) {
      winston.error('Error getting revenue analytics:', error);
      throw error;
    }
  }

  async getCustomerPaymentHistory(customerId, limit = 20) {
    try {
      const paymentIntents = await this.stripe.paymentIntents.list({
        customer: customerId,
        limit,
      });

      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        limit,
      });

      return {
        paymentIntents: paymentIntents.data,
        subscriptions: subscriptions.data,
      };
    } catch (error) {
      winston.error('Error getting customer payment history:', error);
      throw error;
    }
  }

  async handlePaymentIntentCanceled(paymentIntent) {
    winston.info(`Payment intent canceled: ${paymentIntent.id}`);
    // Handle canceled payment intent
  }

  async handleChargeDisputeCreated(dispute) {
    winston.error(`Charge dispute created: ${dispute.id}`);
    // Handle charge dispute - may need to notify admin
  }

  async handleCustomerCreated(customer) {
    winston.info(`Customer created: ${customer.id}`);
    // Additional customer creation logic if needed
  }

  async handleCustomerUpdated(customer) {
    winston.info(`Customer updated: ${customer.id}`);
    // Handle customer updates
  }

  async handleCustomerDeleted(customer) {
    winston.info(`Customer deleted: ${customer.id}`);
    // Handle customer deletion - may need to clean up user data
  }

  async handleSubscriptionTrialWillEnd(subscription) {
    winston.info(`Subscription trial will end: ${subscription.id}`);
    // Send trial ending notification
  }

  async handleInvoiceCreated(invoice) {
    winston.info(`Invoice created: ${invoice.id}`);
    // Handle invoice creation
  }

  async handleInvoiceFinalized(invoice) {
    winston.info(`Invoice finalized: ${invoice.id}`);
    // Handle invoice finalization
  }

  async handleInvoicePaymentActionRequired(invoice) {
    winston.info(`Invoice payment action required: ${invoice.id}`);
    // Handle payment action required (e.g., 3D Secure)
  }

  // =====================================================================
  // STRIPE ISSUING - CARD MANAGEMENT
  // =====================================================================

  /**
   * Create a cardholder (required before issuing cards)
   */
  async createCardholder(cardholderData) {
    try {
      const cardholder = await this.stripe.issuing.cardholders.create({
        name: cardholderData.name,
        email: cardholderData.email,
        phone_number: cardholderData.phone,
        type: cardholderData.type || 'individual', // 'individual' or 'company'
        billing: {
          address: {
            line1: cardholderData.address.line1,
            line2: cardholderData.address.line2 || '',
            city: cardholderData.address.city,
            state: cardholderData.address.state,
            postal_code: cardholderData.address.postal_code,
            country: cardholderData.address.country || 'US',
          },
        },
        status: 'active',
        metadata: {
          platform: 'dar_al_nas',
          sharia_compliant: 'true',
          ...cardholderData.metadata,
        },
      });
      winston.info(`Cardholder created: ${cardholder.id} - ${cardholder.name}`);
      return cardholder;
    } catch (error) {
      winston.error(`Error creating cardholder: ${error.message}`);
      throw error;
    }
  }

  /**
   * Issue a new card (physical or virtual)
   */
  async issueCard(cardData) {
    try {
      const card = await this.stripe.issuing.cards.create({
        cardholder: cardData.cardholder_id,
        currency: cardData.currency || 'usd',
        type: cardData.type || 'virtual', // 'virtual' or 'physical'
        status: 'active',
        spending_controls: {
          spending_limits: cardData.spending_limits || [
            { amount: 500000, interval: 'monthly' }, // $5,000/month default
          ],
          allowed_categories: cardData.allowed_categories || null,
          blocked_categories: cardData.blocked_categories || [
            'ac_refrigeration_repair',
            'bars_cocktail_lounges',
            'beer_wine_liquor',
            'drinking_places',
            'package_stores_beer_wine_liquor',
            'gambling',
          ],
        },
        shipping: cardData.type === 'physical' ? {
          name: cardData.shipping_name,
          address: cardData.shipping_address,
          service: cardData.shipping_service || 'standard', // 'standard', 'express', 'priority'
        } : undefined,
        metadata: {
          platform: 'dar_al_nas',
          sharia_compliant: 'true',
          card_tier: cardData.tier || 'standard',
          ...cardData.metadata,
        },
      });
      winston.info(`Card issued: ${card.id} - Type: ${card.type} - Status: ${card.status}`);
      return card;
    } catch (error) {
      winston.error(`Error issuing card: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get card details
   */
  async getCard(cardId) {
    try {
      const card = await this.stripe.issuing.cards.retrieve(cardId);
      return card;
    } catch (error) {
      winston.error(`Error retrieving card: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update card status (activate, deactivate, cancel)
   */
  async updateCardStatus(cardId, status) {
    try {
      const card = await this.stripe.issuing.cards.update(cardId, {
        status: status, // 'active', 'inactive', 'canceled'
      });
      winston.info(`Card ${cardId} status updated to: ${status}`);
      return card;
    } catch (error) {
      winston.error(`Error updating card status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update card spending controls
   */
  async updateCardSpendingControls(cardId, spendingControls) {
    try {
      const card = await this.stripe.issuing.cards.update(cardId, {
        spending_controls: spendingControls,
      });
      winston.info(`Card ${cardId} spending controls updated`);
      return card;
    } catch (error) {
      winston.error(`Error updating spending controls: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all cards for a cardholder
   */
  async listCards(cardholderId, options = {}) {
    try {
      const cards = await this.stripe.issuing.cards.list({
        cardholder: cardholderId,
        limit: options.limit || 10,
        status: options.status || undefined,
      });
      return cards;
    } catch (error) {
      winston.error(`Error listing cards: ${error.message}`);
      throw error;
    }
  }

  /**
   * List cardholders
   */
  async listCardholders(options = {}) {
    try {
      const cardholders = await this.stripe.issuing.cardholders.list({
        limit: options.limit || 10,
        status: options.status || undefined,
      });
      return cardholders;
    } catch (error) {
      winston.error(`Error listing cardholders: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get card transactions (authorizations)
   */
  async listCardAuthorizations(cardId, options = {}) {
    try {
      const authorizations = await this.stripe.issuing.authorizations.list({
        card: cardId,
        limit: options.limit || 25,
      });
      return authorizations;
    } catch (error) {
      winston.error(`Error listing authorizations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get card transaction history
   */
  async listCardTransactions(cardId, options = {}) {
    try {
      const transactions = await this.stripe.issuing.transactions.list({
        card: cardId,
        limit: options.limit || 25,
      });
      return transactions;
    } catch (error) {
      winston.error(`Error listing card transactions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a top-up for Issuing balance
   */
  async createIssuingTopUp(amount, currency = 'usd') {
    try {
      const topUp = await this.stripe.topups.create({
        amount: amount,
        currency: currency,
        description: 'Dar Al-Nas Issuing balance top-up',
        metadata: {
          platform: 'dar_al_nas',
          purpose: 'card_funding',
        },
      });
      winston.info(`Issuing top-up created: ${topUp.id} - $${(amount / 100).toFixed(2)}`);
      return topUp;
    } catch (error) {
      winston.error(`Error creating top-up: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Issuing balance
   */
  async getIssuingBalance() {
    try {
      const balance = await this.stripe.balance.retrieve();
      const issuingBalance = balance.issuing || { available: [] };
      return issuingBalance;
    } catch (error) {
      winston.error(`Error retrieving issuing balance: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new StripeService();
