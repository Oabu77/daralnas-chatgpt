/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * secretsVault.js – AES-256-GCM encrypted secret store.
 *
 * Production requires a runtime-managed VAULT_KEY. Runtime vault material is
 * stored outside the source tree by default so a repository snapshot cannot
 * contain both the encryption key and ciphertext.
 */

'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_RUNTIME_DIR = path.join(os.homedir(), '.daralnas-agent-actions');
const DATA_DIR = path.resolve(process.env.VAULT_DATA_DIR || DEFAULT_RUNTIME_DIR);
const VAULT_FILE = path.join(DATA_DIR, 'secrets.enc.json');
const KEY_FILE = path.join(DATA_DIR, 'vault.key');

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

function validateRuntimeLocation() {
  if (process.env.NODE_ENV === 'production' && isWithin(REPO_ROOT, DATA_DIR)) {
    throw new Error('SecretsVault runtime directory must be outside the repository in production');
  }
}

function decodeKey(raw, source) {
  const value = String(raw || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`SecretsVault ${source} must be exactly 32 bytes encoded as 64 hex characters`);
  }
  return Buffer.from(value, 'hex');
}

function ensureRuntimeDir() {
  validateRuntimeLocation();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  try {
    fs.chmodSync(DATA_DIR, 0o700);
  } catch (_) {
    // Best-effort on platforms that do not support POSIX permissions.
  }
}

// Production fails closed without a managed key. Local development may use a
// generated key, but it is persisted only in the runtime directory outside the
// repository tree.
function getKey() {
  validateRuntimeLocation();

  const envKey = process.env.VAULT_KEY;
  if (envKey) {
    return decodeKey(envKey, 'VAULT_KEY');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SecretsVault requires VAULT_KEY in production');
  }

  ensureRuntimeDir();
  if (fs.existsSync(KEY_FILE)) {
    return decodeKey(fs.readFileSync(KEY_FILE, 'utf8'), 'development key file');
  }

  const newKey = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, newKey.toString('hex'), { mode: 0o600, flag: 'wx' });
  console.log('[SecretsVault] generated development vault key outside repository');
  return newKey;
}

let KEY = null;
function ensureKey() {
  if (!KEY) KEY = getKey();
  return KEY;
}

// ── Encrypt / Decrypt ────────────────────────────────────────────────────────
function encrypt(plaintext) {
  const key = ensureKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv:         iv.toString('hex'),
    ciphertext: enc.toString('hex'),
    tag:        tag.toString('hex'),
  };
}

function decrypt(record) {
  const key = ensureKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(record.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(record.tag, 'hex'));
  return decipher.update(record.ciphertext, 'hex', 'utf8') + decipher.final('utf8');
}

// ── Vault storage (on-disk map: secretId → encrypted blob + metadata) ────────
let vault = {};

function loadVault() {
  validateRuntimeLocation();
  try {
    if (fs.existsSync(VAULT_FILE)) {
      vault = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
      console.log(`[SecretsVault] loaded ${Object.keys(vault).length} secrets`);
    }
  } catch (err) {
    console.error('[SecretsVault] load error:', err.message);
    vault = {};
  }
}

function saveVault() {
  try {
    ensureRuntimeDir();
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error('[SecretsVault] save error:', err.message);
    throw err;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Store a secret. Returns SecretRef (no value).
 */
function store(agentId, name, value, type, rotateAfterDays) {
  const secretId = crypto.randomUUID();
  const encrypted = encrypt(value);
  vault[secretId] = {
    secretId,
    agentId,
    name,
    type,
    encrypted,
    rotateAfterDays: rotateAfterDays || null,
    createdAt: new Date().toISOString(),
  };
  saveVault();
  return toRef(vault[secretId]);
}

/**
 * Retrieve decrypted value — INTERNAL USE ONLY (task runner needs it).
 * NEVER expose via API.
 */
function retrieve(secretId) {
  const entry = vault[secretId];
  if (!entry) return null;
  return decrypt(entry.encrypted);
}

/**
 * List secret references for an agent (metadata only, no values).
 */
function listRefs(agentId) {
  return Object.values(vault)
    .filter((e) => e.agentId === agentId)
    .map(toRef);
}

/**
 * Delete a secret.
 */
function deleteSecret(secretId) {
  if (!vault[secretId]) return false;
  delete vault[secretId];
  saveVault();
  return true;
}

/**
 * Check if a secret exists.
 */
function exists(secretId) {
  return !!vault[secretId];
}

function toRef(entry) {
  return {
    secretId:  entry.secretId,
    name:      entry.name,
    type:      entry.type,
    createdAt: entry.createdAt,
  };
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') ensureKey();
loadVault();

module.exports = { store, retrieve, listRefs, deleteSecret, exists };
