import { useState, useEffect, useCallback } from 'react';

const API = '/api';

export default function Web3Connector() {
  const [walletState, setWalletState] = useState({
    connected: false,
    ethAddress: null,
    qrcAddress: null,
    balance: 0,
    stake: 0,
    chainId: null,
    networkName: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [txForm, setTxForm] = useState({ to: '', amount: '', memo: '' });
  const [txResult, setTxResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('connect');

  const hasMetaMask = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  // Connect MetaMask
  const connectWallet = useCallback(async () => {
    if (!hasMetaMask) {
      setError('MetaMask not detected. Install MetaMask to connect your Ethereum wallet.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const ethAddress = accounts[0];
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      // Map ETH address to QRC address via API
      const res = await fetch(`${API}/blockchain/web3/address/${ethAddress}`);
      const data = await res.json();

      const networkNames = {
        '0x1': 'Ethereum Mainnet', '0x5': 'Goerli', '0xaa36a7': 'Sepolia',
        '0x89': 'Polygon', '0xa86a': 'Avalanche', '0xa4b1': 'Arbitrum',
      };

      setWalletState({
        connected: true,
        ethAddress,
        qrcAddress: data.qrcAddress,
        balance: data.balance,
        stake: data.stake,
        chainId,
        networkName: networkNames[chainId] || `Chain ${parseInt(chainId, 16)}`,
      });

      // Fetch history
      fetchHistory(data.qrcAddress);
      setTab('dashboard');
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, [hasMetaMask]);

  // Listen for account/chain changes
  useEffect(() => {
    if (!hasMetaMask) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setWalletState(s => ({ ...s, connected: false, ethAddress: null }));
      } else if (accounts[0] !== walletState.ethAddress) {
        connectWallet();
      }
    };
    const handleChainChanged = () => connectWallet();

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [hasMetaMask, walletState.ethAddress, connectWallet]);

  const fetchHistory = async (address) => {
    try {
      const res = await fetch(`${API}/blockchain/history/${address}`);
      const data = await res.json();
      setHistory(data.transactions || []);
    } catch {}
  };

  // Sign a message with MetaMask to verify ownership
  const signAndVerify = async () => {
    if (!walletState.ethAddress) return;
    setLoading(true);
    setError('');
    try {
      const msg = `QuranChain Web3 Bridge\nAddress: ${walletState.ethAddress}\nTimestamp: ${Date.now()}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [msg, walletState.ethAddress],
      });

      const res = await fetch(`${API}/blockchain/web3/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethAddress: walletState.ethAddress,
          signature,
          message: msg,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Wallet verified and mapped to QuranChain!');
        setWalletState(s => ({ ...s, balance: data.balance, stake: data.stake }));
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Send QRC from Web3 wallet
  const sendQRC = async (e) => {
    e.preventDefault();
    if (!walletState.qrcAddress) return;
    setLoading(true);
    setTxResult(null);
    try {
      const res = await fetch(`${API}/blockchain/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: walletState.qrcAddress,
          to: txForm.to,
          amount: txForm.amount,
          memo: txForm.memo || `Web3 transfer from ${walletState.ethAddress?.substring(0, 10)}...`,
        }),
      });
      const data = await res.json();
      setTxResult(data);
      if (data.success) {
        setTxForm({ to: '', amount: '', memo: '' });
        // Refresh balance
        const balRes = await fetch(`${API}/blockchain/balance/${walletState.qrcAddress}`);
        const balData = await balRes.json();
        setWalletState(s => ({ ...s, balance: balData.balance, stake: balData.stake }));
        fetchHistory(walletState.qrcAddress);
      }
    } catch (err) {
      setTxResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setWalletState({
      connected: false, ethAddress: null, qrcAddress: null,
      balance: 0, stake: 0, chainId: null, networkName: null,
    });
    setHistory([]);
    setTab('connect');
    setMessage('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-emerald-400">Web3 Wallet Bridge</h1>
            <p className="text-gray-400 mt-1">Connect MetaMask to QuranChain</p>
          </div>
          {walletState.connected && (
            <button onClick={disconnect} className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg text-sm transition-colors">
              Disconnect
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6 text-red-300 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-4 mb-6 text-emerald-300 text-sm">
            {message}
          </div>
        )}

        {/* Tabs */}
        {walletState.connected && (
          <div className="flex gap-2 mb-6">
            {['dashboard', 'send', 'history', 'verify'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${tab === t ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Connect View */}
        {!walletState.connected && (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <div className="text-6xl mb-6">🦊</div>
            <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Connect your MetaMask or Ethereum wallet to bridge with QuranChain. 
              Your ETH address will be mapped to a QRC address for on-chain transactions.
            </p>
            <button onClick={connectWallet} disabled={loading}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl text-lg font-medium transition-colors">
              {loading ? 'Connecting...' : hasMetaMask ? 'Connect MetaMask' : 'MetaMask Required'}
            </button>
            {!hasMetaMask && (
              <p className="text-gray-500 text-sm mt-4">
                <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">
                  Install MetaMask
                </a> to connect your Ethereum wallet.
              </p>
            )}

            {/* Manual Address Entry */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm mb-3">Or enter an Ethereum address manually:</p>
              <ManualEntry />
            </div>
          </div>
        )}

        {/* Dashboard */}
        {walletState.connected && tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Wallet Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-emerald-400 text-sm font-medium mb-3">Ethereum Wallet</h3>
                <p className="font-mono text-sm text-gray-300 break-all">{walletState.ethAddress}</p>
                <p className="text-gray-500 text-xs mt-2">{walletState.networkName} ({walletState.chainId})</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-emerald-400 text-sm font-medium mb-3">QuranChain Address</h3>
                <p className="font-mono text-sm text-gray-300 break-all">{walletState.qrcAddress}</p>
                <p className="text-gray-500 text-xs mt-2">Mapped from ETH address</p>
              </div>
            </div>

            {/* Balance */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 text-sm">Available Balance</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">{walletState.balance.toFixed(4)} <span className="text-lg">QRC</span></p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Staked</p>
                  <p className="text-3xl font-bold text-purple-400 mt-1">{walletState.stake.toFixed(4)} <span className="text-lg">QRC</span></p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onClick={() => setTab('send')} className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-center transition-colors">
                <span className="text-2xl block mb-1">📤</span>
                <span className="text-sm text-gray-300">Send QRC</span>
              </button>
              <button onClick={() => setTab('history')} className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-center transition-colors">
                <span className="text-2xl block mb-1">📋</span>
                <span className="text-sm text-gray-300">History</span>
              </button>
              <button onClick={() => setTab('verify')} className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-center transition-colors">
                <span className="text-2xl block mb-1">✅</span>
                <span className="text-sm text-gray-300">Verify Wallet</span>
              </button>
              <a href="/explorer" className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-center transition-colors block">
                <span className="text-2xl block mb-1">🔍</span>
                <span className="text-sm text-gray-300">Explorer</span>
              </a>
            </div>
          </div>
        )}

        {/* Send */}
        {walletState.connected && tab === 'send' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Send QRC</h3>
            <p className="text-sm text-gray-400 mb-4">
              From: <span className="font-mono text-gray-300">{walletState.qrcAddress?.substring(0, 30)}...</span>
              <span className="ml-3 text-emerald-400">{walletState.balance.toFixed(4)} QRC available</span>
            </p>
            <form onSubmit={sendQRC} className="space-y-4">
              <input placeholder="Recipient address (qrc_... or name)" value={txForm.to}
                onChange={e => setTxForm(s => ({ ...s, to: e.target.value }))} required
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <input type="number" step="0.0001" min="0.0001" placeholder="Amount (QRC)" value={txForm.amount}
                onChange={e => setTxForm(s => ({ ...s, amount: e.target.value }))} required
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <input placeholder="Memo (optional)" value={txForm.memo}
                onChange={e => setTxForm(s => ({ ...s, memo: e.target.value }))}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg py-3 font-medium transition-colors">
                {loading ? 'Sending...' : 'Send QRC'}
              </button>
            </form>
            {txResult && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${txResult.success ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                {txResult.success ? `TX submitted: ${txResult.transaction?.id?.substring(0, 16)}...` : txResult.error}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {walletState.connected && tab === 'history' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Transaction History ({history.length})</h3>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No transactions yet for this address.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...history].reverse().map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-700/30 rounded text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        tx.type === 'TRANSFER' ? 'bg-blue-500/20 text-blue-400' :
                        tx.type === 'REWARD' ? 'bg-yellow-500/20 text-yellow-400' :
                        tx.type === 'STAKE' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-gray-600/20 text-gray-400'
                      }`}>{tx.type}</span>
                      <span className="text-gray-400 text-xs">Block #{tx.blockIndex}</span>
                    </div>
                    <div className="text-right">
                      <span className={tx.to === walletState.qrcAddress ? 'text-emerald-400' : 'text-red-400'}>
                        {tx.to === walletState.qrcAddress ? '+' : '-'}{tx.amount} QRC
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Verify */}
        {walletState.connected && tab === 'verify' && (
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Verify Wallet Ownership</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              Sign a message with MetaMask to prove you own this Ethereum address.
              This verifies the mapping between your ETH and QRC addresses.
            </p>
            <button onClick={signAndVerify} disabled={loading}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl text-lg font-medium transition-colors">
              {loading ? 'Signing...' : 'Sign & Verify'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Manual address entry sub-component
function ManualEntry() {
  const [addr, setAddr] = useState('');
  const [result, setResult] = useState(null);

  const lookup = async () => {
    if (!addr) return;
    const res = await fetch(`/api/blockchain/web3/address/${addr}`);
    const data = await res.json();
    setResult(data);
  };

  return (
    <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
      <div className="flex gap-2 w-full">
        <input value={addr} onChange={e => setAddr(e.target.value)} placeholder="0x..."
          className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
        <button onClick={lookup} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
          Lookup
        </button>
      </div>
      {result && (
        <div className="bg-gray-700/50 rounded-lg p-3 text-left w-full text-xs">
          <p className="text-gray-400">ETH: <span className="text-gray-200 font-mono">{result.ethAddress?.substring(0, 20)}...</span></p>
          <p className="text-gray-400">QRC: <span className="text-emerald-400 font-mono">{result.qrcAddress}</span></p>
          <p className="text-gray-400">Balance: <span className="text-white">{result.balance} QRC</span></p>
        </div>
      )}
    </div>
  );
}
