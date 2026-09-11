#!/usr/bin/env node
'use strict';

// Harden the legacy revenue server's IPFS read boundary without modifying its
// large monolithic entrypoint. The legacy server imports child_process.exec
// after this preload runs, so the guarded implementation is what it receives.
const childProcess = require('child_process');
const { createExecGuard } = require('./security/ipfs_command_policy');

childProcess.exec = createExecGuard(
  childProcess.exec.bind(childProcess),
  childProcess.execFile.bind(childProcess)
);

require('./revenue-server');
