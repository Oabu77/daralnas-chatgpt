/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
// Mock stripe before requiring the service
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
    },
    products: {
      create: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    },
    prices: {
      create: jest.fn(),
      update: jest.fn(),
      retrieve: jest.fn(),
      list: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      confirm: jest.fn(),
      cancel: jest.fn(),
      list: jest.fn(),
    },
    paymentMethods: {
      create: jest.fn(),
      attach: jest.fn(),
      detach: jest.fn(),
      list: jest.fn(),
    },
    invoices: {
      create: jest.fn(),
      finalizeInvoice: jest.fn(),
      sendInvoice: jest.fn(),
      retrieve: jest.fn(),
    },
    balanceTransactions: {
      list: jest.fn(),
    },
    charges: {
      list: jest.fn(),
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

const stripeService = require('../src/services/stripeService');
const User = require('../src/models/User');
const mongoose = require('mongoose');

// Mock winston logger
jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock User model
jest.mock('../src/models/User', () => ({
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue({
    _id: 'user_test123',
    save: jest.fn().mockResolvedValue({}),
  }),
  deleteMany: jest.fn().mockResolvedValue({}),
}));

describe('StripeService', () => {
  let mockStripe;

  beforeEach(() => {
    mockStripe = stripeService.stripe;
    jest.clearAllMocks();
  });

  describe('Customer Management', () => {
    test('should create customer successfully', async () => {
      const mockCustomer = { id: 'cus_test123', email: 'test@example.com' };
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const userData = {
        _id: new mongoose.Types.ObjectId(),
        email: 'test@example.com',
        username: 'testuser',
      };

      const result = await stripeService.createCustomer(userData);
      expect(result).toEqual(mockCustomer);
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: userData.email,
        name: userData.username,
        metadata: { userId: userData._id.toString() },
      });
    });

    test('should handle customer creation error', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Stripe error'));

      const userData = {
        _id: new mongoose.Types.ObjectId(),
        email: 'test@example.com',
        username: 'testuser',
      };

      await expect(stripeService.createCustomer(userData)).rejects.toThrow('Stripe error');
    });
  });

  describe('Product Management', () => {
    test('should create product with price', async () => {
      const mockProduct = { id: 'prod_test123', name: 'Test Product' };
      const mockPrice = { id: 'price_test123', unit_amount: 1000 };

      mockStripe.products.create.mockResolvedValue(mockProduct);
      mockStripe.prices.create.mockResolvedValue(mockPrice);

      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        price: 1000,
        currency: 'usd',
        recurring: { interval: 'month' },
      };

      const result = await stripeService.createProduct(productData);
      expect(result).toEqual({ product: mockProduct, price: mockPrice });
    });

    test('should get products with prices', async () => {
      const mockProducts = {
        data: [{ id: 'prod_test123', name: 'Test Product', active: true }],
      };
      const mockPrices = {
        data: [{
          id: 'price_test123',
          product: 'prod_test123',
          unit_amount: 1000,
          currency: 'usd',
          recurring: { interval: 'month' },
          type: 'recurring',
        }],
      };

      mockStripe.products.list.mockResolvedValue(mockProducts);
      mockStripe.prices.list.mockResolvedValue(mockPrices);

      const result = await stripeService.getProducts();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Product');
      expect(result[0].prices[0].amount).toBe(10);
    });
  });

  describe('Subscription Management', () => {
    test('should create subscription', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        status: 'active',
        customer: 'cus_test123',
        latest_invoice: { payment_intent: { client_secret: 'secret' } },
      };

      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await stripeService.createSubscription('cus_test123', 'price_test123');
      expect(result).toEqual(mockSubscription);
    });

    test('should cancel subscription', async () => {
      const mockSubscription = { id: 'sub_test123', customer: 'cus_test123', cancel_at_period_end: true };
      mockStripe.subscriptions.update.mockResolvedValue(mockSubscription);

      const result = await stripeService.cancelSubscription('sub_test123');
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('Payment Intents', () => {
    test('should create payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'secret',
        amount: 1000,
        currency: 'usd',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent(10, 'usd', 'cus_test123');
      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'usd',
        customer: 'cus_test123',
        metadata: {},
        automatic_payment_methods: { enabled: true },
      });
    });
  });

  describe('Webhook Handling', () => {
    test('should handle subscription created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            current_period_end: 1640995200,
            cancel_at_period_end: false,
          },
        },
      };

      // Mock User.findOne
      User.findOne = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        save: jest.fn(),
      });

      await stripeService.handleWebhookEvent(mockEvent);
      expect(User.findOne).toHaveBeenCalledWith({ stripeCustomerId: 'cus_test123' });
    });

    test('should handle payment intent succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_test123' },
        },
      };

      await stripeService.handleWebhookEvent(mockEvent);
      // Should not throw error
    });
  });

  describe('Revenue Analytics', () => {
    test('should get revenue analytics', async () => {
      const mockBalanceTransactions = {
        data: [
          { type: 'charge', amount: 1000 },
          { type: 'refund', amount: -500 },
        ],
      };
      const mockCharges = { data: [] };

      mockStripe.balanceTransactions.list.mockResolvedValue(mockBalanceTransactions);
      mockStripe.charges.list.mockResolvedValue(mockCharges);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const result = await stripeService.getRevenueAnalytics(startDate, endDate);
      expect(result.totalRevenue).toBe(10);
      expect(result.totalRefunds).toBe(5);
      expect(result.netRevenue).toBe(5);
    });
  });
});