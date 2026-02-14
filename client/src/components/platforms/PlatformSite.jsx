import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared platform website layout used by all subdomain sites.
 * Each platform passes its branding config + the layout renders
 * hero, features, pricing cards with live Stripe payment links.
 */
export default function PlatformSite({ config }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payment-links')
      .then(r => r.json())
      .then(data => {
        const filtered = (data.payment_links || []).filter(link =>
          config.keywords.some(kw => link.product.toLowerCase().includes(kw))
        );
        setProducts(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [config.keywords]);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient}`}>
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{config.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{config.name}</h1>
              <p className="text-xs text-white/60">{config.subdomain}.darcloud.host</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/products" className="text-white/70 hover:text-white text-sm">All Products</Link>
            <Link to="/ai-marketplace" className="text-white/70 hover:text-white text-sm">AI Marketplace</Link>
            <Link to="/login" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className={`absolute inset-0 bg-gradient-to-r ${config.heroGradient} opacity-30`}></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full mb-6">
              <span className="text-lg">{config.icon}</span>
              <span className="text-white/80 text-sm font-medium">QuranChain™ Ecosystem</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-extrabold text-white mb-6 leading-tight">
              {config.headline}
            </h1>
            <p className="text-xl text-white/70 mb-8 leading-relaxed">
              {config.subheadline}
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#pricing" className={`inline-flex items-center gap-2 bg-gradient-to-r ${config.ctaGradient} text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg hover:opacity-90 transition`}>
                View Plans & Pricing
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </a>
              <Link to="/register" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-xl transition backdrop-blur-sm">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{config.featuresTitle}</h2>
            <p className="text-white/60 max-w-2xl mx-auto">{config.featuresSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.features.map((feature, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${config.ctaGradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Plans & Pricing</h2>
            <p className="text-white/60">All plans include Sharia-compliance certification and blockchain-verified transactions</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-white mx-auto mb-4"></div>
              <p className="text-white/60">Loading pricing...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition group hover:-translate-y-1">
                  <div className={`h-1.5 bg-gradient-to-r ${config.ctaGradient}`}></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        product.interval === 'one-time' ? 'bg-blue-500/20 text-blue-300'
                        : product.interval === 'month' ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {product.interval === 'one-time' ? 'One-time' : product.interval === 'month' ? 'Monthly' : 'Annual'}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-3 leading-tight min-h-[40px]">
                      {product.product}
                    </h3>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-bold text-white">{product.amount}</span>
                        {product.interval !== 'one-time' && (
                          <span className="text-white/40 text-xs ml-1">/{product.interval === 'month' ? 'mo' : 'yr'}</span>
                        )}
                      </div>
                      <a
                        href={product.payment_link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 bg-gradient-to-r ${config.ctaGradient} text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition shadow-lg`}
                      >
                        Buy
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className={`bg-gradient-to-r ${config.ctaGradient} rounded-3xl p-12 shadow-2xl`}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{config.ctaTitle}</h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">{config.ctaDescription}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="bg-white text-gray-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg">
                Start Now — Free Trial
              </Link>
              <Link to="/ai-marketplace" className="bg-white/20 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/30 transition backdrop-blur-sm">
                AI Marketplace →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-3">Platform</h4>
              <div className="space-y-2">
                <FooterLink to="/products">All Products</FooterLink>
                <FooterLink to="/ai-marketplace">AI Marketplace</FooterLink>
                <FooterLink to="/register">Create Account</FooterLink>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">QuranChain</h4>
              <div className="space-y-2">
                <FooterLink to="/site/darcloud">DarCloud</FooterLink>
                <FooterLink to="/site/meshtalk">MeshTalk</FooterLink>
                <FooterLink to="/site/daralnas">Dar Al-Nas</FooterLink>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">More</h4>
              <div className="space-y-2">
                <FooterLink to="/site/blockchain">Blockchain</FooterLink>
                <FooterLink to="/site/qex">QEX Exchange</FooterLink>
                <FooterLink to="/site/darpay">DarPay</FooterLink>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Company</h4>
              <div className="space-y-2">
                <FooterLink to="/site/whispernet">WhisperNet</FooterLink>
                <FooterLink to="/site/logistics">Logistics</FooterLink>
                <FooterLink to="/site/aiagents">AI Agents</FooterLink>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} {config.name} — A QuranChain™ Ecosystem Platform
            </p>
            <p className="text-white/30 text-xs mt-1">
              Omar Mohammad Abunadi™ — All Rights Reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link to={to} className="block text-white/50 hover:text-white/80 text-sm transition">
      {children}
    </Link>
  );
}
