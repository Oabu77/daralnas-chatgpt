/**
 * QuranChain Blockchain — Landing Page Worker
 * Theme: Dark, amber/gold chain visuals, quantum encryption
 * Routes: blockchain.darcloud.host, chain.darcloud.host, explorer.darcloud.host
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' };
const jsonRes = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });

const LANDING = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QuranChain — Islamic Blockchain Network</title>
<meta name="description" content="QuranChain: 47 blockchain networks, AI validators, gas toll system, immutable Quran preservation. 30% Founder Royalty.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛓️</text></svg>">
<style>
:root{--bg:#0a0a0f;--s1:#111118;--s2:#1a1a24;--bdr:#2a2a3a;--amber:#f59e0b;--gold:#d4af37;--orange:#f97316;--txt:#e8e6f0;--muted:#8888a0;--grad:linear-gradient(135deg,#f59e0b,#f97316)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--txt);overflow-x:hidden}
a{color:var(--amber);text-decoration:none}
.container{max-width:1100px;margin:0 auto;padding:0 1.5rem}

/* Animated chain bg */
body::before{content:'';position:fixed;top:0;left:0;right:0;bottom:0;background:
  radial-gradient(circle at 20% 30%,rgba(245,158,11,.04) 0%,transparent 50%),
  radial-gradient(circle at 80% 70%,rgba(249,115,22,.03) 0%,transparent 50%);pointer-events:none;z-index:0}

nav{position:sticky;top:0;z-index:100;background:rgba(10,10,15,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);padding:.75rem 2rem;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:1.3rem;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-links{display:flex;gap:1.5rem;font-size:.85rem}
.nav-links a{color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--amber)}
.btn{display:inline-block;padding:.6rem 1.5rem;border-radius:8px;font-weight:600;font-size:.9rem;transition:all .3s;border:none;cursor:pointer}
.btn-amber{background:var(--grad);color:#000}
.btn-amber:hover{opacity:.9;transform:translateY(-1px)}
.btn-outline{border:1px solid var(--amber);color:var(--amber);background:transparent}
.btn-outline:hover{background:rgba(245,158,11,.1)}

.hero{text-align:center;padding:6rem 1.5rem 4rem;position:relative;z-index:1}
.bismillah{font-size:1.4rem;color:var(--gold);margin-bottom:1rem;font-style:italic}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--bdr);padding:.4rem 1rem;border-radius:99px;font-size:.8rem;color:var(--muted);margin-bottom:2rem}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--amber);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.hero h1{font-size:clamp(2.2rem,5vw,4rem);font-weight:800;line-height:1.1;margin-bottom:1.5rem}
.hero h1 span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.1rem;color:var(--muted);max-width:650px;margin:0 auto 2.5rem;line-height:1.7}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}

/* Chain status bar */
.chain-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem;padding:2rem 0;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);margin:2rem 0}
.chain-stat{text-align:center;padding:1rem}
.chain-stat .val{font-size:1.8rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.chain-stat .lbl{font-size:.75rem;color:var(--muted);margin-top:.2rem;text-transform:uppercase;letter-spacing:1px}

.section{padding:5rem 0;position:relative;z-index:1}
.section-head{text-align:center;margin-bottom:3rem}
.section-head h2{font-size:2rem;font-weight:700;margin-bottom:.75rem}
.section-head p{color:var(--muted);max-width:550px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem}
.card{background:var(--s1);border:1px solid var(--bdr);border-radius:12px;padding:2rem;transition:all .3s}
.card:hover{border-color:var(--amber);transform:translateY(-3px);box-shadow:0 8px 30px rgba(245,158,11,.06)}
.card-icon{font-size:2.2rem;margin-bottom:1rem}
.card h3{font-size:1.1rem;font-weight:600;color:var(--amber);margin-bottom:.5rem}
.card p{color:var(--muted);font-size:.9rem;line-height:1.6}

/* Live chains ticker */
.chains-section{background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);padding:3rem 0}
.chains-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.75rem}
.chain-tag{display:flex;align-items:center;gap:.4rem;padding:.5rem .75rem;background:var(--s2);border:1px solid var(--bdr);border-radius:8px;font-size:.8rem;transition:border-color .2s}
.chain-tag:hover{border-color:var(--amber)}
.chain-dot{width:6px;height:6px;border-radius:50%;background:#22c55e}

/* Revenue split */
.rev-bar{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;padding:1.5rem;background:var(--s2);border-radius:10px;margin-top:2rem}
.rev-item{font-size:.85rem;color:var(--muted)}.rev-item b{color:var(--amber)}

.cta{text-align:center;padding:5rem 1.5rem;z-index:1;position:relative}
.cta h2{font-size:2rem;margin-bottom:1rem}
.cta p{color:var(--muted);margin-bottom:2rem}

footer{padding:3rem 2rem;border-top:1px solid var(--bdr);text-align:center;z-index:1;position:relative}
.footer-links{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:1rem}
.footer-links a{color:var(--muted);font-size:.85rem}
.footer-copy{color:var(--muted);font-size:.8rem}

@media(max-width:768px){.nav-links{display:none}.hero h1{font-size:2rem}.chain-bar{grid-template-columns:repeat(3,1fr)}.grid{grid-template-columns:1fr}.chains-grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}}
</style>
</head>
<body>

<nav>
  <div class="logo">⛓️ QuranChain</div>
  <div class="nav-links">
    <a href="#features">Features</a>
    <a href="#chains">Live Chains</a>
    <a href="https://darcloud.host">DarCloud</a>
    <a href="https://ai.darcloud.host">AI Agents</a>
    <a href="https://api.darcloud.host/api">API</a>
  </div>
  <a class="btn btn-amber" href="https://api.darcloud.host/api">Explorer</a>
</nav>

<section class="hero">
  <p class="bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
  <div class="hero-badge"><span class="dot"></span> 47 Networks — All Validators Online</div>
  <h1>The <span>Islamic Blockchain</span> Network</h1>
  <p>QuranChain: AI-validated blockchain ecosystem spanning 47 networks. Gas toll revenue, immutable Quran preservation, quantum-secured consensus. Powered by Omar AI™ & QuranChain AI™.</p>
  <div class="hero-btns">
    <a class="btn btn-amber" href="https://api.darcloud.host/api">Block Explorer</a>
    <a class="btn btn-outline" href="https://darcloud.host">DarCloud Platform</a>
  </div>
</section>

<div class="container">
  <div class="chain-bar">
    <div class="chain-stat"><div class="val">47</div><div class="lbl">Live Chains</div></div>
    <div class="chain-stat"><div class="val">$2.4M</div><div class="lbl">Gas Revenue</div></div>
    <div class="chain-stat"><div class="val">2</div><div class="lbl">AI Validators</div></div>
    <div class="chain-stat"><div class="val">340K</div><div class="lbl">Mesh Nodes</div></div>
    <div class="chain-stat"><div class="val">30%</div><div class="lbl">Founder Share</div></div>
    <div class="chain-stat"><div class="val">2%</div><div class="lbl">Zakat</div></div>
  </div>
</div>

<section id="features" class="section">
  <div class="container">
    <div class="section-head">
      <h2>Blockchain Infrastructure</h2>
      <p>Production-grade Islamic blockchain ecosystem with real revenue generation.</p>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-icon">⚡</div>
        <h3>Gas Toll System</h3>
        <p>Revenue-generating gas toll collection across all 47 monitored chains. Every transaction contributes to the ecosystem fund with automatic distribution.</p>
      </div>
      <div class="card">
        <div class="card-icon">🤖</div>
        <h3>AI Validators</h3>
        <p>Omar AI™ and QuranChain AI™ serve as the primary validators — advanced AI securing the network with intelligent consensus.</p>
      </div>
      <div class="card">
        <div class="card-icon">📖</div>
        <h3>Quran Preservation</h3>
        <p>Immutable on-chain preservation of the Holy Quran. Every word, surah, and ayah permanently stored with cryptographic verification.</p>
      </div>
      <div class="card">
        <div class="card-icon">🔒</div>
        <h3>Quantum Encryption</h3>
        <p>Post-quantum cryptographic algorithms protecting all chain operations. Future-proof security for the Islamic digital economy.</p>
      </div>
      <div class="card">
        <div class="card-icon">💰</div>
        <h3>Revenue Distribution</h3>
        <p>Immutable 30% Founder / 40% AI Validators / 10% Hardware / 18% Ecosystem / 2% Zakat split on all revenue streams.</p>
      </div>
      <div class="card">
        <div class="card-icon">🌐</div>
        <h3>Multi-Chain Bridge</h3>
        <p>Interoperability across all 47 networks. Cross-chain asset transfers, unified gas tolls, and seamless ecosystem connectivity.</p>
      </div>
    </div>
    <div class="rev-bar">
      <div class="rev-item"><b>30%</b> Founder (Immutable)</div>
      <div class="rev-item"><b>40%</b> AI Validators</div>
      <div class="rev-item"><b>10%</b> Hardware Hosts</div>
      <div class="rev-item"><b>18%</b> Ecosystem Fund</div>
      <div class="rev-item"><b>2%</b> Zakat</div>
    </div>
  </div>
</section>

<section id="chains" class="chains-section">
  <div class="container">
    <div class="section-head">
      <h2>47 Live Blockchain Networks</h2>
      <p>Gas tolls collected on every chain. All validators online.</p>
    </div>
    <div class="chains-grid">
      <div class="chain-tag"><span class="chain-dot"></span>Ethereum</div>
      <div class="chain-tag"><span class="chain-dot"></span>Bitcoin</div>
      <div class="chain-tag"><span class="chain-dot"></span>BNB Chain</div>
      <div class="chain-tag"><span class="chain-dot"></span>Polygon</div>
      <div class="chain-tag"><span class="chain-dot"></span>Arbitrum</div>
      <div class="chain-tag"><span class="chain-dot"></span>Optimism</div>
      <div class="chain-tag"><span class="chain-dot"></span>Avalanche</div>
      <div class="chain-tag"><span class="chain-dot"></span>Solana</div>
      <div class="chain-tag"><span class="chain-dot"></span>Fantom</div>
      <div class="chain-tag"><span class="chain-dot"></span>Cardano</div>
      <div class="chain-tag"><span class="chain-dot"></span>Polkadot</div>
      <div class="chain-tag"><span class="chain-dot"></span>Cosmos</div>
      <div class="chain-tag"><span class="chain-dot"></span>Near</div>
      <div class="chain-tag"><span class="chain-dot"></span>Tron</div>
      <div class="chain-tag"><span class="chain-dot"></span>Cronos</div>
      <div class="chain-tag"><span class="chain-dot"></span>zkSync</div>
      <div class="chain-tag"><span class="chain-dot"></span>Base</div>
      <div class="chain-tag"><span class="chain-dot"></span>Mantle</div>
      <div class="chain-tag"><span class="chain-dot"></span>Linea</div>
      <div class="chain-tag"><span class="chain-dot"></span>Scroll</div>
      <div class="chain-tag"><span class="chain-dot"></span>Celo</div>
      <div class="chain-tag"><span class="chain-dot"></span>Gnosis</div>
      <div class="chain-tag"><span class="chain-dot"></span>Moonbeam</div>
      <div class="chain-tag"><span class="chain-dot"></span>Metis</div>
      <div class="chain-tag"><span class="chain-dot"></span>Kava</div>
      <div class="chain-tag"><span class="chain-dot"></span>Harmony</div>
      <div class="chain-tag"><span class="chain-dot"></span>Aurora</div>
      <div class="chain-tag"><span class="chain-dot"></span>Boba</div>
      <div class="chain-tag"><span class="chain-dot"></span>Klaytn</div>
      <div class="chain-tag"><span class="chain-dot"></span>IoTeX</div>
      <div class="chain-tag"><span class="chain-dot"></span>Hedera</div>
      <div class="chain-tag"><span class="chain-dot"></span>Flow</div>
      <div class="chain-tag"><span class="chain-dot"></span>Algorand</div>
      <div class="chain-tag"><span class="chain-dot"></span>Theta</div>
      <div class="chain-tag"><span class="chain-dot"></span>VeChain</div>
      <div class="chain-tag"><span class="chain-dot"></span>Zilliqa</div>
      <div class="chain-tag"><span class="chain-dot"></span>Sui</div>
      <div class="chain-tag"><span class="chain-dot"></span>Aptos</div>
      <div class="chain-tag"><span class="chain-dot"></span>Starknet</div>
      <div class="chain-tag"><span class="chain-dot"></span>Sei</div>
      <div class="chain-tag"><span class="chain-dot"></span>Blast</div>
      <div class="chain-tag"><span class="chain-dot"></span>Mode</div>
      <div class="chain-tag"><span class="chain-dot"></span>Manta</div>
      <div class="chain-tag"><span class="chain-dot"></span>Zora</div>
      <div class="chain-tag"><span class="chain-dot"></span>Taiko</div>
      <div class="chain-tag"><span class="chain-dot"></span>Berachain</div>
      <div class="chain-tag"><span class="chain-dot"></span>QuranChain</div>
    </div>
  </div>
</section>

<section class="cta">
  <h2>Join the Islamic Blockchain Revolution</h2>
  <p>Explore the chain, build on our network, or earn gas toll revenue as a validator.</p>
  <div class="hero-btns">
    <a class="btn btn-amber" href="https://api.darcloud.host/api">API Documentation</a>
    <a class="btn btn-outline" href="https://darcloud.host">DarCloud Platform</a>
  </div>
</section>

<footer>
  <div class="footer-links">
    <a href="https://darcloud.host">DarCloud</a>
    <a href="https://darcloud.net">DarCloud.net</a>
    <a href="https://mesh.darcloud.host">FungiMesh</a>
    <a href="https://ai.darcloud.host">AI Agents</a>
    <a href="https://halalwealthclub.darcloud.host">HWC</a>
  </div>
  <p class="footer-copy">© 2026 QuranChain by Omar Abu Nadi. 30% Founder Royalty Immutable. All Validators Online.</p>
</footer>

</body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/health') return jsonRes({ service: 'quranchain-blockchain', status: 'live', chains: 47, validators: 'online' });

    // Proxy API to origin blockchain host
    if (url.pathname.startsWith('/api/')) {
      const origin = env.ORIGIN_URL || 'http://localhost:3001';
      const target = origin + url.pathname + url.search;
      try {
        const res = await fetch(target, { method: request.method, headers: request.headers, body: ['GET','HEAD'].includes(request.method) ? null : request.body });
        return new Response(res.body, { status: res.status, headers: { ...Object.fromEntries(res.headers), ...CORS } });
      } catch (e) { return jsonRes({ error: 'Origin unreachable', detail: e.message }, 502); }
    }

    return new Response(LANDING, { headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS } });
  }
};
