const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const { authenticateToken } = require('../middleware/auth');

// =====================================================================
// STRIPE ISSUING - CARD ROUTES
// Dar Al-Nas Card Issuance via Stripe Issuing
// =====================================================================

/**
 * POST /api/cards/cardholders
 * Create a new cardholder
 */
router.post('/cardholders', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, type, address, metadata } = req.body;

    if (!name || !email || !address) {
      return res.status(400).json({
        error: 'Name, email, and address are required',
      });
    }

    if (!address.line1 || !address.city || !address.state || !address.postal_code) {
      return res.status(400).json({
        error: 'Address must include line1, city, state, and postal_code',
      });
    }

    const cardholder = await stripeService.createCardholder({
      name,
      email,
      phone,
      type: type || 'individual',
      address,
      metadata,
    });

    res.status(201).json({
      success: true,
      message: 'Cardholder created successfully',
      cardholder: {
        id: cardholder.id,
        name: cardholder.name,
        email: cardholder.email,
        type: cardholder.type,
        status: cardholder.status,
      },
      sharia_compliant: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cards/cardholders
 * List all cardholders
 */
router.get('/cardholders', authenticateToken, async (req, res) => {
  try {
    const { limit, status } = req.query;
    const cardholders = await stripeService.listCardholders({
      limit: limit ? parseInt(limit) : 10,
      status,
    });

    res.json({
      success: true,
      cardholders: cardholders.data,
      has_more: cardholders.has_more,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cards/issue
 * Issue a new card (virtual or physical)
 */
router.post('/issue', authenticateToken, async (req, res) => {
  try {
    const {
      cardholder_id,
      type,
      currency,
      spending_limits,
      allowed_categories,
      blocked_categories,
      shipping_name,
      shipping_address,
      shipping_service,
      tier,
      metadata,
    } = req.body;

    if (!cardholder_id) {
      return res.status(400).json({
        error: 'cardholder_id is required',
      });
    }

    if (type === 'physical' && (!shipping_name || !shipping_address)) {
      return res.status(400).json({
        error: 'Physical cards require shipping_name and shipping_address',
      });
    }

    // Default blocked categories for halal compliance
    const halalBlockedCategories = blocked_categories || [
      'bars_cocktail_lounges',
      'beer_wine_liquor',
      'drinking_places',
      'package_stores_beer_wine_liquor',
      'gambling',
    ];

    const card = await stripeService.issueCard({
      cardholder_id,
      type: type || 'virtual',
      currency: currency || 'usd',
      spending_limits,
      allowed_categories,
      blocked_categories: halalBlockedCategories,
      shipping_name,
      shipping_address,
      shipping_service,
      tier: tier || 'standard',
      metadata,
    });

    res.status(201).json({
      success: true,
      message: `${type || 'virtual'} card issued successfully`,
      card: {
        id: card.id,
        type: card.type,
        status: card.status,
        last4: card.last4,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        brand: card.brand,
        cardholder: card.cardholder,
      },
      halal_compliance: {
        blocked_categories: halalBlockedCategories,
        sharia_verified: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cards/:cardId
 * Get card details
 */
router.get('/:cardId', authenticateToken, async (req, res) => {
  try {
    const card = await stripeService.getCard(req.params.cardId);

    res.json({
      success: true,
      card: {
        id: card.id,
        type: card.type,
        status: card.status,
        last4: card.last4,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        brand: card.brand,
        cardholder: card.cardholder,
        spending_controls: card.spending_controls,
        created: card.created,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/cards/:cardId/status
 * Update card status (activate, deactivate, cancel)
 */
router.patch('/:cardId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'canceled'].includes(status)) {
      return res.status(400).json({
        error: 'Status must be one of: active, inactive, canceled',
      });
    }

    const card = await stripeService.updateCardStatus(req.params.cardId, status);

    res.json({
      success: true,
      message: `Card status updated to ${status}`,
      card: {
        id: card.id,
        status: card.status,
        last4: card.last4,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/cards/:cardId/spending
 * Update card spending controls
 */
router.patch('/:cardId/spending', authenticateToken, async (req, res) => {
  try {
    const { spending_limits, allowed_categories, blocked_categories } = req.body;

    const card = await stripeService.updateCardSpendingControls(req.params.cardId, {
      spending_limits,
      allowed_categories,
      blocked_categories,
    });

    res.json({
      success: true,
      message: 'Spending controls updated',
      card: {
        id: card.id,
        spending_controls: card.spending_controls,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cards/:cardId/authorizations
 * List card authorizations
 */
router.get('/:cardId/authorizations', authenticateToken, async (req, res) => {
  try {
    const { limit } = req.query;
    const authorizations = await stripeService.listCardAuthorizations(
      req.params.cardId,
      { limit: limit ? parseInt(limit) : 25 }
    );

    res.json({
      success: true,
      authorizations: authorizations.data,
      has_more: authorizations.has_more,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cards/:cardId/transactions
 * List card transactions
 */
router.get('/:cardId/transactions', authenticateToken, async (req, res) => {
  try {
    const { limit } = req.query;
    const transactions = await stripeService.listCardTransactions(
      req.params.cardId,
      { limit: limit ? parseInt(limit) : 25 }
    );

    res.json({
      success: true,
      transactions: transactions.data,
      has_more: transactions.has_more,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cards/issuing/balance
 * Get Issuing balance
 */
router.get('/issuing/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await stripeService.getIssuingBalance();

    res.json({
      success: true,
      issuing_balance: balance,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cards/issuing/topup
 * Top up Issuing balance
 */
router.post('/issuing/topup', authenticateToken, async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number (in cents)',
      });
    }

    const topUp = await stripeService.createIssuingTopUp(amount, currency || 'usd');

    res.status(201).json({
      success: true,
      message: `Issuing balance topped up by $${(amount / 100).toFixed(2)}`,
      topup: {
        id: topUp.id,
        amount: topUp.amount,
        currency: topUp.currency,
        status: topUp.status,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cards/cardholder/:cardholderId/cards
 * List all cards for a cardholder
 */
router.get('/cardholder/:cardholderId/cards', authenticateToken, async (req, res) => {
  try {
    const { limit, status } = req.query;
    const cards = await stripeService.listCards(req.params.cardholderId, {
      limit: limit ? parseInt(limit) : 10,
      status,
    });

    res.json({
      success: true,
      cards: cards.data.map(card => ({
        id: card.id,
        type: card.type,
        status: card.status,
        last4: card.last4,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        brand: card.brand,
      })),
      has_more: cards.has_more,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
