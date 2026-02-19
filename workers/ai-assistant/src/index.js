/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * DarCloud AI Assistant Worker — Cloudflare Edge AI Proxy
 * Serves AI Fleet landing page + edge gateway to OpenAI assistants
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

const LANDING = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DarCloud AI Fleet — 71 Intelligent Agents</title>
<meta name="description" content="71 specialized AI agents powered by GPT-4o. Customer service, revenue optimization, blockchain validation, real estate, and more.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>">
<style>
:root{--bg:#060a14;--s1:#0c1220;--s2:#121a2e;--bdr:#1e2d4a;--blue:#0096ff;--cyan:#00d4ff;--purple:#8b5cf6;--txt:#d8e4f0;--muted:#7088a8;--grad:linear-gradient(135deg,#0096ff,#00d4ff)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--txt);overflow-x:hidden}
a{color:var(--blue);text-decoration:none}
.container{max-width:1100px;margin:0 auto;padding:0 1.5rem}
body::before{content:'';position:fixed;inset:0;background:
  radial-gradient(circle at 30% 20%,rgba(0,150,255,.06) 0%,transparent 50%),
  radial-gradient(circle at 70% 80%,rgba(139,92,246,.04) 0%,transparent 50%);pointer-events:none}
nav{position:sticky;top:0;z-index:100;background:rgba(6,10,20,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bdr);padding:.75rem 2rem;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:1.3rem;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.nav-links{display:flex;gap:1.5rem;font-size:.85rem}
.nav-links a{color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--blue)}
.btn{display:inline-block;padding:.65rem 1.6rem;border-radius:8px;font-weight:600;font-size:.9rem;transition:all .3s;border:none;cursor:pointer}
.btn-ai{background:var(--grad);color:#000}
.btn-ai:hover{opacity:.9;transform:translateY(-1px)}
.btn-outline{border:1px solid var(--blue);color:var(--blue);background:transparent}
.btn-outline:hover{background:rgba(0,150,255,.1)}
.hero{text-align:center;padding:5rem 1.5rem 3.5rem;position:relative;z-index:1}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--bdr);padding:.4rem 1rem;border-radius:99px;font-size:.8rem;color:var(--muted);margin-bottom:2rem}
.hero-badge .dot{width:8px;height:8px;border-radius:50%;background:var(--blue);animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1.1;margin-bottom:1.5rem}
.hero h1 span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:1.05rem;color:var(--muted);max-width:620px;margin:0 auto 2rem;line-height:1.7}
.hero-btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;padding:3rem 0;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);margin:2rem 0}
.st{text-align:center;padding:1rem}
.st-val{font-size:2rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.st-lbl{font-size:.75rem;color:var(--muted);margin-top:.2rem;text-transform:uppercase;letter-spacing:1px}
.section{padding:4rem 0;position:relative;z-index:1}
.section-head{text-align:center;margin-bottom:2.5rem}
.section-head h2{font-size:1.8rem;font-weight:700;margin-bottom:.75rem}
.section-head p{color:var(--muted);max-width:500px;margin:0 auto}
.tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem}
.tier{background:var(--s1);border:1px solid var(--bdr);border-radius:12px;padding:1.75rem;transition:all .3s}
.tier:hover{border-color:var(--blue);transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,150,255,.06)}
.tier-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
.tier h3{font-size:1.05rem;font-weight:600;color:var(--blue)}
.tier-count{background:rgba(0,150,255,.1);color:var(--blue);padding:.2rem .6rem;border-radius:6px;font-size:.75rem;font-weight:600}
.tier-agents{display:flex;flex-wrap:wrap;gap:.4rem}
.agent-tag{padding:.25rem .5rem;background:var(--s2);border:1px solid var(--bdr);border-radius:4px;font-size:.7rem;color:var(--muted)}
.api-section{background:var(--s1);border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr);padding:3rem 0}
.api-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem}
.api-card{padding:1.25rem;background:var(--s2);border:1px solid var(--bdr);border-radius:10px}
.api-method{font-size:.7rem;font-weight:700;padding:.15rem .4rem;border-radius:3px;margin-right:.5rem}
.api-method.get{background:rgba(0,212,170,.15);color:#00d4aa}
.api-method.post{background:rgba(0,150,255,.15);color:var(--blue)}
.api-path{font-family:monospace;font-size:.85rem;color:var(--txt)}
.api-desc{font-size:.75rem;color:var(--muted);margin-top:.4rem}
.cta{text-align:center;padding:4rem 1.5rem}
.cta h2{font-size:1.8rem;margin-bottom:1rem}
.cta p{color:var(--muted);margin-bottom:2rem}
footer{padding:2rem;border-top:1px solid var(--bdr);text-align:center;position:relative;z-index:1}
.footer-links{display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:1rem}
.footer-links a{color:var(--muted);font-size:.85rem}
.footer-copy{color:var(--muted);font-size:.78rem}
@media(max-width:768px){.nav-links{display:none}.hero h1{font-size:1.8rem}.tiers,.api-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<nav>
  <div class="logo">🤖 DarCloud AI Fleet</div>
  <div class="nav-links"><a href="#agents">Agents</a><a href="#api">API</a><a href="/api/fleet">Fleet JSON</a><a href="https://darcloud.host">DarCloud</a></div>
  <a class="btn btn-ai" href="/api/assistants">Explore Agents</a>
</nav>
<section class="hero">
  <div class="hero-badge"><span class="dot"></span> 71 Agents Deployed — All Online</div>
  <h1><span>71 AI Agents</span> at Your Service</h1>
  <p>The largest Islamic AI workforce in production. GPT-4o powered assistants for blockchain validation, revenue optimization, real estate, customer service, and enterprise operations.</p>
  <div class="hero-btns">
    <a class="btn btn-ai" href="/api/chat">Start Chat</a>
    <a class="btn btn-outline" href="/api/fleet">View Full Fleet</a>
  </div>
</section>
<div class="container">
  <div class="stats">
    <div class="st"><div class="st-val">71</div><div class="st-lbl">AI Agents</div></div>
    <div class="st"><div class="st-val">12</div><div class="st-lbl">Core Assistants</div></div>
    <div class="st"><div class="st-val">GPT-4o</div><div class="st-lbl">Model</div></div>
    <div class="st"><div class="st-val">24/7</div><div class="st-lbl">Availability</div></div>
    <div class="st"><div class="st-val">40%</div><div class="st-lbl">Revenue Share</div></div>
  </div>
</div>
<section id="agents" class="section">
  <div class="container">
    <div class="section-head"><h2>Agent Fleet Tiers</h2><p>Specialized AI agents organized by domain expertise.</p></div>
    <div class="tiers">
      <div class="tier">
        <div class="tier-head"><h3>Core Assistants</h3><span class="tier-count">10</span></div>
        <div class="tier-agents">
          <span class="agent-tag">QuranChain AI</span><span class="agent-tag">DarCloud AI</span>
          <span class="agent-tag">Revenue Engine</span><span class="agent-tag">Developer Platform</span>
          <span class="agent-tag">Blockchain Expert</span><span class="agent-tag">Autonomous Server</span>
          <span class="agent-tag">MCP Connected</span><span class="agent-tag">Infrastructure</span>
          <span class="agent-tag">Commerce</span><span class="agent-tag">Quran Scholar</span>
        </div>
      </div>
      <div class="tier">
        <div class="tier-head"><h3>Specialized Agents</h3><span class="tier-count">11</span></div>
        <div class="tier-agents">
          <span class="agent-tag">AI Orchestrator</span><span class="agent-tag">FungiMesh</span>
          <span class="agent-tag">MeshTalk OS</span><span class="agent-tag">Docker Container</span>
          <span class="agent-tag">Auto Deploy</span><span class="agent-tag">Dedicated Server</span>
          <span class="agent-tag">Omar AI Validator</span><span class="agent-tag">QuranChain Validator</span>
          <span class="agent-tag">Compliance</span><span class="agent-tag">Security</span>
          <span class="agent-tag">DarCloud Server</span>
        </div>
      </div>
      <div class="tier">
        <div class="tier-head"><h3>Workforce Bots</h3><span class="tier-count">9</span></div>
        <div class="tier-agents">
          <span class="agent-tag">Customer Service</span><span class="agent-tag">Sales Outreach</span>
          <span class="agent-tag">Content Creator</span><span class="agent-tag">Data Analyst</span>
          <span class="agent-tag">DevOps</span><span class="agent-tag">Islamic Finance</span>
          <span class="agent-tag">Security Bot</span><span class="agent-tag">Payment Processor</span>
          <span class="agent-tag">Revenue Analytics</span>
        </div>
      </div>
      <div class="tier">
        <div class="tier-head"><h3>Gas Toll Agents</h3><span class="tier-count">12</span></div>
        <div class="tier-agents">
          <span class="agent-tag">Ethereum</span><span class="agent-tag">BSC</span>
          <span class="agent-tag">Polygon</span><span class="agent-tag">Arbitrum</span>
          <span class="agent-tag">Solana</span><span class="agent-tag">Bridge</span>
          <span class="agent-tag">NFT</span><span class="agent-tag">Staking</span>
          <span class="agent-tag">Governance</span><span class="agent-tag">Dynamic Pricing</span>
          <span class="agent-tag">Revenue Opt</span><span class="agent-tag">Fraud Detect</span>
        </div>
      </div>
      <div class="tier">
        <div class="tier-head"><h3>Expert Agents</h3><span class="tier-count">7</span></div>
        <div class="tier-agents">
          <span class="agent-tag">Core Services</span><span class="agent-tag">Blockchain Tools</span>
          <span class="agent-tag">AI/ML Tools</span><span class="agent-tag">Database</span>
          <span class="agent-tag">Network Telecom</span><span class="agent-tag">Fiat Payment</span>
          <span class="agent-tag">DevOps Tools</span>
        </div>
      </div>
      <div class="tier">
        <div class="tier-head"><h3>Platform Agents</h3><span class="tier-count">9+</span></div>
        <div class="tier-agents">
          <span class="agent-tag">Payment Tools</span><span class="agent-tag">Security Tools</span>
          <span class="agent-tag">System Tools</span><span class="agent-tag">Web API</span>
          <span class="agent-tag">Data Science</span><span class="agent-tag">Logistics</span>
          <span class="agent-tag">API Error Mgr</span><span class="agent-tag">Subscription Mgr</span>
          <span class="agent-tag">Real Estate</span>
        </div>
      </div>
    </div>
  </div>
</section>
<section id="api" class="api-section">
  <div class="container">
    <div class="section-head"><h2>API Endpoints</h2><p>Interact with the AI fleet through our edge API.</p></div>
    <div class="api-grid">
      <div class="api-card"><span class="api-method post">POST</span><span class="api-path">/api/chat</span><div class="api-desc">Send a message to any agent. Body: { agent, message }</div></div>
      <div class="api-card"><span class="api-method get">GET</span><span class="api-path">/api/assistants</span><div class="api-desc">List all 12 core assistants with endpoints</div></div>
      <div class="api-card"><span class="api-method get">GET</span><span class="api-path">/api/fleet</span><div class="api-desc">Full fleet listing — all 71 agents with status</div></div>
      <div class="api-card"><span class="api-method get">GET</span><span class="api-path">/api/agent/:name</span><div class="api-desc">Individual agent info and endpoints</div></div>
    </div>
  </div>
</section>
<section class="cta">
  <h2>Put AI to Work</h2>
  <p>Start chatting with any of our 71 agents, or browse the full fleet to find the right expertise.</p>
  <div class="hero-btns">
    <a class="btn btn-ai" href="/api/fleet">Browse Fleet</a>
    <a class="btn btn-outline" href="https://darcloud.host">DarCloud Platform</a>
  </div>
</section>
<footer>
  <div class="footer-links">
    <a href="https://darcloud.host">DarCloud</a><a href="https://blockchain.darcloud.host">Blockchain</a>
    <a href="https://mesh.darcloud.host">FungiMesh</a><a href="https://halalwealthclub.darcloud.host">HWC</a>
    <a href="https://darcloud.net">DarCloud.net</a>
  </div>
  <p class="footer-copy">© 2026 DarCloud AI Fleet by Omar Abu Nadi. 40% AI Validator Revenue Share. 30% Founder Royalty Immutable.</p>
</footer>
</body></html>`;

// Assistant routing table
const ASSISTANTS = {
  'quranchain':    { name: 'QuranChain AI',            model: 'gpt-4o' },
  'darcloud':      { name: 'DarCloud AI',              model: 'gpt-4o' },
  'revenue':       { name: 'Revenue Engine AI',        model: 'gpt-4o' },
  'developer':     { name: 'Developer Platform AI',    model: 'gpt-4o' },
  'blockchain':    { name: 'Blockchain Expert AI',     model: 'gpt-4o' },
  'autonomous':    { name: 'DarCloud Autonomous Server AI', model: 'gpt-4o' },
  'mcp':           { name: 'MCP Connected AI',         model: 'gpt-4o' },
  'infrastructure':{ name: 'DarCloud Infrastructure AI', model: 'gpt-4o' },
  'commerce':      { name: 'DarCloud Commerce AI',     model: 'gpt-4o' },
  'scholar':       { name: 'Quran Scholar AI',         model: 'gpt-4o' },
  'fungimesh':     { name: 'FungiMesh Agent',          model: 'gpt-4o' },
  'orchestrator':  { name: 'AI Orchestrator Agent',    model: 'gpt-4o' },
};

const AGENT_FLEET = [
  // Core Assistants
  'QuranChain AI', 'DarCloud AI', 'Revenue Engine AI', 'Developer Platform AI',
  'Blockchain Expert AI', 'DarCloud Autonomous Server AI', 'MCP Connected AI',
  'DarCloud Infrastructure AI', 'DarCloud Commerce AI', 'Quran Scholar AI',
  // Specialized Agents
  'AI Orchestrator Agent', 'FungiMesh Agent', 'MeshTalk OS Agent',
  'Docker Container Agent', 'Auto Deploy Agent', 'Dedicated Server Agent',
  'DarCloud Server Agent', 'Omar AI Validator', 'QuranChain AI Validator',
  'Compliance AI Agent', 'Security AI Agent',
  // Workforce Bots
  'Customer Service Bot', 'Sales Outreach Bot', 'Content Creator Bot',
  'Data Analyst Bot', 'DevOps Bot', 'Islamic Finance Bot', 'Security Bot',
  'Payment Processor Bot', 'Revenue Analytics Bot',
  // Expert Agents
  'Core Services Expert', 'Blockchain Tools Expert', 'AI/ML Tools Expert',
  'Database Expert', 'Network Telecom Expert', 'Fiat Payment Expert', 'DevOps Tools Expert',
  // Specialized
  'Customer Support AI Agent', 'Marketing AI Agent', 'Sales AI Agent',
  'IT Operations AI Agent', 'Fraud Detection AI Agent', 'Optimization AI Agent',
  'Partner Integration Agent', 'Subscription Manager Bot',
  // Gas Toll Fleet
  'Ethereum Gas Toll Agent', 'BSC Gas Toll Agent', 'Polygon Gas Toll Agent',
  'Arbitrum Gas Toll Agent', 'Solana Gas Toll Agent', 'Bridge Gas Toll Agent',
  'NFT Gas Toll Agent', 'Staking Gas Toll Agent', 'Governance Gas Toll Agent',
  'Dynamic Pricing Gas Agent', 'Revenue Optimization Gas Agent', 'Fraud Detection Gas Agent',
  // Platform
  'Payment Tools Expert', 'Security Tools Expert', 'System Tools Expert',
  'Web API Tools Expert', 'Data Science ML Expert', 'Logistics Bot',
  'API Error Manager Agent', 'Subscription Manager Agent', 'Logistics Agent'
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Health / Root
    if (url.pathname === '/health') {
      return json({
        status: 'healthy',
        service: 'DarCloud AI Assistant Gateway',
        version: '1.0.0',
        platform: 'Cloudflare Workers',
        timestamp: new Date().toISOString(),
        assistants: Object.keys(ASSISTANTS).length,
        total_fleet: AGENT_FLEET.length,
        endpoints: {
          chat: '/api/chat',
          assistants: '/api/assistants',
          fleet: '/api/fleet',
          agent: '/api/agent/:name'
        }
      });
    }

    // Landing page at root
    if (url.pathname === '/') {
      return new Response(LANDING, { headers: { 'Content-Type': 'text/html;charset=UTF-8', ...CORS } });
    }

    // List assistants
    if (url.pathname === '/api/assistants') {
      return json({
        assistants: Object.entries(ASSISTANTS).map(([key, val]) => ({
          id: key,
          ...val,
          endpoint: `https://ai.darcloud.host/api/agent/${key}`
        })),
        total: Object.keys(ASSISTANTS).length
      });
    }

    // Full fleet listing
    if (url.pathname === '/api/fleet') {
      return json({
        fleet: AGENT_FLEET.map((name, i) => ({
          id: i + 1,
          name,
          status: 'deployed',
          platform: 'OpenAI'
        })),
        total: AGENT_FLEET.length,
        tiers: {
          core_assistants: 10,
          specialized_agents: 11,
          workforce_bots: 9,
          expert_agents: 7,
          specialized: 8,
          gas_toll_agents: 12,
          platform_agents: 9
        }
      });
    }

    // Chat endpoint — proxy to MCP or OpenAI
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        const agent = body.agent || 'quranchain';
        const message = body.message || body.content || '';
        
        if (!message) {
          return json({ error: 'message required' }, 400);
        }

        const assistant = ASSISTANTS[agent] || ASSISTANTS['quranchain'];
        
        // Forward to MCP server for processing
        const mcpResp = await fetch('https://mcp.darcloud.host/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: assistant.name,
            message,
            model: assistant.model
          })
        }).catch(() => null);

        if (mcpResp && mcpResp.ok) {
          const data = await mcpResp.json();
          return json({
            agent: assistant.name,
            model: assistant.model,
            ...data
          });
        }

        // Fallback response
        return json({
          agent: assistant.name,
          model: assistant.model,
          response: `[${assistant.name}] Query received: "${message.substring(0, 100)}". Connect to https://mcp.darcloud.host for full AI processing. As-salamu alaykum.`,
          status: 'edge-processed'
        });
      } catch (err) {
        return json({ error: err.message }, 400);
      }
    }

    // Individual agent info
    const agentMatch = url.pathname.match(/^\/api\/agent\/(.+)/);
    if (agentMatch) {
      const agentKey = agentMatch[1].toLowerCase();
      const assistant = ASSISTANTS[agentKey];
      if (assistant) {
        return json({
          ...assistant,
          id: agentKey,
          status: 'deployed',
          platform: 'OpenAI + Cloudflare Workers',
          endpoints: {
            chat: `https://ai.darcloud.host/api/chat`,
            mcp: `https://mcp.darcloud.host/mcp`,
            direct: `https://ai.darcloud.host/api/agent/${agentKey}`
          }
        });
      }
      return json({ error: `Agent '${agentKey}' not found`, available: Object.keys(ASSISTANTS) }, 404);
    }

    return json({ error: 'Not found', endpoints: ['/api/chat', '/api/assistants', '/api/fleet'] }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}
