/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * DarCloud Revenue Worker — Edge Revenue Tracking & Webhook Handler
 * Handles Stripe webhooks, gas toll tracking, and revenue analytics at the edge
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Stripe-Signature',
};

const FOUNDER_ROYALTY_RATE = 0.30; // IMMUTABLE — 30% founder royalty

const REVENUE_DISTRIBUTION = {
  founder: 0.30,
  ai_validators: 0.40,
  hardware_hosts: 0.10,
  ecosystem: 0.18,
  zakat: 0.02,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Health
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        status: 'healthy',
        service: 'DarCloud Revenue Engine',
        version: '1.0.0',
        platform: 'Cloudflare Workers',
        founder_royalty: '30% (immutable)',
        revenue_streams: ['gas_tolls', 'fiat_payments', 'subscriptions', 'enterprise', 'network_provider'],
        distribution: REVENUE_DISTRIBUTION,
      });
    }

    // Revenue dashboard
    if (url.pathname === '/api/revenue' || url.pathname === '/api/dashboard') {
      // Fetch live data from origin
      let liveData = null;
      try {
        const resp = await fetch('https://blockchain.darcloud.host/health');
        if (resp.ok) liveData = await resp.json();
      } catch(e) {}

      const gasToll = liveData?.gasTollHighway || {};
      
      return json({
        timestamp: new Date().toISOString(),
        revenue_streams: {
          gas_tolls: {
            total_collected: gasToll.totalCollected || 0,
            founder_royalty: gasToll.founderRoyalty || 0,
            networks_monitored: gasToll.totalNetworks || 47,
            toll_rate: gasToll.tollRate || '0.1%',
          },
          fiat_payments: {
            processor: 'Stripe (Live)',
            endpoint: 'https://payments.darcloud.host',
            status: 'active',
          },
          subscriptions: {
            endpoint: 'https://billing.darcloud.host',
            tiers: ['Starter', 'Professional', 'Enterprise', 'Unlimited'],
          },
          enterprise: {
            endpoint: 'https://enterprise.darcloud.host',
            services: ['billing', 'analytics', 'compliance', 'sla', 'provisioning'],
          },
        },
        distribution: {
          ...REVENUE_DISTRIBUTION,
          note: '30% Founder Royalty is IMMUTABLE'
        },
        total_agents: 63,
        blockchain_networks: 47,
      });
    }

    // Stripe webhook handler
    if (url.pathname === '/api/webhooks/stripe' && request.method === 'POST') {
      try {
        const body = await request.json();
        const eventType = body.type || 'unknown';
        
        // Log and forward to origin
        ctx.waitUntil(
          fetch('https://revenue.darcloud.host/webhooks/stripe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).catch(() => {})
        );

        return json({
          received: true,
          event: eventType,
          timestamp: new Date().toISOString(),
          founder_royalty_applied: FOUNDER_ROYALTY_RATE,
        });
      } catch(e) {
        return json({ error: 'Invalid webhook payload' }, 400);
      }
    }

    // Gas toll status
    if (url.pathname === '/api/gas-toll') {
      let data = null;
      try {
        const resp = await fetch('https://blockchain.darcloud.host/health');
        if (resp.ok) data = await resp.json();
      } catch(e) {}

      return json({
        gas_toll_highway: data?.gasTollHighway || {
          status: 'active',
          total_networks: 47,
          toll_rate: '0.1%',
          founder_royalty_rate: '30%',
        },
        networks: [
          'Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Solana',
          'Avalanche', 'Optimism', 'Base', 'Fantom', 'Cronos',
          'NEAR', 'Cosmos', 'Polkadot', 'Cardano', 'Tron',
          'Algorand', 'Tezos', 'Stellar', 'Hedera', 'Harmony'
        ],
        distribution: REVENUE_DISTRIBUTION,
      });
    }

    // Proxy all other /api/* paths to origin server via tunnel
    if (url.pathname.startsWith('/api/')) {
      try {
        const originUrl = `https://darcloud.host${url.pathname}${url.search}`;
        const resp = await fetch(originUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== 'GET' ? await request.arrayBuffer() : undefined,
        });
        const body = await resp.text();
        return new Response(body, {
          status: resp.status,
          headers: { ...CORS, 'Content-Type': resp.headers.get('Content-Type') || 'application/json' },
        });
      } catch(e) {
        return json({ error: 'Origin unavailable', detail: e.message }, 502);
      }
    }

    return json({ error: 'Not found', endpoints: ['/api/revenue', '/api/gas-toll', '/api/webhooks/stripe', '/api/*'] }, 404);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}
