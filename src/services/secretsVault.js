/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * secretsVault.js  –  AES-256-GCM encrypted secret store
 *
 * Secrets are stored encrypted on disk at data/agent-actions/secrets.enc.json
 * The encryption key comes from VAULT_KEY env var (32-byte hex or auto-generated).
 * Public API never returns the raw value — only SecretRef metadata.
 */

'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const VAULT_FILE = path.resolve(__dirname, '../../data/agent-actions/secrets.enc.json');
const DATA_DIR   = path.resolve(__dirname, '../../data/agent-actions');

// Derive 32-byte key from env or generate a stable one
function getKey() {
  const envKey = process.env.VAULT_KEY;
  if (envKey && envKey.length >= 64) {
    return Buffer.from(envKey.substring(0, 64), 'hex');
  }
  // Auto-generate and persist a key if none provided
  const keyFile = path.join(DATA_DIR, '.vault-key');
  if (fs.existsSync(keyFile)) {
    return Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'hex');
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const newKey = crypto.randomBytes(32);
  fs.writeFileSync(keyFile, newKey.toString('hex'), { mode: 0o600 });
  console.log('[SecretsVault] generated new vault key at', keyFile);
  return newKey;
}

let KEY = null;
function ensureKey() { if (!KEY) KEY = getKey(); return KEY; }

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
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error('[SecretsVault] save error:', err.message);
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
loadVault();

module.exports = { store, retrieve, listRefs, deleteSecret, exists };
