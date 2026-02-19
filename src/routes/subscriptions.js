/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
const express = require('express');
const stripeService = require('../services/stripeService');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Create Subscription Endpoint
router.post('/subscription', auth, async (req, res) => {
  try {
    const { priceId, paymentMethodId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure user has a Stripe customer
    let customer;
    if (!user.stripeCustomerId) {
      customer = await stripeService.createCustomer(user);
    } else {
      customer = await stripeService.getCustomer(user.stripeCustomerId);
    }

    // Create subscription
    const subscription = await stripeService.createSubscription(customer.id, priceId, {
      default_payment_method: paymentMethodId,
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel Subscription
router.post('/subscription/cancel', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.subscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = await stripeService.cancelSubscription(user.subscriptionId);
    res.json({ message: 'Subscription canceled successfully', subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User's Subscription
router.get('/subscription', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.subscriptionId) {
      return res.json({ subscription: null });
    }

    const subscription = await stripeService.getSubscription(user.subscriptionId);
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List Products Endpoint
router.get('/products', async (req, res) => {
  try {
    const products = await stripeService.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Payment Intent for one-time payments
router.post('/payment-intent', auth, async (req, res) => {
  try {
    const { amount, currency = 'usd', metadata = {} } = req.body;
    const user = await User.findById(req.user.id);

    let customerId = null;
    if (user.stripeCustomerId) {
      customerId = user.stripeCustomerId;
    }

    const paymentIntent = await stripeService.createPaymentIntent(amount, currency, customerId, {
      userId: user._id.toString(),
      ...metadata,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resume Subscription
router.post('/subscription/resume', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.subscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = await stripeService.resumeSubscription(user.subscriptionId);
    res.json({ message: 'Subscription resumed successfully', subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change Subscription Plan
router.post('/subscription/change-plan', auth, async (req, res) => {
  try {
    const { newPriceId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.subscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = await stripeService.changeSubscriptionPrice(user.subscriptionId, newPriceId);
    res.json({ message: 'Subscription plan changed successfully', subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Revenue Analytics (Admin only)
router.get('/analytics/revenue', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const analytics = await stripeService.getRevenueAnalytics(start, end);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Customer Payment History
router.get('/customer/payment-history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.stripeCustomerId) {
      return res.json({ paymentIntents: [], subscriptions: [] });
    }

    const history = await stripeService.getCustomerPaymentHistory(user.stripeCustomerId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripeService.constructEvent(req.body, sig, endpointSecret);
    await stripeService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
});

module.exports = router;