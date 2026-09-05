'use strict';

function isSupportedCid(cid) {
  if (typeof cid !== 'string') return false;
  if (cid.length < 20 || cid.length > 128) return false;

  // CIDv0 (base58btc, typically Qm + 44 chars)
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)) return true;

  // Common CIDv1 textual forms. Keep this conservative: unsupported
  // multibase encodings can be added deliberately after review.
  if (/^b[a-z2-7]{20,127}$/.test(cid)) return true; // base32
  if (/^k[0-9a-z]{20,127}$/.test(cid)) return true; // base36

  return false;
}

function createExecGuard(originalExec, execFileImpl) {
  if (typeof originalExec !== 'function' || typeof execFileImpl !== 'function') {
    throw new TypeError('exec implementations must be functions');
  }

  return function guardedExec(command, options, callback) {
    let opts = options;
    let cb = callback;
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    if (typeof command === 'string' && command.startsWith('ipfs cat ')) {
      const cid = command.slice('ipfs cat '.length);
      if (!isSupportedCid(cid)) {
        const err = new Error('Invalid or unsupported IPFS CID');
        err.code = 'EINVAL';
        process.nextTick(() => {
          if (typeof cb === 'function') cb(err, '', '');
        });
        return undefined;
      }

      return execFileImpl('ipfs', ['cat', cid], opts || {}, cb);
    }

    return originalExec(command, opts, cb);
  };
}

module.exports = { isSupportedCid, createExecGuard };
