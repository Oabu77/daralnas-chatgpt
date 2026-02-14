/**
 * 🌐 DarCloud Services — Domain Registration + Email Provisioning
 * Full-service domain registration (.com, .net, .org, .io, .info, .host, .dev, .app, .cloud)
 * Customer email addresses on @darcloud.host and @darcloud.net
 * 
 * © Omar Mohammad Abunadi™ — QuranChain-OS Ecosystem
 */

import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════
//  TLD PRICING (annual)
// ══════════════════════════════════════════════
const TLD_PRICING = {
  '.com':    { register: 10.99, renew: 10.99, transfer: 10.99, popular: true },
  '.net':    { register: 11.99, renew: 11.99, transfer: 11.99, popular: true },
  '.org':    { register: 12.99, renew: 12.99, transfer: 12.99, popular: false },
  '.io':     { register: 39.99, renew: 39.99, transfer: 39.99, popular: true },
  '.info':   { register: 4.99,  renew: 4.99,  transfer: 4.99,  popular: false },
  '.host':   { register: 29.99, renew: 29.99, transfer: 29.99, popular: false },
  '.dev':    { register: 14.99, renew: 14.99, transfer: 14.99, popular: true },
  '.app':    { register: 15.99, renew: 15.99, transfer: 15.99, popular: false },
  '.cloud':  { register: 9.99,  renew: 9.99,  transfer: 9.99,  popular: false },
  '.co':     { register: 12.99, renew: 12.99, transfer: 12.99, popular: true },
  '.ai':     { register: 79.99, renew: 79.99, transfer: 79.99, popular: true },
  '.tech':   { register: 6.99,  renew: 6.99,  transfer: 6.99,  popular: false },
  '.store':  { register: 4.99,  renew: 4.99,  transfer: 4.99,  popular: false },
  '.site':   { register: 3.99,  renew: 3.99,  transfer: 3.99,  popular: false },
  '.online': { register: 5.99,  renew: 5.99,  transfer: 5.99,  popular: false },
  '.xyz':    { register: 2.99,  renew: 2.99,  transfer: 2.99,  popular: false },
};

// ══════════════════════════════════════════════
//  EMAIL PLANS
// ══════════════════════════════════════════════
const EMAIL_PLANS = [
  {
    id: 'email-basic',
    name: 'Email Starter',
    domain: 'darcloud.host',
    price: 0,
    interval: 'month',
    features: ['1 email alias', 'Forward to Gmail/iCloud', 'Spam protection', 'Custom display name'],
    icon: '📧',
    badge: 'FREE',
  },
  {
    id: 'email-pro',
    name: 'Email Professional',
    domain: 'darcloud.host',
    price: 4.99,
    interval: 'month',
    features: ['5 email aliases', 'Forward to any address', 'Priority routing', 'Custom domain option', 'SPF/DKIM/DMARC'],
    icon: '💼',
    badge: 'POPULAR',
  },
  {
    id: 'email-business',
    name: 'Email Business',
    domain: 'darcloud.host',
    price: 9.99,
    interval: 'month',
    features: ['25 email aliases', 'Catch-all forwarding', 'Multi-domain routing', 'Custom domain setup', 'API access', 'Webhook notifications'],
    icon: '🏢',
    badge: null,
  },
  {
    id: 'email-enterprise',
    name: 'Email Enterprise',
    domain: 'darcloud.net',
    price: 24.99,
    interval: 'month',
    features: ['Unlimited aliases', 'iCloud Mail integration', 'Full mailbox hosting', 'Custom DKIM signing', 'Dedicated IP', 'SLA guarantee', '24/7 support'],
    icon: '🏛️',
    badge: 'ENTERPRISE',
  },
];

// ══════════════════════════════════════════════
//  INCLUDED SERVICES WITH DOMAIN
// ══════════════════════════════════════════════
const INCLUDED_SERVICES = [
  { icon: '🔒', title: 'WHOIS Privacy', desc: 'Free privacy protection on all domains' },
  { icon: '🔐', title: 'Free SSL', desc: 'Auto-provisioned Let\'s Encrypt certificates' },
  { icon: '⚡', title: 'Cloudflare CDN', desc: 'Global edge caching & DDoS protection' },
  { icon: '🌐', title: 'DNS Management', desc: 'Full DNS control with DNSSEC support' },
  { icon: '📧', title: 'Email Routing', desc: 'Free email forwarding with every domain' },
  { icon: '🔄', title: 'Auto-Renewal', desc: 'Never lose your domain — auto-renew enabled' },
];

export default function DarCloudServices() {
  // ── Tabs ──
  const [activeTab, setActiveTab] = useState('domains');
  
  // ── Domain Search State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState([]);
  
  // ── Email State ──  
  const [emailAlias, setEmailAlias] = useState('');
  const [emailDomain, setEmailDomain] = useState('darcloud.host');
  const [forwardTo, setForwardTo] = useState('');
  const [emailCreating, setEmailCreating] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [existingEmails, setExistingEmails] = useState([]);
  
  // ── Cart State ──
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  
  // ── My Domains State ──
  const [myDomains, setMyDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(false);

  // ──────────────────────────────────────────
  //  DOMAIN SEARCH
  // ──────────────────────────────────────────
  const searchDomains = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults(null);
    
    try {
      const res = await fetch(`/api/domains/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      setSearchResults({ error: 'Search failed. Please try again.' });
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Load existing emails on mount
  useEffect(() => {
    fetch('/api/email/list').then(r => r.json()).then(d => {
      if (d.rules) setExistingEmails(d.rules);
    }).catch(() => {});
    
    fetch('/api/domains/registered').then(r => r.json()).then(d => {
      if (d.domains) setMyDomains(d.domains);
    }).catch(() => {});
  }, []);

  // ──────────────────────────────────────────
  //  EMAIL CREATION
  // ──────────────────────────────────────────
  const createEmail = async () => {
    if (!emailAlias.trim() || !forwardTo.trim()) return;
    setEmailCreating(true);
    setEmailResult(null);
    
    try {
      const res = await fetch('/api/email/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias: emailAlias.trim().toLowerCase(),
          domain: emailDomain,
          forward_to: forwardTo.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      setEmailResult(data);
      if (data.success) {
        setExistingEmails(prev => [...prev, data.rule]);
        setEmailAlias('');
        setForwardTo('');
      }
    } catch (err) {
      setEmailResult({ error: 'Failed to create email alias.' });
    } finally {
      setEmailCreating(false);
    }
  };

  // ──────────────────────────────────────────
  //  CART
  // ──────────────────────────────────────────
  const addToCart = (domain, tld, action = 'register') => {
    const fullDomain = `${domain}${tld}`;
    if (cart.find(c => c.domain === fullDomain)) return;
    const pricing = TLD_PRICING[tld];
    setCart(prev => [...prev, {
      domain: fullDomain,
      tld,
      action,
      price: pricing[action] || pricing.register,
      interval: 'year',
    }]);
    setShowCart(true);
  };
  
  const removeFromCart = (domain) => {
    setCart(prev => prev.filter(c => c.domain !== domain));
  };
  
  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);
  
  const checkoutCart = async () => {
    try {
      const res = await fetch('/api/domains/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: cart }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank');
      } else if (data.payment_links) {
        // Open first payment link
        window.open(data.payment_links[0], '_blank');
      }
    } catch (err) {
      alert('Checkout failed. Please try again.');
    }
  };

  // ══════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white">
      {/* ── HEADER ── */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">☁️</span>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                DarCloud™ Services
              </h1>
              <p className="text-xs text-slate-400">Domain Registration & Email Hosting</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
            >
              🛒 Cart {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {cart.length}
                </span>
              )}
            </button>
            <a href="/" className="text-sm text-slate-400 hover:text-white transition">← Back to Home</a>
          </div>
        </div>
      </nav>

      {/* ── TAB NAV ── */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex gap-2 border-b border-white/10 pb-1">
          {[
            { id: 'domains', label: '🌐 Domain Registration', badge: `${Object.keys(TLD_PRICING).length} TLDs` },
            { id: 'email', label: '📧 Email Services', badge: `${EMAIL_PLANS.length} Plans` },
            { id: 'transfer', label: '🔄 Transfer Domains', badge: null },
            { id: 'manage', label: '⚙️ My Domains', badge: myDomains.length > 0 ? myDomains.length : null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* ══════════ DOMAIN REGISTRATION TAB ══════════ */}
        {activeTab === 'domains' && (
          <div className="space-y-8">
            {/* Hero Search */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">Register Your Perfect Domain</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Search across {Object.keys(TLD_PRICING).length} TLDs including .com, .io, .ai, .dev, and more. 
                Every domain includes free WHOIS privacy, SSL, CDN, and email routing.
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="flex bg-white/5 border border-white/20 rounded-2xl overflow-hidden focus-within:border-blue-500 transition">
                <div className="px-4 flex items-center text-slate-400">🔍</div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchDomains()}
                  placeholder="Search for your domain name (e.g., mybusiness)"
                  className="flex-1 py-4 bg-transparent text-white placeholder-slate-500 outline-none text-lg"
                />
                <button
                  onClick={searchDomains}
                  disabled={searching || !searchQuery.trim()}
                  className="px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 font-bold text-lg transition"
                >
                  {searching ? '⏳' : 'Search'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults && (
              <div className="max-w-4xl mx-auto">
                {searchResults.error ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300">
                    {searchResults.error}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-300">
                      Results for "{searchResults.query}" — {searchResults.results?.length || 0} TLDs checked
                    </h3>
                    <div className="grid gap-2">
                      {searchResults.results?.map((result) => (
                        <div
                          key={result.domain}
                          className={`flex items-center justify-between p-4 rounded-xl border transition ${
                            result.available
                              ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                              : 'bg-white/5 border-white/10 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-lg ${result.available ? '🟢' : '🔴'}`}>
                              {result.available ? '✅' : '❌'}
                            </span>
                            <span className="font-mono text-lg font-bold">
                              {result.domain}
                            </span>
                            {result.premium && (
                              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded-full">PREMIUM</span>
                            )}
                            {TLD_PRICING[result.tld]?.popular && (
                              <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full">POPULAR</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-lg">
                                ${result.price || TLD_PRICING[result.tld]?.register || '—'}/yr
                              </div>
                              {result.available && (
                                <div className="text-xs text-slate-400">
                                  Renews at ${TLD_PRICING[result.tld]?.renew || result.price}/yr
                                </div>
                              )}
                            </div>
                            {result.available ? (
                              <button
                                onClick={() => addToCart(searchResults.query, result.tld)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                                  cart.find(c => c.domain === result.domain)
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}
                                disabled={!!cart.find(c => c.domain === result.domain)}
                              >
                                {cart.find(c => c.domain === result.domain) ? '✓ In Cart' : '+ Add to Cart'}
                              </button>
                            ) : (
                              <span className="px-4 py-2 text-sm text-slate-500">Taken</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TLD Pricing Grid */}
            <div>
              <h3 className="text-2xl font-bold text-center mb-6">TLD Pricing</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {Object.entries(TLD_PRICING).map(([tld, pricing]) => (
                  <div
                    key={tld}
                    className={`p-4 rounded-xl border text-center transition hover:scale-105 cursor-default ${
                      pricing.popular
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="font-mono font-bold text-lg text-blue-300">{tld}</div>
                    <div className="text-xl font-bold mt-1">${pricing.register}</div>
                    <div className="text-xs text-slate-400">/year</div>
                    {pricing.popular && (
                      <div className="mt-1 text-xs text-blue-400 font-semibold">★ Popular</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Included Services */}
            <div>
              <h3 className="text-2xl font-bold text-center mb-6">Included Free With Every Domain</h3>
              <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                {INCLUDED_SERVICES.map((s, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                    <div className="text-3xl mb-2">{s.icon}</div>
                    <div className="font-bold text-sm">{s.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ EMAIL SERVICES TAB ══════════ */}
        {activeTab === 'email' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">Professional Email Services</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Get your own @darcloud.host or @darcloud.net email address. 
                From free forwarding to full enterprise mailboxes.
              </p>
            </div>

            {/* Email Plans */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {EMAIL_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-2xl border transition hover:scale-[1.02] ${
                    plan.badge === 'POPULAR'
                      ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20'
                      : plan.badge === 'ENTERPRISE'
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
                      plan.badge === 'FREE' ? 'bg-emerald-500 text-white' :
                      plan.badge === 'POPULAR' ? 'bg-blue-500 text-white' :
                      'bg-purple-500 text-white'
                    }`}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-4xl mb-3">{plan.icon}</div>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mb-3">@{plan.domain}</p>
                    <div className="mb-4">
                      {plan.price === 0 ? (
                        <span className="text-3xl font-bold text-emerald-400">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">${plan.price}</span>
                          <span className="text-slate-400">/{plan.interval}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      if (plan.price === 0) {
                        setActiveTab('email-create');
                      } else {
                        addToCart(`email-${plan.id}`, '', 'register');
                      }
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition ${
                      plan.badge === 'POPULAR'
                        ? 'bg-blue-600 hover:bg-blue-500'
                        : plan.badge === 'FREE'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-white/10 hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {plan.price === 0 ? 'Create Free Email' : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Email Creator */}
            <div className="max-w-2xl mx-auto">
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                <h3 className="text-xl font-bold mb-4">✉️ Create Email Alias (Free)</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Create mailbox.name@darcloud.host that forwards to your existing email
                </p>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={emailAlias}
                      onChange={(e) => setEmailAlias(e.target.value.replace(/[^a-z0-9._-]/gi, ''))}
                      placeholder="username"
                      className="flex-1 px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-slate-500 outline-none focus:border-blue-500"
                    />
                    <select
                      value={emailDomain}
                      onChange={(e) => setEmailDomain(e.target.value)}
                      className="px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white outline-none focus:border-blue-500"
                    >
                      <option value="darcloud.host">@darcloud.host</option>
                      <option value="darcloud.net">@darcloud.net</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Forward to:</label>
                    <input
                      type="email"
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      placeholder="your-email@gmail.com"
                      className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-slate-500 outline-none focus:border-blue-500"
                    />
                  </div>
                  {emailAlias && forwardTo && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                      <span className="text-blue-300">Preview:</span>{' '}
                      <span className="font-mono font-bold">{emailAlias}@{emailDomain}</span>
                      <span className="text-slate-400"> → </span>
                      <span className="font-mono">{forwardTo}</span>
                    </div>
                  )}
                  <button
                    onClick={createEmail}
                    disabled={emailCreating || !emailAlias.trim() || !forwardTo.trim()}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 rounded-xl font-bold transition"
                  >
                    {emailCreating ? '⏳ Creating...' : '📧 Create Email Alias'}
                  </button>
                  {emailResult && (
                    <div className={`p-3 rounded-lg text-sm ${
                      emailResult.success 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/10 border border-red-500/20 text-red-300'
                    }`}>
                      {emailResult.success 
                        ? `✅ Created: ${emailResult.rule?.address || emailAlias + '@' + emailDomain}`
                        : `❌ ${emailResult.error || 'Failed to create email'}`
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Existing Email Rules */}
            {existingEmails.length > 0 && (
              <div className="max-w-2xl mx-auto">
                <h3 className="text-xl font-bold mb-4">📬 Active Email Addresses</h3>
                <div className="space-y-2">
                  {existingEmails.map((rule, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                      <div>
                        <span className="font-mono font-bold text-blue-300">{rule.address || rule.name}</span>
                        {rule.forward_to && (
                          <span className="text-slate-400 text-sm"> → {rule.forward_to}</span>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        rule.enabled !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {rule.enabled !== false ? '● Active' : '○ Paused'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ TRANSFER TAB ══════════ */}
        {activeTab === 'transfer' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">Transfer Your Domain to DarCloud</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Transfer your existing domains to DarCloud for at-cost pricing, free WHOIS privacy, 
                and full integration with our ecosystem. No hidden fees ever.
              </p>
            </div>

            <div className="max-w-2xl mx-auto p-8 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-xl font-bold mb-6">🔄 Start Domain Transfer</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Domain to transfer:</label>
                  <input
                    type="text"
                    placeholder="yourdomain.com"
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-slate-500 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Authorization / EPP code:</label>
                  <input
                    type="text"
                    placeholder="Enter EPP code from current registrar"
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-slate-500 outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm space-y-2">
                  <p className="font-bold text-blue-300">Transfer includes:</p>
                  <ul className="text-slate-300 space-y-1">
                    <li>✓ 1 year renewal added to current expiration</li>
                    <li>✓ Free WHOIS privacy protection</li>
                    <li>✓ Free SSL certificate</li>
                    <li>✓ Cloudflare CDN & DDoS protection</li>
                    <li>✓ Full DNS management with DNSSEC</li>
                    <li>✓ Email routing integration</li>
                  </ul>
                </div>
                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold transition">
                  🔄 Check Transfer Eligibility
                </button>
              </div>
            </div>

            {/* Transfer Pricing */}
            <div>
              <h3 className="text-xl font-bold text-center mb-4">Transfer Pricing (Includes 1-year renewal)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 max-w-5xl mx-auto">
                {Object.entries(TLD_PRICING).filter(([, p]) => p.transfer).map(([tld, pricing]) => (
                  <div key={tld} className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
                    <div className="font-mono font-bold text-blue-300">{tld}</div>
                    <div className="font-bold">${pricing.transfer}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ MY DOMAINS TAB ══════════ */}
        {activeTab === 'manage' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">My Domains & Services</h2>
              <p className="text-lg text-slate-400">Manage your registered domains, DNS, email, and hosting</p>
            </div>

            {myDomains.length > 0 ? (
              <div className="space-y-4">
                {myDomains.map((domain, i) => (
                  <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold font-mono">{domain.name}</h3>
                        <p className="text-sm text-slate-400">
                          Registered: {domain.created} — Expires: {domain.expires}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        domain.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {domain.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {['DNS', 'SSL', 'Email', 'CDN'].map(service => (
                        <div key={service} className="p-3 bg-black/20 rounded-xl text-center">
                          <div className="text-sm font-bold">{service}</div>
                          <div className="text-xs text-emerald-400">Active</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🌐</div>
                <h3 className="text-xl font-bold text-slate-400">No domains registered yet</h3>
                <p className="text-slate-500 mb-4">Search for your perfect domain to get started</p>
                <button
                  onClick={() => setActiveTab('domains')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition"
                >
                  Search Domains
                </button>
              </div>
            )}

            {/* Registered Platform Domains */}
            <div>
              <h3 className="text-xl font-bold mb-4">🏢 Platform Domains (Active)</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: 'darcloud.host', type: 'Primary', services: ['Hosting', 'CDN', 'Email', 'SSL'] },
                  { name: 'darcloud.net', type: 'Secondary', services: ['iCloud Mail', 'CDN', 'DNS'] },
                ].map((d, i) => (
                  <div key={i} className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <div className="font-mono font-bold text-blue-300">{d.name}</div>
                    <div className="text-xs text-slate-400 mb-2">{d.type}</div>
                    <div className="flex flex-wrap gap-1">
                      {d.services.map(s => (
                        <span key={s} className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════ CART SIDEBAR ══════════ */}
      {showCart && cart.length > 0 && (
        <div className="fixed right-0 top-0 h-full w-96 bg-slate-950/95 backdrop-blur-xl border-l border-white/10 z-50 shadow-2xl">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">🛒 Your Cart</h3>
              <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3">
              {cart.map((item) => (
                <div key={item.domain} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-sm">{item.domain}</div>
                      <div className="text-xs text-slate-400">{item.action} — ${item.price}/{item.interval}</div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.domain)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-white/10 pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-blue-400">${cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={checkoutCart}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold text-lg transition"
              >
                💳 Checkout with Stripe
              </button>
              <p className="text-xs text-slate-500 text-center mt-2">
                Secure payment processing by Stripe
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} DarCloud™ — A QuranChain-OS Company</p>
          <p className="mt-1">Domain Registration powered by Cloudflare Registrar | Email by Cloudflare Email Routing</p>
          <p className="mt-1">Founded by Omar Mohammad Abunadi™</p>
        </div>
      </footer>
    </div>
  );
}
