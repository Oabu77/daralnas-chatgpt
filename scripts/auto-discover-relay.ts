#!/usr/bin/env tsx
/**
 * Auto-discover and connect to laptop relay
 * Tries multiple connection methods
 */

async function tryConnection(url: string): Promise<boolean> {
  try {
    console.log(`  🔍 Trying: ${url}`);
    const response = await fetch(url, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Connected! Hostname: ${data.hostname}`);
      return true;
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'timeout'}`);
  }
  return false;
}

async function discover() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 AUTO-DISCOVERING LAPTOP RELAY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');

  const candidates = [
    'http://Quranchain.net:8888/health',
    'http://quranchain.net:8888/health',
    'https://Quranchain.net/health',
    'https://quranchain.net/health',
    'http://192.168.1.101:8888/health',
    'http://omar-GL75-Leopard-10SDK.local:8888/health',
    'http://omar-gl75-leopard-10sdk.local:8888/health',
    'http://localhost:8888/health',
    'http://127.0.0.1:8888/health',
  ];

  console.log(`Checking ${candidates.length} possible endpoints...`);
  console.log('');

  for (const url of candidates) {
    const connected = await tryConnection(url);
    if (connected) {
      const baseUrl = url.replace('/health', '');
      console.log('');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('✅ RELAY FOUND!');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('');
      console.log(`Set this in your environment:`);
      console.log(`  export LAPTOP_RELAY_URL=${baseUrl}`);
      console.log('');
      return baseUrl;
    }
  }

  console.log('');
  console.log('❌ No relay agent found on any endpoint');
  console.log('');
  console.log('💡 If the relay is running, try these:');
  console.log('  1. Get the Cloudflare Tunnel URL from laptop terminal');
  console.log('  2. Or use ngrok/localtunnel to expose port 8888');
  console.log('  3. Or provide the public IP/domain where relay is accessible');
  
  return null;
}

discover();
