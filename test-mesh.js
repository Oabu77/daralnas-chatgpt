/**
 * FungiMesh Test Script
 * =====================
 * Test script to demonstrate FungiMesh distributed computing capabilities
 *
 * This script submits various types of computational tasks to the mesh network
 * and displays the results.
 *
 * Founder: Omar Mohammad Abunadi™
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Simple HTTP GET request
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

// Simple HTTP POST request
function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testMesh() {
  console.log('🍄 Testing FungiMesh Network\n');

  try {
    // Check mesh status
    console.log('📊 Mesh Status:');
    const status = await httpGet(`${BASE_URL}/api/mesh/status`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Node ID: ${status.nodeId}`);
    console.log(`   Peers: ${status.peers}`);
    console.log(`   CPU Cores: ${status.capabilities.cpuCores}`);
    console.log(`   Memory: ${(status.capabilities.totalMemory / 1024 / 1024 / 1024).toFixed(1)}GB`);
    console.log(`   GPU: ${status.capabilities.hasGPU ? 'Available' : 'Not detected'}\n`);

    // Test CPU-intensive task
    console.log('⚡ Testing CPU-intensive task...');
    const cpuStart = Date.now();
    const cpuResult = await httpPost(`${BASE_URL}/api/mesh/task/cpu`, {
      data: { test: 'cpu_computation' },
      iterations: 100000
    });
    const cpuTime = Date.now() - cpuStart;
    console.log(`   Result: ${JSON.stringify(cpuResult.result).substring(0, 100)}...`);
    console.log(`   Time: ${cpuTime}ms\n`);

    // Test GPU task (if available)
    if (status.capabilities.hasGPU) {
      console.log('🎮 Testing GPU task...');
      const gpuStart = Date.now();
      const gpuResult = await httpPost(`${BASE_URL}/api/mesh/task/gpu`, {
        data: { test: 'gpu_computation' },
        options: { complexity: 'medium' }
      });
      const gpuTime = Date.now() - gpuStart;
      console.log(`   Result: ${JSON.stringify(gpuResult.result).substring(0, 100)}...`);
      console.log(`   Time: ${gpuTime}ms\n`);
    }

    // Test QuranChain-specific tasks
    console.log('📖 Testing QuranChain-specific tasks...');

    // Verse validation task
    const verseStart = Date.now();
    const verseResult = await httpPost(`${BASE_URL}/api/mesh/task/quranchain`, {
      taskType: 'verse_validation',
      data: {
        surah: 1,
        ayah: 1,
        text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
        expectedHash: 'some_hash'
      }
    });
    const verseTime = Date.now() - verseStart;
    console.log(`   Verse validation: ${verseTime}ms`);

    // Analytics computation
    const analyticsStart = Date.now();
    const analyticsResult = await httpPost(`${BASE_URL}/api/mesh/task/quranchain`, {
      taskType: 'analytics_computation',
      data: {
        type: 'verse_frequency',
        dataset: 'sample_quran_data'
      }
    });
    const analyticsTime = Date.now() - analyticsStart;
    console.log(`   Analytics computation: ${analyticsTime}ms\n`);

    // Check final status
    console.log('📈 Final Mesh Status:');
    const finalStatus = await httpGet(`${BASE_URL}/api/mesh/status`);
    console.log(`   Active Tasks: ${finalStatus.activeTasks}`);
    console.log(`   Completed Tasks: ${finalStatus.completedTasks}`);
    console.log(`   Workload: ${(finalStatus.workload * 100).toFixed(1)}%`);

    console.log('\n✅ FungiMesh test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMesh();