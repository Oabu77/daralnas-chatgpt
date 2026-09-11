const express = require('express');
const request = require('supertest');
const {
  DEFAULT_HOST,
  DEFAULT_MAX_UPLOAD_BYTES,
  HARD_MAX_UPLOAD_BYTES,
  resolveHost,
  resolveMaxUploadBytes,
  createMeshStorageGuard,
} = require('../src/services/meshStorageSecurity');
const { SecureMeshStorageBackend } = require('../src/services/secureMeshStorageBackend');

const TEST_TOKEN = 'synthetic-mesh-control-token-32-bytes-minimum';

function invokeGuard({ env, path = '/retrieve', headers = {} }) {
  const guard = createMeshStorageGuard({ env });
  const req = { path, headers };
  const state = { statusCode: 200, body: null, headers: {}, nextCalled: false };
  const res = {
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(body) {
      state.body = body;
      return this;
    },
    set(name, value) {
      state.headers[name] = value;
      return this;
    },
  };
  guard(req, res, () => {
    state.nextCalled = true;
  });
  return state;
}

describe('Mesh Storage security boundary', () => {
  test('defaults the listener to loopback', () => {
    expect(resolveHost({}, {})).toBe(DEFAULT_HOST);
    expect(DEFAULT_HOST).toBe('127.0.0.1');
  });

  test('allows an explicit host override only when deliberately configured', () => {
    expect(resolveHost({}, { MESH_STORAGE_HOST: '10.0.0.5' })).toBe('10.0.0.5');
  });

  test('fails closed when the control token is not configured', () => {
    const result = invokeGuard({ env: {} });
    expect(result.statusCode).toBe(503);
    expect(result.nextCalled).toBe(false);
  });

  test('rejects missing and incorrect bearer credentials before downstream dispatch', () => {
    const env = { MESH_STORAGE_CONTROL_TOKEN: TEST_TOKEN };
    const missing = invokeGuard({ env });
    const wrong = invokeGuard({
      env,
      headers: { authorization: 'Bearer definitely-not-the-token' },
    });

    expect(missing.statusCode).toBe(401);
    expect(missing.nextCalled).toBe(false);
    expect(wrong.statusCode).toBe(403);
    expect(wrong.nextCalled).toBe(false);
  });

  test('permits a correct synthetic credential to reach downstream policy', () => {
    const result = invokeGuard({
      env: { MESH_STORAGE_CONTROL_TOKEN: TEST_TOKEN },
      headers: { authorization: `Bearer ${TEST_TOKEN}` },
    });
    expect(result.nextCalled).toBe(true);
  });

  test('requires a bounded content length for in-memory upload routes', () => {
    const env = { MESH_STORAGE_CONTROL_TOKEN: TEST_TOKEN };
    const headers = { authorization: `Bearer ${TEST_TOKEN}` };

    const missingLength = invokeGuard({ env, path: '/store', headers });
    const tooLarge = invokeGuard({
      env,
      path: '/meshtalk/backup',
      headers: {
        ...headers,
        'content-length': String(HARD_MAX_UPLOAD_BYTES + 1),
      },
    });

    expect(missingLength.statusCode).toBe(411);
    expect(missingLength.nextCalled).toBe(false);
    expect(tooLarge.statusCode).toBe(413);
    expect(tooLarge.nextCalled).toBe(false);
  });

  test('caps configured upload size and uses a safer default than the legacy 500 MB buffer', () => {
    expect(resolveMaxUploadBytes({})).toBe(DEFAULT_MAX_UPLOAD_BYTES);
    expect(DEFAULT_MAX_UPLOAD_BYTES).toBe(32 * 1024 * 1024);
    expect(resolveMaxUploadBytes({ MESH_STORAGE_MAX_UPLOAD_BYTES: String(1024 * 1024 * 1024) }))
      .toBe(HARD_MAX_UPLOAD_BYTES);
  });

  test('keeps anonymous health minimal and blocks unauthenticated traffic before legacy parsing', async () => {
    const backend = new SecureMeshStorageBackend({
      env: { MESH_STORAGE_CONTROL_TOKEN: TEST_TOKEN },
    });

    let downstreamCalls = 0;
    const downstream = express();
    downstream.use((req, res) => {
      downstreamCalls += 1;
      res.status(204).end();
    });
    backend.legacyBackend.app = downstream;

    const health = await request(backend.app).get('/health');
    expect(health.statusCode).toBe(503);
    expect(health.body).toEqual({ status: 'starting', service: 'mesh-storage' });

    const unauthenticated = await request(backend.app)
      .post('/retrieve')
      .set('Content-Type', 'application/json')
      .send('{not-valid-json');

    expect(unauthenticated.statusCode).toBe(401);
    expect(downstreamCalls).toBe(0);
  });
});
