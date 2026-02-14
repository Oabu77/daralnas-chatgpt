import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * 🤖 AI Commerce Marketplace
 * Where AI agents can programmatically purchase tools they need:
 * Phone lines, email, storage, CRM access, VPN, hosting, etc.
 * 
 * Features:
 * - Role-based tool bundles (Customer Service Agent, Data Analyst, etc.)
 * - Individual tool purchasing via Stripe payment links
 * - API keys for programmatic access
 * - Agent wallet integration
 */

// AI Agent Roles and their required toolkits
const AI_ROLES = [
  {
    id: 'customer-service',
    name: 'Customer Service Agent',
    icon: '🎧',
    description: 'Handle customer inquiries, resolve tickets, manage live chat, and process returns.',
    color: 'from-blue-600 to-indigo-600',
    requiredTools: ['phone-line', 'email-inbox', 'crm-access', 'knowledge-base', 'live-chat'],
    optionalTools: ['storage', 'analytics', 'vpn'],
    monthlyEstimate: '$89.97',
  },
  {
    id: 'sales-agent',
    name: 'Sales & Outreach Agent',
    icon: '💼',
    description: 'Generate leads, send proposals, manage pipeline, and close deals autonomously.',
    color: 'from-emerald-600 to-teal-600',
    requiredTools: ['phone-line', 'email-inbox', 'crm-access', 'calendar', 'analytics'],
    optionalTools: ['storage', 'domain', 'website'],
    monthlyEstimate: '$109.97',
  },
  {
    id: 'content-creator',
    name: 'Content Creator Agent',
    icon: '✍️',
    description: 'Write blog posts, social media content, newsletters, and marketing copy.',
    color: 'from-pink-600 to-rose-600',
    requiredTools: ['storage', 'website', 'email-inbox', 'cdn', 'analytics'],
    optionalTools: ['domain', 'crm-access', 'knowledge-base'],
    monthlyEstimate: '$79.97',
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst Agent',
    icon: '📊',
    description: 'Process datasets, generate reports, create visualizations, and deliver insights.',
    color: 'from-cyan-600 to-blue-600',
    requiredTools: ['storage', 'compute', 'analytics', 'api-access', 'knowledge-base'],
    optionalTools: ['email-inbox', 'vpn', 'blockchain-node'],
    monthlyEstimate: '$149.97',
  },
  {
    id: 'devops-agent',
    name: 'DevOps & Infrastructure Agent',
    icon: '⚙️',
    description: 'Deploy services, monitor uptime, manage containers, and handle CI/CD pipelines.',
    color: 'from-orange-600 to-red-600',
    requiredTools: ['server', 'storage', 'domain', 'ssl', 'cdn', 'vpn'],
    optionalTools: ['email-inbox', 'analytics', 'blockchain-node'],
    monthlyEstimate: '$199.97',
  },
  {
    id: 'finance-agent',
    name: 'Islamic Finance Agent',
    icon: '🏦',
    description: 'Process Sharia-compliant payments, manage accounts, calculate Zakat, and audit transactions.',
    color: 'from-amber-600 to-yellow-600',
    requiredTools: ['crm-access', 'email-inbox', 'analytics', 'api-access', 'blockchain-node'],
    optionalTools: ['phone-line', 'storage', 'knowledge-base'],
    monthlyEstimate: '$179.97',
  },
  {
    id: 'security-agent',
    name: 'Security & Compliance Agent',
    icon: '🛡️',
    description: 'Monitor threats, enforce policies, detect fraud, manage AML/KYC, and generate compliance reports.',
    color: 'from-gray-600 to-zinc-700',
    requiredTools: ['vpn', 'analytics', 'api-access', 'email-inbox', 'knowledge-base', 'blockchain-node'],
    optionalTools: ['phone-line', 'storage'],
    monthlyEstimate: '$229.97',
  },
  {
    id: 'logistics-agent',
    name: 'Logistics & Shipping Agent',
    icon: '📦',
    description: 'Track shipments, optimize routes, manage warehousing, and handle customs documentation.',
    color: 'from-green-600 to-lime-600',
    requiredTools: ['api-access', 'email-inbox', 'analytics', 'storage', 'crm-access'],
    optionalTools: ['phone-line', 'vpn', 'blockchain-node'],
    monthlyEstimate: '$139.97',
  },
];

// Available tools that AI agents can purchase
const AI_TOOLS = {
  'phone-line': {
    name: 'MeshTalk Phone Line',
    icon: '📞',
    description: 'Dedicated phone number with VoIP, call recording, IVR, and voicemail-to-text.',
    price: '$9.99/mo',
    priceValue: 9.99,
    platform: 'MeshTalk',
    platformLink: '/site/meshtalk',
    capabilities: ['Inbound/outbound calls', 'Call recording & transcription', 'IVR auto-attendant', 'Voicemail to text', 'Call analytics'],
    apiEndpoint: '/api/ai-tools/phone-line',
  },
  'email-inbox': {
    name: 'DarCloud Email Inbox',
    icon: '📧',
    description: 'Professional email with sending API, templates, spam filtering, and unlimited aliases.',
    price: '$4.99/mo',
    priceValue: 4.99,
    platform: 'DarCloud',
    platformLink: '/site/darcloud',
    capabilities: ['Send/receive API', 'Template engine', 'Spam filtering', 'Unlimited aliases', 'Attachment handling'],
    apiEndpoint: '/api/ai-tools/email',
  },
  'crm-access': {
    name: 'QuranChain CRM Access',
    icon: '👥',
    description: 'Full CRM API: contacts, leads, deals, tasks, notes, and pipeline management.',
    price: '$20.00/mo',
    priceValue: 20.00,
    platform: 'QuranChain OS',
    platformLink: '/site/core',
    capabilities: ['Contact management API', 'Lead scoring', 'Deal pipeline', 'Task automation', 'Reporting API'],
    apiEndpoint: '/api/ai-tools/crm',
  },
  'storage': {
    name: 'DarCloud Storage',
    icon: '💾',
    description: '50GB encrypted cloud storage with file API, versioning, and CDN integration.',
    price: '$7.99/mo',
    priceValue: 7.99,
    platform: 'DarCloud',
    platformLink: '/site/darcloud',
    capabilities: ['File upload/download API', 'Versioning', 'Encryption at rest', 'CDN delivery', 'Webhook notifications'],
    apiEndpoint: '/api/ai-tools/storage',
  },
  'website': {
    name: 'DarCloud Website Hosting',
    icon: '🌐',
    description: 'Managed website with automatic deployment, SSL, and custom domain support.',
    price: '$4.99/mo',
    priceValue: 4.99,
    platform: 'DarCloud',
    platformLink: '/site/darcloud',
    capabilities: ['One-click deployment', 'Free SSL', 'Custom domain', 'Git integration', 'Auto-scaling'],
    apiEndpoint: '/api/ai-tools/website',
  },
  'domain': {
    name: 'Domain Registration',
    icon: '🔗',
    description: 'Register .com, .io, .dev, .host domains with DNS API and WHOIS privacy.',
    price: '$12.99/yr',
    priceValue: 12.99,
    platform: 'DarCloud',
    platformLink: '/site/darcloud',
    capabilities: ['Domain registration API', 'DNS management', 'WHOIS privacy', 'Auto-renewal', 'Transfer support'],
    apiEndpoint: '/api/ai-tools/domain',
  },
  'ssl': {
    name: 'SSL Certificate',
    icon: '🔒',
    description: 'Automated SSL with Let\'s Encrypt + DarCloud CA. Wildcard support.',
    price: '$0.00/mo',
    priceValue: 0,
    platform: 'DarCloud',
    platformLink: '/site/darcloud',
    capabilities: ['Auto-provisioning', 'Wildcard certificates', 'Auto-renewal', 'Certificate API', 'HSTS support'],
    apiEndpoint: '/api/ai-tools/ssl',
  },
  'cdn': {
    name: 'DarCloud CDN',
    icon: '⚡',
    description: 'Global content delivery with 200+ PoPs, edge caching, and purge API.',
    price: '$9.99/mo',
    priceValue: 9.99,
    platform: 'DarCloud',
    platformLink: '/site/darcloud',
    capabilities: ['Edge caching', 'Purge API', 'Image optimization', 'DDoS protection', 'Real-time analytics'],
    apiEndpoint: '/api/ai-tools/cdn',
  },
  'vpn': {
    name: 'WhisperNet VPN',
    icon: '🛡️',
    description: 'Encrypted tunnel for all agent traffic. Multi-hop with obfuscation.',
    price: '$9.99/mo',
    priceValue: 9.99,
    platform: 'WhisperNet',
    platformLink: '/site/whispernet',
    capabilities: ['WireGuard tunnel API', 'Multi-hop routing', 'Kill switch', 'IP rotation', 'Traffic obfuscation'],
    apiEndpoint: '/api/ai-tools/vpn',
  },
  'server': {
    name: 'DarCloud Dedicated Server',
    icon: '🖥️',
    description: 'Dedicated compute with SSH API access. 4 vCPU, 8GB RAM, 100GB SSD.',
    price: '$49.99/mo',
    priceValue: 49.99,
    platform: 'DarCloud',
    platformLink: '/site/darcloud',
    capabilities: ['SSH API access', 'Root privileges', 'Snapshot backups', 'Monitoring API', 'Auto-scaling'],
    apiEndpoint: '/api/ai-tools/server',
  },
  'compute': {
    name: 'DarCloud GPU Compute',
    icon: '🧮',
    description: 'GPU instances for ML training and inference. NVIDIA A100 available.',
    price: '$99.99/mo',
    priceValue: 99.99,
    platform: 'DarCloud',
    platformLink: '/site/darcloud',
    capabilities: ['GPU API access', 'Jupyter integration', 'Model hosting', 'Batch processing', 'Auto-scaling'],
    apiEndpoint: '/api/ai-tools/compute',
  },
  'analytics': {
    name: 'QuranChain Analytics',
    icon: '📊',
    description: 'Real-time analytics API with dashboards, alerts, and custom reporting.',
    price: '$14.99/mo',
    priceValue: 14.99,
    platform: 'QuranChain OS',
    platformLink: '/site/core',
    capabilities: ['Real-time metrics API', 'Custom dashboards', 'Alert webhooks', 'Export to CSV/PDF', 'Trend analysis'],
    apiEndpoint: '/api/ai-tools/analytics',
  },
  'api-access': {
    name: 'QuranChain API Gateway',
    icon: '🔌',
    description: 'Full REST API access to all QuranChain ecosystem services with rate limiting.',
    price: '$29.99/mo',
    priceValue: 29.99,
    platform: 'QuranChain OS',
    platformLink: '/site/core',
    capabilities: ['REST API access', 'WebSocket streams', 'OAuth2 auth', 'Rate limit management', 'Usage analytics'],
    apiEndpoint: '/api/ai-tools/gateway',
  },
  'blockchain-node': {
    name: 'QuranChain RPC Node',
    icon: '⛓️',
    description: 'Dedicated RPC endpoint for blockchain queries, transactions, and smart contract calls.',
    price: '$49.99/mo',
    priceValue: 49.99,
    platform: 'Blockchain',
    platformLink: '/site/blockchain',
    capabilities: ['JSON-RPC API', 'WebSocket subscriptions', 'Transaction broadcasting', 'Block queries', 'Smart contract calls'],
    apiEndpoint: '/api/ai-tools/rpc',
  },
  'knowledge-base': {
    name: 'AI Knowledge Base',
    icon: '📚',
    description: 'Vector database for RAG. Upload documents, query with semantic search.',
    price: '$19.99/mo',
    priceValue: 19.99,
    platform: 'AI Agent School',
    platformLink: '/site/aiagents',
    capabilities: ['Document ingestion API', 'Semantic search', 'RAG pipeline', 'Embedding storage', 'Multi-format support'],
    apiEndpoint: '/api/ai-tools/knowledge-base',
  },
  'live-chat': {
    name: 'MeshTalk Live Chat Widget',
    icon: '💬',
    description: 'Embeddable chat widget with AI routing, canned responses, and escalation.',
    price: '$14.99/mo',
    priceValue: 14.99,
    platform: 'MeshTalk',
    platformLink: '/site/meshtalk',
    capabilities: ['Chat widget API', 'Visitor tracking', 'Canned responses', 'Agent routing', 'Chat history'],
    apiEndpoint: '/api/ai-tools/live-chat',
  },
  'calendar': {
    name: 'Meeting Scheduler',
    icon: '📅',
    description: 'AI-powered scheduling with availability API, booking links, and reminders.',
    price: '$9.99/mo',
    priceValue: 9.99,
    platform: 'QuranChain OS',
    platformLink: '/site/core',
    capabilities: ['Availability API', 'Booking links', 'Calendar sync', 'Reminder notifications', 'Time zone handling'],
    apiEndpoint: '/api/ai-tools/calendar',
  },
};

export default function AIMarketplace() {
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedRole, setSelectedRole] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentLinks, setPaymentLinks] = useState([]);

  useEffect(() => {
    fetch('/api/payment-links')
      .then(r => r.json())
      .then(data => setPaymentLinks(data.payment_links || []))
      .catch(() => {});
  }, []);

  const addToCart = (toolId) => {
    if (!cart.includes(toolId)) {
      setCart([...cart, toolId]);
      setShowCart(true);
    }
  };

  const removeFromCart = (toolId) => {
    setCart(cart.filter(id => id !== toolId));
  };

  const addRoleBundle = (role) => {
    const newCart = [...new Set([...cart, ...role.requiredTools])];
    setCart(newCart);
    setShowCart(true);
  };

  const cartTotal = cart.reduce((sum, toolId) => sum + (AI_TOOLS[toolId]?.priceValue || 0), 0);

  // Find best matching payment link for checkout
  const findPaymentLink = (toolId) => {
    const tool = AI_TOOLS[toolId];
    if (!tool) return null;
    const n = tool.name.toLowerCase();
    return paymentLinks.find(l => {
      const p = l.product.toLowerCase();
      if (n.includes('phone') && p.includes('meshtalk cell')) return true;
      if (n.includes('email') && p.includes('darcloud mail')) return true;
      if (n.includes('crm') && p.includes('crm system')) return true;
      if (n.includes('storage') && p.includes('cloud storage')) return true;
      if (n.includes('website') && p.includes('hosting - starter')) return true;
      if (n.includes('domain') && p.includes('domain registration - .com')) return true;
      if (n.includes('cdn') && p.includes('darcloud cdn')) return true;
      if (n.includes('vpn') && p.includes('whispernet stealth vpn') && !p.includes('business') && !p.includes('enterprise')) return true;
      if (n.includes('dedicated server') && p.includes('darcloud dedicated')) return true;
      if (n.includes('gpu') && p.includes('darcloud autonomous')) return true;
      if (n.includes('analytics') && p.includes('analytics dashboard')) return true;
      if (n.includes('api gateway') && p.includes('rpc api')) return true;
      if (n.includes('rpc node') && p.includes('full node')) return true;
      if (n.includes('knowledge') && p.includes('ai agent training')) return true;
      if (n.includes('live chat') && p.includes('meshtalk business - starter')) return true;
      if (n.includes('calendar') && p.includes('crm')) return true;
      return false;
    });
  };

  const filteredTools = Object.entries(AI_TOOLS).filter(([, tool]) =>
    !searchQuery || tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950">
      {/* Header */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-black/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <h1 className="text-xl font-bold text-white">AI Commerce Marketplace</h1>
              <p className="text-xs text-violet-400">marketplace.darcloud.host</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/products" className="text-white/60 hover:text-white text-sm">Products</Link>
            <Link to="/" className="text-white/60 hover:text-white text-sm">Home</Link>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
            >
              🛒 Cart
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-purple-200 to-pink-300 mb-4">
            AI Agent Toolkit Store
          </h1>
          <p className="text-lg text-violet-200/70 max-w-2xl mx-auto mb-6">
            Everything an AI agent needs to work autonomously — phone lines, email, storage, CRM, hosting, and more.
            Select a role or build a custom toolkit.
          </p>

          {/* Tabs */}
          <div className="inline-flex bg-black/20 backdrop-blur-sm rounded-xl p-1 mb-8">
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'roles' ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white'}`}
            >
              🎭 Agent Roles
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'tools' ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white'}`}
            >
              🔧 Individual Tools
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'api' ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white'}`}
            >
              🔌 API Reference
            </button>
          </div>
        </div>

        {/* Cart Sidebar */}
        {showCart && (
          <div className="fixed right-0 top-0 h-full w-96 bg-slate-900/98 backdrop-blur-xl border-l border-violet-700/30 z-50 shadow-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">🛒 Agent Toolkit</h2>
                <button onClick={() => setShowCart(false)} className="text-white/60 hover:text-white text-lg">✕</button>
              </div>

              {cart.length === 0 ? (
                <p className="text-violet-300/60 text-center py-8">No tools selected yet</p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {cart.map(toolId => {
                      const tool = AI_TOOLS[toolId];
                      return (
                        <div key={toolId} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{tool.icon}</span>
                            <div>
                              <p className="text-white text-sm font-medium">{tool.name}</p>
                              <p className="text-violet-300/60 text-xs">{tool.price}</p>
                            </div>
                          </div>
                          <button onClick={() => removeFromCart(toolId)} className="text-rose-400 hover:text-rose-300 text-sm">✕</button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-violet-700/30 pt-4 mb-6">
                    <div className="flex justify-between text-white mb-1">
                      <span className="font-medium">Monthly Total</span>
                      <span className="text-xl font-bold">${cartTotal.toFixed(2)}/mo</span>
                    </div>
                    <p className="text-violet-300/50 text-xs">30% founder royalty included</p>
                  </div>

                  {/* Checkout — link to first product payment link or show API instructions */}
                  <button
                    onClick={() => {
                      // Open checkout for each tool
                      cart.forEach(toolId => {
                        const link = findPaymentLink(toolId);
                        if (link) window.open(link.payment_link_url, '_blank');
                      });
                    }}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition shadow-lg mb-3"
                  >
                    Purchase via Stripe ({cart.length} items)
                  </button>

                  <div className="bg-violet-900/30 rounded-xl p-4">
                    <p className="text-violet-300 text-xs font-medium mb-2">🔌 API Purchase (for AI Agents)</p>
                    <pre className="text-violet-200/70 text-xs overflow-x-auto">
{`POST /api/ai-marketplace/purchase
Authorization: Bearer <agent_api_key>
{
  "agent_id": "agent_xxx",
  "tools": ${JSON.stringify(cart, null, 2)},
  "payment_method": "agent_wallet"
}`}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab: Agent Roles */}
        {activeTab === 'roles' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {AI_ROLES.map(role => (
                <div
                  key={role.id}
                  className={`bg-white/5 backdrop-blur-sm border rounded-2xl overflow-hidden transition hover:-translate-y-1 ${
                    selectedRole?.id === role.id ? 'border-violet-500 shadow-lg shadow-violet-600/20' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className={`h-2 bg-gradient-to-r ${role.color}`}></div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{role.icon}</span>
                        <div>
                          <h3 className="text-lg font-bold text-white">{role.name}</h3>
                          <p className="text-white/50 text-xs">Est. {role.monthlyEstimate}/month</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/60 text-sm mb-4">{role.description}</p>

                    <div className="mb-4">
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Required Tools</p>
                      <div className="flex flex-wrap gap-1.5">
                        {role.requiredTools.map(toolId => (
                          <span key={toolId} className="bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded text-xs">
                            {AI_TOOLS[toolId]?.icon} {AI_TOOLS[toolId]?.name?.split(' ').slice(-1)[0]}
                          </span>
                        ))}
                      </div>
                    </div>

                    {role.optionalTools.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Optional Add-ons</p>
                        <div className="flex flex-wrap gap-1.5">
                          {role.optionalTools.map(toolId => (
                            <span key={toolId} className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-xs">
                              {AI_TOOLS[toolId]?.icon} {AI_TOOLS[toolId]?.name?.split(' ').slice(-1)[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => addRoleBundle(role)}
                        className={`flex-1 bg-gradient-to-r ${role.color} text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-90 transition`}
                      >
                        Add Toolkit to Cart
                      </button>
                      <button
                        onClick={() => setSelectedRole(selectedRole?.id === role.id ? null : role)}
                        className="bg-white/10 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-white/20 transition"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Role Detail */}
            {selectedRole && (
              <div className="bg-white/5 backdrop-blur-sm border border-violet-500/30 rounded-2xl p-8 mb-8">
                <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                  <span className="text-4xl">{selectedRole.icon}</span>
                  {selectedRole.name} — Full Toolkit
                </h3>
                <p className="text-white/60 mb-6">{selectedRole.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...selectedRole.requiredTools, ...selectedRole.optionalTools].map(toolId => {
                    const tool = AI_TOOLS[toolId];
                    const isRequired = selectedRole.requiredTools.includes(toolId);
                    return (
                      <div key={toolId} className={`bg-white/5 rounded-xl p-4 border ${isRequired ? 'border-violet-500/30' : 'border-white/5'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{tool.icon}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${isRequired ? 'bg-violet-500/20 text-violet-300' : 'bg-white/10 text-white/50'}`}>
                            {isRequired ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <h4 className="text-white font-semibold text-sm mb-1">{tool.name}</h4>
                        <p className="text-white/50 text-xs mb-2">{tool.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold text-sm">{tool.price}</span>
                          <button
                            onClick={() => addToCart(toolId)}
                            disabled={cart.includes(toolId)}
                            className={`text-xs px-3 py-1 rounded-lg transition ${
                              cart.includes(toolId)
                                ? 'bg-green-500/20 text-green-300 cursor-default'
                                : 'bg-violet-600 text-white hover:bg-violet-500'
                            }`}
                          >
                            {cart.includes(toolId) ? '✓ Added' : 'Add'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Individual Tools */}
        {activeTab === 'tools' && (
          <div>
            <div className="max-w-md mx-auto mb-8">
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-violet-700/30 rounded-xl px-5 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTools.map(([toolId, tool]) => (
                <div key={toolId} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/50 transition group hover:-translate-y-0.5">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{tool.icon}</span>
                      <Link to={tool.platformLink} className="text-xs text-violet-400 hover:text-violet-300">
                        {tool.platform} →
                      </Link>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{tool.name}</h3>
                    <p className="text-white/50 text-xs mb-3 min-h-[36px]">{tool.description}</p>

                    <div className="mb-3">
                      <p className="text-xs text-white/30 mb-1.5">Capabilities:</p>
                      <div className="flex flex-wrap gap-1">
                        {tool.capabilities.slice(0, 3).map((cap, i) => (
                          <span key={i} className="bg-white/5 text-white/50 px-1.5 py-0.5 rounded text-[10px]">{cap}</span>
                        ))}
                        {tool.capabilities.length > 3 && (
                          <span className="text-white/30 text-[10px]">+{tool.capabilities.length - 3} more</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <span className="text-white font-bold text-lg">{tool.price}</span>
                      <button
                        onClick={() => addToCart(toolId)}
                        disabled={cart.includes(toolId)}
                        className={`text-sm px-4 py-2 rounded-lg font-medium transition ${
                          cart.includes(toolId)
                            ? 'bg-green-500/20 text-green-300 cursor-default'
                            : 'bg-violet-600 text-white hover:bg-violet-500'
                        }`}
                      >
                        {cart.includes(toolId) ? '✓ In Cart' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: API Reference */}
        {activeTab === 'api' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm border border-violet-700/30 rounded-2xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">🔌 AI Agent Marketplace API</h2>
              <p className="text-white/60 mb-6">
                AI agents can programmatically browse, purchase, and provision tools through our REST API.
                Each purchased tool returns an API key and endpoint for immediate use.
              </p>

              <div className="space-y-6">
                <ApiSection
                  method="GET"
                  endpoint="/api/ai-marketplace/tools"
                  description="List all available tools with pricing and capabilities"
                  response={`{
  "tools": [
    {
      "id": "phone-line",
      "name": "MeshTalk Phone Line",
      "price": 9.99,
      "currency": "usd",
      "interval": "month",
      "capabilities": ["inbound_calls", "outbound_calls", "recording", "ivr"],
      "api_endpoint": "/api/ai-tools/phone-line"
    }
  ]
}`}
                />

                <ApiSection
                  method="GET"
                  endpoint="/api/ai-marketplace/roles"
                  description="List predefined agent roles with required tool bundles"
                  response={`{
  "roles": [
    {
      "id": "customer-service",
      "name": "Customer Service Agent",
      "required_tools": ["phone-line", "email-inbox", "crm-access"],
      "monthly_estimate": 89.97
    }
  ]
}`}
                />

                <ApiSection
                  method="POST"
                  endpoint="/api/ai-marketplace/purchase"
                  description="Purchase tools for an AI agent. Charges agent's wallet or linked payment method."
                  request={`{
  "agent_id": "agent_abc123",
  "tools": ["phone-line", "email-inbox", "crm-access"],
  "payment_method": "agent_wallet",
  "auto_provision": true
}`}
                  response={`{
  "purchase_id": "pur_xyz789",
  "status": "active",
  "provisions": [
    {
      "tool": "phone-line",
      "api_key": "mk_live_xxxxx",
      "endpoint": "https://api.meshtalk.darcloud.host/v1/calls",
      "phone_number": "+1-555-0123"
    },
    {
      "tool": "email-inbox",
      "api_key": "dc_live_xxxxx",
      "endpoint": "https://api.darcloud.host/v1/email",
      "email": "agent-abc123@darcloud.host"
    },
    {
      "tool": "crm-access",
      "api_key": "qc_live_xxxxx",
      "endpoint": "https://api.darcloud.host/v1/crm"
    }
  ],
  "monthly_total": 34.98,
  "next_billing": "2026-03-14T00:00:00Z"
}`}
                />

                <ApiSection
                  method="GET"
                  endpoint="/api/ai-marketplace/agent/:agentId/tools"
                  description="List tools currently provisioned for an AI agent"
                  response={`{
  "agent_id": "agent_abc123",
  "active_tools": [
    {
      "tool": "phone-line",
      "status": "active",
      "provisioned_at": "2026-02-14T00:00:00Z",
      "api_key": "mk_live_xxxxx",
      "usage": { "calls_today": 47, "minutes_today": 312 }
    }
  ]
}`}
                />

                <ApiSection
                  method="DELETE"
                  endpoint="/api/ai-marketplace/agent/:agentId/tools/:toolId"
                  description="Deprovision a tool from an AI agent"
                  response={`{
  "status": "deprovisioned",
  "tool": "phone-line",
  "effective_date": "2026-03-14T00:00:00Z"
}`}
                />
              </div>
            </div>

            {/* SDK Example */}
            <div className="bg-white/5 backdrop-blur-sm border border-violet-700/30 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-4">📦 QuranChain Agent SDK</h3>
              <p className="text-white/60 mb-4">Install the SDK to let your AI agents self-provision tools:</p>
              <pre className="bg-black/40 rounded-xl p-4 text-sm text-green-400 overflow-x-auto mb-6">
{`npm install @quranchain/agent-sdk`}
              </pre>
              <pre className="bg-black/40 rounded-xl p-4 text-sm text-violet-300 overflow-x-auto">
{`import { AgentMarketplace } from '@quranchain/agent-sdk';

const marketplace = new AgentMarketplace({
  apiKey: process.env.QURANCHAIN_API_KEY,
  agentId: 'agent_abc123',
});

// AI agent self-provisions what it needs
async function setupCustomerServiceAgent() {
  // Check what tools are needed
  const role = await marketplace.getRole('customer-service');
  
  // Purchase required tools
  const purchase = await marketplace.purchase({
    tools: role.requiredTools,
    paymentMethod: 'agent_wallet', // Uses agent's QCOIN balance
  });
  
  // Now the agent can use its tools
  const phone = purchase.getProvider('phone-line');
  await phone.makeCall('+1-555-0199', {
    message: 'Hello! I am your AI customer service agent.',
  });
  
  const email = purchase.getProvider('email-inbox');
  await email.send({
    to: 'customer@example.com',
    subject: 'Your support ticket #1234',
    body: 'We have resolved your issue...',
  });
  
  const crm = purchase.getProvider('crm-access');
  await crm.createContact({
    name: 'New Customer',
    email: 'customer@example.com',
    source: 'ai-agent',
  });
}

setupCustomerServiceAgent();`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-violet-300 text-lg font-semibold mb-2">🤖 AI Commerce Marketplace</p>
          <p className="text-white/40 text-sm mb-4">Part of the QuranChain™ Ecosystem — marketplace.darcloud.host</p>
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} QuranChain™ — Omar Mohammad Abunadi™ — All Rights Reserved</p>
        </div>
      </footer>
    </div>
  );
}

function ApiSection({ method, endpoint, description, request, response }) {
  const methodColors = { GET: 'bg-emerald-500', POST: 'bg-blue-500', DELETE: 'bg-rose-500', PUT: 'bg-amber-500' };
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div className="bg-white/5 px-4 py-3 flex items-center gap-3">
        <span className={`${methodColors[method]} text-white text-xs font-bold px-2 py-0.5 rounded`}>{method}</span>
        <code className="text-violet-300 text-sm">{endpoint}</code>
      </div>
      <div className="p-4">
        <p className="text-white/60 text-sm mb-3">{description}</p>
        {request && (
          <div className="mb-3">
            <p className="text-xs text-white/40 mb-1">Request Body:</p>
            <pre className="bg-black/40 rounded-lg p-3 text-xs text-blue-300 overflow-x-auto">{request}</pre>
          </div>
        )}
        <div>
          <p className="text-xs text-white/40 mb-1">Response:</p>
          <pre className="bg-black/40 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">{response}</pre>
        </div>
      </div>
    </div>
  );
}
