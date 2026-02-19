#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * 🕌 QuranChain-OS — Payment Link Generator
 * Creates Stripe Payment Links for all active products
 * Founder: Omar Mohammad Abunadi™
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');

async function createPaymentLinks() {
  console.log('='.repeat(70));
  console.log('💰 QURANCHAIN — PAYMENT LINK GENERATOR');
  console.log('='.repeat(70));

  // Fetch all active prices (with product info)
  let allPrices = [];
  let hasMore = true;
  let startingAfter = null;

  console.log('\n📦 Fetching all active prices from Stripe...');
  while (hasMore) {
    const params = { limit: 100, active: true, expand: ['data.product'] };
    if (startingAfter) params.starting_after = startingAfter;
    const batch = await stripe.prices.list(params);
    allPrices = allPrices.concat(batch.data);
    hasMore = batch.has_more;
    if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
  }

  // Deduplicate — keep only one price per unique product name
  const seenProducts = new Set();
  const uniquePrices = [];
  for (const price of allPrices) {
    const productName = typeof price.product === 'object' ? price.product.name : price.product;
    if (!seenProducts.has(productName)) {
      seenProducts.add(productName);
      uniquePrices.push(price);
    }
  }

  console.log(`✅ Found ${allPrices.length} total prices, ${uniquePrices.length} unique products\n`);

  const paymentLinks = [];
  let created = 0;
  let errors = 0;

  for (const price of uniquePrices) {
    const productName = typeof price.product === 'object' ? price.product.name : price.product;
    try {
      const linkParams = {
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: {
          product_name: productName,
          platform: 'quranchain-os',
          founder: 'Omar Mohammad Abunadi',
        },
        after_completion: {
          type: 'redirect',
          redirect: { url: 'https://darcloud.host/thank-you' },
        },
        allow_promotion_codes: true,
      };

      // For recurring prices, set mode to subscription
      if (price.recurring) {
        // Payment links auto-detect recurring, no extra config needed
      }

      const link = await stripe.paymentLinks.create(linkParams);

      paymentLinks.push({
        product: productName,
        price_id: price.id,
        amount: price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'Custom',
        interval: price.recurring?.interval || 'one-time',
        payment_link_url: link.url,
        payment_link_id: link.id,
      });

      created++;
      console.log(`🔗 [${created}/${uniquePrices.length}] ${productName} → ${link.url}`);

      // Rate limit protection
      if (created % 20 === 0) {
        console.log('   ⏳ Rate limit pause...');
        await new Promise(r => setTimeout(r, 2000));
      } else {
        await new Promise(r => setTimeout(r, 150));
      }
    } catch (error) {
      errors++;
      console.error(`❌ ${productName}: ${error.message}`);
    }
  }

  // Save to file
  const output = {
    generated_at: new Date().toISOString(),
    founder: 'Omar Mohammad Abunadi™',
    platform: 'QuranChain-OS',
    total_links: paymentLinks.length,
    payment_links: paymentLinks,
  };

  fs.writeFileSync(
    '/home/omar/Desktop/QuranChain-OS/payment-links.json',
    JSON.stringify(output, null, 2)
  );

  console.log('\n' + '='.repeat(70));
  console.log('✅ PAYMENT LINKS GENERATED');
  console.log('='.repeat(70));
  console.log(`Created: ${created}`);
  console.log(`Errors:  ${errors}`);
  console.log(`Output:  payment-links.json`);
  console.log('='.repeat(70));

  return paymentLinks;
}

createPaymentLinks()
  .then(links => {
    console.log(`\n🎉 Done! ${links.length} payment links ready for revenue.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
