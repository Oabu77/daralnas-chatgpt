/**
 * 🔐 QuranChain Wallet Manager
 * Create, import, recover, export wallets + send/receive QRC
 * 
 * © Omar Mohammad Abunadi™ — QuranChain-OS Ecosystem
 */

import { useState, useEffect, useCallback } from 'react';

const API = '/api/blockchain';

export default function WalletManager() {
  const [wallets, setWallets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('wallets');   // wallets | create | import | recover | send
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fetchWallets = useCallback(async () => {
    try {
      const res = await fetch(`${API}/wallets`);
      const data = await res.json();
      setWallets(data.wallets || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 6000);
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin text-5xl mb-4">🔐</div>
        <p className="text-xl">Loading Wallets...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur border-b border-indigo-500/20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔐 QuranChain Wallet</h1>
            <p className="text-indigo-400 text-sm">Manage QRC wallets — Create, Import, Recover, Send</p>
          </div>
          <span className="px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-400 text-sm border border-indigo-500/30">
            {wallets.length} Wallet{wallets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* Alert */}
      {alert && (
        <div className={`max-w-6xl mx-auto px-4 mt-4`}>
          <div className={`p-3 rounded-lg text-sm ${alert.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}>
            {alert.msg}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1">
          {[
            { id: 'wallets', label: '👛 Wallets' },
            { id: 'create', label: '✨ Create' },
            { id: 'import', label: '📥 Import Key' },
            { id: 'recover', label: '🔑 Recover Seed' },
            { id: 'send', label: '💸 Send QRC' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >{t.label}</button>
          ))}
        </div>

        {/* Tab: Wallet List */}
        {tab === 'wallets' && (
          <div className="space-y-3">
            {wallets.length === 0 && (
              <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-8 text-center">
                <div className="text-5xl mb-4">👛</div>
                <p className="text-lg mb-2">No wallets yet</p>
                <p className="text-sm text-gray-400 mb-4">Create your first QuranChain wallet</p>
                <button onClick={() => setTab('create')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold">✨ Create Wallet</button>
              </div>
            )}
            {wallets.map(w => (
              <div key={w.address} onClick={() => setSelected(selected?.address === w.address ? null : w)}
                className={`bg-white/5 border rounded-xl p-4 cursor-pointer transition ${selected?.address === w.address ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:bg-white/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{w.isFounder ? '👑' : w.type === 'zakat' ? '🕌' : w.type === 'sadaqah' ? '💝' : '👛'}</span>
                      <span className="font-semibold">{w.label || 'Unnamed'}</span>
                      {w.isFounder && <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded">FOUNDER</span>}
                      <span className="bg-white/10 text-gray-400 text-xs px-2 py-0.5 rounded">{w.type || 'standard'}</span>
                    </div>
                    <div className="font-mono text-xs text-gray-400">{w.address}</div>
                    {w.ethAddress && <div className="font-mono text-xs text-gray-500">ETH: {w.ethAddress}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-400">{w.balance ?? 0} QRC</div>
                    {w.stake > 0 && <div className="text-xs text-yellow-400">Staked: {w.stake} QRC</div>}
                  </div>
                </div>

                {/* Expanded Details */}
                {selected?.address === w.address && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <WalletDetail address={w.address} onExport={() => showAlert('Keystore exported — check console')} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab: Create Wallet */}
        {tab === 'create' && <CreateWallet onCreated={(w) => { fetchWallets(); showAlert(`Wallet created: ${w.address}`); setTab('wallets'); }} />}

        {/* Tab: Import from Key */}
        {tab === 'import' && <ImportWallet onImported={(w) => { fetchWallets(); showAlert(`Wallet imported: ${w.address}`); setTab('wallets'); }} />}

        {/* Tab: Recover from Seed */}
        {tab === 'recover' && <RecoverWallet onRecovered={(w) => { fetchWallets(); showAlert(`Wallet recovered: ${w.address}`); setTab('wallets'); }} />}

        {/* Tab: Send QRC */}
        {tab === 'send' && <SendQRC wallets={wallets} onSent={() => { fetchWallets(); showAlert('Transaction submitted — mine a block to confirm'); }} />}
      </div>

      {/* Footer */}
      <footer className="bg-black/30 border-t border-indigo-500/20 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          © Omar Mohammad Abunadi™ — QuranChain Wallet — BIP39 · AES-256-GCM · RSA-2048
        </div>
      </footer>
    </div>
  );
}

// ── Wallet Detail Panel ──
function WalletDetail({ address, onExport }) {
  const [detail, setDetail] = useState(null);
  const [password, setPassword] = useState('');
  const [keystore, setKeystore] = useState(null);

  useEffect(() => {
    fetch(`${API}/wallet/${address}`).then(r => r.json()).then(setDetail).catch(() => {});
  }, [address]);

  const exportKeystore = async () => {
    if (password.length < 8) return;
    try {
      const res = await fetch(`${API}/wallet/export-keystore`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password }),
      });
      const data = await res.json();
      if (data.keystore) {
        setKeystore(data.keystore);
        onExport();
      }
    } catch (e) { console.error(e); }
  };

  if (!detail) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-400">Version:</span> {detail.version}</div>
        <div><span className="text-gray-400">Type:</span> {detail.type}</div>
        <div><span className="text-gray-400">Balance:</span> <span className="text-indigo-400 font-semibold">{detail.balance} QRC</span></div>
        <div><span className="text-gray-400">Staked:</span> {detail.stake} QRC</div>
        <div className="col-span-2"><span className="text-gray-400">Created:</span> {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : 'N/A'}</div>
        <div className="col-span-2"><span className="text-gray-400">Derivation:</span> <span className="font-mono text-xs">{detail.derivationPath}</span></div>
      </div>

      {/* Transaction History */}
      {detail.history?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-indigo-400 mb-2">Transaction History ({detail.history.length})</h4>
          <div className="space-y-1 max-h-40 overflow-auto">
            {detail.history.map((tx, i) => (
              <div key={i} className="flex justify-between items-center bg-white/5 rounded p-2 text-xs">
                <div>
                  <span className={`px-1.5 py-0.5 rounded mr-2 ${tx.type === 'REWARD' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>{tx.type}</span>
                  <span className="text-gray-500">Block #{tx.blockIndex}</span>
                </div>
                <span className={tx.to === address ? 'text-green-400' : 'text-red-400'}>{tx.to === address ? '+' : '-'}{tx.amount} QRC</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Keystore */}
      <div className="flex gap-2">
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)" className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm" />
        <button onClick={exportKeystore} disabled={password.length < 8}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 rounded-lg text-sm font-semibold">
          🔒 Export Keystore
        </button>
      </div>
      {keystore && (
        <div className="bg-black/30 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-green-400 font-semibold">Encrypted Keystore (AES-256-GCM)</span>
            <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(keystore, null, 2)); }}
              className="text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">📋 Copy</button>
          </div>
          <pre className="text-xs text-gray-400 overflow-auto max-h-40">{JSON.stringify(keystore, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ── Create Wallet ──
function CreateWallet({ onCreated }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('standard');
  const [strength, setStrength] = useState(12);
  const [result, setResult] = useState(null);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API}/wallet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, type, strength }),
      });
      const data = await res.json();
      setResult(data);
      if (data.address) onCreated(data);
    } catch (e) { setResult({ error: e.message }); }
    setCreating(false);
  };

  return (
    <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">✨ Create New Wallet</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="My QuranChain Wallet"
            className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Wallet Type</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'standard', icon: '👛', label: 'Standard' },
              { id: 'zakat', icon: '🕌', label: 'Zakat' },
              { id: 'sadaqah', icon: '💝', label: 'Sadaqah' },
              { id: 'founder', icon: '👑', label: 'Founder' },
            ].map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`p-3 rounded-lg text-center border transition ${type === t.id ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/10 hover:bg-white/10'}`}>
                <div className="text-xl">{t.icon}</div>
                <div className="text-xs">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">Seed Phrase Length</label>
          <div className="flex gap-2">
            <button onClick={() => setStrength(12)}
              className={`flex-1 py-2 rounded-lg border transition ${strength === 12 ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/10 hover:bg-white/10'}`}>
              12 Words
            </button>
            <button onClick={() => setStrength(24)}
              className={`flex-1 py-2 rounded-lg border transition ${strength === 24 ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/10 hover:bg-white/10'}`}>
              24 Words (More Secure)
            </button>
          </div>
        </div>

        <button onClick={create} disabled={creating}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 rounded-lg font-semibold transition">
          {creating ? 'Creating...' : '✨ Create Wallet'}
        </button>
      </div>

      {result?.mnemonic && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <h4 className="text-red-400 font-bold mb-2">⚠️ SAVE YOUR SEED PHRASE — This is the ONLY way to recover your wallet</h4>
          <div className="bg-black/30 rounded-lg p-4 mb-2">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {result.mnemonic.split(' ').map((word, i) => (
                <span key={i} className="bg-white/10 rounded px-2 py-1 text-sm font-mono">
                  <span className="text-gray-500 mr-1">{i + 1}.</span>{word}
                </span>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-300 space-y-1">
            <p><span className="text-gray-400">Address:</span> <span className="font-mono">{result.address}</span></p>
            <p><span className="text-gray-400">ETH Address:</span> <span className="font-mono">{result.ethAddress}</span></p>
            <p><span className="text-gray-400">Type:</span> {result.type} | <span className="text-gray-400">Version:</span> {result.version}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Import Wallet from Private Key ──
function ImportWallet({ onImported }) {
  const [privateKey, setPrivateKey] = useState('');
  const [label, setLabel] = useState('');
  const [result, setResult] = useState(null);

  const importWallet = async () => {
    try {
      const res = await fetch(`${API}/wallet/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey, label: label || 'imported' }),
      });
      const data = await res.json();
      setResult(data);
      if (data.address) onImported(data);
    } catch (e) { setResult({ error: e.message }); }
  };

  return (
    <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">📥 Import from Private Key</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Imported Wallet"
            className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Private Key (PEM format)</label>
          <textarea value={privateKey} onChange={e => setPrivateKey(e.target.value)}
            placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvg...&#10;-----END PRIVATE KEY-----"
            rows={6} className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs" />
        </div>
        <button onClick={importWallet} disabled={!privateKey.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 rounded-lg font-semibold">
          📥 Import Wallet
        </button>
      </div>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
          {result.error ? result.error : `✅ Imported: ${result.address}`}
        </div>
      )}
    </div>
  );
}

// ── Recover Wallet from Seed Phrase ──
function RecoverWallet({ onRecovered }) {
  const [mnemonic, setMnemonic] = useState('');
  const [label, setLabel] = useState('');
  const [result, setResult] = useState(null);

  const recover = async () => {
    try {
      const res = await fetch(`${API}/wallet/recover`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mnemonic: mnemonic.trim(), label: label || 'recovered' }),
      });
      const data = await res.json();
      setResult(data);
      if (data.address) onRecovered(data);
    } catch (e) { setResult({ error: e.message }); }
  };

  return (
    <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">🔑 Recover from Seed Phrase</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Recovered Wallet"
            className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Seed Phrase (12 or 24 words)</label>
          <textarea value={mnemonic} onChange={e => setMnemonic(e.target.value)}
            placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
            rows={3} className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2" />
          <p className="text-xs text-gray-500 mt-1">Words: {mnemonic.trim().split(/\s+/).filter(Boolean).length}</p>
        </div>
        <button onClick={recover} disabled={!mnemonic.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 rounded-lg font-semibold">
          🔑 Recover Wallet
        </button>
      </div>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
          {result.error ? result.error : `✅ Recovered: ${result.address}`}
        </div>
      )}
    </div>
  );
}

// ── Send QRC ──
function SendQRC({ wallets, onSent }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [txType, setTxType] = useState('transfer');
  const [result, setResult] = useState(null);

  const send = async () => {
    const endpoints = { transfer: 'transfer', zakat: 'zakat', sadaqah: 'sadaqah', halal_payment: 'halal-payment' };
    try {
      const res = await fetch(`${API}/${endpoints[txType]}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, amount, memo, description: memo }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) onSent();
    } catch (e) { setResult({ error: e.message }); }
  };

  return (
    <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">💸 Send QRC</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Transaction Type</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'transfer', icon: '💸', label: 'Transfer' },
              { id: 'zakat', icon: '🕌', label: 'Zakat' },
              { id: 'sadaqah', icon: '💝', label: 'Sadaqah' },
              { id: 'halal_payment', icon: '✅', label: 'Halal Pay' },
            ].map(t => (
              <button key={t.id} onClick={() => setTxType(t.id)}
                className={`p-2 rounded-lg text-center border transition text-sm ${txType === t.id ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/10 hover:bg-white/10'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">From</label>
          <select value={from} onChange={e => setFrom(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2">
            <option value="">Select wallet...</option>
            {wallets.map(w => (
              <option key={w.address} value={w.address}>
                {w.label || w.address.substring(0, 16)} — {w.balance} QRC
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1 block">To Address</label>
          <input value={to} onChange={e => setTo(e.target.value)} placeholder="qrc_... or recipient address"
            className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Amount (QRC)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Memo</label>
            <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="Optional memo"
              className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2" />
          </div>
        </div>

        {txType === 'halal_payment' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-400">
            ℹ️ Halal payments include a 30% founder royalty. Recipient receives 70% of the amount.
          </div>
        )}

        <button onClick={send} disabled={!from || !to || !amount}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 rounded-lg font-semibold">
          Send {txType.replace('_', ' ').toUpperCase()}
        </button>
      </div>

      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
          <pre className="overflow-auto max-h-40">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
