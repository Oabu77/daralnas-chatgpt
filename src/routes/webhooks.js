/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const winston = require('../config/logger');
const User = require('../models/User');
const stripeService = require('../services/stripeService');

const router = express.Router();

// Stripe Webhook Endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    winston.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object);
        break;
      default:
        winston.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    winston.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

// Event Handlers
async function handleSubscriptionCreated(subscription) {
  winston.info(`Subscription created: ${subscription.id}`);
  // Update user subscription status
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (user) {
    user.subscriptionStatus = 'active';
    user.subscriptionId = subscription.id;
    user.subscriptionPlan = subscription.items.data[0].price.id;
    await user.save();
  }
}

async function handleSubscriptionUpdated(subscription) {
  winston.info(`Subscription updated: ${subscription.id}`);
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (user) {
    user.subscriptionStatus = subscription.status;
    user.subscriptionPlan = subscription.items.data[0].price.id;
    await user.save();
  }
}

async function handleSubscriptionDeleted(subscription) {
  winston.info(`Subscription deleted: ${subscription.id}`);
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (user) {
    user.subscriptionStatus = 'cancelled';
    await user.save();
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  winston.info(`Invoice payment succeeded: ${invoice.id}`);
  // Log successful payment
}

async function handleInvoicePaymentFailed(invoice) {
  winston.info(`Invoice payment failed: ${invoice.id}`);
  // Handle failed payment
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  winston.info(`Payment intent succeeded: ${paymentIntent.id}`);
  // Process successful payment
}

async function handlePaymentIntentFailed(paymentIntent) {
  winston.info(`Payment intent failed: ${paymentIntent.id}`);
  // Handle failed payment
}

async function handleCustomerCreated(customer) {
  winston.info(`Customer created: ${customer.id}`);
  // Additional customer setup if needed
}

async function handleCustomerUpdated(customer) {
  winston.info(`Customer updated: ${customer.id}`);
  // Update local customer data if needed
}

module.exports = router;