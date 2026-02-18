#!/bin/bash
cd /home/omar/Desktop/QuranChain-OS
export NODE_ENV=production
export BLOCKCHAIN_HTTP_PORT=3001
exec node src/blockchain-server.js
