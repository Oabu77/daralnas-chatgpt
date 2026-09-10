'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const MODULE_PATH = '../src/services/secretsVault';
const ORIGINAL_ENV = { ...process.env };
const TEMP_DIRS = [];

function freshTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daralnas-vault-test-'));
  TEMP_DIRS.push(dir);
  return dir;
}

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

afterEach(() => {
  jest.resetModules();
  restoreEnv();
});

afterAll(() => {
  for (const dir of TEMP_DIRS) fs.rmSync(dir, { recursive: true, force: true });
});

test('production fails closed when VAULT_KEY is absent', () => {
  process.env.NODE_ENV = 'production';
  process.env.VAULT_DATA_DIR = freshTempDir();
  delete process.env.VAULT_KEY;

  expect(() => require(MODULE_PATH)).toThrow(/requires VAULT_KEY in production/);
});

test('production rejects runtime vault storage inside the repository', () => {
  process.env.NODE_ENV = 'production';
  process.env.VAULT_KEY = '11'.repeat(32);
  process.env.VAULT_DATA_DIR = path.join(process.cwd(), 'data', 'agent-actions-runtime-test');

  expect(() => require(MODULE_PATH)).toThrow(/outside the repository/);
});

test('production stores only encrypted vault state in an external runtime directory', () => {
  const runtimeDir = freshTempDir();
  process.env.NODE_ENV = 'production';
  process.env.VAULT_KEY = '22'.repeat(32);
  process.env.VAULT_DATA_DIR = runtimeDir;

  const vault = require(MODULE_PATH);
  const ref = vault.store('synthetic-agent', 'synthetic-name', 'SYNTHETIC_SECRET_ONLY', 'test');

  expect(ref).toEqual(expect.objectContaining({
    agentId: undefined,
    name: 'synthetic-name',
    type: 'test',
  }));

  const vaultFile = path.join(runtimeDir, 'secrets.enc.json');
  expect(fs.existsSync(vaultFile)).toBe(true);
  const serialized = fs.readFileSync(vaultFile, 'utf8');
  expect(serialized).not.toContain('SYNTHETIC_SECRET_ONLY');
  expect(fs.existsSync(path.join(process.cwd(), 'data', 'agent-actions', '.vault-key'))).toBe(true);
});
