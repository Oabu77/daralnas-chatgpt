const crypto = require('crypto');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_MAX_UPLOAD_BYTES = 32 * 1024 * 1024;
const HARD_MAX_UPLOAD_BYTES = 64 * 1024 * 1024;
const UPLOAD_PATHS = new Set(['/store', '/meshtalk/backup']);

function getControlToken(env = process.env) {
  return String(env.MESH_STORAGE_CONTROL_TOKEN || '').trim();
}

function resolveHost(options = {}, env = process.env) {
  return String(options.host || env.MESH_STORAGE_HOST || DEFAULT_HOST).trim() || DEFAULT_HOST;
}

function resolveMaxUploadBytes(env = process.env) {
  const configured = Number.parseInt(String(env.MESH_STORAGE_MAX_UPLOAD_BYTES || ''), 10);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_MAX_UPLOAD_BYTES;
  return Math.min(configured, HARD_MAX_UPLOAD_BYTES);
}

function secureTokenEqual(candidate, expected) {
  const candidateDigest = crypto.createHash('sha256').update(String(candidate)).digest();
  const expectedDigest = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(candidateDigest, expectedDigest);
}

function bearerFromRequest(req) {
  const value = String(req.headers.authorization || '');
  if (!value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token || null;
}

function createMeshStorageGuard({ env = process.env } = {}) {
  const expectedToken = getControlToken(env);
  const maxUploadBytes = resolveMaxUploadBytes(env);

  return (req, res, next) => {
    if (!expectedToken) {
      return res.status(503).json({ error: 'mesh_storage_control_unavailable' });
    }

    const candidate = bearerFromRequest(req);
    if (!candidate) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'authentication_required' });
    }

    if (!secureTokenEqual(candidate, expectedToken)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (UPLOAD_PATHS.has(req.path)) {
      const rawLength = req.headers['content-length'];
      if (!rawLength) {
        return res.status(411).json({ error: 'content_length_required' });
      }

      const contentLength = Number.parseInt(String(rawLength), 10);
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        return res.status(400).json({ error: 'invalid_content_length' });
      }
      if (contentLength > maxUploadBytes) {
        return res.status(413).json({ error: 'payload_too_large' });
      }
    }

    return next();
  };
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_MAX_UPLOAD_BYTES,
  HARD_MAX_UPLOAD_BYTES,
  getControlToken,
  resolveHost,
  resolveMaxUploadBytes,
  secureTokenEqual,
  createMeshStorageGuard,
};
