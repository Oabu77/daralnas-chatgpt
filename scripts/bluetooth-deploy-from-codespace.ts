#!/usr/bin/env tsx
/**
 * Deploy to Laptop via Bluetooth
 * Sends deployment command through Bluetooth connection
 */

import { createLaptopBridge } from '../src/agents/laptop-bridge-client';

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('📡 BLUETOOTH DEPLOYMENT TO LAPTOP');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');

  const bridge = createLaptopBridge();

  if (!bridge) {
    console.error('❌ Laptop bridge not configured');
    console.log('This requires the laptop relay agent to be already running.');
    console.log('');
    console.log('Alternative: Use direct Bluetooth from this machine');
    console.log('');
    
    // Try direct Bluetooth scan
    console.log('🔍 Scanning for Bluetooth devices...');
    try {
      const { spawn } = require('child_process');
      const bt = spawn('bluetoothctl', ['scan', 'on']);
      
      bt.stdout.on('data', (data: Buffer) => {
        const line = data.toString();
        if (line.includes('GL75') || line.includes('Leopard') || line.includes('omar')) {
          console.log(`🎯 Found: ${line.trim()}`);
        } else {
          console.log(line.trim());
        }
      });
      
      setTimeout(() => {
        bt.kill();
        console.log('');
        console.log('❌ Direct Bluetooth not available in Codespace');
        console.log('');
        console.log('✅ SOLUTION: Run the laptop relay setup manually:');
        console.log('   On your laptop: cd ~/Projects/daralnas-chatgpt && ./scripts/setup-laptop-relay.sh');
        process.exit(1);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Bluetooth not available in this environment');
      process.exit(1);
    }
    return;
  }

  console.log('✅ Laptop bridge configured');
  console.log('');

  // First check if laptop is reachable
  try {
    const health = await bridge.health();
    console.log(`📱 Laptop connected: ${health.hostname}`);
    console.log('');
  } catch (error) {
    console.error('❌ Cannot reach laptop relay agent');
    console.log('The relay agent must be running first before Bluetooth deployment');
    process.exit(1);
  }

  // Execute Bluetooth deployment
  console.log('🔄 Initiating Bluetooth deployment...');
  console.log('   This will scan for paired Bluetooth devices');
  console.log('   and send the deployment command to GL75-Leopard laptop');
  console.log('');

  try {
    const result = await bridge.bluetoothDeploy();
    
    console.log('════════════════════════════════════════════════════════════════');
    if (result.success) {
      console.log('✅ BLUETOOTH DEPLOYMENT SUCCESSFUL');
    } else {
      console.log('⚠️  BLUETOOTH DEPLOYMENT COMPLETED WITH WARNINGS');
    }
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');
    
    if (result.stdout) {
      console.log('📤 Output:');
      console.log(result.stdout);
      console.log('');
    }
    
    if (result.stderr) {
      console.log('⚠️  Warnings/Errors:');
      console.log(result.stderr);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Bluetooth deployment failed:', error);
    console.log('');
    console.log('💡 Manual deployment command:');
    console.log('');
    console.log('cd ~/Projects && \\');
    console.log('(git clone https://github.com/Oabu77/daralnas-chatgpt.git 2>/dev/null || (cd daralnas-chatgpt && git pull)) && \\');
    console.log('cd daralnas-chatgpt && \\');
    console.log('chmod +x scripts/setup-laptop-relay.sh && \\');
    console.log('./scripts/setup-laptop-relay.sh && \\');
    console.log('~/start-laptop-relay.sh');
    console.log('');
    process.exit(1);
  }
}

main();
