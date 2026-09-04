/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
const request = require('supertest');
const stripeService = require('../src/services/stripeService');

// Provider isolation is mandatory in unit/CI tests. Registration currently
// invokes createCustomer(), but the test must never make a real Stripe request.
const createCustomerSpy = jest
  .spyOn(stripeService, 'createCustomer')
  .mockResolvedValue({ id: 'cus_synthetic_auth_test' });

const app = require('../src/index');
const User = require('../src/models/User');
const mongoose = require('mongoose');

describe('Auth Routes', () => {
  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
    createCustomerSpy.mockRestore();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user without real provider egress', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(createCustomerSpy).toHaveBeenCalledTimes(1);
    });

    it('should not register user with existing email', async () => {
      const userData = {
        username: 'testuser2',
        email: 'test@example.com',
        password: 'password123',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      // Duplicate rejection happens before another provider operation.
      expect(createCustomerSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should not login with wrong password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });
  });
});
