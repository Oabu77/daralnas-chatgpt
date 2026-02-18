#!/usr/bin/env tsx
/**
 * Auto-detect and Deploy via Existing Relay
 * Finds open relay connection and deploys automatically
 */

import { LaptopBridgeClient } from '../src/agents/laptop-bridge-client';
import * as fs from 'fs';
import * as path from 'path';

async function scanForRelay(): Promise<{ url: string; secret: string } | null> {
  console.log('🔍 Scanning for active relay connections...');
  
  // Check common locations for relay info
  const possibleConfigs = [
    '/tmp/laptop-relay-config.json',
    '/tmp/relay-info.json',
    path.join(process.env.HOME || '/root', '.laptop-relay'),
    '.relay-config',
  ];
  
  for (const configPath of possibleConfigs) {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.url && config.secret) {
          console.log(`✅ Found relay config: ${configPath}`);
          return { url: config.url, secret: config.secret };
        }
      }
    } catch {}
  }
  
  // Try common tunnel URLs
  const commonPatterns = [
    'localhost:8888',
    '127.0.0.1:8888',
  ];
  
  for (const pattern of commonPatterns) {
    try {
      const testUrl = `http://${pattern}`;
      console.log(`  Testing ${testUrl}...`);
      
      const response = await fetch(`${testUrl}/health`, {
        signal: AbortSignal.timeout(2000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found local relay at ${testUrl}`);
        console.log(`   Hostname: ${data.hostname}`);
        return { url: testUrl, secret: 'LOCAL_NO_AUTH' };
      }
    } catch {}
  }
  
  return null;
}

async function deployViaRelay(bridge: LaptopBridgeClient) {
  console.log('');
  console.log('🚀 Executing deployment on laptop...');
  console.log('');
  
  const deployScript = `
cd ~/Projects && \\
([ -d daralnas-chatgpt ] && cd daralnas-chatgpt && git pull || git clone https://github.com/Oabu77/daralnas-chatgpt.git && cd daralnas-chatgpt) && \\
chmod +x scripts/setup-laptop-relay.sh scripts/bluetooth-deploy.py && \\
echo "✅ Repository updated" && \\
if [ -f ~/start-laptop-relay.sh ]; then
  echo "✅ Relay already configured"
else
  ./scripts/setup-laptop-relay.sh && echo "✅ Relay configured"
fi && \\
echo "✅ Deployment complete"
`;

  try {
    const result = await bridge.executeCommand(deployScript.trim());
    
    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ DEPLOYMENT SUCCESSFUL');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📤 Output:');
    console.log(result.stdout);
    
    if (result.stderr) {
      console.log('');
      console.log('⚠️  Warnings:');
      console.log(result.stderr);
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Deployment failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🤖 AUTO-DEPLOY VIA EXISTING RELAY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  
  // Scan for relay
  const relayConfig = await scanForRelay();
  
  if (!relayConfig) {
    console.log('');
    console.log('❌ No active relay found');
    console.log('');
    console.log('Expected relay locations:');
    console.log('  - Local: http://localhost:8888');
    console.log('  - Tunnel: https://xxx.trycloudflare.com');
    console.log('');
    console.log('If relay is running on your laptop, create a tunnel:');
    console.log('  On laptop: cloudflared tunnel --url http://localhost:8888');
    console.log('  Then set: export LAPTOP_RELAY_URL=<tunnel-url>');
    console.log('            export LAPTOP_RELAY_SECRET=<secret-token>');
    process.exit(1);
  }
  
  console.log(`📡 Relay URL: ${relayConfig.url}`);
  console.log('');
  
  // Create bridge client
  const bridge = new LaptopBridgeClient({
    tunnelUrl: relayConfig.url,
    secretToken: relayConfig.secret,
  });
  
  // Test connection
  console.log('🔗 Testing connection...');
  try {
    const health = await bridge.health();
    console.log(`✅ Connected to: ${health.hostname}`);
    console.log(`   Platform: ${health.platform}`);
    console.log(`   Status: ${health.status}`);
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.log('');
    console.log('The relay might require authentication.');
    console.log('Set: export LAPTOP_RELAY_SECRET=<your-secret>');
    process.exit(1);
  }
  
  // Get system info
  console.log('');
  console.log('📊 System Information:');
  try {
    const info = await bridge.getSystemInfo();
    console.log(`   User: ${info.user}`);
    console.log(`   Home: ${info.home}`);
    console.log(`   CWD: ${info.cwd}`);
  } catch (error: any) {
    console.log('   (Authentication required for system info)');
  }
  
  // Execute deployment
  const success = await deployViaRelay(bridge);
  
  if (success) {
    console.log('');
    console.log('🎉 All systems deployed and ready!');
    console.log('');
    console.log('Next: Test the full bridge connection');
    console.log('  npx tsx scripts/test-laptop-bridge.ts');
  } else {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
