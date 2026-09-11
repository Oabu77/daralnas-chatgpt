'use strict';

const dns = require('dns');
const net = require('net');

function parseAllowedHosts(raw = process.env.AGENT_WEBHOOK_ALLOWED_HOSTS || '') {
  return new Set(
    String(raw)
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isBlockedIp(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const octets = address.split('.').map(Number);
    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51) ||
      (a === 203 && b === 0) ||
      a >= 224
    );
  }

  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(normalized)) return true;
    if (normalized.startsWith('2001:db8:')) return true;
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice('::ffff:'.length);
      if (net.isIP(mapped) === 4) return isBlockedIp(mapped);
    }
  }

  return false;
}

function validateWebhookTarget(targetUrl, allowedHostsRaw = process.env.AGENT_WEBHOOK_ALLOWED_HOSTS || '') {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'https_required' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'url_credentials_not_allowed' };
  }
  if (parsed.hash) {
    return { ok: false, reason: 'url_fragment_not_allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { ok: false, reason: 'local_target_not_allowed' };
  }
  if (net.isIP(hostname)) {
    return { ok: false, reason: 'ip_literal_not_allowed' };
  }

  const allowedHosts = parseAllowedHosts(allowedHostsRaw);
  if (!allowedHosts.size) {
    return { ok: false, reason: 'allowlist_not_configured' };
  }
  if (!allowedHosts.has(hostname)) {
    return { ok: false, reason: 'host_not_allowed' };
  }

  return { ok: true, url: parsed.toString(), hostname, hostHeader: parsed.host };
}

async function resolvePublicAddress(hostname) {
  const answers = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  if (!answers.length) throw new Error('Webhook hostname did not resolve');
  if (answers.some(({ address }) => isBlockedIp(address))) {
    throw new Error('Webhook hostname resolved to a non-public address');
  }
  return answers[0].address;
}

module.exports = {
  isBlockedIp,
  parseAllowedHosts,
  resolvePublicAddress,
  validateWebhookTarget,
};
