/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * DarCloud Enterprise — Corporate Cloud Infrastructure
 * Theme: Navy/professional, white text, corporate clean
 * Routes: enterprise.darcloud.host
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' };
const jsonRes = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });

const LANDING = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DarCloud Enterprise — Shariah-Compliant Cloud Infrastructure</title>
<meta name="description" content="Enterprise-grade cloud infrastructure. SLA guarantees, compliance automation, dedicated provisioning. 100% Shariah-compliant.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏢</text></svg>">
<style>
:root{--bg:#0a1628;--s1:#0f1d32;--s2:#152540;--bdr:#1e3a5f;--blue:#3b82f6;--cyan:#06b6d4;--white:#f8fafc;--txt:#d1d5db;--muted:#9ca3af;--grad:linear-gradient(135deg,#3b82f6,#06b6d4)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--txt);overflow-x:hidden}
a{color:var(--blue);text-decoration:none}
.container{max-width:1100px;margin:0 auto;padding:0 1.5rem}

nav{position:sticky;top:0;z-index:100;background:rgba(10,22,40,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);padding:.75rem 2rem;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:1.3rem;font-weight:700;color:var(--white)}.logo span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-links{display:flex;gap:1.5rem;font-size:.85rem}
.nav-links a{color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--blue)}
.btn{display:inline-block;padding:.65rem 1.6rem;border-radius:8px;font-weight:600;font-size:.9rem;transition:all .3s;border:none;cursor:pointer}
.btn-blue{background:var(--grad);color:#fff}
.btn-blue:hover{opacity:.9;transform:translateY(-1px)}
.btn-outline{border:1px solid var(--blue);color:var(--blue);background:transparent}
.btn-outline:hover{background:rgba(59,130,246,.1)}

.hero{text-align:center;padding:6rem 1.5rem 4rem;position:relative}
.hero::before{content:'';position:absolute;top:0;left:0;right:0;height:100%;background:radial-gradient(ellipse at 50% 0%,rgba(59,130,246,.08) 0%,transparent 60%);pointer-events:none}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--bdr);padding:.4rem 1rem;border-radius:99px;font-size:.8rem;color:var(--muted);margin-bottom:2rem}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;color:var(--white);line-height:1.15;margin-bottom:1.5rem}
.hero h1 span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.1rem;color:var(--muted);max-width:650px;margin:0 auto 2.5rem;line-height:1.7}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}

.features{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;padding:4rem 0}
.f-card{background:var(--s1);border:1px solid var(--bdr);border-radius:14px;padding:2rem;transition:all .3s}
.f-card:hover{border-color:var(--blue);transform:translateY(-3px);box-shadow:0 8px 30px rgba(59,130,246,.08)}
.f-icon{font-size:2rem;margin-bottom:1rem}
.f-card h3{font-size:1.1rem;font-weight:600;color:var(--white);margin-bottom:.5rem}
.f-card p{color:var(--muted);font-size:.85rem;line-height:1.6}
.f-tag{display:inline-block;margin-top:.75rem;padding:.25rem .6rem;background:rgba(59,130,246,.1);color:var(--blue);border-radius:4px;font-size:.75rem;font-weight:500}

.section{padding:5rem 0}
.section-head{text-align:center;margin-bottom:3rem}
.section-head h2{font-size:2rem;font-weight:700;color:var(--white);margin-bottom:.75rem}
.section-head p{color:var(--muted);max-width:550px;margin:0 auto}

/* SLA */
.sla-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-top:2rem}
.sla-item{text-align:center;padding:1.5rem;background:var(--s1);border:1px solid var(--bdr);border-radius:12px}
.sla-val{font-size:2rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sla-lbl{font-size:.8rem;color:var(--muted);margin-top:.3rem}

/* Plans */
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem}
.plan{background:var(--s1);border:1px solid var(--bdr);border-radius:14px;padding:2rem;transition:all .3s}
.plan.recommended{border-color:var(--blue);box-shadow:0 0 30px rgba(59,130,246,.1)}
.plan-name{font-size:1rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-size:.8rem}
.plan-price{font-size:2.5rem;font-weight:800;color:var(--white);margin:.5rem 0}
.plan-price span{font-size:.9rem;font-weight:400;color:var(--muted)}
.plan ul{list-style:none;margin:1.5rem 0}
.plan li{padding:.35rem 0;font-size:.85rem;color:var(--muted)}
.plan li::before{content:'✓ ';color:var(--blue);font-weight:700}
.plan .btn{width:100%;text-align:center;margin-top:1rem}

.cta{text-align:center;padding:5rem 1.5rem;background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
.cta h2{font-size:2rem;color:var(--white);margin-bottom:1rem}
.cta p{color:var(--muted);margin-bottom:2rem;max-width:500px;margin-left:auto;margin-right:auto}

footer{padding:3rem 2rem;border-top:1px solid var(--bdr);text-align:center}
.footer-links{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:1rem}
.footer-links a{color:var(--muted);font-size:.85rem}
.footer-copy{color:var(--muted);font-size:.8rem}

@media(max-width:768px){.nav-links{display:none}.features{grid-template-columns:1fr}.plans{grid-template-columns:1fr}}
</style>
</head>
<body>

<nav>
  <div class="logo">🏢 DarCloud <span>Enterprise</span></div>
  <div class="nav-links">
    <a href="#features">Solutions</a>
    <a href="#pricing">Pricing</a>
    <a href="https://darcloud.host">Platform</a>
    <a href="https://api.darcloud.host/api">API</a>
  </div>
  <a class="btn btn-blue" href="#contact">Contact Sales</a>
</nav>

<section class="hero">
  <div class="hero-badge">🛡️ SOC2-Ready • Shariah-Compliant • 99.99% SLA</div>
  <h1>Enterprise Cloud <span>Built for Islamic Finance</span></h1>
  <p>Dedicated infrastructure, compliance automation, and AI-powered operations — designed for banks, funds, and enterprise organizations requiring Shariah compliance.</p>
  <div class="hero-btns">
    <a class="btn btn-blue" href="#contact">Request Demo</a>
    <a class="btn btn-outline" href="#pricing">View Plans</a>
  </div>
</section>

<div class="container">
  <div id="features" class="features">
    <div class="f-card">
      <div class="f-icon">🛡️</div>
      <h3>Compliance Engine</h3>
      <p>Automated Shariah compliance checking. Every transaction, investment, and financial product validated against Islamic principles in real-time.</p>
      <span class="f-tag">Shariah Board Certified</span>
    </div>
    <div class="f-card">
      <div class="f-icon">📊</div>
      <h3>Analytics & BI</h3>
      <p>Real-time business intelligence dashboards. Revenue tracking, user analytics, blockchain metrics, and AI agent performance monitoring.</p>
      <span class="f-tag">Real-Time</span>
    </div>
    <div class="f-card">
      <div class="f-icon">⚡</div>
      <h3>Auto-Provisioning</h3>
      <p>Instant infrastructure provisioning. VMs, containers, databases, and AI agents spin up in seconds with our automated pipeline.</p>
      <span class="f-tag">< 30s Deploy</span>
    </div>
    <div class="f-card">
      <div class="f-icon">💳</div>
      <h3>Billing & Metering</h3>
      <p>Usage-based billing with Stripe integration. Custom invoicing, multi-currency support, and automatic zakat calculation on all revenue.</p>
      <span class="f-tag">2% Zakat Auto</span>
    </div>
    <div class="f-card">
      <div class="f-icon">🔐</div>
      <h3>Vault & Secrets</h3>
      <p>Enterprise-grade secret management. API keys, wallet addresses, and credentials secured with quantum-resistant encryption.</p>
      <span class="f-tag">Post-Quantum</span>
    </div>
    <div class="f-card">
      <div class="f-icon">🤖</div>
      <h3>Managed AI Fleet</h3>
      <p>Dedicated AI agent workforce. Custom-trained assistants for your organization — customer service, sales, compliance, analytics.</p>
      <span class="f-tag">71 Agents Available</span>
    </div>
  </div>

  <div class="sla-bar">
    <div class="sla-item"><div class="sla-val">99.99%</div><div class="sla-lbl">Uptime SLA</div></div>
    <div class="sla-item"><div class="sla-val">< 50ms</div><div class="sla-lbl">Edge Latency</div></div>
    <div class="sla-item"><div class="sla-val">24/7</div><div class="sla-lbl">Support</div></div>
    <div class="sla-item"><div class="sla-val">SOC2</div><div class="sla-lbl">Compliance</div></div>
    <div class="sla-item"><div class="sla-val">47</div><div class="sla-lbl">Blockchain Nets</div></div>
  </div>
</div>

<section id="pricing" class="section">
  <div class="container">
    <div class="section-head">
      <h2>Enterprise Plans</h2>
      <p>Tailored infrastructure for Islamic financial institutions.</p>
    </div>
    <div class="plans">
      <div class="plan">
        <div class="plan-name">Startup</div>
        <div class="plan-price">$499<span>/mo</span></div>
        <ul>
          <li>5 Dedicated VMs</li>
          <li>10 AI Agents</li>
          <li>Basic Compliance Engine</li>
          <li>Email Support</li>
          <li>99.9% SLA</li>
        </ul>
        <a class="btn btn-outline" href="#contact">Get Started</a>
      </div>
      <div class="plan recommended">
        <div class="plan-name">Business</div>
        <div class="plan-price">$1,999<span>/mo</span></div>
        <ul>
          <li>20 Dedicated VMs</li>
          <li>30 AI Agents</li>
          <li>Full Compliance Engine</li>
          <li>Priority Support</li>
          <li>99.95% SLA</li>
          <li>Custom Billing</li>
        </ul>
        <a class="btn btn-blue" href="#contact">Contact Sales</a>
      </div>
      <div class="plan">
        <div class="plan-name">Enterprise</div>
        <div class="plan-price">Custom</div>
        <ul>
          <li>Unlimited Infrastructure</li>
          <li>Full AI Fleet (71 Agents)</li>
          <li>Dedicated Shariah Board</li>
          <li>24/7 Phone + Slack</li>
          <li>99.99% SLA</li>
          <li>On-Prem Option</li>
        </ul>
        <a class="btn btn-outline" href="#contact">Talk to Sales</a>
      </div>
    </div>
  </div>
</section>

<section id="contact" class="cta">
  <h2>Ready to Scale with DarCloud?</h2>
  <p>Our enterprise team will design a custom solution for your organization's infrastructure and compliance needs.</p>
  <div class="hero-btns">
    <a class="btn btn-blue" href="mailto:omarabunadi28@gmail.com?subject=DarCloud Enterprise Inquiry">Contact Sales</a>
    <a class="btn btn-outline" href="https://darcloud.host">Explore Platform</a>
  </div>
</section>

<footer>
  <div class="footer-links">
    <a href="https://darcloud.host">DarCloud</a>
    <a href="https://darcloud.net">DarCloud.net</a>
    <a href="https://blockchain.darcloud.host">Blockchain</a>
    <a href="https://ai.darcloud.host">AI</a>
    <a href="https://halalwealthclub.darcloud.host">HWC</a>
    <a href="https://realestate.darcloud.host">Real Estate</a>
  </div>
  <p class="footer-copy">© 2026 DarCloud Enterprise by Omar Abu Nadi. All rights reserved. Shariah-compliant infrastructure.</p>
</footer>

</body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/health') return jsonRes({ service: 'darcloud-enterprise', status: 'live' });

    if (url.pathname.startsWith('/api/')) {
      const origin = env.ORIGIN_URL || 'http://localhost:8200';
      const target = origin + url.pathname + url.search;
      try {
        const res = await fetch(target, { method: request.method, headers: request.headers, body: ['GET','HEAD'].includes(request.method) ? null : request.body });
        return new Response(res.body, { status: res.status, headers: { ...Object.fromEntries(res.headers), ...CORS } });
      } catch (e) { return jsonRes({ error: 'Origin unreachable', detail: e.message }, 502); }
    }

    return new Response(LANDING, { headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS } });
  }
};
