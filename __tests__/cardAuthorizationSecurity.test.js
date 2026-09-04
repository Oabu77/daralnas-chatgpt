process.env.JWT_SECRET = 'synthetic-card-security-test-secret';
process.env.NODE_ENV = 'test';

jest.mock('../src/config/database', () => jest.fn());
jest.mock('../src/models/User', () => ({
  findById: jest.fn(),
}));
jest.mock('../src/services/stripeService', () => ({
  createIssuingTopUp: jest.fn(),
  issueCard: jest.fn(),
  getCard: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const stripeService = require('../src/services/stripeService');
const app = require('../src/index');

function tokenFor(id = 'synthetic-user-id') {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

function ordinaryUser() {
  return {
    _id: 'synthetic-user-id',
    isActive: true,
    role: 'user',
  };
}

describe('Stripe Issuing authorization boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue(ordinaryUser());
  });

  test('anonymous callers stop before user lookup and provider dispatch', async () => {
    const response = await request(app)
      .post('/api/cards/issuing/topup')
      .send({ amount: 10000, currency: 'usd' });

    expect(response.status).toBe(401);
    expect(User.findById).not.toHaveBeenCalled();
    expect(stripeService.createIssuingTopUp).not.toHaveBeenCalled();
  });

  test('ordinary users cannot request an Issuing balance top-up', async () => {
    const response = await request(app)
      .post('/api/cards/issuing/topup')
      .set('Authorization', `Bearer ${tokenFor()}`)
      .send({ amount: 10000, currency: 'usd' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Admin access required');
    expect(stripeService.createIssuingTopUp).not.toHaveBeenCalled();
  });

  test('ordinary users cannot issue a card for a caller-supplied cardholder', async () => {
    const response = await request(app)
      .post('/api/cards/issue')
      .set('Authorization', `Bearer ${tokenFor()}`)
      .send({ cardholder_id: 'ich_synthetic', type: 'virtual' });

    expect(response.status).toBe(403);
    expect(stripeService.issueCard).not.toHaveBeenCalled();
  });

  test('ordinary users cannot retrieve a caller-supplied card id', async () => {
    const response = await request(app)
      .get('/api/cards/ic_synthetic')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(response.status).toBe(403);
    expect(stripeService.getCard).not.toHaveBeenCalled();
  });
});
