#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * QuranChain Payment Webhook Server
 * Receives and processes real-time Stripe payment notifications
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const PAYMENT_LOG = path.join(__dirname, 'logs/production/payments.log');

// Raw body parser for Stripe webhooks
app.post('/webhook/stripe', 
  express.raw({type: 'application/json'}),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error('❌ Webhook Error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Log all incoming payments
    const timestamp = new Date().toISOString();
    switch (event.type) {
      case 'charge.succeeded':
        const charge = event.data.object;
        const paymentLog = `
[${timestamp}] 💰 PAYMENT RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount: $${(charge.amount / 100).toFixed(2)} USD
Charge ID: ${charge.id}
Status: ${charge.status}
Customer: ${charge.customer || 'Guest'}
Description: ${charge.description || 'N/A'}
Payment Method: ${charge.payment_method_details?.type || 'card'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        fs.appendFileSync(PAYMENT_LOG, paymentLog);
        console.log('💚 Payment recorded!');
        break;

      case 'charge.failed':
        const failedCharge = event.data.object;
        const failLog = `
[${timestamp}] ❌ PAYMENT FAILED
Charge ID: ${failedCharge.id}
Amount: $${(failedCharge.amount / 100).toFixed(2)}
Reason: ${failedCharge.failure_message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        fs.appendFileSync(PAYMENT_LOG, failLog);
        console.log('⚠️  Payment failed');
        break;
    }

    res.json({received: true});
  }
);

app.get('/payments', (req, res) => {
  try {
    if (!fs.existsSync(PAYMENT_LOG)) {
      return res.json({ payments: [], total: 0 });
    }
    const data = fs.readFileSync(PAYMENT_LOG, 'utf8');
    res.json({ log_excerpt: data.slice(-1000) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.WEBHOOK_PORT || 9100;
app.listen(PORT, () => {
  console.log(`🌐 Payment Webhook Server listening on port ${PORT}`);
  console.log(`📍 Add to Stripe Dashboard:`);
  console.log(`   Webhook URL: https://darcloud.host:${PORT}/webhook/stripe`);
});
