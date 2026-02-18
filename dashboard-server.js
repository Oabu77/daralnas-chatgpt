#!/usr/bin/env node
/**
 * QuranChain-OS Live Dashboard Server
 * Real-time monitoring dashboard for all system components
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 8081;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dashboard HTML page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 QuranChain-OS Live Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .glow { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
        .metric-card { transition: all 0.3s ease; }
        .metric-card:hover { transform: translateY(-2px); }
        .status-online { color: #10b981; }
        .status-offline { color: #ef4444; }
        .status-warning { color: #f59e0b; }
    </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="text-center mb-8">
            <h1 class="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent mb-2">
                🚀 QuranChain-OS Live Dashboard
            </h1>
            <p class="text-gray-400">Real-time monitoring of $4M monthly revenue target</p>
            <div id="lastUpdate" class="text-sm text-gray-500 mt-2">Loading...</div>
        </header>

        <!-- Revenue Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="metric-card bg-gray-800 rounded-lg p-6 glow">
                <h3 class="text-lg font-semibold text-purple-400 mb-2">Monthly Target</h3>
                <div class="text-3xl font-bold text-green-400" id="monthlyTarget">$4,000,000</div>
            </div>
            <div class="metric-card bg-gray-800 rounded-lg p-6 glow">
                <h3 class="text-lg font-semibold text-blue-400 mb-2">Current Revenue</h3>
                <div class="text-3xl font-bold text-blue-400" id="currentRevenue">$0.00</div>
            </div>
            <div class="metric-card bg-gray-800 rounded-lg p-6 glow">
                <h3 class="text-lg font-semibold text-yellow-400 mb-2">Progress</h3>
                <div class="text-3xl font-bold text-yellow-400" id="progress">0.00%</div>
            </div>
            <div class="metric-card bg-gray-800 rounded-lg p-6 glow">
                <h3 class="text-lg font-semibold text-pink-400 mb-2">Active Agents</h3>
                <div class="text-3xl font-bold text-pink-400" id="activeAgents">0</div>
            </div>
        </div>

        <!-- System Status Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- AI Agent Fleet -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-2xl font-bold text-purple-400 mb-4">🤖 AI Agent Fleet</h2>
                <div id="agentFleet" class="space-y-2">
                    <div class="text-gray-400">Loading agents...</div>
                </div>
            </div>

            <!-- Blockchain Status -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-2xl font-bold text-blue-400 mb-4">⛓️ Blockchain Network</h2>
                <div id="blockchainStatus" class="space-y-2">
                    <div class="text-gray-400">Loading blockchain data...</div>
                </div>
            </div>

            <!-- FungiMesh Network -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-2xl font-bold text-green-400 mb-4">🍄 FungiMesh Network</h2>
                <div id="meshStatus" class="space-y-2">
                    <div class="text-gray-400">Loading mesh data...</div>
                </div>
            </div>

            <!-- Enterprise Billing -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-2xl font-bold text-yellow-400 mb-4">💰 Enterprise Billing</h2>
                <div id="billingStatus" class="space-y-2">
                    <div class="text-gray-400">Loading billing data...</div>
                </div>
            </div>
        </div>

        <!-- Revenue Chart -->
        <div class="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 class="text-2xl font-bold text-pink-400 mb-4">📊 Revenue Trends (Last 24 Hours)</h2>
            <canvas id="revenueChart" width="400" height="200"></canvas>
        </div>

        <!-- System Logs -->
        <div class="bg-gray-800 rounded-lg p-6">
            <h2 class="text-2xl font-bold text-red-400 mb-4">📋 System Logs</h2>
            <div id="systemLogs" class="bg-black rounded p-4 h-64 overflow-y-auto font-mono text-sm">
                <div class="text-gray-400">Loading logs...</div>
            </div>
        </div>
    </div>

    <script>
        let revenueChart;
        let revenueData = [];
        let timestamps = [];

        async function fetchDashboardData() {
            try {
                const response = await fetch('http://localhost:3001/api/revenue/dashboard');
                const data = await response.json();
                updateDashboard(data);
                document.getElementById('lastUpdate').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                document.getElementById('lastUpdate').textContent = 'Error: ' + error.message;
            }
        }

        function updateDashboard(data) {
            // Revenue metrics
            document.getElementById('currentRevenue').textContent = '$' + (data.fleet?.totalEarnings || 0).toLocaleString();
            const progress = ((data.fleet?.totalEarnings || 0) / 4000000 * 100).toFixed(4);
            document.getElementById('progress').textContent = progress + '%';
            document.getElementById('activeAgents').textContent = data.fleet?.activeAgents || 0;

            // Agent Fleet
            updateAgentFleet(data.fleet);

            // Blockchain Status
            updateBlockchainStatus(data);

            // Mesh Status
            updateMeshStatus(data);

            // Billing Status
            updateBillingStatus(data);

            // Update chart
            updateRevenueChart(data);
        }

        function updateAgentFleet(fleet) {
            const container = document.getElementById('agentFleet');
            if (!fleet || !fleet.agents) {
                container.innerHTML = '<div class="text-gray-400">No agent data available</div>';
                return;
            }

            let html = '';
            Object.entries(fleet.agents).forEach(([type, count]) => {
                const status = count > 0 ? 'status-online' : 'status-offline';
                html += \`<div class="flex justify-between items-center">
                    <span>\${type.replace('_', ' ').toUpperCase()}</span>
                    <span class="\${status}">\${count} active</span>
                </div>\`;
            });
            container.innerHTML = html;
        }

        function updateBlockchainStatus(data) {
            const container = document.getElementById('blockchainStatus');
            const bc = data.blockchain || {};
            const nomad = data.nomadMainnet || {};

            container.innerHTML = \`
                <div class="flex justify-between items-center">
                    <span>Chain Height</span>
                    <span class="status-online">\${bc.chainHeight || 0}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>Pending TX</span>
                    <span class="status-warning">\${bc.pendingTx || 0}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>Nomad Mainnet</span>
                    <span class="\${nomad.running ? 'status-online' : 'status-offline'}">\${nomad.running ? 'Running' : 'Offline'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>Relayed TX</span>
                    <span class="status-online">\${nomad.relayed || 0}</span>
                </div>
            \`;
        }

        function updateMeshStatus(data) {
            const container = document.getElementById('meshStatus');
            const mesh = data.mesh || {};
            const quantum = data.quantumCompute || {};
            const ocean = data.dataOcean || {};

            container.innerHTML = \`
                <div class="flex justify-between items-center">
                    <span>FungiMesh Peers</span>
                    <span class="status-online">\${mesh.peers || 0}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>FungiMesh Status</span>
                    <span class="\${mesh.running ? 'status-online' : 'status-offline'}">\${mesh.running ? 'Running' : 'Offline'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>Quantum Engine</span>
                    <span class="\${quantum.running ? 'status-online' : 'status-offline'}">\${quantum.running ? 'Running' : 'Offline'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>Data Ocean</span>
                    <span class="\${ocean.running ? 'status-online' : 'status-offline'}">\${ocean.running ? 'Running' : 'Offline'}</span>
                </div>
            \`;
        }

        function updateBillingStatus(data) {
            const container = document.getElementById('billingStatus');
            const billing = data.enterpriseBilling || {};

            container.innerHTML = \`
                <div class="flex justify-between items-center">
                    <span>Gas Toll Highway</span>
                    <span class="status-online">\${data.gasTollHighway?.active ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>Invoice Engine</span>
                    <span class="status-online">\${data.invoiceEngine?.active ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>Pricing Engine</span>
                    <span class="status-online">\${billing.pricing?.active ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>Metering</span>
                    <span class="status-online">\${billing.metering?.active ? 'Active' : 'Inactive'}</span>
                </div>
            \`;
        }

        function updateRevenueChart(data) {
            const now = new Date();
            const revenue = data.fleet?.totalEarnings || 0;

            timestamps.push(now.toLocaleTimeString());
            revenueData.push(revenue);

            // Keep only last 24 hours (assuming updates every 30 seconds, ~2880 points)
            if (timestamps.length > 2880) {
                timestamps.shift();
                revenueData.shift();
            }

            if (!revenueChart) {
                const ctx = document.getElementById('revenueChart').getContext('2d');
                revenueChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: timestamps,
                        datasets: [{
                            label: 'Revenue ($)',
                            data: revenueData,
                            borderColor: 'rgb(168, 85, 247)',
                            backgroundColor: 'rgba(168, 85, 247, 0.1)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value.toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                revenueChart.data.labels = timestamps;
                revenueChart.data.datasets[0].data = revenueData;
                revenueChart.update();
            }
        }

        // Fetch logs from various sources
        async function fetchLogs() {
            try {
                const logs = [];

                // Try to get blockchain logs
                try {
                    const bcResponse = await fetch('http://localhost:3001/api/blockchain/info');
                    if (bcResponse.ok) {
                        const bcData = await bcResponse.json();
                        logs.push(\`[\${new Date().toLocaleTimeString()}] Blockchain: Chain height \${bcData.chain?.length || 0}\`);
                    }
                } catch (e) {}

                // Add some system status
                logs.push(\`[\${new Date().toLocaleTimeString()}] System: Dashboard updated\`);

                const logContainer = document.getElementById('systemLogs');
                logContainer.innerHTML = logs.slice(-20).map(log => \`<div>\${log}</div>\`).join('');
                logContainer.scrollTop = logContainer.scrollHeight;
            } catch (error) {
                console.error('Failed to fetch logs:', error);
            }
        }

        // Initialize
        fetchDashboardData();
        fetchLogs();

        // Update every 30 seconds
        setInterval(() => {
            fetchDashboardData();
            fetchLogs();
        }, 30000);
    </script>
</body>
</html>
  `);
});

// API proxy for dashboard data (in case of CORS issues)
app.get('/api/dashboard', async (req, res) => {
  try {
    const response = await fetch('http://localhost:3001/api/revenue/dashboard');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 QuranChain-OS Live Dashboard running at http://localhost:${port}`);
  console.log('📊 Real-time monitoring active');
});