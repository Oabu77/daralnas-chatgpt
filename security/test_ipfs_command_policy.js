'use strict';
const assert = require('assert');
const { isSupportedCid, createExecGuard } = require('./ipfs_command_policy');

const cidV0 = 'Qm' + 'a'.repeat(44);
const cidV1 = 'b' + 'a'.repeat(58);
assert.equal(isSupportedCid(cidV0), true);
assert.equal(isSupportedCid(cidV1), true);
assert.equal(isSupportedCid('Qmabc;touchX'), false);
assert.equal(isSupportedCid('babc$(id)'), false);
assert.equal(isSupportedCid(''), false);

let execFileCalls = [];
const guarded = createExecGuard(
  (command, options, cb) => {
    if (typeof cb === 'function') cb(null, 'legacy-ok', '');
    return { legacy: true };
  },
  (file, args, options, cb) => {
    execFileCalls.push({ file, args, options });
    if (typeof cb === 'function') cb(null, 'safe-ok', '');
    return { safe: true };
  }
);

let invalidError = null;
guarded('ipfs cat bad;echo_x', { maxBuffer: 1024 }, (err) => { invalidError = err; });
setImmediate(() => {
  assert(invalidError);
  assert.equal(invalidError.code, 'EINVAL');
  assert.equal(execFileCalls.length, 0);

  guarded(`ipfs cat ${cidV0}`, { maxBuffer: 2048 }, (err, stdout) => {
    assert.ifError(err);
    assert.equal(stdout, 'safe-ok');
  });
  assert.equal(execFileCalls.length, 1);
  assert.equal(execFileCalls[0].file, 'ipfs');
  assert.deepEqual(execFileCalls[0].args, ['cat', cidV0]);

  let passthrough = false;
  const passthroughGuard = createExecGuard(
    (command, options, cb) => {
      passthrough = command === 'ipfs id --format="<id>"';
      if (typeof cb === 'function') cb(null, 'id', '');
      return {};
    },
    () => { throw new Error('unexpected execFile'); }
  );
  passthroughGuard('ipfs id --format="<id>"', () => {});
  assert.equal(passthrough, true);

  console.log('ipfs command policy: PASS');
});
