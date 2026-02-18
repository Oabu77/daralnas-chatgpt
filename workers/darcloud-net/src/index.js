/**
 * DarCloud.net — Corporate Website
 * Clean professional design for the corporate brand
 * Theme: White/navy, clean modern
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

const LANDING = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DarCloud — Cloud Infrastructure for Everyone</title>
<meta name="description" content="DarCloud.net: Enterprise cloud infrastructure, AI-powered services, and blockchain solutions. Shariah-compliant technology.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>☁️</text></svg>">
<style>
:root{--bg:#ffffff;--s1:#f8fafc;--s2:#f1f5f9;--bdr:#e2e8f0;--navy:#0f172a;--blue:#2563eb;--cyan:#0891b2;--gold:#d97706;--txt:#0f172a;--muted:#64748b;--grad:linear-gradient(135deg,#2563eb,#0891b2)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--txt)}
a{color:var(--blue);text-decoration:none}
.container{max-width:1100px;margin:0 auto;padding:0 1.5rem}

nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);padding:.75rem 2rem;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:1.4rem;font-weight:800;color:var(--navy)}
.logo span{color:var(--blue)}
.nav-links{display:flex;gap:1.5rem;font-size:.9rem}
.nav-links a{color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--blue)}
.btn{display:inline-block;padding:.6rem 1.5rem;border-radius:8px;font-weight:600;font-size:.9rem;transition:all .3s;border:none;cursor:pointer}
.btn-primary{background:var(--grad);color:#fff}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-outline{border:1px solid var(--blue);color:var(--blue);background:transparent}
.btn-outline:hover{background:rgba(37,99,235,.05)}

.hero{text-align:center;padding:6rem 1.5rem 4rem;position:relative}
.hero::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 50% 0%,rgba(37,99,235,.06) 0%,transparent 70%);pointer-events:none}
.hero h1{font-size:clamp(2.2rem,5vw,3.8rem);font-weight:800;color:var(--navy);line-height:1.15;margin-bottom:1.5rem}
.hero h1 .highlight{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.15rem;color:var(--muted);max-width:640px;margin:0 auto 2.5rem;line-height:1.7}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--bdr);padding:.4rem 1rem;border-radius:99px;font-size:.8rem;color:var(--muted);margin-bottom:2rem}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:#22c55e}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1.5rem;padding:3rem 0}
.stat{text-align:center;padding:1.5rem}
.stat-value{font-size:2.5rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-label{font-size:.85rem;color:var(--muted);margin-top:.25rem}

.section{padding:5rem 0}
.section-head{text-align:center;margin-bottom:3rem}
.section-head h2{font-size:2rem;font-weight:700;color:var(--navy);margin-bottom:.75rem}
.section-head p{color:var(--muted);font-size:1rem;max-width:550px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem}
.card{background:var(--bg);border:1px solid var(--bdr);border-radius:14px;padding:2rem;transition:all .3s}
.card:hover{border-color:var(--blue);box-shadow:0 8px 30px rgba(37,99,235,.08);transform:translateY(-3px)}
.card-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1rem}
.card-icon.blue{background:rgba(37,99,235,.1)}
.card-icon.cyan{background:rgba(8,145,178,.1)}
.card-icon.gold{background:rgba(217,119,6,.1)}
.card-icon.green{background:rgba(34,197,94,.1)}
.card-icon.purple{background:rgba(139,92,246,.1)}
.card-icon.red{background:rgba(239,68,68,.1)}
.card h3{font-size:1.15rem;font-weight:600;margin-bottom:.5rem;color:var(--navy)}
.card p{color:var(--muted);font-size:.9rem;line-height:1.6}
.card-link{display:inline-block;margin-top:1rem;font-size:.85rem;font-weight:500}

.compare{background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
.compare-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem}
.compare-card{background:var(--bg);border:1px solid var(--bdr);border-radius:14px;padding:2rem;text-align:center}
.compare-card.featured{border-color:var(--blue);box-shadow:0 4px 20px rgba(37,99,235,.1)}
.compare-card h3{font-size:1.2rem;margin-bottom:.5rem}
.compare-card .price{font-size:2rem;font-weight:800;color:var(--navy);margin:.75rem 0}
.compare-card .price span{font-size:.9rem;font-weight:400;color:var(--muted)}
.compare-card ul{list-style:none;text-align:left;margin:1.5rem 0}
.compare-card li{padding:.4rem 0;font-size:.9rem;color:var(--muted)}
.compare-card li::before{content:'✓ ';color:var(--blue);font-weight:700}

.cta{text-align:center;padding:5rem 1.5rem}
.cta h2{font-size:2rem;color:var(--navy);margin-bottom:1rem}
.cta p{color:var(--muted);margin-bottom:2rem;max-width:500px;margin-left:auto;margin-right:auto}

footer{padding:3rem 2rem;border-top:1px solid var(--bdr);text-align:center;background:var(--s1)}
.footer-links{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:1rem}
.footer-links a{color:var(--muted);font-size:.85rem}
.footer-copy{color:var(--muted);font-size:.8rem}

@media(max-width:768px){.nav-links{display:none}.hero h1{font-size:2rem}.stats{grid-template-columns:repeat(2,1fr)}.grid,.compare-grid{grid-template-columns:1fr}}
</style>
</head>
<body>

<nav>
  <div class="logo">Dar<span>Cloud</span>.net</div>
  <div class="nav-links">
    <a href="#services">Services</a>
    <a href="#pricing">Pricing</a>
    <a href="https://darcloud.host">Platform</a>
    <a href="https://enterprise.darcloud.host">Enterprise</a>
    <a href="https://api.darcloud.host/api">API</a>
  </div>
  <a class="btn btn-primary" href="https://halalwealthclub.darcloud.host">Get Started</a>
</nav>

<section class="hero">
  <div class="hero-badge"><span class="dot"></span> 47 Blockchain Networks Live</div>
  <h1>Cloud Infrastructure <span class="highlight">for Everyone</span></h1>
  <p>Shariah-compliant cloud computing, AI, blockchain, and mesh networking — built for the global Muslim digital economy.</p>
  <div class="hero-btns">
    <a class="btn btn-primary" href="https://halalwealthclub.darcloud.host">Create Account</a>
    <a class="btn btn-outline" href="https://darcloud.host">Explore Platform</a>
  </div>
</section>

<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-value">99.9%</div><div class="stat-label">Uptime SLA</div></div>
    <div class="stat"><div class="stat-value">340K</div><div class="stat-label">Global Nodes</div></div>
    <div class="stat"><div class="stat-value">47</div><div class="stat-label">Chains</div></div>
    <div class="stat"><div class="stat-value">71</div><div class="stat-label">AI Agents</div></div>
    <div class="stat"><div class="stat-value">0%</div><div class="stat-label">Interest / Riba</div></div>
  </div>
</div>

<section id="services" class="section">
  <div class="container">
    <div class="section-head">
      <h2>Everything You Need</h2>
      <p>From compute to AI to blockchain — a fully halal technology stack.</p>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-icon blue">☁️</div>
        <h3>Cloud Computing</h3>
        <p>Scalable virtual machines, containers, and serverless functions running on our distributed mesh network.</p>
        <a class="card-link" href="https://darcloud.host">Learn more →</a>
      </div>
      <div class="card">
        <div class="card-icon cyan">🤖</div>
        <h3>AI & Machine Learning</h3>
        <p>71 specialized AI agents ready to deploy. GPT-4o powered assistants for every business need.</p>
        <a class="card-link" href="https://ai.darcloud.host">Explore AI →</a>
      </div>
      <div class="card">
        <div class="card-icon gold">⛓️</div>
        <h3>Blockchain Services</h3>
        <p>QuranChain network with 47 monitored chains. Gas tolls, smart contracts, Quran preservation.</p>
        <a class="card-link" href="https://blockchain.darcloud.host">Explore Chain →</a>
      </div>
      <div class="card">
        <div class="card-icon green">🍄</div>
        <h3>Mesh Networking</h3>
        <p>FungiMesh P2P with 340,000 nodes. Quantum-encrypted communication. Self-healing topology.</p>
        <a class="card-link" href="https://mesh.darcloud.host">View Mesh →</a>
      </div>
      <div class="card">
        <div class="card-icon purple">🔐</div>
        <h3>Security & Compliance</h3>
        <p>Shariah-compliant data handling. End-to-end encryption. SOC2-ready infrastructure for Islamic finance.</p>
        <a class="card-link" href="https://enterprise.darcloud.host">Security →</a>
      </div>
      <div class="card">
        <div class="card-icon red">🏠</div>
        <h3>Real Estate Platform</h3>
        <p>Dar Al Nas — zero-riba home buying. $5K down auto-approval. Bank-owned properties in 31 USA cities.</p>
        <a class="card-link" href="https://realestate.darcloud.host">Browse Homes →</a>
      </div>
    </div>
  </div>
</section>

<section id="pricing" class="section compare">
  <div class="container">
    <div class="section-head">
      <h2>Simple, Halal Pricing</h2>
      <p>No hidden fees. No interest. Just value.</p>
    </div>
    <div class="compare-grid">
      <div class="compare-card">
        <h3>Starter</h3>
        <div class="price">Free <span>/month</span></div>
        <ul>
          <li>API Access (1K req/day)</li>
          <li>1 AI Agent</li>
          <li>Basic Mesh Access</li>
          <li>Community Support</li>
        </ul>
        <a class="btn btn-outline" href="https://halalwealthclub.darcloud.host">Start Free</a>
      </div>
      <div class="compare-card featured">
        <h3>Professional</h3>
        <div class="price">$49 <span>/month</span></div>
        <ul>
          <li>Unlimited API Calls</li>
          <li>10 AI Agents</li>
          <li>Full Mesh + Blockchain</li>
          <li>Priority Support</li>
          <li>HWC Membership</li>
        </ul>
        <a class="btn btn-primary" href="https://halalwealthclub.darcloud.host">Get Pro</a>
      </div>
      <div class="compare-card">
        <h3>Enterprise</h3>
        <div class="price">Custom</div>
        <ul>
          <li>Dedicated Infrastructure</li>
          <li>Unlimited Everything</li>
          <li>SLA Guarantee</li>
          <li>Dedicated Account Manager</li>
          <li>Custom Integrations</li>
        </ul>
        <a class="btn btn-outline" href="https://enterprise.darcloud.host">Contact Sales</a>
      </div>
    </div>
  </div>
</section>

<section class="cta">
  <h2>Build Something Halal</h2>
  <p>Join thousands of businesses already running on DarCloud's Shariah-compliant infrastructure.</p>
  <div class="hero-btns">
    <a class="btn btn-primary" href="https://halalwealthclub.darcloud.host">Get Started Free</a>
    <a class="btn btn-outline" href="https://api.darcloud.host/api">Read the Docs</a>
  </div>
</section>

<footer>
  <div class="footer-links">
    <a href="https://darcloud.host">DarCloud.host</a>
    <a href="https://darcloud.net">DarCloud.net</a>
    <a href="https://blockchain.darcloud.host">Blockchain</a>
    <a href="https://mesh.darcloud.host">Mesh</a>
    <a href="https://ai.darcloud.host">AI</a>
    <a href="https://enterprise.darcloud.host">Enterprise</a>
    <a href="https://halalwealthclub.darcloud.host">HWC</a>
    <a href="https://realestate.darcloud.host">Real Estate</a>
  </div>
  <p class="footer-copy">© 2026 DarCloud by Omar Abu Nadi. All rights reserved. Shariah-compliant infrastructure.</p>
</footer>

</body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/health') return new Response(JSON.stringify({ service:'darcloud-net', status:'live' }), { headers: { 'Content-Type':'application/json', ...CORS } });
    return new Response(LANDING, { headers: { 'Content-Type':'text/html;charset=UTF-8', ...CORS } });
  }
};
