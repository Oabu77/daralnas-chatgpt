#!/usr/bin/env node
'use strict';

// SECURITY BOUNDARY: keep the historical filename as the only supported
// compatibility entrypoint so legacy launchers cannot bypass the IPFS guard.
// The monolithic implementation is preserved in revenue-server-legacy.js.
const childProcess = require('child_process');
const { createExecGuard } = require('./security/ipfs_command_policy');

childProcess.exec = createExecGuard(
  childProcess.exec.bind(childProcess),
  childProcess.execFile.bind(childProcess)
);

require('./revenue-server-legacy');
