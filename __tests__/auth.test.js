/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
const request = require('supertest');
const stripeService = require('../src/services/stripeService');

// A regression guard: public identity registration must not provision billing
// provider resources. The spy also ensures any accidental future call is local.
const createCustomerSpy = jest
  .spyOn(stripeService, 'createCustomer')
  .mockResolvedValue({ id: 'cus_should_not_be_called' });

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
    it('should register a local identity without Stripe provisioning', async () => {
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
      expect(createCustomerSpy).not.toHaveBeenCalled();
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

      expect(createCustomerSpy).not.toHaveBeenCalled();
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
