/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import SubscriptionManager from './components/SubscriptionManager';
import PaymentHistory from './components/PaymentHistory';
import Products from './components/Products';
import PlatformPage from './components/platforms/PlatformPage';
import AIMarketplace from './components/marketplace/AIMarketplace';
import DarCloudServices from './components/services/DarCloudServices';
import BlockchainExplorer from './components/blockchain/BlockchainExplorer';
import WalletManager from './components/blockchain/WalletManager';
import AdminDashboard from './components/blockchain/AdminDashboard';
import Web3Connector from './components/blockchain/Web3Connector';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          {/* Platform Sites — darcloud.host, meshtalk.darcloud.host, etc. */}
          <Route path="/site/:platformId" element={<PlatformPage />} />
          
          {/* AI Commerce Marketplace */}
          <Route path="/ai-marketplace" element={<AIMarketplace />} />
          
          {/* DarCloud Domain & Email Services */}
          <Route path="/services" element={<DarCloudServices />} />
          <Route path="/domains" element={<DarCloudServices />} />
          <Route path="/email" element={<DarCloudServices />} />
          
          {/* Blockchain Explorer & Wallet */}
          <Route path="/explorer" element={<BlockchainExplorer />} />
          <Route path="/blockchain" element={<BlockchainExplorer />} />
          <Route path="/wallet" element={<WalletManager />} />
          <Route path="/wallets" element={<WalletManager />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/web3" element={<Web3Connector />} />
          <Route path="/bridge" element={<Web3Connector />} />
          <Route path="/connect-wallet" element={<Web3Connector />} />
          
          {/* Core App Routes */}
          <Route path="/products" element={<Products />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subscriptions" element={<SubscriptionManager />} />
          <Route path="/payment-history" element={<PaymentHistory />} />
          <Route path="/" element={<Products />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;