'use strict';

const request = require('supertest');
const {
  isBlockedIp,
  validateWebhookTarget,
} = require('../src/security/agentWebhookPolicy');
const app = require('../agent-actions-server');

describe('Agent Actions security boundary', () => {
  const originalApiKey = process.env.AGENT_API_KEY;
  const originalAllowedHosts = process.env.AGENT_WEBHOOK_ALLOWED_HOSTS;

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.AGENT_API_KEY;
    else process.env.AGENT_API_KEY = originalApiKey;

    if (originalAllowedHosts === undefined) delete process.env.AGENT_WEBHOOK_ALLOWED_HOSTS;
    else process.env.AGENT_WEBHOOK_ALLOWED_HOSTS = originalAllowedHosts;
  });

  test('fails closed when AGENT_API_KEY is not configured', async () => {
    delete process.env.AGENT_API_KEY;
    const response = await request(app).get('/v1/agents/synthetic-agent');
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('authentication_not_configured');
  });

  test('requires a bearer token when authentication is configured', async () => {
    process.env.AGENT_API_KEY = 'synthetic-agent-api-key-for-regression-tests';
    const response = await request(app).get('/v1/agents/synthetic-agent');
    expect(response.status).toBe(401);
  });

  test('rejects the wrong bearer token', async () => {
    process.env.AGENT_API_KEY = 'synthetic-agent-api-key-for-regression-tests';
    const response = await request(app)
      .get('/v1/agents/synthetic-agent')
      .set('Authorization', 'Bearer definitely-wrong');
    expect(response.status).toBe(403);
  });

  test('allows a valid synthetic bearer token through the policy layer', async () => {
    const token = 'synthetic-agent-api-key-for-regression-tests';
    process.env.AGENT_API_KEY = token;
    const response = await request(app)
      .get('/v1/agents/synthetic-agent')
      .set('Authorization', `Bearer ${token}`);
    // The synthetic ID does not exist; reaching the router is the expected proof.
    expect(response.status).toBe(404);
  });

  test('webhooks fail closed when no destination allowlist is configured', () => {
    delete process.env.AGENT_WEBHOOK_ALLOWED_HOSTS;
    const result = validateWebhookTarget('https://hooks.example.com/events');
    expect(result).toEqual({ ok: false, reason: 'allowlist_not_configured' });
  });

  test('allows only exact HTTPS hosts from the server-controlled allowlist', () => {
    process.env.AGENT_WEBHOOK_ALLOWED_HOSTS = 'hooks.example.com,events.example.org';
    expect(validateWebhookTarget('https://hooks.example.com/events').ok).toBe(true);
    expect(validateWebhookTarget('https://sub.hooks.example.com/events')).toEqual({
      ok: false,
      reason: 'host_not_allowed',
    });
    expect(validateWebhookTarget('http://hooks.example.com/events')).toEqual({
      ok: false,
      reason: 'https_required',
    });
  });

  test('blocks local names, URL credentials, fragments, and literal IP targets', () => {
    process.env.AGENT_WEBHOOK_ALLOWED_HOSTS = 'localhost,127.0.0.1,hooks.example.com';
    expect(validateWebhookTarget('https://localhost/events').ok).toBe(false);
    expect(validateWebhookTarget('https://127.0.0.1/events').ok).toBe(false);
    expect(validateWebhookTarget('https://user:pass@hooks.example.com/events').ok).toBe(false);
    expect(validateWebhookTarget('https://hooks.example.com/events#fragment').ok).toBe(false);
  });

  test('classifies private/reserved addresses for dispatch-time DNS enforcement', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('10.0.0.1')).toBe(true);
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('fc00::1')).toBe(true);
    expect(isBlockedIp('8.8.8.8')).toBe(false);
  });
});
