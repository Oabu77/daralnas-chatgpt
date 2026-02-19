/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * Dar Al Nas Real Estate — Cloudflare Edge Worker
 * Routes: realestate.darcloud.host/*, property.darcloud.host/*
 * Serves landing page + proxies to origin (localhost:9020)
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
};

function jsonResponse(data, status = 200, extra = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra }
    });
}

const LANDING = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dar Al Nas — Zero-Riba Home Ownership</title>
<meta name="description" content="Bank-owned homes in 31 USA Muslim cities. $5,000 down = auto-approved. Zero riba. HWC Members Only.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>">
<style>
:root{--bg:#0d1209;--s1:#141f10;--s2:#1b2a16;--bdr:#2a4020;--emerald:#2ecc71;--green:#22c55e;--gold:#d4af37;--brown:#8b6914;--txt:#e8f0e0;--muted:#8a9a78;--grad:linear-gradient(135deg,#2ecc71,#27ae60)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--txt);overflow-x:hidden}
a{color:var(--emerald);text-decoration:none}
.container{max-width:1100px;margin:0 auto;padding:0 1.5rem}
nav{position:sticky;top:0;z-index:100;background:rgba(13,18,9,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);padding:.75rem 2rem;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:1.3rem;font-weight:700;color:var(--emerald)}
.nav-links{display:flex;gap:1.5rem;font-size:.85rem}
.nav-links a{color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--emerald)}
.btn{display:inline-block;padding:.65rem 1.6rem;border-radius:8px;font-weight:600;font-size:.9rem;transition:all .3s;border:none;cursor:pointer}
.btn-green{background:var(--grad);color:#000}
.btn-green:hover{opacity:.9;transform:translateY(-1px)}
.btn-outline{border:1px solid var(--emerald);color:var(--emerald);background:transparent}
.btn-outline:hover{background:rgba(46,204,113,.1)}
.hero{text-align:center;padding:5rem 1.5rem 4rem;position:relative}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(46,204,113,.06) 0%,transparent 60%);pointer-events:none}
.bismillah{font-size:1.3rem;color:var(--gold);margin-bottom:1rem;font-style:italic}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--bdr);padding:.4rem 1rem;border-radius:99px;font-size:.8rem;color:var(--muted);margin-bottom:2rem}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--emerald)}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1.15;margin-bottom:1.5rem}
.hero h1 span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.05rem;color:var(--muted);max-width:620px;margin:0 auto 2rem;line-height:1.7}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.approval-box{max-width:500px;margin:3rem auto 0;background:var(--s1);border:2px solid var(--emerald);border-radius:14px;padding:2rem;text-align:center}
.approval-box h2{font-size:1.5rem;color:var(--emerald);margin-bottom:.5rem}
.approval-box .big{font-size:3rem;font-weight:800;color:var(--gold);margin:.5rem 0}
.approval-box p{color:var(--muted);font-size:.9rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;padding:3rem 0}
.stat{text-align:center;padding:1.5rem;background:var(--s1);border:1px solid var(--bdr);border-radius:10px}
.stat-val{font-size:2rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-lbl{font-size:.8rem;color:var(--muted);margin-top:.2rem}
.section{padding:4rem 0}
.section-head{text-align:center;margin-bottom:2.5rem}
.section-head h2{font-size:1.8rem;font-weight:700;margin-bottom:.75rem}
.section-head p{color:var(--muted);max-width:500px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem}
.card{background:var(--s1);border:1px solid var(--bdr);border-radius:12px;padding:1.75rem;transition:all .3s}
.card:hover{border-color:var(--emerald);transform:translateY(-2px)}
.card-icon{font-size:2rem;margin-bottom:.75rem}
.card h3{font-size:1rem;font-weight:600;color:var(--emerald);margin-bottom:.4rem}
.card p{color:var(--muted);font-size:.85rem;line-height:1.6}
.cities-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.5rem;margin-top:1.5rem}
.city{padding:.5rem .75rem;background:var(--s2);border:1px solid var(--bdr);border-radius:6px;font-size:.8rem;color:var(--muted);text-align:center}
.cta{text-align:center;padding:4rem 1.5rem;background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
.cta h2{font-size:1.8rem;margin-bottom:1rem}
.cta p{color:var(--muted);margin-bottom:2rem}
footer{padding:2rem;border-top:1px solid var(--bdr);text-align:center}
.footer-links{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:1rem}
.footer-links a{color:var(--muted);font-size:.85rem}
.footer-copy{color:var(--muted);font-size:.78rem}
@media(max-width:768px){.nav-links{display:none}.hero h1{font-size:1.8rem}.grid{grid-template-columns:1fr}.cities-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}}
</style>
</head>
<body>
<nav>
  <div class="logo">🏠 Dar Al Nas</div>
  <div class="nav-links"><a href="#cities">Markets</a><a href="https://halalwealthclub.darcloud.host">HWC</a><a href="https://darcloud.host">DarCloud</a></div>
  <a class="btn btn-green" href="https://halalwealthclub.darcloud.host">Join HWC</a>
</nav>
<section class="hero">
  <p class="bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
  <div class="hero-badge"><span class="dot"></span> HWC Members Only — Private Fund</div>
  <h1>Own Your <span>Dream Home</span> with $5,000 Down</h1>
  <p>Bank-owned properties in 31 major USA Muslim communities. Auto-approved with just $5,000 down payment. Zero riba. Blockchain smart contracts. Halal Wealth Club members only.</p>
  <div class="hero-btns">
    <a class="btn btn-green" href="https://halalwealthclub.darcloud.host">Apply Now</a>
    <a class="btn btn-outline" href="/api/realestate/markets">Browse Markets</a>
  </div>
  <div class="approval-box">
    <h2>Auto-Approval Program</h2>
    <div class="big">$5,000</div>
    <p>Down payment = auto-approved for full property purchase price<br>Smart contract generated • 30-day funding window • Stripe subscription mortgage</p>
  </div>
</section>
<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-val">31</div><div class="stat-lbl">USA Cities</div></div>
    <div class="stat"><div class="stat-val">$5K</div><div class="stat-lbl">Down Payment</div></div>
    <div class="stat"><div class="stat-val">0%</div><div class="stat-lbl">Riba</div></div>
    <div class="stat"><div class="stat-val">30d</div><div class="stat-lbl">Funding Window</div></div>
    <div class="stat"><div class="stat-val">10+</div><div class="stat-lbl">Bank-Owned Homes</div></div>
  </div>
</div>
<section class="section">
  <div class="container">
    <div class="section-head"><h2>How It Works</h2><p>From application to keys in hand — 100% halal.</p></div>
    <div class="grid">
      <div class="card"><div class="card-icon">1️⃣</div><h3>Join HWC</h3><p>Become a Halal Wealth Club member. Free membership. Access all financial services.</p></div>
      <div class="card"><div class="card-icon">2️⃣</div><h3>Pay $5,000 Down</h3><p>Universal down payment via Stripe. Auto-approved for the full purchase price immediately.</p></div>
      <div class="card"><div class="card-icon">3️⃣</div><h3>Smart Contract</h3><p>SHA-256 blockchain smart contract generated. Immutable terms. 30-day funding window.</p></div>
      <div class="card"><div class="card-icon">4️⃣</div><h3>Move In</h3><p>Automatic Stripe subscription mortgage. First payment at closing. Zero interest forever.</p></div>
    </div>
  </div>
</section>
<section id="cities" class="section" style="background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)">
  <div class="container">
    <div class="section-head"><h2>31 USA Muslim Markets</h2><p>Bank-owned properties sourced from Zillow & Redfin in every major Muslim community.</p></div>
    <div class="cities-grid">
      <div class="city">Dearborn, MI</div><div class="city">Houston, TX</div><div class="city">Dallas, TX</div>
      <div class="city">Chicago, IL</div><div class="city">New York, NY</div><div class="city">Los Angeles, CA</div>
      <div class="city">San Francisco, CA</div><div class="city">Philadelphia, PA</div><div class="city">Detroit, MI</div>
      <div class="city">Atlanta, GA</div><div class="city">Washington, DC</div><div class="city">Minneapolis, MN</div>
      <div class="city">Columbus, OH</div><div class="city">Indianapolis, IN</div><div class="city">San Diego, CA</div>
      <div class="city">Phoenix, AZ</div><div class="city">Tampa, FL</div><div class="city">Orlando, FL</div>
      <div class="city">Raleigh, NC</div><div class="city">Charlotte, NC</div><div class="city">Nashville, TN</div>
      <div class="city">Sacramento, CA</div><div class="city">Portland, OR</div><div class="city">Seattle, WA</div>
      <div class="city">Denver, CO</div><div class="city">Austin, TX</div><div class="city">San Antonio, TX</div>
      <div class="city">Jacksonville, FL</div><div class="city">Bridgeview, IL</div><div class="city">Paterson, NJ</div>
      <div class="city">Brooklyn, NY</div>
    </div>
  </div>
</section>
<section class="cta">
  <h2>Your Halal Home Awaits</h2>
  <p>Join the Halal Wealth Club and browse bank-owned properties in your city today.</p>
  <div class="hero-btns">
    <a class="btn btn-green" href="https://halalwealthclub.darcloud.host">Join HWC — Free</a>
    <a class="btn btn-outline" href="/api/realestate/properties">Browse All Properties</a>
  </div>
</section>
<footer>
  <div class="footer-links">
    <a href="https://darcloud.host">DarCloud</a><a href="https://halalwealthclub.darcloud.host">HWC</a>
    <a href="https://blockchain.darcloud.host">Blockchain</a><a href="https://darcloud.net">DarCloud.net</a>
  </div>
  <p class="footer-copy">© 2026 Dar Al Nas by Omar Abu Nadi. Private HWC Fund. 30% Founder Royalty Immutable.</p>
</footer>
</body></html>`;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // CORS pre-flight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        // Health check (JSON)
        if (url.pathname === '/health') {
            return jsonResponse({
                service: 'darcloud-realestate',
                status: 'healthy',
                edge: true,
                founderRoyalty: env.FOUNDER_ROYALTY || '0.30',
                timestamp: new Date().toISOString()
            });
        }

        // Landing page at root
        if (url.pathname === '/') {
            return new Response(LANDING, { headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS_HEADERS } });
        }

        // Property detail shortcut: property.darcloud.host/{id}
        if (url.hostname === 'property.darcloud.host' && url.pathname.match(/^\/prop_/)) {
            const propId = url.pathname.slice(1);
            url.pathname = `/api/realestate/property/${propId}`;
        }

        // Proxy all /api/realestate/* to origin
        if (url.pathname.startsWith('/api/realestate/')) {
            try {
                const originUrl = `${env.ORIGIN_URL || 'http://localhost:9020'}${url.pathname}${url.search}`;
                const originResponse = await fetch(originUrl, {
                    method: request.method,
                    headers: request.headers,
                    body: request.method !== 'GET' ? await request.text() : undefined
                });
                const data = await originResponse.text();
                return new Response(data, {
                    status: originResponse.status,
                    headers: {
                        'Content-Type': 'application/json',
                        ...CORS_HEADERS,
                        'X-DarCloud-Service': 'realestate',
                        'X-Founder-Royalty': env.FOUNDER_ROYALTY || '0.30'
                    }
                });
            } catch (err) {
                return jsonResponse({
                    error: 'Origin unavailable',
                    service: 'darcloud-realestate',
                    message: err.message
                }, 502);
            }
        }

        // Fallback
        return jsonResponse({
            error: 'Not Found',
            service: 'darcloud-realestate',
            hint: 'Use /api/realestate/* endpoints or /health'
        }, 404);
    }
};
