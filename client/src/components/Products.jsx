/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect } from 'react';

const CATEGORIES = {
  'QuranChain Core': { icon: '🕌', color: 'from-emerald-600 to-teal-700', keywords: ['quranchain os', 'crm system', 'ai agent service', 'offline gas toll', 'network provider', 'fiat payment', 'crypto payment processing'] },
  'DarCloud': { icon: '☁️', color: 'from-blue-600 to-indigo-700', keywords: ['darcloud'] },
  'MeshTalk': { icon: '📡', color: 'from-purple-600 to-violet-700', keywords: ['meshtalk'] },
  'WhisperNet': { icon: '🔐', color: 'from-gray-700 to-gray-900', keywords: ['whispernet'] },
  'Dar Al-Nas Financial': { icon: '🏦', color: 'from-amber-600 to-yellow-700', keywords: ['dar al-nas', 'muslim wallet'] },
  'OliveAir & Logistics': { icon: '✈️', color: 'from-green-600 to-lime-700', keywords: ['oliveair', 'olivesea', 'dar logistics'] },
  'Blockchain': { icon: '⛓️', color: 'from-orange-600 to-red-700', keywords: ['quranchain layer', 'quranchain validator', 'quranchain full node', 'quranchain rpc', 'quranchain gas toll', 'quranchain bridge', 'quranchain stak', 'quranchain smart', 'quranchain govern', 'quranchain defi', 'quranchain block', 'quranchain analy', 'quranchain aml', 'quranchain fraud', 'quranchain multi-sig', 'quranchain ibc', 'quranchain cosmwasm', 'quranchain chain', 'quranchain enterprise', 'quranchain private', 'quranchain revenue', 'quranchain token', 'quranchain consult', 'global validator', 'validator managed', 'gas toll unlimited'] },
  'QEX Exchange': { icon: '📊', color: 'from-cyan-600 to-blue-700', keywords: ['qex'] },
  'DarPay': { icon: '💳', color: 'from-pink-600 to-rose-700', keywords: ['darpay'] },
  'Tokens': { icon: '🪙', color: 'from-yellow-500 to-amber-600', keywords: ['quran token', 'qcoin token', 'qlearn token', 'ecosystem token'] },
  'AI Agents': { icon: '🤖', color: 'from-violet-600 to-purple-800', keywords: ['ai agent school', 'ai agent license', 'ai agent hiring', 'ai agent training', 'ai agent fleet'] },
};

function categorize(productName) {
  const n = productName.toLowerCase();
  for (const [cat, info] of Object.entries(CATEGORIES)) {
    if (info.keywords.some(kw => n.includes(kw))) return cat;
  }
  return 'QuranChain Core';
}

export default function Products() {
  const [links, setLinks] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payment-links')
      .then(r => r.json())
      .then(data => {
        setLinks(data.payment_links || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: try loading from static file
        fetch('/payment-links.json')
          .then(r => r.json())
          .then(data => {
            setLinks(data.payment_links || []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  // Group by category
  const grouped = {};
  const categoryCounts = { All: links.length };
  links.forEach(link => {
    const cat = categorize(link.product);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(link);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Filter
  const filteredLinks = links.filter(link => {
    const matchesCategory = activeCategory === 'All' || categorize(link.product) === activeCategory;
    const matchesSearch = !searchQuery || link.product.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-emerald-300 text-lg">Loading QuranChain Products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/50 to-teal-900/50"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 mb-4">
              🕌 QuranChain™
            </h1>
            <p className="text-xl sm:text-2xl text-emerald-200 mb-2">
              The World's First Sharia-Compliant Blockchain Ecosystem
            </p>
            <p className="text-sm text-emerald-400/70 mb-8">
              Founded by Omar Mohammad Abunadi™ — {links.length} Products & Services
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800/80 border border-emerald-700/50 rounded-xl px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <svg className="absolute right-4 top-3.5 h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              <StatCard label="Products" value={links.length} />
              <StatCard label="Platforms" value={Object.keys(CATEGORIES).length} />
              <StatCard label="Payment Links" value="Live" accent />
              <StatCard label="Sharia Compliant" value="100%" accent />
            </div>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-emerald-800/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <CategoryTab
              label="All"
              count={categoryCounts.All}
              active={activeCategory === 'All'}
              onClick={() => setActiveCategory('All')}
              icon="🌐"
            />
            {Object.entries(CATEGORIES).map(([name, info]) => (
              <CategoryTab
                key={name}
                label={name}
                count={categoryCounts[name] || 0}
                active={activeCategory === name}
                onClick={() => setActiveCategory(name)}
                icon={info.icon}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-emerald-400 text-sm mb-6">
          Showing {filteredLinks.length} of {links.length} products
          {activeCategory !== 'All' && ` in ${activeCategory}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLinks.map((link, i) => (
            <ProductCard key={i} link={link} />
          ))}
        </div>

        {filteredLinks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No products found</p>
            <button
              onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
              className="mt-4 text-emerald-400 hover:text-emerald-300 underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-emerald-900/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <p className="text-emerald-300 text-lg font-semibold mb-2">
            🕌 QuranChain™ Ecosystem
          </p>
          <p className="text-gray-400 text-sm mb-4">
            DarCloud • MeshTalk • WhisperNet • Dar Al-Nas • OliveAir • OliveSea • QEX • DarPay
          </p>
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} QuranChain™ — Omar Mohammad Abunadi™ — All Rights Reserved
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Powered by Stripe • Secured by Blockchain • Certified Sharia-Compliant
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-gray-800/60 border border-emerald-800/30 rounded-lg px-5 py-3 min-w-[100px]">
      <div className={`text-2xl font-bold ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function CategoryTab({ label, count, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
        active ? 'bg-emerald-500' : 'bg-gray-700'
      }`}>
        {count}
      </span>
    </button>
  );
}

function ProductCard({ link }) {
  const cat = categorize(link.product);
  const catInfo = CATEGORIES[cat] || { icon: '🕌', color: 'from-emerald-600 to-teal-700' };

  return (
    <div className="group bg-gray-800/60 border border-emerald-800/20 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-900/30 hover:-translate-y-0.5">
      {/* Color bar */}
      <div className={`h-1.5 bg-gradient-to-r ${catInfo.color}`}></div>

      <div className="p-4">
        {/* Category badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs bg-gray-700/80 text-gray-300 px-2 py-0.5 rounded-full">
            {catInfo.icon} {cat}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            link.interval === 'one-time'
              ? 'bg-blue-900/50 text-blue-300'
              : link.interval === 'month'
              ? 'bg-emerald-900/50 text-emerald-300'
              : 'bg-amber-900/50 text-amber-300'
          }`}>
            {link.interval === 'one-time' ? 'One-time' : link.interval === 'month' ? 'Monthly' : 'Annual'}
          </span>
        </div>

        {/* Product name */}
        <h3 className="text-white font-semibold text-sm mb-3 leading-tight min-h-[40px]">
          {link.product}
        </h3>

        {/* Price & CTA */}
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold text-white">{link.amount}</span>
            {link.interval !== 'one-time' && (
              <span className="text-gray-400 text-xs ml-1">/{link.interval === 'month' ? 'mo' : 'yr'}</span>
            )}
          </div>
          <a
            href={link.payment_link_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 bg-gradient-to-r ${catInfo.color} text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-lg`}
          >
            Buy Now
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
