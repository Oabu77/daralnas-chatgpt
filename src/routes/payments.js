const express = require('express');
const stripeService = require('../services/stripeService');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// ACH Payment Collection Endpoint (using Stripe)
router.post('/ach', auth, async (req, res) => {
  const { accountNumber, routingNumber, accountHolderName, amount, currency = 'usd' } = req.body;

  // Validate input
  if (!accountNumber || !routingNumber || !accountHolderName || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findById(req.user.id);

    // Ensure user has a Stripe customer
    let customer;
    if (!user.stripeCustomerId) {
      customer = await stripeService.createCustomer(user);
    } else {
      customer = await stripeService.getCustomer(user.stripeCustomerId);
    }

    // Create payment method for ACH
    const paymentMethod = await stripeService.stripe.paymentMethods.create({
      type: 'us_bank_account',
      us_bank_account: {
        account_holder_type: 'individual',
        account_number: accountNumber,
        routing_number: routingNumber,
      },
      billing_details: {
        name: accountHolderName,
      },
    });

    // Attach payment method to customer
    await stripeService.stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    });

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent(amount, currency, customer.id, {
      userId: user._id.toString(),
      paymentType: 'ach',
    });

    // Confirm the payment intent with the payment method
    const confirmedPayment = await stripeService.stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: paymentMethod.id,
      mandate_data: {
        customer_acceptance: {
          type: 'online',
          online: {
            ip_address: req.ip || '127.0.0.1',
            user_agent: req.get('User-Agent') || 'QuranChain-OS/1.0',
          },
        },
      },
    });

    res.json({
      paymentIntentId: confirmedPayment.id,
      clientSecret: confirmedPayment.client_secret,
      status: confirmedPayment.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Card Payment Collection Endpoint
router.post('/card', auth, async (req, res) => {
  const { paymentMethodId, amount, currency = 'usd', metadata = {} } = req.body;

  if (!paymentMethodId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findById(req.user.id);

    // Ensure user has a Stripe customer
    let customer;
    if (!user.stripeCustomerId) {
      customer = await stripeService.createCustomer(user);
    } else {
      customer = await stripeService.getCustomer(user.stripeCustomerId);
    }

    // Attach payment method to customer
    await stripeService.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set as default payment method
    await stripeService.stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent(amount, currency, customer.id, {
      userId: user._id.toString(),
      paymentType: 'card',
      ...metadata,
    });

    // Confirm the payment
    const confirmedPayment = await stripeService.stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: paymentMethodId,
    });

    res.json({
      paymentIntentId: confirmedPayment.id,
      clientSecret: confirmedPayment.client_secret,
      status: confirmedPayment.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Payment Methods for User
router.get('/payment-methods', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.stripeCustomerId) {
      return res.json({ paymentMethods: [] });
    }

    const paymentMethods = await stripeService.stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    res.json({ paymentMethods: paymentMethods.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove Payment Method
router.delete('/payment-methods/:paymentMethodId', auth, async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user.stripeCustomerId) {
      return res.status(404).json({ error: 'No Stripe customer found' });
    }

    // Detach payment method
    await stripeService.stripe.paymentMethods.detach(paymentMethodId);

    res.json({ message: 'Payment method removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Payment History
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.stripeCustomerId) {
      return res.json({ payments: [] });
    }

    const paymentIntents = await stripeService.stripe.paymentIntents.list({
      customer: user.stripeCustomerId,
      limit: 20,
    });

    res.json({ payments: paymentIntents.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;