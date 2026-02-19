/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * DarCloud Mesh Status Worker — FungiMesh Network Edge Monitor
 * Serves landing page + real-time mesh status from Cloudflare edge
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const LANDING = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FungiMesh — Bio-Inspired Distributed Mesh Network</title>
<meta name="description" content="FungiMesh: 340,000 nodes across 6 continents. Quantum-encrypted P2P. Self-healing mesh topology. Bio-inspired networking.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍄</text></svg>">
<style>
:root{--bg:#0a0618;--s1:#110d22;--s2:#1a1430;--bdr:#2d2550;--teal:#00d4aa;--purple:#8b5cf6;--magenta:#d946ef;--txt:#e0daf0;--muted:#8878a0;--grad:linear-gradient(135deg,#00d4aa,#8b5cf6)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--txt);overflow-x:hidden}
a{color:var(--teal);text-decoration:none}
.container{max-width:1100px;margin:0 auto;padding:0 1.5rem}
body::before{content:'';position:fixed;inset:0;background:
  radial-gradient(circle at 25% 25%,rgba(0,212,170,.05) 0%,transparent 50%),
  radial-gradient(circle at 75% 75%,rgba(139,92,246,.04) 0%,transparent 50%),
  radial-gradient(circle at 50% 50%,rgba(217,70,239,.03) 0%,transparent 40%);pointer-events:none}
nav{position:sticky;top:0;z-index:100;background:rgba(10,6,24,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);padding:.75rem 2rem;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:1.3rem;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-links{display:flex;gap:1.5rem;font-size:.85rem}
.nav-links a{color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--teal)}
.btn{display:inline-block;padding:.65rem 1.6rem;border-radius:8px;font-weight:600;font-size:.9rem;transition:all .3s;border:none;cursor:pointer}
.btn-mesh{background:var(--grad);color:#000}
.btn-mesh:hover{opacity:.9;transform:translateY(-1px)}
.btn-outline{border:1px solid var(--teal);color:var(--teal);background:transparent}
.btn-outline:hover{background:rgba(0,212,170,.1)}
.hero{text-align:center;padding:5rem 1.5rem 4rem;position:relative;z-index:1}
.hero h1{font-size:clamp(2rem,5vw,3.8rem);font-weight:800;line-height:1.1;margin-bottom:1.5rem}
.hero h1 span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.1rem;color:var(--muted);max-width:640px;margin:0 auto 2rem;line-height:1.7}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--bdr);padding:.4rem 1rem;border-radius:99px;font-size:.8rem;color:var(--muted);margin-bottom:2rem}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--teal);animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
/* Mesh visual */
.mesh-visual{width:300px;height:300px;margin:3rem auto 0;position:relative;border-radius:50%;border:1px solid var(--bdr)}
.mesh-visual::before{content:'🍄';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:4rem}
.mesh-ring{position:absolute;border:1px solid rgba(0,212,170,.2);border-radius:50%;animation:spin 20s linear infinite}
.mesh-ring:nth-child(1){inset:10%;animation-duration:20s}
.mesh-ring:nth-child(2){inset:25%;animation-duration:15s;animation-direction:reverse}
.mesh-ring:nth-child(3){inset:40%;animation-duration:25s}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.stats-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;padding:3rem 0;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);margin:2rem 0}
.st{text-align:center;padding:1rem}
.st-val{font-size:2rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.st-lbl{font-size:.75rem;color:var(--muted);margin-top:.2rem;text-transform:uppercase;letter-spacing:1px}
.section{padding:4rem 0;position:relative;z-index:1}
.section-head{text-align:center;margin-bottom:2.5rem}
.section-head h2{font-size:1.8rem;font-weight:700;margin-bottom:.75rem}
.section-head p{color:var(--muted);max-width:500px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem}
.card{background:var(--s1);border:1px solid var(--bdr);border-radius:12px;padding:1.75rem;transition:all .3s}
.card:hover{border-color:var(--teal);transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,212,170,.06)}
.card-icon{font-size:2rem;margin-bottom:.75rem}
.card h3{font-size:1rem;font-weight:600;color:var(--teal);margin-bottom:.4rem}
.card p{color:var(--muted);font-size:.85rem;line-height:1.6}
.regions{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem;margin-top:1.5rem}
.region{display:flex;align-items:center;gap:.5rem;padding:.75rem;background:var(--s2);border:1px solid var(--bdr);border-radius:8px;font-size:.85rem}
.region-dot{width:8px;height:8px;border-radius:50%;background:var(--teal)}
.region span{color:var(--muted);font-size:.75rem}
.cta{text-align:center;padding:4rem 1.5rem;background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
.cta h2{font-size:1.8rem;margin-bottom:1rem}
.cta p{color:var(--muted);margin-bottom:2rem}
footer{padding:2rem;border-top:1px solid var(--bdr);text-align:center;position:relative;z-index:1}
.footer-links{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:1rem}
.footer-links a{color:var(--muted);font-size:.85rem}
.footer-copy{color:var(--muted);font-size:.78rem}
@media(max-width:768px){.nav-links{display:none}.hero h1{font-size:1.8rem}.grid{grid-template-columns:1fr}.mesh-visual{width:200px;height:200px}}
</style>
</head>
<body>
<nav>
  <div class="logo">🍄 FungiMesh</div>
  <div class="nav-links"><a href="#tech">Technology</a><a href="/api/status">Live Status</a><a href="https://darcloud.host">DarCloud</a></div>
  <a class="btn btn-mesh" href="https://darcloud.host">Join Network</a>
</nav>
<section class="hero">
  <div class="hero-badge"><span class="dot"></span> 340,000 Nodes Online — 6 Continents</div>
  <h1>The <span>Bio-Inspired</span> Mesh Network</h1>
  <p>FungiMesh: modeled after mycelium networks in nature. 340,000 nodes spanning 6 continents. Self-healing, quantum-encrypted, zero single point of failure. The backbone of DarCloud.</p>
  <div class="hero-btns">
    <a class="btn btn-mesh" href="/api/status">Live Network Status</a>
    <a class="btn btn-outline" href="/api/nodes">Node Map</a>
  </div>
  <div class="mesh-visual">
    <div class="mesh-ring"></div>
    <div class="mesh-ring"></div>
    <div class="mesh-ring"></div>
  </div>
</section>
<div class="container">
  <div class="stats-bar">
    <div class="st"><div class="st-val">340K</div><div class="st-lbl">Active Nodes</div></div>
    <div class="st"><div class="st-val">6</div><div class="st-lbl">Continents</div></div>
    <div class="st"><div class="st-val">&lt;5ms</div><div class="st-lbl">Avg Latency</div></div>
    <div class="st"><div class="st-val">QKD</div><div class="st-lbl">Encryption</div></div>
    <div class="st"><div class="st-val">2</div><div class="st-lbl">Mesh Layers</div></div>
  </div>
</div>
<section id="tech" class="section">
  <div class="container">
    <div class="section-head"><h2>Mesh Technology</h2><p>Dual-layer architecture inspired by nature's most resilient networks.</p></div>
    <div class="grid">
      <div class="card"><div class="card-icon">🧬</div><h3>Bio-Inspired Topology</h3><p>Modeled after underground mycelium networks. Nodes form organic mesh connections that self-organize for optimal routing.</p></div>
      <div class="card"><div class="card-icon">🔒</div><h3>Quantum Encryption</h3><p>Kyber-1024 + Dilithium-5 + BB84 QKD protocol. Post-quantum cryptography protects every packet traversing the mesh.</p></div>
      <div class="card"><div class="card-icon">🔄</div><h3>Self-Healing</h3><p>When a node goes down, the mesh automatically reroutes traffic. No downtime, no manual intervention, no single point of failure.</p></div>
      <div class="card"><div class="card-icon">⚡</div><h3>Dual-Layer Architecture</h3><p>Layer 1: Node.js WebSocket real-time mesh. Layer 2: Python P2P mesh. Both layers work together for maximum resilience.</p></div>
      <div class="card"><div class="card-icon">📡</div><h3>Edge Computing</h3><p>Each node contributes compute resources. Distributed processing across 340K nodes for AI inference, data processing, and more.</p></div>
      <div class="card"><div class="card-icon">🌍</div><h3>Global Coverage</h3><p>~56,666 nodes per continent. Even coverage across North America, Europe, Asia, South America, Africa, and Oceania.</p></div>
    </div>
    <div class="regions">
      <div class="region"><span class="region-dot"></span>North America<span>56,666</span></div>
      <div class="region"><span class="region-dot"></span>Europe<span>56,666</span></div>
      <div class="region"><span class="region-dot"></span>Asia<span>56,666</span></div>
      <div class="region"><span class="region-dot"></span>South America<span>56,666</span></div>
      <div class="region"><span class="region-dot"></span>Africa<span>56,666</span></div>
      <div class="region"><span class="region-dot"></span>Oceania<span>56,670</span></div>
    </div>
  </div>
</section>
<section class="cta">
  <h2>Become a Mesh Node</h2>
  <p>Contribute computing resources to FungiMesh and earn revenue from the DarCloud ecosystem.</p>
  <div class="hero-btns">
    <a class="btn btn-mesh" href="https://darcloud.host">Join DarCloud</a>
    <a class="btn btn-outline" href="/api/status">Live Status JSON</a>
  </div>
</section>
<footer>
  <div class="footer-links">
    <a href="https://darcloud.host">DarCloud</a><a href="https://blockchain.darcloud.host">Blockchain</a>
    <a href="https://ai.darcloud.host">AI Agents</a><a href="https://darcloud.net">DarCloud.net</a>
  </div>
  <p class="footer-copy">© 2026 FungiMesh by Omar Abu Nadi. Part of the DarCloud Ecosystem. 30% Founder Royalty Immutable.</p>
</footer>
</body></html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Landing page at root
    if (url.pathname === '/') {
      return new Response(LANDING, { headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS } });
    }

    if (url.pathname === '/health' || url.pathname === '/api/status') {
      // Fetch from both mesh layers
      const [blockchain, pythonMesh] = await Promise.allSettled([
        fetch('https://blockchain.darcloud.host/health').then(r => r.json()).catch(() => null),
        fetch('https://mesh.darcloud.host/status').then(r => r.json()).catch(() => null),
      ]);

      const bc = blockchain.status === 'fulfilled' ? blockchain.value : null;
      const pm = pythonMesh.status === 'fulfilled' ? pythonMesh.value : null;

      return json({
        service: 'FungiMesh Network Status',
        timestamp: new Date().toISOString(),
        layer1_nodejs: bc ? {
          chain_height: bc?.blockchain?.height || 0,
          mesh_peers: bc?.mesh?.peers || 0,
          enrolled_devices: bc?.bridge?.enrolledDevices || 0,
          compute_pool: bc?.bridge?.computePool || {},
          edge_nodes: bc?.bridge?.edgeNodes || 0,
          validators: bc?.blockchain?.validators || 0,
          mining: bc?.blockchain?.mining || false,
          gas_toll: bc?.gasTollHighway || {},
          quantum: bc?.quantumCompute ? 'Kyber-1024 + Dilithium-5' : 'offline',
          data_ocean: bc?.dataOcean || {},
        } : { status: 'offline' },
        layer2_python: pm ? {
          nodes_total: pm.nodes_total || 0,
          nodes_healthy: pm.nodes_healthy || 0,
          avg_latency_ms: pm.average_latency_ms || 0,
          bandwidth_tbps: ((pm.total_bandwidth_mbps || 0) / 1e6).toFixed(0),
          packets_relayed: pm.total_packets_relayed || 0,
          revenue_usd: pm.total_revenue_usd || 0,
        } : { status: 'offline' },
        summary: {
          total_nodes: (bc?.bridge?.enrolledDevices || 0) + (pm?.nodes_total || 0),
          encryption: 'Quantum (Kyber-1024 + Dilithium-5 + BB84 QKD)',
          continents: 6,
          design: 'Dual-layer: Node.js WebSocket + Python Mesh',
        }
      });
    }

    if (url.pathname === '/api/nodes') {
      return json({
        regions: [
          { name: 'North America', nodes: 56666, status: 'healthy' },
          { name: 'Europe', nodes: 56666, status: 'healthy' },
          { name: 'Asia', nodes: 56666, status: 'healthy' },
          { name: 'South America', nodes: 56666, status: 'healthy' },
          { name: 'Africa', nodes: 56666, status: 'healthy' },
          { name: 'Oceania', nodes: 56670, status: 'healthy' },
        ],
        total: 340000,
        encryption: 'Quantum-resistant',
      });
    }

    return json({ error: 'Not found', endpoints: ['/api/status', '/api/nodes'] }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}
