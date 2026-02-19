/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/User');
const mongoose = require('mongoose');

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Connect to test database if needed
    // For now, we'll assume MongoDB is running
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
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