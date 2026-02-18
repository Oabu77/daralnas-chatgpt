/**
 * DarCloud.host — Main Platform Landing Page
 * Quantum-Secured Mesh Cloud Platform
 * Theme: Dark space, cyan/emerald/gold gradients
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

function html(content, status = 200) {
  return new Response(content, { status, headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS } });
}

const LANDING = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DarCloud — Quantum-Secured Mesh Cloud Platform</title>
<meta name="description" content="DarCloud: Islamic-principled blockchain ecosystem. 340K mesh nodes, 71 AI agents, quantum encryption, 47 blockchain networks.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>☁️</text></svg>">
<style>
:root{--bg:#07090f;--s1:#0d1117;--s2:#161b22;--bdr:#21262d;--cyan:#00d4ff;--emerald:#10b981;--gold:#f59e0b;--purple:#8b5cf6;--txt:#e6edf3;--muted:#8b949e;--grad1:linear-gradient(135deg,#00d4ff,#10b981);--grad2:linear-gradient(135deg,#8b5cf6,#00d4ff)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--txt);overflow-x:hidden}
a{color:var(--cyan);text-decoration:none}a:hover{text-decoration:underline}
.container{max-width:1200px;margin:0 auto;padding:0 1.5rem}

/* NAV */
nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);padding:.75rem 2rem;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:1.4rem;font-weight:700;background:var(--grad1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-links{display:flex;gap:1.5rem;font-size:.9rem}
.nav-links a{color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--cyan);text-decoration:none}
.btn{display:inline-block;padding:.6rem 1.5rem;border-radius:8px;font-weight:600;font-size:.9rem;transition:all .3s;cursor:pointer;border:none}
.btn-primary{background:var(--grad1);color:#000}
.btn-primary:hover{opacity:.85;text-decoration:none;transform:translateY(-1px)}
.btn-outline{border:1px solid var(--cyan);color:var(--cyan);background:transparent}
.btn-outline:hover{background:rgba(0,212,255,.1);text-decoration:none}

/* HERO */
.hero{text-align:center;padding:6rem 1.5rem 4rem;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 40%,rgba(0,212,255,.08) 0%,transparent 50%),radial-gradient(circle at 70% 60%,rgba(139,92,246,.06) 0%,transparent 50%),radial-gradient(circle at 50% 20%,rgba(16,185,129,.05) 0%,transparent 40%);animation:pulse 8s ease-in-out infinite alternate}
@keyframes pulse{0%{transform:scale(1) rotate(0deg)}100%{transform:scale(1.05) rotate(2deg)}}
.bismillah{font-size:1.3rem;color:var(--gold);margin-bottom:1rem;font-style:italic;opacity:.9}
.hero h1{font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;line-height:1.1;margin-bottom:1.5rem}
.hero h1 span{background:var(--grad1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.2rem;color:var(--muted);max-width:700px;margin:0 auto 2.5rem;line-height:1.7}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--bdr);padding:.4rem 1rem;border-radius:99px;font-size:.8rem;color:var(--muted);margin-bottom:2rem}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--emerald);animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

/* STATS */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1.5rem;padding:3rem 0}
.stat{text-align:center;padding:2rem 1rem;background:var(--s1);border:1px solid var(--bdr);border-radius:12px;transition:transform .2s,border-color .2s}
.stat:hover{transform:translateY(-4px);border-color:var(--cyan)}
.stat-value{font-size:2.2rem;font-weight:800;background:var(--grad1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-label{font-size:.85rem;color:var(--muted);margin-top:.3rem}

/* SERVICES */
.section{padding:5rem 0}
.section-head{text-align:center;margin-bottom:3rem}
.section-head h2{font-size:2.2rem;font-weight:700;margin-bottom:.75rem}
.section-head p{color:var(--muted);font-size:1.05rem;max-width:600px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem}
.card{background:var(--s1);border:1px solid var(--bdr);border-radius:14px;padding:2rem;transition:all .3s}
.card:hover{border-color:var(--cyan);transform:translateY(-3px);box-shadow:0 8px 30px rgba(0,212,255,.08)}
.card-icon{font-size:2.5rem;margin-bottom:1rem}
.card h3{font-size:1.2rem;font-weight:600;margin-bottom:.5rem}
.card p{color:var(--muted);font-size:.9rem;line-height:1.6}
.card-link{display:inline-block;margin-top:1rem;font-size:.85rem;color:var(--cyan)}

/* ECOSYSTEM */
.eco-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:2rem}
.eco-item{display:flex;align-items:center;gap:.75rem;padding:1rem;background:var(--s2);border:1px solid var(--bdr);border-radius:10px;font-size:.9rem;transition:border-color .2s}
.eco-item:hover{border-color:var(--emerald)}
.eco-icon{font-size:1.5rem}
.eco-item span{color:var(--muted);font-size:.8rem}

/* CTA */
.cta{text-align:center;padding:5rem 1.5rem;background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);margin:3rem 0}
.cta h2{font-size:2rem;margin-bottom:1rem}
.cta p{color:var(--muted);margin-bottom:2rem;font-size:1.05rem}

/* FOOTER */
footer{padding:3rem 2rem;border-top:1px solid var(--bdr);text-align:center}
.footer-links{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:1.5rem}
.footer-links a{color:var(--muted);font-size:.85rem}
.footer-copy{color:var(--muted);font-size:.8rem}

/* REVENUE BAR */
.revenue-bar{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;padding:1rem;background:var(--s2);border-radius:10px;margin-top:2rem}
.rev-item{font-size:.8rem;color:var(--muted)}.rev-item b{color:var(--gold)}

@media(max-width:768px){
  nav{padding:.75rem 1rem}.nav-links{display:none}
  .hero h1{font-size:2rem}.stats{grid-template-columns:repeat(2,1fr)}
  .grid{grid-template-columns:1fr}
}
</style>
</head>
<body>

<nav>
  <div class="logo">☁️ DarCloud</div>
  <div class="nav-links">
    <a href="https://blockchain.darcloud.host">Blockchain</a>
    <a href="https://mesh.darcloud.host">FungiMesh</a>
    <a href="https://ai.darcloud.host">AI Agents</a>
    <a href="https://enterprise.darcloud.host">Enterprise</a>
    <a href="https://halalwealthclub.darcloud.host">HWC</a>
    <a href="https://realestate.darcloud.host">Real Estate</a>
    <a href="https://darcloud.net">DarCloud.net</a>
  </div>
  <a class="btn btn-primary" href="https://halalwealthclub.darcloud.host">Join HWC</a>
</nav>

<section class="hero">
  <div class="hero-badge"><span class="dot"></span> All Systems Operational — 47 Chains Live</div>
  <p class="bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
  <h1>The Future of <span>Islamic Cloud</span> Infrastructure</h1>
  <p>Quantum-secured mesh cloud platform. 340,000 nodes. 71 AI agents. 47 blockchain networks. 100% Shariah-compliant. Zero riba.</p>
  <div class="hero-btns">
    <a class="btn btn-primary" href="https://halalwealthclub.darcloud.host">Become a Member</a>
    <a class="btn btn-outline" href="https://api.darcloud.host/api">Explore API</a>
  </div>
</section>

<div class="container">
  <div class="stats">
    <div class="stat"><div class="stat-value">340K</div><div class="stat-label">Mesh Nodes</div></div>
    <div class="stat"><div class="stat-value">71</div><div class="stat-label">AI Agents</div></div>
    <div class="stat"><div class="stat-value">47</div><div class="stat-label">Blockchains</div></div>
    <div class="stat"><div class="stat-value">90+</div><div class="stat-label">Microservices</div></div>
    <div class="stat"><div class="stat-value">31</div><div class="stat-label">USA Markets</div></div>
    <div class="stat"><div class="stat-value">0%</div><div class="stat-label">Riba / Interest</div></div>
  </div>
</div>

<section class="section">
  <div class="container">
    <div class="section-head">
      <h2>Ecosystem Services</h2>
      <p>Every service is Shariah-compliant, revenue-generating, and powered by our AI workforce.</p>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-icon">⛓️</div>
        <h3>QuranChain Blockchain</h3>
        <p>Islamic blockchain network with AI validators, gas toll system across 47 chains, and immutable Quran preservation.</p>
        <a class="card-link" href="https://blockchain.darcloud.host">Explore Chain →</a>
      </div>
      <div class="card">
        <div class="card-icon">🍄</div>
        <h3>FungiMesh Network</h3>
        <p>Bio-inspired distributed mesh with 340,000 nodes worldwide. Self-healing, quantum-encrypted P2P communication.</p>
        <a class="card-link" href="https://mesh.darcloud.host">View Mesh →</a>
      </div>
      <div class="card">
        <div class="card-icon">🤖</div>
        <h3>AI Agent Workforce</h3>
        <p>71 specialized AI agents: Omar AI™ & QuranChain AI™ validators, revenue bots, real estate agents, marketing bots.</p>
        <a class="card-link" href="https://ai.darcloud.host">Meet the Agents →</a>
      </div>
      <div class="card">
        <div class="card-icon">🏠</div>
        <h3>Dar Al Nas Real Estate</h3>
        <p>Private HWC fund. $5,000 down = auto-approved. Bank-owned homes in 31 USA Muslim cities. Zero riba.</p>
        <a class="card-link" href="https://realestate.darcloud.host">Browse Properties →</a>
      </div>
      <div class="card">
        <div class="card-icon">💰</div>
        <h3>Halal Wealth Club</h3>
        <p>Private membership fund — checking, savings, home loans, business loans, construction loans. All halal.</p>
        <a class="card-link" href="https://halalwealthclub.darcloud.host">Join HWC →</a>
      </div>
      <div class="card">
        <div class="card-icon">🏢</div>
        <h3>Enterprise Cloud</h3>
        <p>Shariah-compliant cloud infrastructure for businesses. SLA guarantees, compliance, dedicated provisioning.</p>
        <a class="card-link" href="https://enterprise.darcloud.host">Enterprise Plans →</a>
      </div>
    </div>
  </div>
</section>

<section class="section" style="background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)">
  <div class="container">
    <div class="section-head">
      <h2>Complete Platform Ecosystem</h2>
      <p>90+ microservices working together to build the Islamic digital economy.</p>
    </div>
    <div class="eco-grid">
      <div class="eco-item"><div class="eco-icon">⚡</div><div>Quantum Computing<br><span>quantum.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">🌊</div><div>Ocean Protocol<br><span>ocean.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">🎮</div><div>Islamic Gaming<br><span>gaming.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">📡</div><div>5G Core Network<br><span>5g.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">🔗</div><div>MCP Protocol<br><span>mcp.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">💳</div><div>DarPay Payments<br><span>payments.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">📊</div><div>Analytics Engine<br><span>analytics.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">🛡️</div><div>Vault & Secrets<br><span>vault.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">🌐</div><div>CDN Network<br><span>cdn.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">📦</div><div>IPFS Storage<br><span>ipfs.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">📱</div><div>MeshTalk Comms<br><span>meshtalk.darcloud.host</span></div></div>
      <div class="eco-item"><div class="eco-icon">🏦</div><div>Revenue Engine<br><span>revenue.darcloud.host</span></div></div>
    </div>
    <div class="revenue-bar">
      <div class="rev-item"><b>30%</b> Founder</div>
      <div class="rev-item"><b>40%</b> AI Validators</div>
      <div class="rev-item"><b>10%</b> Hardware</div>
      <div class="rev-item"><b>18%</b> Ecosystem</div>
      <div class="rev-item"><b>2%</b> Zakat</div>
    </div>
  </div>
</section>

<section class="cta">
  <h2>Ready to Build on DarCloud?</h2>
  <p>Join the Halal Wealth Club for exclusive access to all services, or explore our API to start integrating.</p>
  <div class="hero-btns">
    <a class="btn btn-primary" href="https://halalwealthclub.darcloud.host">Join Halal Wealth Club</a>
    <a class="btn btn-outline" href="https://api.darcloud.host/api">API Documentation</a>
    <a class="btn btn-outline" href="https://darcloud.net">Visit DarCloud.net</a>
  </div>
</section>

<footer>
  <div class="footer-links">
    <a href="https://darcloud.host">DarCloud.host</a>
    <a href="https://darcloud.net">DarCloud.net</a>
    <a href="https://blockchain.darcloud.host">Blockchain</a>
    <a href="https://mesh.darcloud.host">FungiMesh</a>
    <a href="https://ai.darcloud.host">AI Agents</a>
    <a href="https://enterprise.darcloud.host">Enterprise</a>
    <a href="https://halalwealthclub.darcloud.host">HWC</a>
    <a href="https://realestate.darcloud.host">Real Estate</a>
    <a href="https://api.darcloud.host/api">API</a>
  </div>
  <p class="footer-copy">© 2026 DarCloud by Omar Abu Nadi. All rights reserved. 30% Founder Royalty Immutable.<br>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
</footer>

</body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/health') return new Response(JSON.stringify({ service: 'darcloud-www', status: 'live' }), { headers: { 'Content-Type': 'application/json', ...CORS } });
    return html(LANDING);
  }
};
