#!/usr/bin/env node

/**
 * Launch All Background Agents
 * Runs continuously to test all 59 companies, monitor Fungi mesh,
 * and connect to Omar's devices
 */

import { MasterAgent } from '../src/agents/background-tester';

async function main() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 DARCLOUD BACKGROUND AGENTS LAUNCHER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 59 Companies Loaded
🧪 Continuous Testing: ENABLED
🔄 Auto-Updates: ENABLED  
🍄 Fungi Mesh Network: ENABLED
📱 Omar's Devices: Auto-Connect (USB + Bluetooth)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  const master = new MasterAgent();
  
  // Start all agents
  await master.startAll();
  
  // Keep process running
  process.on('SIGINT', () => {
    console.log(`\n🛑 Shutting down agents gracefully...`);
    process.exit(0);
  });
  
  // Status reporting every 60 seconds
  setInterval(() => {
    const status = master.getStatus();
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 AGENT STATUS REPORT`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🧪 Tester: ${status.tester.tests_passed}/${status.tester.tests_completed} passed`);
    console.log(`🍄 Fungi Mesh: ${status.fungi_devices.length} devices connected`);
    console.log(`⏱️  Uptime: ${status.tester.uptime_seconds}s`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }, 60000);
}

main().catch(console.error);
