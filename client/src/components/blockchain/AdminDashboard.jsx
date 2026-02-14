import { useState, useEffect, useCallback } from 'react';

const API = '/api';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [system, setSystem] = useState(null);
  const [stakers, setStakers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [stakeForm, setStakeForm] = useState({ from: '', amount: '', lockPeriod: '30' });
  const [stakeMsg, setStakeMsg] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, sysRes, stakeRes] = await Promise.all([
        fetch(`${API}/admin/dashboard`).then(r => r.json()),
        fetch(`${API}/admin/system`).then(r => r.json()),
        fetch(`${API}/blockchain/stakers`).then(r => r.json()),
      ]);
      setDashboard(dashRes);
      setSystem(sysRes);
      setStakers(stakeRes);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    if (!autoRefresh) return;
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll, autoRefresh]);

  const handleStake = async (action) => {
    setStakeMsg('');
    try {
      const endpoint = action === 'stake' ? '/blockchain/stake' : '/blockchain/unstake';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: stakeForm.from,
          amount: stakeForm.amount,
          lockPeriod: stakeForm.lockPeriod,
        }),
      });
      const data = await res.json();
      setStakeMsg(data.message || data.error || JSON.stringify(data));
      if (data.success) fetchAll();
    } catch (e) {
      setStakeMsg('Error: ' + e.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-emerald-400 text-xl animate-pulse">Loading Admin Dashboard...</div>
    </div>
  );

  const bc = dashboard?.blockchain || {};
  const net = dashboard?.network || {};
  const stor = dashboard?.storage || {};
  const rev = dashboard?.revenue || {};
  const stak = dashboard?.staking || {};

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400">QuranChain Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Founder: Omar Mohammad Abunadi™</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="accent-emerald-500" />
            Auto-refresh (10s)
          </label>
          <button onClick={fetchAll} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-medium transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Blocks" value={bc.blocks} color="emerald" />
        <StatCard label="Supply" value={`${bc.totalSupply} QRC`} color="yellow" />
        <StatCard label="Difficulty" value={bc.difficulty} color="blue" />
        <StatCard label="Staked" value={`${stak.totalStaked || 0} QRC`} color="purple" />
        <StatCard label="Peers" value={net.peers || 0} color="cyan" />
        <StatCard label="Verses" value={bc.authenticatedVerses} color="rose" />
        <StatCard label="Total TXs" value={bc.totalTransactions} color="orange" />
        <StatCard label="Addresses" value={bc.addresses} color="indigo" />
        <StatCard label="MongoDB" value={stor.mongodb ? 'ON' : 'OFF'} color={stor.mongodb ? 'emerald' : 'red'} />
        <StatCard label="IPFS" value={stor.ipfs ? 'ON' : 'OFF'} color={stor.ipfs ? 'emerald' : 'red'} />
        <StatCard label="Products" value={rev.products} color="amber" />
        <StatCard label="Uptime" value={formatUptime(dashboard?.uptime)} color="teal" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['overview', 'blocks', 'staking', 'network', 'system'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TX Type Distribution */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Transaction Distribution</h3>
            <div className="space-y-2">
              {bc.txTypeDistribution && Object.entries(bc.txTypeDistribution)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-28 truncate">{type}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${(count / bc.totalTransactions) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-300 w-8 text-right">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Addresses */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Top Addresses</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {dashboard?.topAddresses?.map((addr, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    {addr.isFounder && <span className="text-yellow-400 text-xs">★</span>}
                    <span className="text-gray-300 font-mono text-xs">{addr.address.substring(0, 24)}...</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-medium">{addr.balance.toFixed(2)} QRC</span>
                    {addr.stake > 0 && <span className="text-purple-400 ml-2 text-xs">+{addr.stake} staked</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'blocks' && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-emerald-400 mb-4">Recent Blocks</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Hash</th>
                  <th className="text-left py-2 px-3">TXs</th>
                  <th className="text-left py-2 px-3">Miner</th>
                  <th className="text-left py-2 px-3">Difficulty</th>
                  <th className="text-left py-2 px-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.recentBlocks?.map(block => (
                  <tr key={block.index} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-2 px-3 text-emerald-400 font-medium">{block.index}</td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-300">{block.hash}...</td>
                    <td className="py-2 px-3">{block.txCount}</td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-400">{block.miner?.substring(0, 16)}...</td>
                    <td className="py-2 px-3">{block.difficulty}</td>
                    <td className="py-2 px-3 text-gray-400 text-xs">{new Date(block.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'staking' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stake/Unstake Form */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Stake / Unstake QRC</h3>
            <div className="space-y-3">
              <input placeholder="Address" value={stakeForm.from}
                onChange={e => setStakeForm(s => ({ ...s, from: e.target.value }))}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <input type="number" placeholder="Amount (min 10 QRC)" value={stakeForm.amount}
                onChange={e => setStakeForm(s => ({ ...s, amount: e.target.value }))}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <select value={stakeForm.lockPeriod}
                onChange={e => setStakeForm(s => ({ ...s, lockPeriod: e.target.value }))}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="30">30 days lock</option>
                <option value="90">90 days lock</option>
                <option value="180">180 days lock</option>
                <option value="365">365 days lock</option>
              </select>
              <div className="flex gap-3">
                <button onClick={() => handleStake('stake')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded py-2 text-sm font-medium transition-colors">
                  Stake QRC
                </button>
                <button onClick={() => handleStake('unstake')}
                  className="flex-1 bg-red-600 hover:bg-red-700 rounded py-2 text-sm font-medium transition-colors">
                  Unstake QRC
                </button>
              </div>
              {stakeMsg && <p className="text-sm text-yellow-400 mt-2">{stakeMsg}</p>}
            </div>
          </div>

          {/* Current Stakers */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">
              Stakers ({stakers?.count || 0}) — Total: {stakers?.totalStaked || 0} QRC
            </h3>
            <p className="text-sm text-gray-400 mb-3">Reward Rate: {stakers?.rewardRate} | Min Stake: {stakers?.minStake} QRC</p>
            {stakers?.stakers?.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stakers.stakers.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-700">
                    <span className="font-mono text-xs text-gray-300">{s.address.substring(0, 24)}...</span>
                    <div>
                      <span className="text-purple-400 font-medium">{s.staked} QRC</span>
                      <span className="text-gray-500 ml-2 text-xs">bal: {s.balance}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active stakers yet. Be the first!</p>
            )}
          </div>
        </div>
      )}

      {tab === 'network' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">P2P Network</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Node ID" value={net.nodeId || 'N/A'} />
              <InfoRow label="Port" value={net.port || 6001} />
              <InfoRow label="Connected Peers" value={net.peers || 0} />
              <InfoRow label="Known Peers" value={net.knownPeers || 0} />
              <InfoRow label="Max Peers" value={net.maxPeers || 50} />
            </div>
            {net.peerList?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Connected Peers:</h4>
                {net.peerList.map((p, i) => (
                  <div key={i} className="text-xs text-gray-300 py-1 border-b border-gray-700">
                    {p.nodeId} — {p.address} ({p.direction}, {p.connectedFor})
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Storage Services</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="MongoDB" value={stor.mongodb ? 'Connected' : 'Offline'} color={stor.mongodb ? 'emerald' : 'red'} />
              <InfoRow label="IPFS" value={stor.ipfs ? 'Connected' : 'Offline'} color={stor.ipfs ? 'emerald' : 'red'} />
              <InfoRow label="IPFS Node" value={stor.ipfsNodeId || 'N/A'} />
            </div>
            <h3 className="text-lg font-semibold text-emerald-400 mt-6 mb-4">Security</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Rate Limiting" value="Active" color="emerald" />
              <InfoRow label="Helmet Headers" value="Active" color="emerald" />
              <InfoRow label="Input Validation" value="Active" color="emerald" />
              <InfoRow label="Notification Subs" value={dashboard?.notifications?.activeSubscribers || 0} />
            </div>
          </div>
        </div>
      )}

      {tab === 'system' && system && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Node Info</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Node.js" value={system.node?.version} />
              <InfoRow label="Platform" value={`${system.node?.platform} / ${system.node?.arch}`} />
              <InfoRow label="PID" value={system.node?.pid} />
              <InfoRow label="Uptime" value={formatUptime(system.node?.uptime)} />
              <InfoRow label="Heap Used" value={formatBytes(system.node?.memoryUsage?.heapUsed)} />
              <InfoRow label="Heap Total" value={formatBytes(system.node?.memoryUsage?.heapTotal)} />
              <InfoRow label="RSS" value={formatBytes(system.node?.memoryUsage?.rss)} />
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Blockchain Engine</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Chain Length" value={system.blockchain?.chainLength} />
              <InfoRow label="Difficulty" value={system.blockchain?.difficulty} />
              <InfoRow label="Mining" value={system.blockchain?.mining ? 'Yes' : 'No'} />
              <InfoRow label="Pending TXs" value={system.blockchain?.pendingTx} />
              <InfoRow label="Addresses" value={system.blockchain?.addressCount} />
              <InfoRow label="Verses" value={system.blockchain?.verseCount} />
              <InfoRow label="Data Hashes" value={system.blockchain?.dataHashCount} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'emerald' }) {
  const colors = {
    emerald: 'border-emerald-500/30 text-emerald-400',
    yellow: 'border-yellow-500/30 text-yellow-400',
    blue: 'border-blue-500/30 text-blue-400',
    purple: 'border-purple-500/30 text-purple-400',
    cyan: 'border-cyan-500/30 text-cyan-400',
    rose: 'border-rose-500/30 text-rose-400',
    orange: 'border-orange-500/30 text-orange-400',
    indigo: 'border-indigo-500/30 text-indigo-400',
    red: 'border-red-500/30 text-red-400',
    amber: 'border-amber-500/30 text-amber-400',
    teal: 'border-teal-500/30 text-teal-400',
  };
  return (
    <div className={`bg-gray-800 rounded-xl p-4 border ${colors[color] || colors.emerald}`}>
      <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold mt-1 ${colors[color]?.split(' ')[1] || 'text-emerald-400'}`}>{value ?? '—'}</div>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  const colorClass = color === 'emerald' ? 'text-emerald-400' : color === 'red' ? 'text-red-400' : 'text-gray-200';
  return (
    <div className="flex justify-between py-1 border-b border-gray-700/50">
      <span className="text-gray-400">{label}</span>
      <span className={`font-medium ${colorClass}`}>{value}</span>
    </div>
  );
}

function formatUptime(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const mb = (bytes / 1024 / 1024).toFixed(1);
  return `${mb} MB`;
}
