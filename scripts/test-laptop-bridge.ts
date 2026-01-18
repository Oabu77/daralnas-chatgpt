#!/usr/bin/env tsx
/**
 * Test Laptop Bridge Connection
 * Run this from Codespace to verify laptop connectivity
 */

import { LaptopBridgeClient } from '../src/agents/laptop-bridge-client';

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🧪 TESTING LAPTOP BRIDGE CONNECTION');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');

  // Check environment variables
  const tunnelUrl = process.env.LAPTOP_RELAY_URL;
  const secretToken = process.env.LAPTOP_RELAY_SECRET;

  if (!tunnelUrl || !secretToken) {
    console.error('❌ ERROR: Environment variables not set');
    console.log('');
    console.log('Please set:');
    console.log('  export LAPTOP_RELAY_URL=https://your-tunnel-url.trycloudflare.com');
    console.log('  export LAPTOP_RELAY_SECRET=your-secret-token');
    console.log('');
    process.exit(1);
  }

  console.log('✅ Environment variables configured');
  console.log(`   Tunnel URL: ${tunnelUrl}`);
  console.log(`   Secret Token: ${secretToken.substring(0, 8)}...`);
  console.log('');

  // Create bridge client
  const bridge = new LaptopBridgeClient({ tunnelUrl, secretToken });

  // Test 1: Health Check
  console.log('📡 Test 1: Health Check');
  try {
    const health = await bridge.health();
    console.log(`   ✅ Status: ${health.status}`);
    console.log(`   ✅ Hostname: ${health.hostname}`);
    console.log(`   ✅ Platform: ${health.platform}`);
    console.log('');
  } catch (error) {
    console.error(`   ❌ Health check failed: ${error}`);
    process.exit(1);
  }

  // Test 2: System Info
  console.log('📊 Test 2: System Information');
  try {
    const info = await bridge.getSystemInfo();
    console.log(`   ✅ Hostname: ${info.hostname}`);
    console.log(`   ✅ Platform: ${info.platform}`);
    console.log(`   ✅ User: ${info.user}`);
    console.log(`   ✅ Home: ${info.home}`);
    console.log(`   ✅ CWD: ${info.cwd}`);
    console.log('');
  } catch (error) {
    console.error(`   ❌ System info failed: ${error}`);
    process.exit(1);
  }

  // Test 3: List Files
  console.log('📁 Test 3: List Home Directory');
  try {
    const files = await bridge.listFiles('~');
    console.log(`   ✅ Found ${files.length} entries`);
    
    // Show first 10 entries
    const preview = files.slice(0, 10);
    preview.forEach(entry => {
      const icon = entry.is_dir ? '📁' : '📄';
      const size = entry.is_file ? ` (${(entry.size / 1024).toFixed(1)} KB)` : '';
      console.log(`   ${icon} ${entry.name}${size}`);
    });
    
    if (files.length > 10) {
      console.log(`   ... and ${files.length - 10} more`);
    }
    console.log('');
  } catch (error) {
    console.error(`   ❌ List files failed: ${error}`);
  }

  // Test 4: Read File
  console.log('📖 Test 4: Read File (.bashrc)');
  try {
    const content = await bridge.readFile('~/.bashrc', 1, 20);
    console.log('   ✅ File content (first 20 lines):');
    console.log('   ┌─────────────────────────────────────────────');
    content.split('\n').slice(0, 20).forEach(line => {
      console.log(`   │ ${line}`);
    });
    console.log('   └─────────────────────────────────────────────');
    console.log('');
  } catch (error) {
    console.error(`   ❌ Read file failed: ${error}`);
  }

  // Test 5: Search Files
  console.log('🔍 Test 5: Search for Python Files');
  try {
    const results = await bridge.findFiles('~', '*.py');
    console.log(`   ✅ Found ${results.length} Python files`);
    
    const preview = results.slice(0, 5);
    preview.forEach(path => {
      console.log(`   🐍 ${path}`);
    });
    
    if (results.length > 5) {
      console.log(`   ... and ${results.length - 5} more`);
    }
    console.log('');
  } catch (error) {
    console.error(`   ❌ Search failed: ${error}`);
  }

  // Test 6: Execute Command
  console.log('💻 Test 6: Execute Command (whoami)');
  try {
    const result = await bridge.executeCommand('whoami');
    console.log(`   ✅ Command executed`);
    console.log(`   📤 Output: ${result.stdout.trim()}`);
    console.log(`   📊 Exit Code: ${result.returncode}`);
    console.log('');
  } catch (error) {
    console.error(`   ❌ Command execution failed: ${error}`);
  }

  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ ALL TESTS PASSED');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('🎉 Laptop bridge is fully operational!');
  console.log('');
  console.log('You can now use the bridge client in your code:');
  console.log('');
  console.log('  import { createLaptopBridge } from "./src/agents/laptop-bridge-client";');
  console.log('  const bridge = createLaptopBridge();');
  console.log('  const files = await bridge.listFiles("/home/omar/Documents");');
  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
