/**
 * Oliver Gates™ AI Publishing — Cloudflare Edge Worker
 * ═══════════════════════════════════════════════════════════
 * Edge proxy + storefront for the Oliver Gates AI Publishing Engine.
 * Proxies API calls to origin (localhost:9120 via tunnel),
 * serves beautiful landing page + book catalog at the edge.
 *
 * KDP Account: A2xq3izrirvour
 * Author: Oliver Gates
 * Publisher: Dar Al-Nas Publishing™
 * © QuranChain™ | Omar Mohammad Abunadi™
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

// ═══════════════════════════════════════════════════════════
// Landing Page HTML
// ═══════════════════════════════════════════════════════════

function buildLanding(catalog = [], stats = {}) {
  const bookCards = catalog.map(b => `
    <div class="book-card">
      <div class="book-cover" style="background:linear-gradient(135deg,${genreColor(b.genre)})">
        <span class="book-genre">${(b.genre||'').replace(/_/g,' ')}</span>
        <div class="book-title-overlay">${esc(b.title)}</div>
      </div>
      <div class="book-info">
        <h3>${esc(b.title)}</h3>
        <p class="book-meta">${esc(b.subtitle||'')}</p>
        <div class="book-stats">
          <span>📖 ${(b.word_count||0).toLocaleString()} words</span>
          <span>🏪 ${b.marketplaces||13} markets</span>
        </div>
        <div class="book-pricing">
          <span class="kindle-price">Kindle $${(b.kindle_price_usd||2.99).toFixed(2)}</span>
          <span class="paper-price">Paperback $${(b.price_usd||12.99).toFixed(2)}</span>
        </div>
        <div class="book-ids">
          ${b.asin ? `<span class="asin">ASIN: ${b.asin}</span>` : ''}
          ${b.isbn ? `<span class="isbn">ISBN: ${b.isbn}</span>` : ''}
        </div>
        ${b.asin ? `<a href="https://amazon.com/dp/${b.asin}" target="_blank" class="btn btn-buy">Buy on Amazon →</a>` : ''}
      </div>
    </div>`).join('\n');

  const totalWords = catalog.reduce((s,b) => s + (b.word_count||0), 0);
  const liveBooks = catalog.filter(b => b.status === 'live').length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Oliver Gates — AI-Powered Author | Dar Al-Nas Publishing</title>
<meta name="description" content="Books by Oliver Gates. AI-crafted knowledge across Islamic Finance, Technology, Business, Cryptocurrency, and more. Published by Dar Al-Nas Publishing.">
<meta name="author" content="Oliver Gates">
<meta property="og:title" content="Oliver Gates — AI-Powered Author">
<meta property="og:description" content="${liveBooks} books published across ${catalog.length > 0 ? '13' : '0'} Amazon marketplaces worldwide.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>">
<style>
:root{--bg:#0a0e18;--s1:#111827;--s2:#1a2234;--bdr:#2a3a5c;--gold:#d4a853;--amber:#f59e0b;--txt:#e2e8f0;--muted:#8899b0;--green:#10b981;--grad:linear-gradient(135deg,#d4a853,#f59e0b)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;background:var(--bg);color:var(--txt);min-height:100vh}
a{color:var(--gold);text-decoration:none}
.container{max-width:1100px;margin:0 auto;padding:0 1.5rem}
nav{background:rgba(10,14,24,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);padding:.75rem 2rem;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100}
.logo{font-size:1.4rem;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-links{display:flex;gap:1.5rem;font-size:.85rem;font-family:-apple-system,sans-serif}
.nav-links a{color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--gold)}
.hero{text-align:center;padding:5rem 1.5rem 3rem;background:linear-gradient(180deg,rgba(212,168,83,.04) 0%,transparent 100%)}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:700;margin-bottom:1rem;line-height:1.2}
.hero h1 span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.1rem;color:var(--muted);max-width:650px;margin:0 auto 2rem;line-height:1.7;font-family:-apple-system,sans-serif}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--bdr);padding:.5rem 1.2rem;border-radius:99px;font-size:.8rem;color:var(--muted);margin-bottom:2rem;font-family:-apple-system,sans-serif}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.stats-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;padding:2rem 0;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);margin:1rem 0 3rem}
.stat{text-align:center}
.stat-val{font-size:2rem;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-lbl{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-family:-apple-system,sans-serif}
h2.section-title{font-size:1.8rem;text-align:center;margin-bottom:2rem}
.catalog{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:2rem;padding:3rem 0}
.book-card{background:var(--s1);border:1px solid var(--bdr);border-radius:12px;overflow:hidden;transition:transform .2s,box-shadow .2s}
.book-card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(212,168,83,.08)}
.book-cover{height:180px;display:flex;flex-direction:column;justify-content:space-between;padding:1.2rem;position:relative}
.book-genre{background:rgba(0,0,0,.5);color:#fff;padding:.3rem .8rem;border-radius:20px;font-size:.7rem;text-transform:uppercase;letter-spacing:1px;align-self:flex-start;font-family:-apple-system,sans-serif}
.book-title-overlay{color:#fff;font-size:1rem;font-weight:700;text-shadow:0 2px 8px rgba(0,0,0,.7);line-height:1.3}
.book-info{padding:1.2rem}
.book-info h3{font-size:1rem;margin-bottom:.3rem;line-height:1.3}
.book-meta{font-size:.85rem;color:var(--muted);margin-bottom:.8rem;font-family:-apple-system,sans-serif}
.book-stats{display:flex;gap:1rem;font-size:.78rem;color:var(--muted);margin-bottom:.6rem;font-family:-apple-system,sans-serif}
.book-pricing{display:flex;gap:1rem;margin-bottom:.5rem;font-family:-apple-system,sans-serif}
.kindle-price{background:rgba(245,158,11,.15);color:var(--amber);padding:.2rem .6rem;border-radius:6px;font-size:.8rem;font-weight:600}
.paper-price{background:rgba(16,185,129,.1);color:var(--green);padding:.2rem .6rem;border-radius:6px;font-size:.8rem;font-weight:600}
.book-ids{font-size:.72rem;color:var(--muted);margin-bottom:.8rem;font-family:monospace}
.book-ids span{margin-right:.8rem}
.btn{display:inline-block;padding:.55rem 1.4rem;border-radius:8px;font-weight:600;font-size:.85rem;transition:all .2s;border:none;cursor:pointer;font-family:-apple-system,sans-serif}
.btn-buy{background:var(--grad);color:#000}
.btn-buy:hover{opacity:.9;transform:translateY(-1px)}
.footer{text-align:center;padding:3rem 1.5rem;border-top:1px solid var(--bdr);margin-top:3rem;font-family:-apple-system,sans-serif}
.footer p{color:var(--muted);font-size:.8rem;line-height:1.8}
.kdp-badge{display:inline-flex;align-items:center;gap:.4rem;background:var(--s2);border:1px solid var(--bdr);padding:.4rem 1rem;border-radius:8px;font-size:.75rem;color:var(--muted);margin-top:1rem}
@media(max-width:600px){.catalog{grid-template-columns:1fr}.stats-bar{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<nav>
  <div class="logo">📚 Oliver Gates</div>
  <div class="nav-links">
    <a href="#catalog">Catalog</a>
    <a href="#about">About</a>
    <a href="/api/catalog">API</a>
    <a href="https://darcloud.host">DarCloud</a>
  </div>
</nav>
<div class="container">
  <section class="hero">
    <div class="hero-badge"><span class="dot"></span> AI-Powered Publishing • Live on Amazon KDP</div>
    <h1>Books by <span>Oliver Gates</span></h1>
    <p>Original, AI-crafted knowledge spanning Islamic Finance, Technology, Business, Cryptocurrency, Self-Help, and Programming. Published by Dar Al-Nas Publishing™ across 13 global Amazon marketplaces.</p>
  </section>
  <div class="stats-bar">
    <div class="stat"><div class="stat-val">${liveBooks}</div><div class="stat-lbl">Books Live</div></div>
    <div class="stat"><div class="stat-val">${totalWords.toLocaleString()}</div><div class="stat-lbl">Words Written</div></div>
    <div class="stat"><div class="stat-val">13</div><div class="stat-lbl">Marketplaces</div></div>
    <div class="stat"><div class="stat-val">12</div><div class="stat-lbl">AI Writing Bots</div></div>
  </div>
  <h2 id="catalog" class="section-title">📖 Book Catalog</h2>
  <div class="catalog">${bookCards || '<p style="text-align:center;color:var(--muted)">No books published yet. Engine is generating content...</p>'}</div>
  <section id="about" style="padding:3rem 0">
    <h2 class="section-title">About Oliver Gates</h2>
    <p style="max-width:700px;margin:0 auto;text-align:center;color:var(--muted);line-height:1.8;font-family:-apple-system,sans-serif">
      Oliver Gates is an AI-powered author backed by a team of 12 specialized writing bots.
      Each book is generated with original content, verified through multi-layer plagiarism detection,
      and published across Amazon's 13 global KDP marketplaces. Part of the QuranChain™ / DarCloud™ ecosystem,
      published by Dar Al-Nas Publishing™.
    </p>
  </section>
</div>
<div class="footer">
  <p>© ${new Date().getFullYear()} Oliver Gates • Dar Al-Nas Publishing™ • QuranChain™ • DarCloud™</p>
  <p>KDP Account: A2xq3izrirvour • 30% Founder Royalty • All Rights Reserved</p>
  <div class="kdp-badge">🏪 Amazon KDP Publisher ID: A2xq3izrirvour</div>
</div>
</body></html>`;
}

function genreColor(genre) {
  const colors = {
    islamic_finance: '#d4a853,#8b6914',
    technology: '#0096ff,#0054b4',
    self_help: '#10b981,#047857',
    business: '#8b5cf6,#6d28d9',
    cryptocurrency: '#f59e0b,#d97706',
    ai_technology: '#06b6d4,#0891b2',
    programming: '#ef4444,#dc2626',
  };
  return colors[genre] || '#6366f1,#4f46e5';
}

function esc(s) { return (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ═══════════════════════════════════════════════════════════
// Worker Handler
// ═══════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ── API proxy routes — forward to origin engine ──
    if (path.startsWith('/api/')) {
      try {
        const origin = env.ENGINE_ORIGIN || 'http://localhost:9120';
        const apiPath = path.replace('/api/', '/api/publishing/');
        const originUrl = `${origin}${apiPath}`;
        
        const originReq = new Request(originUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== 'GET' ? request.body : undefined,
        });

        const resp = await fetch(originReq);
        const body = await resp.text();
        return new Response(body, {
          status: resp.status,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({
          error: 'Origin unreachable',
          detail: e.message,
          hint: 'Publishing engine may be starting up',
        }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
    }

    // ── Health endpoint ──
    if (path === '/health') {
      return new Response(JSON.stringify({
        service: 'oliver-gates-publishing-edge',
        status: 'healthy',
        author: env.AUTHOR_NAME || 'Oliver Gates',
        kdp_account: env.KDP_ACCOUNT_ID || 'A2xq3izrirvour',
        worker: 'cloudflare-edge',
        ts: new Date().toISOString(),
      }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // ── Landing page with live catalog ──
    try {
      const origin = env.ENGINE_ORIGIN || 'http://localhost:9120';
      const resp = await fetch(`${origin}/api/publishing/catalog`);
      const data = await resp.json();
      const catalog = data.catalog || [];

      const html = buildLanding(catalog, {});
      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS },
      });
    } catch (e) {
      // Fallback: show page with empty catalog
      const html = buildLanding([], {});
      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS },
      });
    }
  },
};
