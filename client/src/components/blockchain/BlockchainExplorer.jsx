/**
 * ⛓️ QuranChain Blockchain Explorer
 * Full mainnet explorer — blocks, transactions, verses, wallets
 * 
 * © Omar Mohammad Abunadi™ — QuranChain-OS Ecosystem
 */

import { useState, useEffect, useCallback } from 'react';

const API = '/api/blockchain';

export default function BlockchainExplorer() {
  const [stats, setStats] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [tab, setTab] = useState('overview');   // overview | blocks | transactions | verses | islamic
  const [loading, setLoading] = useState(true);
  const [miningStatus, setMiningStatus] = useState(null);
  const [page, setPage] = useState(1);

  // ── Fetch blockchain stats ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/stats`);
      setStats(await res.json());
    } catch (e) { console.error('Stats fetch error:', e); }
  }, []);

  // ── Fetch blocks ──
  const fetchBlocks = useCallback(async (p = 1) => {
    try {
      const res = await fetch(`${API}/chain?page=${p}&limit=10`);
      const data = await res.json();
      setBlocks(data.blocks || []);
      setPage(p);
    } catch (e) { console.error('Blocks fetch error:', e); }
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchBlocks()]).then(() => setLoading(false));
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchBlocks]);

  // ── Mine block ──
  const mineBlock = async () => {
    setMiningStatus('mining');
    try {
      const res = await fetch(`${API}/mine`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      setMiningStatus(data.error ? `Error: ${data.error}` : `Block #${data.block?.index} mined in ${data.miningTime}ms — +${data.reward} QRC`);
      fetchStats(); fetchBlocks();
      setTimeout(() => setMiningStatus(null), 5000);
    } catch (e) { setMiningStatus('Mining failed'); }
  };

  // ── Search ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchResult(null);
    const q = searchQuery.trim();
    
    // Try block by index
    if (/^\d+$/.test(q)) {
      try {
        const res = await fetch(`${API}/block/${q}`);
        if (res.ok) { setSearchResult({ type: 'block', data: await res.json() }); return; }
      } catch {}
    }
    // Try transaction
    try {
      const res = await fetch(`${API}/tx/${q}`);
      if (res.ok) { setSearchResult({ type: 'transaction', data: await res.json() }); return; }
    } catch {}
    // Try address balance
    if (q.startsWith('qrc_') || q.startsWith('Omar')) {
      try {
        const res = await fetch(`${API}/balance/${q}`);
        if (res.ok) { setSearchResult({ type: 'address', data: await res.json() }); return; }
      } catch {}
    }
    // Try verse
    const verseMatch = q.match(/^(\d+):(\d+)$/);
    if (verseMatch) {
      try {
        const res = await fetch(`${API}/verse/${verseMatch[1]}/${verseMatch[2]}`);
        if (res.ok) { setSearchResult({ type: 'verse', data: await res.json() }); return; }
      } catch {}
    }
    setSearchResult({ type: 'not_found', data: { query: q } });
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin text-5xl mb-4">⛓️</div>
        <p className="text-xl">Loading QuranChain Explorer...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur border-b border-green-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">⛓️ QuranChain Explorer</h1>
              <p className="text-green-400 text-sm">Mainnet — Nomadic Decentralized Blockchain</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-500/20 rounded-full text-green-400 text-sm border border-green-500/30">
                {stats?.blocks || 0} Blocks
              </span>
              <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-yellow-400 text-sm border border-yellow-500/30">
                {stats?.totalSupply || 0} QRC
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search: block #, tx ID, address (qrc_...), or verse (1:1)"
            className="flex-1 bg-white/10 border border-green-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button onClick={handleSearch} className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition">
            🔍 Search
          </button>
        </div>

        {/* Search Results */}
        {searchResult && (
          <div className="mb-6 bg-white/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-green-400 font-semibold uppercase text-sm">{searchResult.type}</span>
              <button onClick={() => setSearchResult(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <pre className="text-sm text-gray-300 overflow-auto max-h-60">{JSON.stringify(searchResult.data, null, 2)}</pre>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Blocks', value: stats?.blocks, icon: '📦', color: 'green' },
            { label: 'Supply', value: `${stats?.totalSupply || 0} QRC`, icon: '💰', color: 'yellow' },
            { label: 'Difficulty', value: stats?.difficulty, icon: '⚡', color: 'blue' },
            { label: 'Pending TX', value: stats?.pendingTx, icon: '⏳', color: 'orange' },
            { label: 'Verses', value: stats?.authenticatedVerses, icon: '📖', color: 'purple' },
            { label: 'Addresses', value: stats?.addresses, icon: '👛', color: 'pink' },
          ].map(s => (
            <div key={s.label} className={`bg-white/5 border border-${s.color}-500/20 rounded-xl p-3 text-center`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-lg font-bold">{s.value ?? '—'}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1">
          {['overview', 'blocks', 'transactions', 'verses', 'islamic'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              {t === 'overview' && '📊 Overview'}
              {t === 'blocks' && '📦 Blocks'}
              {t === 'transactions' && '💸 Transactions'}
              {t === 'verses' && '📖 Verses'}
              {t === 'islamic' && '🕌 Islamic Finance'}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Mine Button */}
            <div className="bg-white/5 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">⛏️ Mine Block</h3>
                <p className="text-sm text-gray-400">Block Reward: {stats?.blockReward || 50} QRC | Next Halving: {stats?.halvingIn?.toLocaleString()} blocks</p>
              </div>
              <button onClick={mineBlock} disabled={miningStatus === 'mining'}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 rounded-lg font-bold transition">
                {miningStatus === 'mining' ? '⛏️ Mining...' : '⛏️ Mine Block'}
              </button>
            </div>
            {miningStatus && miningStatus !== 'mining' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">{miningStatus}</div>
            )}

            {/* Chain Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-green-500/20 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-green-400">⛓️ Chain Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Chain ID</span><span>{stats?.chainId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Blocks</span><span>{stats?.blocks}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Difficulty</span><span>{stats?.difficulty}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Block Reward</span><span>{stats?.blockReward} QRC</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Max Supply</span><span>{stats?.maxSupply?.toLocaleString()} QRC</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Target Block Time</span><span>{stats?.targetBlockTime}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Data Hashes</span><span>{stats?.dataHashes}</span></div>
                </div>
              </div>
              <div className="bg-white/5 border border-green-500/20 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-green-400">🌐 Network</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Node ID</span><span className="font-mono">{stats?.nodeId}...</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">P2P Peers</span><span>{stats?.network?.peers || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">MongoDB</span><span className={stats?.mongodb ? 'text-green-400' : 'text-red-400'}>{stats?.mongodb ? 'Connected' : 'Offline'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">IPFS</span><span className={stats?.ipfs ? 'text-green-400' : 'text-yellow-400'}>{stats?.ipfs ? 'Connected' : 'Offline'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Founder</span><span>Omar Mohammad Abunadi™</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Latest Hash</span><span className="font-mono">{stats?.latestHash}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Mining</span><span className={stats?.mining ? 'text-yellow-400' : 'text-gray-400'}>{stats?.mining ? 'Active' : 'Idle'}</span></div>
                </div>
              </div>
            </div>

            {/* Recent Blocks */}
            <div className="bg-white/5 border border-green-500/20 rounded-xl p-4">
              <h3 className="font-semibold mb-3 text-green-400">📦 Recent Blocks</h3>
              <div className="space-y-2">
                {blocks.slice(0, 5).map(block => (
                  <div key={block.index} onClick={() => { setSelectedBlock(block); setTab('blocks'); }}
                    className="flex items-center justify-between bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition">
                    <div className="flex items-center gap-3">
                      <span className="bg-green-500/20 text-green-400 font-mono px-2 py-1 rounded text-sm">#{block.index}</span>
                      <span className="font-mono text-xs text-gray-400">{block.hash?.substring(0, 20)}...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-400">{block.transactions?.length || 0} txs</span>
                      <span className="text-gray-500">{new Date(block.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Blocks */}
        {tab === 'blocks' && (
          <div className="space-y-4">
            {selectedBlock ? (
              <div className="bg-white/5 border border-green-500/20 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">📦 Block #{selectedBlock.index}</h3>
                  <button onClick={() => setSelectedBlock(null)} className="text-gray-400 hover:text-white px-3 py-1 bg-white/10 rounded">← Back</button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                  <div><span className="text-gray-400">Hash:</span><br /><span className="font-mono text-xs break-all">{selectedBlock.hash}</span></div>
                  <div><span className="text-gray-400">Previous:</span><br /><span className="font-mono text-xs break-all">{selectedBlock.previousHash}</span></div>
                  <div><span className="text-gray-400">Miner:</span><br /><span className="font-mono text-xs">{selectedBlock.miner}</span></div>
                  <div><span className="text-gray-400">Merkle Root:</span><br /><span className="font-mono text-xs break-all">{selectedBlock.merkleRoot}</span></div>
                  <div><span className="text-gray-400">Nonce:</span> {selectedBlock.nonce}</div>
                  <div><span className="text-gray-400">Difficulty:</span> {selectedBlock.difficulty}</div>
                  <div><span className="text-gray-400">Time:</span> {new Date(selectedBlock.timestamp).toLocaleString()}</div>
                  <div><span className="text-gray-400">Transactions:</span> {selectedBlock.transactions?.length}</div>
                </div>
                <h4 className="font-semibold mb-2 text-green-400">Transactions</h4>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {selectedBlock.transactions?.map((tx, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          tx.type === 'REWARD' ? 'bg-yellow-500/20 text-yellow-400' :
                          tx.type === 'VERSE_AUTH' ? 'bg-purple-500/20 text-purple-400' :
                          tx.type === 'TRANSFER' ? 'bg-blue-500/20 text-blue-400' :
                          tx.type === 'GENESIS' ? 'bg-green-500/20 text-green-400' :
                          tx.type === 'ZAKAT' ? 'bg-emerald-500/20 text-emerald-400' :
                          tx.type === 'SADAQAH' ? 'bg-teal-500/20 text-teal-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>{tx.type}</span>
                        <span className="text-gray-500 font-mono">{tx.id?.substring(0, 8)}...</span>
                      </div>
                      <div className="text-gray-400">
                        {tx.from} → {tx.to} {tx.amount > 0 && <span className="text-white ml-2">{tx.amount} QRC</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {blocks.map(block => (
                  <div key={block.index} onClick={() => setSelectedBlock(block)}
                    className="bg-white/5 border border-green-500/20 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="bg-green-500/20 text-green-400 font-mono px-2 py-1 rounded text-sm">#{block.index}</span>
                        <span className="ml-3 font-mono text-xs text-gray-400">{block.hash?.substring(0, 24)}...</span>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-400">{block.transactions?.length} txs</div>
                        <div className="text-xs text-gray-500">{new Date(block.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Miner: {block.miner} | Nonce: {block.nonce} | Difficulty: {block.difficulty}</div>
                  </div>
                ))}
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => fetchBlocks(page + 1)} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm">← Older</button>
                  <span className="px-4 py-2 text-gray-400">Page {page}</span>
                  {page > 1 && <button onClick={() => fetchBlocks(page - 1)} className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm">Newer →</button>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Transactions */}
        {tab === 'transactions' && (
          <div className="bg-white/5 border border-green-500/20 rounded-xl p-4">
            <h3 className="font-semibold mb-3 text-green-400">💸 All Transactions (Recent Blocks)</h3>
            <div className="space-y-2 max-h-[600px] overflow-auto">
              {blocks.flatMap(b => (b.transactions || []).map(tx => ({ ...tx, blockIndex: b.index }))).map((tx, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        tx.type === 'REWARD' ? 'bg-yellow-500/20 text-yellow-400' :
                        tx.type === 'VERSE_AUTH' ? 'bg-purple-500/20 text-purple-400' :
                        tx.type === 'TRANSFER' ? 'bg-blue-500/20 text-blue-400' :
                        tx.type === 'GENESIS' ? 'bg-green-500/20 text-green-400' :
                        tx.type === 'ZAKAT' ? 'bg-emerald-500/20 text-emerald-400' :
                        tx.type === 'SADAQAH' ? 'bg-teal-500/20 text-teal-400' :
                        tx.type === 'HALAL_PAYMENT' ? 'bg-cyan-500/20 text-cyan-400' :
                        tx.type === 'WAQF' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>{tx.type}</span>
                      <span className="text-xs text-gray-500 font-mono">Block #{tx.blockIndex}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      <span className="font-mono">{tx.from?.substring(0, 16)}</span> → <span className="font-mono">{tx.to?.substring(0, 16)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {tx.amount > 0 && <div className="font-semibold">{tx.amount} QRC</div>}
                    <div className="text-xs text-gray-500 font-mono">{tx.id?.substring(0, 12)}...</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Verses */}
        {tab === 'verses' && (
          <div className="bg-white/5 border border-green-500/20 rounded-xl p-4">
            <h3 className="font-semibold mb-3 text-green-400">📖 Authenticated Quran Verses</h3>
            <p className="text-sm text-gray-400 mb-4">{stats?.authenticatedVerses} verses permanently preserved on QuranChain</p>
            <div className="space-y-3">
              {blocks.flatMap(b => (b.transactions || []).filter(tx => tx.type === 'VERSE_AUTH')).map((tx, i) => (
                <div key={i} className="bg-white/5 border border-purple-500/20 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm font-semibold">
                      Surah {tx.data?.surah} : Ayah {tx.data?.ayah}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">{tx.data?.verseHash?.substring(0, 16)}...</span>
                  </div>
                  {tx.data?.arabicPreview && (
                    <p className="text-xl text-right font-arabic text-white/90 mb-2 leading-relaxed" dir="rtl">{tx.data.arabicPreview}</p>
                  )}
                  {tx.data?.textPreview && (
                    <p className="text-sm text-gray-300 italic">{tx.data.textPreview}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Islamic Finance */}
        {tab === 'islamic' && <IslamicFinancePanel />}
      </div>

      {/* Footer */}
      <footer className="bg-black/30 border-t border-green-500/20 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          © Omar Mohammad Abunadi™ — QuranChain-OS Mainnet Explorer — بسم الله الرحمن الرحيم
        </div>
      </footer>
    </div>
  );
}

// ── Islamic Finance Sub-Panel ──
function IslamicFinancePanel() {
  const [form, setForm] = useState({ type: 'zakat', from: '', to: '', amount: '', memo: '', purpose: '' });
  const [result, setResult] = useState(null);
  const [royaltyInfo, setRoyaltyInfo] = useState(null);

  useEffect(() => {
    fetch(`${API}/royalty-info?amount=100`).then(r => r.json()).then(setRoyaltyInfo).catch(() => {});
  }, []);

  const submit = async () => {
    const endpoints = { zakat: 'zakat', sadaqah: 'sadaqah', halal_payment: 'halal-payment', waqf: 'waqf', islamic_loan: 'islamic-loan' };
    const endpoint = endpoints[form.type] || form.type;
    try {
      const body = { from: form.from, to: form.to, amount: form.amount, memo: form.memo, purpose: form.purpose, description: form.memo };
      const res = await fetch(`${API}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setResult(await res.json());
    } catch (e) { setResult({ error: e.message }); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-green-500/20 rounded-xl p-4">
        <h3 className="font-semibold mb-3 text-green-400">🕌 Islamic Finance Transactions</h3>
        <p className="text-sm text-gray-400 mb-4">Shariah-compliant transactions: Zakat, Sadaqah, Halal Payments, Waqf, and Qard al-Hasan</p>
        
        <div className="grid md:grid-cols-5 gap-2 mb-4">
          {[
            { id: 'zakat', icon: '🕌', label: 'Zakat', desc: '2.5% obligatory charity' },
            { id: 'sadaqah', icon: '💝', label: 'Sadaqah', desc: 'Voluntary charity' },
            { id: 'halal_payment', icon: '✅', label: 'Halal Payment', desc: '30% founder royalty' },
            { id: 'waqf', icon: '🏛️', label: 'Waqf', desc: 'Irrevocable endowment' },
            { id: 'islamic_loan', icon: '🤝', label: 'Qard al-Hasan', desc: 'Interest-free loan' },
          ].map(t => (
            <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
              className={`p-3 rounded-lg text-center transition border ${form.type === t.id ? 'bg-green-600/30 border-green-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
              <div className="text-2xl mb-1">{t.icon}</div>
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="text-xs text-gray-400">{t.desc}</div>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <input value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} placeholder="From address (qrc_...)" className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          <input value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} placeholder="To address (qrc_... or beneficiary)" className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount (QRC)" type="number" className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          <input value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} placeholder="Memo / purpose" className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" />
        </div>

        <button onClick={submit} className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition">
          Submit {form.type.replace('_', ' ').toUpperCase()} Transaction
        </button>

        {result && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${result.error ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}>
            <pre className="overflow-auto max-h-40">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>

      {royaltyInfo && (
        <div className="bg-white/5 border border-yellow-500/20 rounded-xl p-4">
          <h3 className="font-semibold mb-2 text-yellow-400">👑 Founder Royalty Info</h3>
          <div className="text-sm space-y-1 text-gray-300">
            <p>Rate: <span className="text-white font-semibold">{(royaltyInfo.founderRoyaltyRate * 100)}%</span> on Halal Payments</p>
            <p>Founder: <span className="font-mono text-white">{royaltyInfo.founderAddress}</span></p>
            <p>Example: {royaltyInfo.example?.amount} QRC → Merchant gets {royaltyInfo.example?.net} QRC, Founder gets {royaltyInfo.example?.royalty} QRC</p>
          </div>
        </div>
      )}
    </div>
  );
}
