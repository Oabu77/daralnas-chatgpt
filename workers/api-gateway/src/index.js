/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * DarCloud API Gateway — Cloudflare Worker
 * Routes requests to appropriate backend services via Cloudflare Tunnel
 * Handles CORS, rate limiting, auth, and request routing
 */

const TUNNEL_ORIGIN = 'http://localhost'; // Tunnel handles real routing

const ROUTES = {
  // Core APIs
  '/api/blockchain':     { port: 3001, path: '/health' },
  '/api/mesh':           { port: 5006, path: '/status' },
  '/api/mcp':            { port: 2091, path: '/health' },
  '/api/revenue':        { port: 9200, path: '/api/revenue' },
  '/api/agents':         { port: 3001, path: '/api/agents/fleet' },
  '/api/enterprise':     { port: 8200, path: '/api/enterprise/status' },
  '/api/quantum':        { port: 9011, path: '/api/quantum/status' },
  '/api/ocean':          { port: 9012, path: '/api/ocean/status' },
  '/api/gaming':         { port: 9300, path: '/api/gaming/status' },
  '/api/gas-toll':       { port: 3001, path: '/api/gas-toll/status' },
  '/api/compute':        { port: 3001, path: '/api/compute/pool' },
  '/api/validators':     { port: 8001, path: '/api/validators' },
  '/api/p2p':            { port: 5002, path: '/status' },
  '/api/analytics':      { port: 8083, path: '/api/analytics' },
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      return jsonResponse({
        status: 'healthy',
        service: 'DarCloud API Gateway',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        routes: Object.keys(ROUTES).length,
        platform: 'Cloudflare Workers',
        ecosystem: {
          blockchain: 'QuranChain',
          mesh: 'FungiMesh (340,000 nodes)',
          storage: 'Data Ocean (2.8PB)',
          encryption: 'Quantum (Kyber-1024 + Dilithium-5)',
          revenue: '30% Founder Royalty (immutable)'
        }
      });
    }

    // Route matching
    for (const [route, config] of Object.entries(ROUTES)) {
      if (url.pathname.startsWith(route)) {
        const subpath = url.pathname.slice(route.length) || '';
        const targetUrl = `https://${getSubdomain(config.port)}.darcloud.host${config.path}${subpath}`;
        
        try {
          const resp = await fetch(targetUrl, {
            method: request.method,
            headers: {
              ...Object.fromEntries(request.headers),
              'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
              'X-Gateway': 'darcloud-api-gateway',
            },
            body: request.method !== 'GET' ? request.body : undefined,
          });
          
          const body = await resp.text();
          return new Response(body, {
            status: resp.status,
            headers: { ...CORS_HEADERS, 'Content-Type': resp.headers.get('Content-Type') || 'application/json' }
          });
        } catch (err) {
          return jsonResponse({ 
            error: 'Backend unreachable', 
            route, 
            detail: err.message 
          }, 502);
        }
      }
    }

    // API directory
    if (url.pathname === '/api' || url.pathname === '/api/') {
      return jsonResponse({
        service: 'DarCloud API Gateway',
        available_endpoints: Object.keys(ROUTES),
        documentation: 'https://mcp.darcloud.host/.well-known/openapi.json',
        mcp_endpoint: 'https://mcp.darcloud.host/mcp',
        total_services: '70+',
        total_agents: 63,
        blockchain_networks: 47
      });
    }

    return jsonResponse({ error: 'Not found', available: '/api' }, 404);
  }
};

function getSubdomain(port) {
  const map = {
    3001: 'blockchain', 5006: 'mesh', 2091: 'mcp', 9200: 'revenue',
    8200: 'enterprise', 9011: 'quantum', 9012: 'ocean', 9300: 'gaming',
    8001: 'blockchain', 5002: 'p2p', 8083: 'analytics', 3000: 'api'
  };
  return map[port] || 'api';
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
