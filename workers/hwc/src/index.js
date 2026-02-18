/**
 * Halal Wealth Club — Private Islamic Membership Fund
 * Theme: Dark green, gold luxury, Islamic geometric patterns
 * Routes: halalwealthclub.darcloud.host, hwc.darcloud.host
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' };
const jsonRes = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });

const LANDING = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Halal Wealth Club — Private Islamic Wealth Management</title>
<meta name="description" content="HWC: Private membership fund. Halal banking, zero-riba home loans, $5K auto-approval, business financing. 100% Shariah-compliant.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏦</text></svg>">
<style>
:root{--bg:#060d06;--s1:#0d1a0d;--s2:#132013;--bdr:#1a3a1a;--gold:#d4af37;--gold2:#f5d76e;--green:#22c55e;--emerald:#059669;--txt:#f0ead6;--muted:#9cac8c;--grad:linear-gradient(135deg,#d4af37,#f5d76e)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;background:var(--bg);color:var(--txt);overflow-x:hidden}
a{color:var(--gold);text-decoration:none}
.container{max-width:1100px;margin:0 auto;padding:0 1.5rem}

/* Islamic pattern overlay */
body::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231a3a1a' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");pointer-events:none;z-index:0}

nav{position:sticky;top:0;z-index:100;background:rgba(6,13,6,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);padding:.75rem 2rem;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:1.3rem;font-weight:700;color:var(--gold);font-family:Georgia,serif}
.logo .sub{font-size:.7rem;color:var(--muted);display:block;letter-spacing:2px;text-transform:uppercase}
.nav-links{display:flex;gap:1.5rem;font-size:.85rem;font-family:-apple-system,sans-serif}
.nav-links a{color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--gold)}
.btn{display:inline-block;padding:.7rem 1.8rem;border-radius:6px;font-weight:600;font-size:.9rem;transition:all .3s;border:none;cursor:pointer;font-family:-apple-system,sans-serif}
.btn-gold{background:var(--grad);color:#0d1a0d}
.btn-gold:hover{opacity:.9;transform:translateY(-1px)}
.btn-outline{border:1px solid var(--gold);color:var(--gold);background:transparent}
.btn-outline:hover{background:rgba(212,175,55,.1)}

.hero{text-align:center;padding:6rem 1.5rem 4rem;position:relative;z-index:1}
.hero::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(212,175,55,.08) 0%,transparent 70%);pointer-events:none}
.bismillah{font-size:1.8rem;color:var(--gold);margin-bottom:1rem}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--bdr);padding:.4rem 1rem;border-radius:99px;font-size:.8rem;color:var(--muted);margin-bottom:2rem;font-family:-apple-system,sans-serif}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--gold);animation:glow 2s infinite}
@keyframes glow{0%,100%{box-shadow:0 0 4px var(--gold)}50%{box-shadow:0 0 12px var(--gold)}}
.hero h1{font-size:clamp(2.2rem,5vw,3.8rem);font-weight:700;line-height:1.15;margin-bottom:1.5rem;color:var(--txt)}
.hero h1 span{color:var(--gold)}
.hero p{font-size:1.1rem;color:var(--muted);max-width:600px;margin:0 auto 2.5rem;line-height:1.8;font-family:-apple-system,sans-serif}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}

.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem;padding:4rem 0;position:relative;z-index:1}
.card{background:var(--s1);border:1px solid var(--bdr);border-radius:12px;padding:2rem;transition:all .3s}
.card:hover{border-color:var(--gold);transform:translateY(-3px);box-shadow:0 8px 30px rgba(212,175,55,.08)}
.card-top{display:flex;align-items:center;gap:.75rem;margin-bottom:1rem}
.card-icon{font-size:2rem}
.card h3{font-size:1.15rem;font-weight:600;color:var(--gold)}
.card p{color:var(--muted);font-size:.9rem;line-height:1.7;font-family:-apple-system,sans-serif}
.card-highlight{background:var(--s2);padding:.75rem;border-radius:8px;margin-top:1rem;font-size:.85rem;color:var(--green);font-family:-apple-system,sans-serif}

.section{padding:5rem 0;position:relative;z-index:1}
.section-head{text-align:center;margin-bottom:3rem}
.section-head h2{font-size:2rem;color:var(--txt);margin-bottom:.75rem}
.section-head p{color:var(--muted);max-width:550px;margin:0 auto;font-family:-apple-system,sans-serif}

.services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}
.svc{text-align:center;padding:2rem 1rem;background:var(--s1);border:1px solid var(--bdr);border-radius:12px;transition:all .2s}
.svc:hover{border-color:var(--gold)}
.svc-icon{font-size:2.5rem;margin-bottom:.75rem}
.svc h4{color:var(--gold);margin-bottom:.3rem;font-size:1rem}
.svc p{color:var(--muted);font-size:.8rem;font-family:-apple-system,sans-serif}

.trust{background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);padding:3rem 0}
.trust-grid{display:flex;justify-content:center;gap:3rem;flex-wrap:wrap;text-align:center}
.trust-item{font-family:-apple-system,sans-serif}
.trust-item .val{font-size:2rem;font-weight:700;color:var(--gold)}
.trust-item .lbl{font-size:.8rem;color:var(--muted);margin-top:.2rem}

.cta{text-align:center;padding:5rem 1.5rem;position:relative;z-index:1}
.cta h2{font-size:2rem;margin-bottom:1rem}
.cta p{color:var(--muted);margin-bottom:2rem;font-family:-apple-system,sans-serif}

footer{padding:3rem 2rem;border-top:1px solid var(--bdr);text-align:center;position:relative;z-index:1}
.footer-links{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:1rem;font-family:-apple-system,sans-serif}
.footer-links a{color:var(--muted);font-size:.85rem}
.footer-copy{color:var(--muted);font-size:.8rem;font-family:-apple-system,sans-serif}

@media(max-width:768px){.nav-links{display:none}.hero h1{font-size:2rem}.features,.services-grid{grid-template-columns:1fr}}
</style>
</head>
<body>

<nav>
  <div class="logo">🏦 Halal Wealth Club<span class="sub">Private Membership Fund</span></div>
  <div class="nav-links">
    <a href="#services">Services</a>
    <a href="https://realestate.darcloud.host">Real Estate</a>
    <a href="https://darcloud.host">DarCloud</a>
  </div>
  <a class="btn btn-gold" href="#join">Apply for Membership</a>
</nav>

<section class="hero">
  <p class="bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
  <div class="hero-badge"><span class="dot"></span> Private Fund — Members Only</div>
  <h1>Build <span>Halal Wealth</span> With Confidence</h1>
  <p>Private Islamic membership fund — checking accounts, savings, home loans with $5,000 auto-approval, business financing, and construction loans. Zero riba. 100% Shariah-compliant.</p>
  <div class="hero-btns">
    <a class="btn btn-gold" href="#join">Apply Now — $0 Membership Fee</a>
    <a class="btn btn-outline" href="https://realestate.darcloud.host">Browse Properties</a>
  </div>
</section>

<div class="container">
  <div class="features">
    <div class="card">
      <div class="card-top"><div class="card-icon">🏠</div><h3>Home Loans</h3></div>
      <p>$5,000 down payment = auto-approved for full property purchase. Bank-owned homes in 31 major USA Muslim communities. Smart contract with 30-day funding window.</p>
      <div class="card-highlight">✓ $5K DOWN → AUTO-APPROVED FOR FULL PRICE</div>
    </div>
    <div class="card">
      <div class="card-top"><div class="card-icon">💳</div><h3>Checking Account</h3></div>
      <p>Full-featured halal checking account. No monthly fees. No minimum balance. No overdraft interest charges. Free debit card with cashback.</p>
      <div class="card-highlight">✓ $0 Fees — True Halal Banking</div>
    </div>
    <div class="card">
      <div class="card-top"><div class="card-icon">📈</div><h3>Savings & Growth</h3></div>
      <p>Profit-sharing savings accounts based on Islamic Mudarabah principles. Your money works in halal investments — no interest, only shared profit.</p>
      <div class="card-highlight">✓ Mudarabah Profit-Sharing Model</div>
    </div>
    <div class="card">
      <div class="card-top"><div class="card-icon">🏢</div><h3>Business Loans</h3></div>
      <p>Musharakah business financing. We invest alongside you. No interest — profit & loss shared fairly according to Shariah principles.</p>
      <div class="card-highlight">✓ Partnership-Based Financing</div>
    </div>
    <div class="card">
      <div class="card-top"><div class="card-icon">🏗️</div><h3>Construction Loans</h3></div>
      <p>Istisna construction financing. Build your dream home or commercial property with milestone-based funding and zero interest.</p>
      <div class="card-highlight">✓ Milestone-Based — Zero Riba</div>
    </div>
    <div class="card">
      <div class="card-top"><div class="card-icon">🔒</div><h3>Smart Contracts</h3></div>
      <p>Every transaction secured by SHA-256 blockchain smart contracts. Immutable terms. Transparent conditions. DarCloud-powered.</p>
      <div class="card-highlight">✓ Blockchain-Verified Agreements</div>
    </div>
  </div>
</div>

<div class="trust">
  <div class="container">
    <div class="trust-grid">
      <div class="trust-item"><div class="val">31</div><div class="lbl">USA Muslim Cities</div></div>
      <div class="trust-item"><div class="val">$5K</div><div class="lbl">Auto-Approval</div></div>
      <div class="trust-item"><div class="val">0%</div><div class="lbl">Interest / Riba</div></div>
      <div class="trust-item"><div class="val">30</div><div class="lbl">Day Funding Window</div></div>
      <div class="trust-item"><div class="val">7</div><div class="lbl">Halal Products</div></div>
      <div class="trust-item"><div class="val">2%</div><div class="lbl">Zakat Allocation</div></div>
    </div>
  </div>
</div>

<section id="services" class="section">
  <div class="container">
    <div class="section-head">
      <h2>Complete Halal Financial Services</h2>
      <p>Every service designed around Islamic principles — no shortcuts, no compromise.</p>
    </div>
    <div class="services-grid">
      <div class="svc"><div class="svc-icon">💰</div><h4>Murabaha</h4><p>Cost-plus financing</p></div>
      <div class="svc"><div class="svc-icon">🤝</div><h4>Musharakah</h4><p>Joint venture partnership</p></div>
      <div class="svc"><div class="svc-icon">📊</div><h4>Mudarabah</h4><p>Profit-sharing investment</p></div>
      <div class="svc"><div class="svc-icon">🏗️</div><h4>Istisna</h4><p>Construction financing</p></div>
      <div class="svc"><div class="svc-icon">🏠</div><h4>Ijarah</h4><p>Lease-to-own housing</p></div>
      <div class="svc"><div class="svc-icon">💎</div><h4>Sukuk</h4><p>Islamic bonds</p></div>
      <div class="svc"><div class="svc-icon">🕌</div><h4>Waqf</h4><p>Charitable endowments</p></div>
      <div class="svc"><div class="svc-icon">🌙</div><h4>Zakat</h4><p>2% auto-calculated</p></div>
    </div>
  </div>
</section>

<section id="join" class="cta">
  <h2>Ready to Join the Club?</h2>
  <p>Membership is free. Access every halal financial product we offer. Start with a $5,000 down payment on your new home.</p>
  <div class="hero-btns">
    <a class="btn btn-gold" href="https://realestate.darcloud.host">Browse Properties</a>
    <a class="btn btn-outline" href="https://darcloud.host">Back to DarCloud</a>
  </div>
</section>

<footer>
  <div class="footer-links">
    <a href="https://darcloud.host">DarCloud</a>
    <a href="https://darcloud.net">DarCloud.net</a>
    <a href="https://realestate.darcloud.host">Real Estate</a>
    <a href="https://blockchain.darcloud.host">Blockchain</a>
    <a href="https://enterprise.darcloud.host">Enterprise</a>
  </div>
  <p class="footer-copy">© 2026 Halal Wealth Club by Omar Abu Nadi. Private Membership Fund. 30% Founder Royalty Immutable.<br>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
</footer>

</body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/health') return jsonRes({ service: 'hwc-landing', status: 'live', members: 'active' });

    // Proxy API calls to origin HWC bot
    if (url.pathname.startsWith('/api/')) {
      const origin = env.ORIGIN_URL || 'http://localhost:3000';
      const target = origin + url.pathname + url.search;
      try {
        const res = await fetch(target, { method: request.method, headers: request.headers, body: ['GET','HEAD'].includes(request.method) ? null : request.body });
        return new Response(res.body, { status: res.status, headers: { ...Object.fromEntries(res.headers), ...CORS } });
      } catch (e) { return jsonRes({ error: 'Origin unreachable', detail: e.message }, 502); }
    }

    return new Response(LANDING, { headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS } });
  }
};
