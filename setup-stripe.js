/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
require('dotenv').config();
const stripeService = require('./src/services/stripeService');

async function setupStripeProducts() {
  console.log('Setting up Stripe products for QuranChain-OS...');

  const products = [
    // === QURANCHAIN OS CORE ===
    {
      name: 'QuranChain OS Core Subscription',
      description: 'Access to QuranChain-OS platform with basic features',
      price: 10000, // $100/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'core', platform: 'quranchain' }
    },
    {
      name: 'AI Agent Service',
      description: 'Per-agent subscription for autonomous AI workforce',
      price: 5000, // $50/month per agent
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'ai_agent', platform: 'quranchain' }
    },
    {
      name: 'CRM System Access',
      description: 'Customer relationship management system',
      price: 2000, // $20/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'crm', platform: 'quranchain' }
    },
    {
      name: 'Offline Gas Toll Service',
      description: 'Automated gas toll payment processing',
      price: 500, // $5 per toll
      currency: 'usd',
      metadata: { type: 'one_time', service: 'gas_toll', platform: 'quranchain' }
    },
    {
      name: 'Network Provider Service',
      description: 'Mobile network provider integration and billing',
      price: 1000, // $10/month per user
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'network', platform: 'quranchain' }
    },
    {
      name: 'Fiat Payment Processing Fee',
      description: 'ACH payment processing fee (2.9% + $0.30)',
      metadata: { type: 'fee', service: 'fiat_processing', platform: 'quranchain' }
    },
    {
      name: 'Crypto Payment Processing',
      description: 'Blockchain transaction processing with 1% fee',
      metadata: { type: 'fee', service: 'crypto_processing', platform: 'quranchain' }
    },

    // === DARCLOUD WEB HOSTING ===
    {
      name: 'DarCloud Web Hosting - Starter',
      description: 'Basic web hosting with 10GB storage, 1 website, SSL included, 100GB bandwidth',
      price: 499, // $4.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'web_hosting_starter', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Web Hosting - Business',
      description: 'Business hosting with 50GB storage, 10 websites, SSL, CDN, 500GB bandwidth, WordPress support',
      price: 1499, // $14.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'web_hosting_business', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Web Hosting - Enterprise',
      description: 'Enterprise hosting with unlimited storage, unlimited websites, SSL, CDN, dedicated IP, priority support',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'web_hosting_enterprise', platform: 'darcloud' }
    },

    // === DARCLOUD DOMAIN REGISTRATION ===
    {
      name: 'DarCloud Domain Registration - .com',
      description: 'Register a .com domain for 1 year with WHOIS privacy, DNS management, and auto-renewal',
      price: 1299, // $12.99/year
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { type: 'subscription', service: 'domain_com', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Domain Registration - .net/.org',
      description: 'Register a .net or .org domain for 1 year with WHOIS privacy and DNS management',
      price: 1499, // $14.99/year
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { type: 'subscription', service: 'domain_net_org', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Domain Registration - .io/.dev/.app',
      description: 'Register premium TLD domain for 1 year with WHOIS privacy and DNS management',
      price: 3499, // $34.99/year
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { type: 'subscription', service: 'domain_premium', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Domain Registration - .host/.cloud',
      description: 'Register .host or .cloud domain for 1 year with WHOIS privacy and DNS management',
      price: 499, // $4.99/year
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { type: 'subscription', service: 'domain_host_cloud', platform: 'darcloud' }
    },

    // === DARCLOUD CLOUD COMPUTING ===
    {
      name: 'DarCloud Cloud Storage - Pay As You Go',
      description: 'S3-compatible cloud storage at $0.023/GB/month with encryption and CDN',
      price: 999, // $9.99/month base (includes 100GB)
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'cloud_storage', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Personal Cloud - Basic',
      description: 'Personal cloud storage with 100GB, file sync, device backup, cross-platform access',
      price: 999, // $9.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'personal_cloud_basic', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Personal Cloud - Pro',
      description: 'Personal cloud with 1TB storage, priority sync, advanced sharing, collaboration tools',
      price: 2499, // $24.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'personal_cloud_pro', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Personal Cloud - Family',
      description: 'Family cloud with 2TB storage, 6 user accounts, shared albums, family vault',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'personal_cloud_family', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Autonomous Server',
      description: 'EC2-like compute instance with auto-scaling, monitoring, and self-healing capabilities',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'autonomous_server', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Dedicated Server',
      description: 'Dedicated bare-metal server with full root access, 8 vCPU, 32GB RAM, 500GB SSD',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'dedicated_server', platform: 'darcloud' }
    },

    // === DARCLOUD CDN & NETWORK ===
    {
      name: 'DarCloud CDN Distribution',
      description: 'Global CDN with 1440+ edge servers, DDoS protection, real-time analytics, $0.085/GB',
      price: 1999, // $19.99/month base
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'cdn', platform: 'darcloud' }
    },
    {
      name: 'DarCloud SSL Certificate - Standard',
      description: 'Standard SSL/TLS certificate with auto-renewal and installation',
      price: 6900, // $69/year
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { type: 'subscription', service: 'ssl_standard', platform: 'darcloud' }
    },

    // === DARCLOUD EMAIL & COMMUNICATION ===
    {
      name: 'DarCloud Mail Service - Business',
      description: 'Professional email hosting with custom domain, 50GB mailbox, spam filtering, calendar',
      price: 599, // $5.99/month per mailbox
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'mail_business', platform: 'darcloud' }
    },

    // === DARCLOUD BLOCKCHAIN & AI ===
    {
      name: 'DarCloud Blockchain Storage',
      description: 'Decentralized blockchain-backed storage with SHA-256 verification across 47 networks',
      price: 1999, // $19.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'blockchain_storage', platform: 'darcloud' }
    },
    {
      name: 'DarCloud AI Agent School',
      description: 'AI agent training and deployment platform with autonomous workforce management',
      price: 7999, // $79.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'ai_school', platform: 'darcloud' }
    },

    // === DARCLOUD LICENSING ===
    {
      name: 'DarCloud Software License - Basic',
      description: 'Software licensing and distribution with key management and activation tracking',
      price: 999, // $9.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'licensing_basic', platform: 'darcloud' }
    },
    {
      name: 'DarCloud Mesh Deployer',
      description: 'Automated deployment across mesh network with canary releases and rollback',
      price: 2499, // $24.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'mesh_deployer', platform: 'darcloud' }
    },

    // ============================================================
    // === OLIVEAIR LOGISTICS ===
    // ============================================================

    // --- CORE LOGISTICS OPERATIONS ---
    {
      name: 'OliveAir Logistics - Freight Brokering',
      description: 'AI-powered freight brokering with shipment-contractor matching, dispatch optimization, and revenue analytics',
      price: 49900, // $499/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'freight_brokering', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Logistics - Small Business',
      description: 'Small business logistics with up to 100 shipments/month, route optimization, and real-time tracking',
      price: 9900, // $99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'logistics_small', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Logistics - Enterprise',
      description: 'Enterprise logistics with unlimited shipments, 26 AI agents, fleet management, dynamic pricing, and full analytics suite',
      price: 199900, // $1,999/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'logistics_enterprise', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Per-Shipment Fee',
      description: 'Per-shipment processing fee for on-demand logistics (avg $18.75/shipment)',
      price: 1875, // $18.75 per shipment
      currency: 'usd',
      metadata: { type: 'one_time', service: 'per_shipment', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Contractor Recruitment',
      description: 'AI-powered contractor recruitment, onboarding, and performance management platform',
      price: 29900, // $299/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'contractor_recruitment', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Dispatch & Route Optimization',
      description: 'AI dispatch with real-time route optimization, 18.5% efficiency improvement, and fuel savings',
      price: 39900, // $399/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'dispatch_optimization', platform: 'oliveair' }
    },

    // --- FLEET MANAGEMENT ---
    {
      name: 'OliveAir Fleet Management',
      description: 'Vehicle tracking, GPS monitoring, preventive maintenance, and fuel optimization for up to 100 vehicles',
      price: 49900, // $499/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'fleet_management', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Fleet Management - Enterprise',
      description: 'Unlimited fleet management with insurance claims AI, 99.8% GPS coverage, predictive maintenance',
      price: 149900, // $1,499/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'fleet_enterprise', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Dynamic Pricing Engine',
      description: 'AI-powered dynamic pricing with surge control, 22.5% revenue increase, 2,850 daily price adjustments',
      price: 59900, // $599/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'dynamic_pricing', platform: 'oliveair' }
    },

    // --- COMPLIANCE & PARTNERSHIPS ---
    {
      name: 'OliveAir Compliance & Customs Automation',
      description: 'Regulatory compliance, customs clearance automation, 99.6% compliance rate, documentation management',
      price: 19900, // $199/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'compliance_customs', platform: 'oliveair' }
    },
    {
      name: 'OliveAir 3PL Integration Hub',
      description: '28+ third-party logistics provider integrations, 850K API calls/day, carrier relationship management',
      price: 39900, // $399/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: '3pl_integration', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Real-Time Tracking API',
      description: 'Real-time shipment tracking API with 12,000+ shipments, 99.8% accuracy, webhook notifications',
      price: 14900, // $149/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'tracking_api', platform: 'oliveair' }
    },

    // ============================================================
    // === LAST-MILE DELIVERY ===
    // ============================================================
    {
      name: 'OliveAir Last-Mile Delivery - Starter',
      description: 'Last-mile delivery optimization for up to 500 deliveries/month, 97% success rate, POD verification',
      price: 9900, // $99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'lastmile_starter', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Last-Mile Delivery - Business',
      description: 'Up to 2,500 deliveries/month with unloading optimization, 2.3hr average delivery, customer satisfaction tracking',
      price: 29900, // $299/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'lastmile_business', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Last-Mile Delivery - Enterprise',
      description: 'Unlimited deliveries with full last-mile AI suite: optimization, unloading, POD, returns processing, retention programs',
      price: 99900, // $999/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'lastmile_enterprise', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Per-Delivery Fee',
      description: 'Pay-per-delivery processing with last-mile AI optimization and proof of delivery',
      price: 299, // $2.99 per delivery
      currency: 'usd',
      metadata: { type: 'one_time', service: 'per_delivery', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Returns Processing',
      description: 'AI-powered returns and refund processing, 87% approval rate, reverse logistics management',
      price: 14900, // $149/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'returns_processing', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Customer Retention Suite',
      description: 'Customer satisfaction monitoring, loyalty programs, 95.8% retention rate, NPS scoring',
      price: 19900, // $199/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'customer_retention', platform: 'oliveair' }
    },

    // ============================================================
    // === CARGO SHIPPING (OliveSea Maritime & Freight) ===
    // ============================================================

    // --- MARITIME SHIPPING ---
    {
      name: 'OliveSea Maritime Shipping - Standard',
      description: 'Ocean container shipping with blockchain bill of lading, vessel tracking, and port coordination',
      price: 99900, // $999/month base
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'maritime_standard', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Maritime Shipping - Enterprise',
      description: 'Full maritime fleet access with AI-optimized routing, transpacific/transatlantic/Middle East routes, priority port clearance',
      price: 499900, // $4,999/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'maritime_enterprise', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Container Shipping - 20ft FCL',
      description: 'Full 20ft container load shipping, port-to-port or door-to-door, blockchain-tracked',
      price: 250000, // $2,500 per container
      currency: 'usd',
      metadata: { type: 'one_time', service: 'container_20ft', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Container Shipping - 40ft FCL',
      description: 'Full 40ft container load shipping with enhanced capacity, blockchain cargo tracking',
      price: 450000, // $4,500 per container
      currency: 'usd',
      metadata: { type: 'one_time', service: 'container_40ft', platform: 'olivesea' }
    },
    {
      name: 'OliveSea LCL Consolidation',
      description: 'Less-than-container-load cargo consolidation at $45/CBM, shared container shipping',
      price: 4500, // $45 per CBM
      currency: 'usd',
      metadata: { type: 'one_time', service: 'lcl_consolidation', platform: 'olivesea' }
    },

    // --- CARGO FREIGHT FORWARDING ---
    {
      name: 'OliveSea Freight Forwarding - Standard',
      description: 'International freight forwarding with customs coordination, LCL/FCL, multimodal options',
      price: 49900, // $499/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'freight_forwarding', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Freight Forwarding - Enterprise',
      description: 'Full freight forwarding suite with OliveAir multimodal, priority customs, warehousing, insurance',
      price: 249900, // $2,499/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'freight_enterprise', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Refrigerated Cargo',
      description: 'Temperature-controlled refrigerated cargo shipping at $75/CBM with cold chain tracking',
      price: 7500, // $75 per CBM
      currency: 'usd',
      metadata: { type: 'one_time', service: 'refrigerated_cargo', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Dangerous Goods Shipping',
      description: 'Hazmat and dangerous goods shipping at $95/CBM with IMDG compliance and safety documentation',
      price: 9500, // $95 per CBM
      currency: 'usd',
      metadata: { type: 'one_time', service: 'dangerous_goods', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Oversized Cargo',
      description: 'Oversized and breakbulk cargo shipping at $120/CBM with custom rigging and crane operations',
      price: 12000, // $120 per CBM
      currency: 'usd',
      metadata: { type: 'one_time', service: 'oversized_cargo', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Bulk Cargo',
      description: 'Bulk commodity shipping at $35/CBM for raw materials, grains, and minerals',
      price: 3500, // $35 per CBM
      currency: 'usd',
      metadata: { type: 'one_time', service: 'bulk_cargo', platform: 'olivesea' }
    },

    // --- SUPPLY CHAIN & WAREHOUSING ---
    {
      name: 'OliveSea Cargo Insurance',
      description: 'Comprehensive cargo insurance at 2% of declared value with AI claims processing',
      metadata: { type: 'fee', service: 'cargo_insurance', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Customs Clearance',
      description: 'Full customs clearance service with 3% customs bond, documentation, and compliance automation',
      price: 29900, // $299 per clearance
      currency: 'usd',
      metadata: { type: 'one_time', service: 'customs_clearance', platform: 'olivesea' }
    },
    {
      name: 'OliveSea Blockchain Cargo Tracking',
      description: 'SHA-256 blockchain-verified cargo tracking at 0.5% of shipment value, immutable audit trail',
      price: 9900, // $99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'blockchain_tracking', platform: 'olivesea' }
    },

    // --- DAR LOGISTICS (Halal Supply Chain) ---
    {
      name: 'Dar Logistics - Halal Supply Chain',
      description: 'Islamic-compliant halal supply chain management with Shariah-certified warehousing in Dubai, Riyadh, Jeddah, Istanbul',
      price: 79900, // $799/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'halal_supply_chain', platform: 'dar_logistics' }
    },
    {
      name: 'Dar Logistics - Warehousing',
      description: 'Halal-certified warehousing with cross-docking, customs, and packaging across 4 global hubs (155,000 sqm total)',
      price: 49900, // $499/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'warehousing', platform: 'dar_logistics' }
    },
    {
      name: 'Dar Logistics - Global Shipping',
      description: 'Door-to-door international shipping with real-time tracking, blockchain verification, and Zakat-compliant billing',
      price: 29900, // $299/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'global_shipping', platform: 'dar_logistics' }
    },

    // --- INTEGRATED CARRIER SERVICES ---
    {
      name: 'OliveAir Carrier Integration - FedEx/UPS/DHL',
      description: 'Integrated parcel/express shipping via FedEx, UPS, and DHL with unified API and rate comparison',
      price: 19900, // $199/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'carrier_express', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Carrier Integration - Ocean Lines',
      description: 'Integrated ocean shipping via Maersk, CMA CGM, Hapag-Lloyd with booking and container tracking',
      price: 39900, // $399/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'carrier_ocean', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Air-Sea Multimodal',
      description: 'Combined air and sea shipping via OliveAir + OliveSea for fastest transit with cost optimization',
      price: 59900, // $599/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'multimodal_airsea', platform: 'oliveair' }
    },
    {
      name: 'OliveAir Supply Chain Analytics',
      description: 'Full supply chain analytics with route optimization, predictive maintenance, and blockchain tracking integration',
      price: 29900, // $299/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'supply_chain_analytics', platform: 'oliveair' }
    },

    // --- PORT OPERATIONS ---
    {
      name: 'OliveSea Port Operations Platform',
      description: 'Port authority integration across 10 major hubs (163M TEU capacity) with customs and terminal coordination',
      price: 99900, // $999/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'port_operations', platform: 'olivesea' }
    },

    // ============================================================
    // === MESHTALK OS - TELECOM & DATA SERVICES ===
    // ============================================================

    // --- CELLULAR PHONE PLANS (USA) ---
    {
      name: 'MeshTalk Cell - Personal Basic',
      description: '2GB data, 500 minutes voice, nationwide 5G coverage, mesh-enhanced rural connectivity',
      price: 1999, // $19.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'cell_personal_basic', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Cell - Personal Standard',
      description: '10GB data, unlimited voice & SMS, 5G nationwide, hotspot included',
      price: 3999, // $39.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'cell_personal_standard', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Cell - Personal Premium',
      description: 'Unlimited data, voice & SMS, 5G/6G priority, international roaming, HD streaming',
      price: 5999, // $59.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'cell_personal_premium', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Cell - Family Plan',
      description: 'Up to 5 lines, shared 50GB data, unlimited voice, family controls, 5G coverage',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'cell_family', platform: 'meshtalk' }
    },

    // --- BUSINESS TELECOM PLANS ---
    {
      name: 'MeshTalk Business - Starter',
      description: '50 users, 100GB shared data, unlimited voice, cloud PBX, 99.9% SLA',
      price: 9900, // $99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'biz_starter', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Business - Professional',
      description: '200 users, 500GB dedicated data, unlimited voice, VPN, advanced PBX, priority support',
      price: 29900, // $299/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'biz_professional', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Business - Enterprise',
      description: 'Unlimited users & data, dedicated SLA, global roaming, custom integrations, 24/7 support',
      price: 99900, // $999/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'biz_enterprise', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Global Enterprise',
      description: 'Custom global telecom with 200+ country coverage, dedicated infrastructure, white-glove support',
      price: 250000, // $2,500/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'global_enterprise', platform: 'meshtalk' }
    },

    // --- INTERNET & BROADBAND ---
    {
      name: 'MeshTalk Internet - Home Basic',
      description: '100 Mbps fiber broadband, unlimited data, WiFi 6 router included, mesh network ready',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'internet_home_basic', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Internet - Home Premium',
      description: '1 Gbps fiber broadband, unlimited data, WiFi 6E mesh system, smart home integration',
      price: 7999, // $79.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'internet_home_premium', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Internet - Business',
      description: '10 Gbps dedicated fiber, static IPs, SLA-backed uptime, enterprise router, DDoS protection',
      price: 29900, // $299/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'internet_business', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Mobile Hotspot',
      description: 'Portable 5G hotspot device with 50GB monthly data, connects up to 30 devices',
      price: 3999, // $39.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'mobile_hotspot', platform: 'meshtalk' }
    },

    // --- MESHTALK OS WIRELESS PROTOCOLS ---
    {
      name: 'MeshTalk OS - Open5G Node License',
      description: 'Open5G mesh node license with TLS 1.3 encryption, 43-node global network, carrier-grade security',
      price: 49900, // $499/month per node
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'open5g_node', platform: 'meshtalk_os' }
    },
    {
      name: 'MeshTalk OS - WiFi 6 Mesh License',
      description: 'WiFi 6 (802.11ax) mesh network node with WPA3-Enterprise, enterprise security mode',
      price: 19900, // $199/month per node
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'wifi6_mesh', platform: 'meshtalk_os' }
    },
    {
      name: 'MeshTalk OS - Bluetooth 5.2 IoT Hub',
      description: 'Bluetooth 5.2 LE-Secure-Connections hub for IoT device management, up to 200 concurrent devices',
      price: 9900, // $99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'bluetooth_iot', platform: 'meshtalk_os' }
    },
    {
      name: 'MeshTalk OS - FM Radio Broadcast License',
      description: 'FM radio broadcast node with AES-256-GCM encryption, 88.1-104.9 MHz, emergency broadcast capable',
      price: 14900, // $149/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'fm_broadcast', platform: 'meshtalk_os' }
    },
    {
      name: 'MeshTalk OS - Full Protocol Bundle',
      description: 'All 4 protocols (Open5G + WiFi6 + Bluetooth5.2 + FM) per node, TLS 1.3, AES-256-GCM, auto-healing',
      price: 79900, // $799/month per node
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'full_protocol_bundle', platform: 'meshtalk_os' }
    },

    // --- GLOBAL ROAMING & INTERNATIONAL ---
    {
      name: 'MeshTalk Global - International Roaming',
      description: 'Seamless roaming across 200+ countries, 47 partner networks, no throttling or hidden fees',
      price: 2999, // $29.99/month add-on
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'global_roaming', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Global - International Calling',
      description: 'Unlimited international calls to 100+ countries, HD voice, conference calling included',
      price: 1999, // $19.99/month add-on
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'intl_calling', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Global - Data Roaming Pack',
      description: '10GB high-speed international data roaming across all partner networks, 30-day validity',
      price: 4999, // $49.99 per pack
      currency: 'usd',
      metadata: { type: 'one_time', service: 'data_roaming_pack', platform: 'meshtalk' }
    },

    // --- IOT & DEVICE CONNECTIVITY ---
    {
      name: 'MeshTalk IoT - Starter',
      description: 'IoT device connectivity for up to 100 devices, mesh network, real-time monitoring',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'iot_starter', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk IoT - Enterprise',
      description: 'Unlimited IoT devices, industrial sensors, fleet GPS, smart city infrastructure, custom protocols',
      price: 49900, // $499/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'iot_enterprise', platform: 'meshtalk' }
    },

    // --- DEVICES & HARDWARE ---
    {
      name: 'MeshTalk Mesh Phone',
      description: 'Custom mesh-enabled smartphone with Open5G, WiFi6, Bluetooth 5.2, FM, and mesh networking built-in',
      price: 59900, // $599 one-time
      currency: 'usd',
      metadata: { type: 'one_time', service: 'mesh_phone', platform: 'meshtalk_devices' }
    },
    {
      name: 'MeshTalk Mesh Router',
      description: 'Enterprise mesh router with WiFi 6E, 5G backhaul, mesh node relay, covers 5,000 sqft',
      price: 29900, // $299 one-time
      currency: 'usd',
      metadata: { type: 'one_time', service: 'mesh_router', platform: 'meshtalk_devices' }
    },
    {
      name: 'MeshTalk Signal Booster',
      description: '5G/LTE signal booster with mesh relay, extends coverage up to 25,000 sqft, auto-configuration',
      price: 19900, // $199 one-time
      currency: 'usd',
      metadata: { type: 'one_time', service: 'signal_booster', platform: 'meshtalk_devices' }
    },
    {
      name: 'MeshTalk Emergency Communicator',
      description: 'Ruggedized emergency mesh communicator with satellite fallback, FM radio, 72-hour battery',
      price: 39900, // $399 one-time
      currency: 'usd',
      metadata: { type: 'one_time', service: 'emergency_comm', platform: 'meshtalk_devices' }
    },
    {
      name: 'MeshTalk IoT Gateway',
      description: 'IoT mesh gateway hub, connects 500+ sensors, Bluetooth/WiFi/LoRa/Zigbee, edge computing',
      price: 44900, // $449 one-time
      currency: 'usd',
      metadata: { type: 'one_time', service: 'iot_gateway', platform: 'meshtalk_devices' }
    },

    // --- CLOUD PBX & VOIP ---
    {
      name: 'MeshTalk Cloud PBX - Small Business',
      description: 'Cloud phone system for up to 25 extensions, auto-attendant, voicemail, call recording',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'cloud_pbx_small', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Cloud PBX - Enterprise',
      description: 'Enterprise PBX with unlimited extensions, IVR, CRM integration, analytics, 99.99% uptime SLA',
      price: 29900, // $299/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'cloud_pbx_enterprise', platform: 'meshtalk' }
    },
    {
      name: 'MeshTalk Business VPN',
      description: 'Enterprise VPN with AES-256 encryption, split tunneling, zero-trust architecture, global PoPs',
      price: 14900, // $149/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'business_vpn', platform: 'meshtalk' }
    },

    // ============================================================
    // === WHISPERNET - ENCRYPTED MESH COMMUNICATION ===
    // ============================================================
    {
      name: 'WhisperNet - Personal Secure',
      description: 'End-to-end encrypted mesh messaging with AES-256 + ChaCha20, anonymous communication, offline support',
      price: 999, // $9.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'personal_secure', platform: 'whispernet' }
    },
    {
      name: 'WhisperNet - Professional',
      description: 'Encrypted business communication with team channels, file sharing, voice/video, compliance logging',
      price: 2999, // $29.99/month per user
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'professional', platform: 'whispernet' }
    },
    {
      name: 'WhisperNet - Enterprise',
      description: 'Enterprise encrypted comms with unlimited users, custom encryption policies, SIEM integration, admin controls',
      price: 19900, // $199/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'enterprise', platform: 'whispernet' }
    },
    {
      name: 'WhisperNet Stealth VPN',
      description: 'Military-grade VPN with traffic obfuscation (Shadowsocks, V2Ray, Trojan, Obfs4), quantum-resistant encryption',
      price: 1499, // $14.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'stealth_vpn', platform: 'whispernet' }
    },
    {
      name: 'WhisperNet Stealth VPN - Business',
      description: 'Multi-user stealth VPN with 8 obfuscation protocols, carrier traffic disguise, zero-knowledge architecture',
      price: 9900, // $99/month for 25 users
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'stealth_vpn_business', platform: 'whispernet' }
    },
    {
      name: 'WhisperNet Stealth VPN - Enterprise',
      description: 'Enterprise stealth VPN with unlimited users, 350K+ device support, custom obfuscation, anti-detection AI',
      price: 49900, // $499/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'stealth_vpn_enterprise', platform: 'whispernet' }
    },
    {
      name: 'WhisperNet Mesh Relay Node',
      description: 'Dedicated mesh relay node for WhisperNet traffic, enhances network resilience and coverage',
      price: 9900, // $99/month per node
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'mesh_relay_node', platform: 'whispernet' }
    },
    {
      name: 'WhisperNet Secure File Vault',
      description: 'Zero-knowledge encrypted file storage with mesh distribution, 1TB capacity, military-grade encryption',
      price: 1999, // $19.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'secure_file_vault', platform: 'whispernet' }
    },
    {
      name: 'WhisperNet Anonymous Email',
      description: 'Encrypted anonymous email service with no metadata logging, onion routing, PGP built-in',
      price: 799, // $7.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'anonymous_email', platform: 'whispernet' }
    },
    {
      name: 'WhisperNet Secure Voice',
      description: 'End-to-end encrypted voice calls via mesh network with anti-eavesdropping and frequency hopping',
      price: 1499, // $14.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'secure_voice', platform: 'whispernet' }
    },

    // =====================================================================
    // DAR AL-NAS ISLAMIC BANKING
    // =====================================================================
    {
      name: 'Dar Al-Nas Savings Account',
      description: 'Sharia-compliant savings account with halal profit-sharing (no riba/interest) - 2.5% annual revenue share',
      price: 999, // $9.99/month account maintenance
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'savings_account', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Current Account',
      description: 'Islamic current/checking account with debit card, mobile banking, and zero-interest overdraft protection',
      price: 1499, // $14.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'current_account', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Investment Account',
      description: 'Halal investment account with Mudarabah/Musharakah profit-sharing, screened for Sharia compliance',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'investment_account', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Premium Banking',
      description: 'Premium Islamic banking with dedicated advisor, priority support, wealth management, and concierge services',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'premium_banking', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Business Banking',
      description: 'Islamic business banking with commercial accounts, payroll, merchant services, and halal trade financing',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'business_banking', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Wire Transfer',
      description: 'International halal wire transfer - Sharia-compliant cross-border remittance with blockchain verification',
      price: 2500, // $25.00 per transfer
      currency: 'usd',
      metadata: { type: 'one_time', service: 'wire_transfer', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // DAR AL-NAS HALAL MORTGAGES (MURABAHA)
    // =====================================================================
    {
      name: 'Dar Al-Nas Halal Mortgage - Starter',
      description: 'Murabaha home financing up to $300K - cost-plus profit model (no interest/riba), 30-year term, 3% markup',
      price: 49900, // $499.00 origination fee
      currency: 'usd',
      metadata: { type: 'one_time', service: 'halal_mortgage_starter', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Halal Mortgage - Standard',
      description: 'Murabaha home financing $300K-$750K - Sharia-verified cost-plus financing with property ownership transfer',
      price: 99900, // $999.00 origination fee
      currency: 'usd',
      metadata: { type: 'one_time', service: 'halal_mortgage_standard', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Halal Mortgage - Premium',
      description: 'Murabaha home financing $750K-$2M - luxury property financing with dedicated Sharia board verification',
      price: 199900, // $1,999.00 origination fee
      currency: 'usd',
      metadata: { type: 'one_time', service: 'halal_mortgage_premium', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Mortgage Processing',
      description: 'Monthly mortgage servicing fee for Murabaha contract management, payment processing, and compliance monitoring',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'mortgage_servicing', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // DAR AL-NAS TAKAFUL INSURANCE
    // =====================================================================
    {
      name: 'Dar Al-Nas Takaful Health Insurance',
      description: 'Islamic cooperative health insurance with community pool sharing - covers medical, dental, vision, Halal-certified providers',
      price: 7500, // $75.00/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'takaful_health', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Takaful Auto Insurance',
      description: 'Sharia-compliant auto insurance with cooperative risk-sharing, comprehensive coverage, and halal claims processing',
      price: 12500, // $125.00/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'takaful_auto', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Takaful Life Insurance',
      description: 'Islamic life/family Takaful with mutual protection, Sharia-compliant beneficiary terms, and sukuk-backed reserves',
      price: 15000, // $150.00/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'takaful_life', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Takaful Property Insurance',
      description: 'Islamic property insurance with cooperative risk pool, natural disaster coverage, and halal compliance verification',
      price: 20000, // $200.00/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'takaful_property', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Takaful Business Insurance',
      description: 'Commercial Takaful insurance for businesses - liability, equipment, inventory, and employee coverage with Sharia board approval',
      price: 50000, // $500.00/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'takaful_business', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // DAR AL-NAS HEALTHCARE SERVICES
    // =====================================================================
    {
      name: 'Dar Al-Nas Healthcare Basic',
      description: 'Halal-certified healthcare plan with consultations, preventive care, and Islamic medical center network access',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'healthcare_basic', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Healthcare Premium',
      description: 'Premium halal healthcare with specialist access, hospital coverage, mental health, and Islamic wellness programs',
      price: 14999, // $149.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'healthcare_premium', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Healthcare Family',
      description: 'Family halal healthcare plan covering up to 6 members - pediatrics, maternity, dental, and halal pharmaceutical coverage',
      price: 29999, // $299.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'healthcare_family', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Telehealth Consultation',
      description: 'On-demand halal-certified telehealth consultation with Islamic healthcare providers - per visit',
      price: 5000, // $50.00 per visit
      currency: 'usd',
      metadata: { type: 'one_time', service: 'telehealth_visit', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // DAR AL-NAS ZAKAT & SADAQAH SERVICES
    // =====================================================================
    {
      name: 'Dar Al-Nas Zakat Calculator & Distribution',
      description: 'Automated Zakat calculation (2.5% above Nisab), blockchain-verified distribution to eligible recipients with Sharia board oversight',
      price: 999, // $9.99 processing fee
      currency: 'usd',
      metadata: { type: 'one_time', service: 'zakat_processing', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Sadaqah Platform',
      description: 'Voluntary charitable giving platform with transparent blockchain tracking, verified recipients, and tax-deductible receipts',
      price: 500, // $5.00 processing fee
      currency: 'usd',
      metadata: { type: 'one_time', service: 'sadaqah_processing', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Waqf Endowment',
      description: 'Islamic endowment (Waqf) management - perpetual charitable trust with blockchain-recorded deed and automated income distribution',
      price: 49999, // $499.99 setup fee
      currency: 'usd',
      metadata: { type: 'one_time', service: 'waqf_endowment', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // DAR AL-NAS REAL ESTATE
    // =====================================================================
    {
      name: 'Dar Al-Nas Halal Property Search',
      description: 'Halal real estate search service with Zillow/Redfin integration - properties screened for Sharia-compliant investment',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'property_search', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Property Halal Certification',
      description: 'Sharia compliance verification for property investments - tenant screening, business use audit, and halal certification',
      price: 24999, // $249.99 per assessment
      currency: 'usd',
      metadata: { type: 'one_time', service: 'halal_certification', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Real Estate Investment Trust',
      description: 'Halal REIT membership - Sharia-screened property portfolio, quarterly profit distribution, blockchain-recorded ownership',
      price: 49999, // $499.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'halal_reit', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // MUSLIM WALLET
    // =====================================================================
    {
      name: 'Muslim Wallet Basic',
      description: 'Sharia-compliant digital wallet with halal transaction engine, QCN blockchain sync, and automated founder royalty routing',
      price: 499, // $4.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'muslim_wallet_basic', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Muslim Wallet Pro',
      description: 'Pro wallet with enhanced limits ($100K/month), JWT auth, ledger database, audit logging, and auto-heal supervisor',
      price: 1999, // $19.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'muslim_wallet_pro', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Muslim Wallet Enterprise',
      description: 'Enterprise wallet with unlimited transactions, dedicated API gateway, KYC/AML integration, multi-chain support, and 99.95% uptime SLA',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'muslim_wallet_enterprise', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Muslim Wallet Transaction Fee',
      description: 'Per-transaction processing fee for Muslim Wallet transfers - includes blockchain verification, halal tagging, and gas fee',
      price: 50, // $0.50 per transaction
      currency: 'usd',
      metadata: { type: 'one_time', service: 'wallet_tx_fee', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // DAR AL-NAS PUBLISHING & MEDIA
    // =====================================================================
    {
      name: 'Dar Al-Nas Author Publishing',
      description: 'Islamic publishing platform for authors - book publishing, distribution, royalty management, and digital media hosting',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'author_publishing', platform: 'dar_al_nas' }
    },
    {
      name: 'Dar Al-Nas Content Creator',
      description: 'Islamic content creation platform - video, audio, articles with halal ad network and blockchain-verified content ownership',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'content_creator', platform: 'dar_al_nas' }
    },
    {
      name: 'Dar Al-Nas Media Distribution',
      description: 'Global Islamic media distribution network - books, digital content, podcasts, and streaming to Muslim communities worldwide',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'media_distribution', platform: 'dar_al_nas' }
    },
    {
      name: 'Dar Al-Nas Enterprise License',
      description: 'Mega-tier enterprise licensing for Dar Al-Nas platform access - includes all services, API access, and white-label rights',
      price: 833333, // $8,333.33/month ($100K/year)
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'enterprise_license', platform: 'dar_al_nas', tier: 'mega' }
    },

    // =====================================================================
    // DAR AL-NAS FINANCIAL STRATEGY
    // =====================================================================
    {
      name: 'Dar Al-Nas Treasury Optimization',
      description: 'AI-powered Sharia-compliant treasury optimization - pool allocation, currency mix, Mudarabah/Musharakah modeling',
      price: 99999, // $999.99 per engagement
      currency: 'usd',
      metadata: { type: 'one_time', service: 'treasury_optimization', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Market Strategy',
      description: 'Islamic banking market entry strategy - regional analysis, competitor mapping, and halal product design consulting',
      price: 199999, // $1,999.99 per engagement
      currency: 'usd',
      metadata: { type: 'one_time', service: 'market_strategy', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Institution Evaluation',
      description: 'Bank and financial institution evaluation for acquisition, partnership, or market displacement - Sharia compliance audit included',
      price: 499999, // $4,999.99 per evaluation
      currency: 'usd',
      metadata: { type: 'one_time', service: 'institution_evaluation', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // DAR AL-NAS HALAL INVESTMENT PRODUCTS
    // =====================================================================
    {
      name: 'Dar Al-Nas Sukuk Bond',
      description: 'Islamic bond (Sukuk) investment - asset-backed securities with halal returns, Sharia-screened underlying assets',
      price: 100000, // $1,000.00 minimum investment
      currency: 'usd',
      metadata: { type: 'one_time', service: 'sukuk_bond', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Halal ETF Access',
      description: 'Access to Sharia-screened ETF portfolios - no alcohol, gambling, pork, or interest-bearing instruments',
      price: 3999, // $39.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'halal_etf', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Gold Savings',
      description: 'Sharia-compliant gold savings account - physical gold-backed, allocated storage, and on-demand delivery or trade',
      price: 1999, // $19.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'gold_savings', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // STRIPE ISSUING - CARD PRODUCTS
    // =====================================================================
    {
      name: 'Dar Al-Nas Debit Card - Standard',
      description: 'Halal Visa/Mastercard debit card linked to Dar Al-Nas banking - contactless, mobile wallet, ATM access, Sharia-compliant spending',
      price: 999, // $9.99/month card fee
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'debit_card_standard', platform: 'dar_al_nas', card_type: 'physical', issuing: 'true' }
    },
    {
      name: 'Dar Al-Nas Debit Card - Premium Metal',
      description: 'Premium metal halal debit card with airport lounge access, travel insurance, higher daily limits, and concierge services',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'debit_card_premium', platform: 'dar_al_nas', card_type: 'physical', issuing: 'true' }
    },
    {
      name: 'Dar Al-Nas Virtual Card',
      description: 'Instant virtual debit card for online purchases - single-use or recurring, spending limits, merchant category restrictions for halal compliance',
      price: 499, // $4.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'virtual_card', platform: 'dar_al_nas', card_type: 'virtual', issuing: 'true' }
    },
    {
      name: 'Dar Al-Nas Business Expense Card',
      description: 'Corporate expense card with department budgets, receipt capture, real-time spend controls, and halal merchant categories only',
      price: 1999, // $19.99/month per card
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'business_expense_card', platform: 'dar_al_nas', card_type: 'physical', issuing: 'true' }
    },
    {
      name: 'Dar Al-Nas Prepaid Card',
      description: 'Reloadable halal prepaid card - no credit, no riba, perfect for gifting, travel, and youth/student spending with parental controls',
      price: 599, // $5.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'prepaid_card', platform: 'dar_al_nas', card_type: 'physical', issuing: 'true' }
    },
    {
      name: 'Dar Al-Nas Card Issuance Fee',
      description: 'One-time card issuance and shipping fee for physical Dar Al-Nas debit or prepaid cards via Stripe Issuing',
      price: 1500, // $15.00 per card
      currency: 'usd',
      metadata: { type: 'one_time', service: 'card_issuance', platform: 'dar_al_nas', issuing: 'true' }
    },
    {
      name: 'Dar Al-Nas Card Replacement',
      description: 'Replacement card with expedited shipping for lost, stolen, or damaged Dar Al-Nas cards - includes instant virtual card while waiting',
      price: 2500, // $25.00 per replacement
      currency: 'usd',
      metadata: { type: 'one_time', service: 'card_replacement', platform: 'dar_al_nas', issuing: 'true' }
    },

    // =====================================================================
    // DAR AL-NAS SHARIA COMPLIANCE SERVICES
    // =====================================================================
    {
      name: 'Dar Al-Nas Sharia Compliance Audit',
      description: 'Full Sharia board audit and certification for financial products, transactions, and business operations - issued by certified scholars',
      price: 249999, // $2,499.99 per audit
      currency: 'usd',
      metadata: { type: 'one_time', service: 'sharia_audit', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },
    {
      name: 'Dar Al-Nas Sharia Advisory Retainer',
      description: 'Monthly Sharia board advisory retainer - ongoing compliance monitoring, fatwa consultations, and product approval reviews',
      price: 49999, // $499.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'sharia_advisory', platform: 'dar_al_nas', sharia_compliant: 'true' }
    },

    // =====================================================================
    // QURANCHAIN BLOCKCHAIN - CORE INFRASTRUCTURE
    // =====================================================================
    {
      name: 'QuranChain Layer 1 Node License',
      description: 'License to operate a QuranChain Layer 1 blockchain node (Cosmos SDK) - full validator capability, block production, and transaction processing',
      price: 99999, // $999.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'l1_node_license', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Validator Node - Standard',
      description: 'Standard validator node with 100K QURAN minimum stake, 10% commission, 5% APR staking rewards, 30% founder royalty on rewards',
      price: 49999, // $499.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'validator_standard', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Validator Node - Enterprise',
      description: 'Enterprise validator with priority block production, enhanced uptime SLA (99.99%), dedicated support, and multi-region failover',
      price: 199999, // $1,999.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'validator_enterprise', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Full Node Hosting',
      description: 'Managed full node hosting on DarCloud - automatic updates, monitoring, 32 CPU / 128GB RAM / 8TB SSD / 10Gbps bandwidth',
      price: 29999, // $299.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'full_node_hosting', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain RPC API Access - Developer',
      description: 'Developer-tier RPC API access to QuranChain blockchain - 100K requests/day, WebSocket support, transaction broadcasting',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'rpc_api_developer', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain RPC API Access - Enterprise',
      description: 'Enterprise RPC API with unlimited requests, dedicated endpoints, gRPC support, real-time block monitoring, and priority routing',
      price: 24999, // $249.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'rpc_api_enterprise', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN GAS TOLL SYSTEM
    // =====================================================================
    {
      name: 'QuranChain Gas Toll - Standard',
      description: 'Standard gas toll rate for blockchain transactions - covers transfers, smart contract calls, staking, and governance on 47+ networks',
      price: 50, // $0.50 per transaction
      currency: 'usd',
      metadata: { type: 'one_time', service: 'gas_toll_standard', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Gas Toll - Priority',
      description: 'Priority gas toll for urgent/high-value transactions - 1.5x standard rate with guaranteed fast confirmation across all chains',
      price: 75, // $0.75 per transaction
      currency: 'usd',
      metadata: { type: 'one_time', service: 'gas_toll_priority', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Gas Toll - Critical',
      description: 'Critical gas toll for time-sensitive transactions - 2x standard rate with instant routing and cross-chain atomic settlement',
      price: 100, // $1.00 per transaction
      currency: 'usd',
      metadata: { type: 'one_time', service: 'gas_toll_critical', platform: 'quranchain_blockchain' }
    },
    {
      name: 'Gas Toll Unlimited Pass',
      description: 'Unlimited gas toll pass for high-volume users - flat monthly fee covers all transaction types across all 47+ supported networks',
      price: 49999, // $499.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'gas_toll_unlimited', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN MULTI-CHAIN BRIDGE
    // =====================================================================
    {
      name: 'QuranChain Bridge - Standard',
      description: 'Cross-chain asset bridge between 47+ networks - 0.5% bridge fee, 3-5 min settlement, supports all major tokens (BTC, ETH, USDC, etc.)',
      price: 999, // $9.99/month access
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'bridge_standard', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Bridge - Enterprise',
      description: 'Enterprise bridge with reduced fees (0.25%), instant settlement, dedicated liquidity pools, and cross-chain atomic swaps',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'bridge_enterprise', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Bridge Transaction Fee',
      description: 'Per-transaction bridge fee for cross-chain transfers (0.5% of transfer value) - includes gas optimization and founder royalty settlement',
      price: 500, // $5.00 minimum per bridge tx
      currency: 'usd',
      metadata: { type: 'one_time', service: 'bridge_tx_fee', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN STAKING SERVICES
    // =====================================================================
    {
      name: 'QuranChain Staking - Basic',
      description: 'Stake QURAN tokens with 5% APR rewards - minimum 1,000 QURAN, automatic compounding, 30% founder commission on rewards',
      price: 999, // $9.99/month management fee
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'staking_basic', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Staking - Delegator',
      description: 'Delegate QURAN to trusted validators with automated reward distribution - supports multiple validators, re-delegation, and unbonding',
      price: 1999, // $19.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'staking_delegator', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Staking - Institutional',
      description: 'Institutional staking with dedicated validator, custom commission rates, governance voting power, and enterprise reporting dashboard',
      price: 49999, // $499.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'staking_institutional', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN SMART CONTRACTS
    // =====================================================================
    {
      name: 'QuranChain Smart Contract Deployment',
      description: 'Deploy smart contracts on QuranChain L1 - includes gas, Sharia compliance verification, and on-chain registration',
      price: 9999, // $99.99 per deployment
      currency: 'usd',
      metadata: { type: 'one_time', service: 'smart_contract_deploy', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Smart Contract Audit',
      description: 'Professional smart contract security audit with vulnerability assessment, gas optimization, and Sharia compliance certification',
      price: 249999, // $2,499.99 per audit
      currency: 'usd',
      metadata: { type: 'one_time', service: 'smart_contract_audit', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Smart Contract SDK',
      description: 'Developer SDK for building on QuranChain - CosmWasm tooling, testing framework, deployment scripts, and documentation access',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'smart_contract_sdk', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN GOVERNANCE
    // =====================================================================
    {
      name: 'QuranChain Governance Participation',
      description: 'Active governance participation - create proposals, vote on protocol upgrades, influence token economics and network parameters',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'governance_participation', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Governance Council Seat',
      description: 'Premium council seat with enhanced voting power, proposal priority, direct founder consultations, and protocol upgrade veto rights',
      price: 99999, // $999.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'governance_council', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QEX EXCHANGE (QURANCHAIN EXCHANGE)
    // =====================================================================
    {
      name: 'QEX Exchange - Basic Trader',
      description: 'Basic trading account on QEX Exchange - spot trading of QURAN, QCOIN, QLEARN and ecosystem tokens, market/limit orders',
      price: 999, // $9.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'qex_basic', platform: 'qex_exchange' }
    },
    {
      name: 'QEX Exchange - Pro Trader',
      description: 'Pro trading with advanced charts, API access, margin capabilities, portfolio analytics, and reduced trading fees (0.05%)',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'qex_pro', platform: 'qex_exchange' }
    },
    {
      name: 'QEX Exchange - Institutional',
      description: 'Institutional trading with dedicated liquidity, OTC desk, co-location, FIX API, and institutional custody integration',
      price: 49999, // $499.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'qex_institutional', platform: 'qex_exchange' }
    },
    {
      name: 'QEX Trading Fee',
      description: 'Per-trade execution fee on QEX Exchange - 0.1% maker / 0.15% taker, volume discounts available',
      price: 100, // $1.00 minimum per trade
      currency: 'usd',
      metadata: { type: 'one_time', service: 'qex_trade_fee', platform: 'qex_exchange' }
    },
    {
      name: 'QEX Market Maker Program',
      description: 'Market maker program with rebates, dedicated support, enhanced API limits, and priority order execution across all pairs',
      price: 24999, // $249.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'qex_market_maker', platform: 'qex_exchange' }
    },
    {
      name: 'QEX Token Listing Fee',
      description: 'List a new token on QEX Exchange - includes compliance review, liquidity bootstrapping support, and marketing promotion',
      price: 999999, // $9,999.99 per listing
      currency: 'usd',
      metadata: { type: 'one_time', service: 'qex_token_listing', platform: 'qex_exchange' }
    },

    // =====================================================================
    // QEX NFT MARKETPLACE
    // =====================================================================
    {
      name: 'QEX NFT Marketplace - Creator',
      description: 'NFT creator account - mint, list, and sell NFTs on QEX marketplace with 30% founder royalty on all sales, AI agent license NFTs supported',
      price: 1999, // $19.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'nft_creator', platform: 'qex_exchange' }
    },
    {
      name: 'QEX NFT Marketplace - Collector',
      description: 'NFT collector account with portfolio tracking, bid management, price alerts, and exclusive access to AI agent license NFT drops',
      price: 999, // $9.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'nft_collector', platform: 'qex_exchange' }
    },
    {
      name: 'QEX NFT Minting Fee',
      description: 'Per-NFT minting fee on QuranChain blockchain - includes metadata storage, IPFS pinning, and on-chain registration',
      price: 2500, // $25.00 per mint
      currency: 'usd',
      metadata: { type: 'one_time', service: 'nft_minting', platform: 'qex_exchange' }
    },
    {
      name: 'QEX NFT Trading Fee',
      description: 'NFT marketplace trading fee - 2.5% seller fee per sale, includes 30% founder royalty auto-distribution',
      price: 250, // $2.50 minimum per trade
      currency: 'usd',
      metadata: { type: 'one_time', service: 'nft_trade_fee', platform: 'qex_exchange' }
    },

    // =====================================================================
    // DARPAY CRYPTO PAYMENT SYSTEM
    // =====================================================================
    {
      name: 'DarPay Crypto - Merchant Basic',
      description: 'Accept crypto payments (USDT, USDC, BTC, ETH, DAI) - invoicing, QR codes, payment page, auto-distribution with 30% founder royalty',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'darpay_merchant_basic', platform: 'darpay_crypto' }
    },
    {
      name: 'DarPay Crypto - Merchant Enterprise',
      description: 'Enterprise crypto payment processing - 90+ cryptocurrencies via Kraken, fiat conversion, multi-chain monitoring, and API integration',
      price: 19999, // $199.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'darpay_merchant_enterprise', platform: 'darpay_crypto' }
    },
    {
      name: 'DarPay Invoice Processing Fee',
      description: 'Per-invoice processing fee for DarPay crypto payments - includes blockchain monitoring, payment detection, and revenue distribution',
      price: 199, // $1.99 per invoice
      currency: 'usd',
      metadata: { type: 'one_time', service: 'darpay_invoice_fee', platform: 'darpay_crypto' }
    },
    {
      name: 'DarPay Crypto-to-Fiat Bridge',
      description: 'Automatic crypto-to-USD conversion via Kraken - real-time price feeds, multi-chain settlement, and instant fiat payout to bank account',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'crypto_fiat_bridge', platform: 'darpay_crypto' }
    },

    // =====================================================================
    // QURANCHAIN MULTI-TOKEN ECONOMY
    // =====================================================================
    {
      name: 'QURAN Token Purchase',
      description: 'Purchase QURAN tokens (native Layer 1 token) - 1 QURAN = 1,000,000 uquran, used for staking, governance, and gas fees on QuranChain',
      price: 5000, // $50.00 per QURAN token
      currency: 'usd',
      metadata: { type: 'one_time', service: 'quran_token', platform: 'quranchain_blockchain', token: 'QURAN' }
    },
    {
      name: 'QCOIN Token Purchase',
      description: 'Purchase QCOIN (general utility token) - used across all QuranChain ecosystem services, tradable on QEX Exchange',
      price: 1000, // $10.00 per QCOIN
      currency: 'usd',
      metadata: { type: 'one_time', service: 'qcoin_token', platform: 'quranchain_blockchain', token: 'QCOIN' }
    },
    {
      name: 'QLEARN Token Bundle',
      description: 'Bundle of QLEARN training tokens for AI Agent School - earn by training, trade on QEX for QCOIN, build AI workforce portfolio',
      price: 2500, // $25.00 per 100 QLEARN
      currency: 'usd',
      metadata: { type: 'one_time', service: 'qlearn_token_bundle', platform: 'quranchain_blockchain', token: 'QLEARN' }
    },
    {
      name: 'Ecosystem Token Pack - Starter',
      description: 'Starter pack with 10 tokens each of DARGIT, DARFLARE, DARLAW, DARHEALTH, MESHTALK, QEX - access all QuranChain ecosystem services',
      price: 9999, // $99.99
      currency: 'usd',
      metadata: { type: 'one_time', service: 'ecosystem_starter_pack', platform: 'quranchain_blockchain' }
    },
    {
      name: 'Ecosystem Token Pack - Enterprise',
      description: 'Enterprise token pack with 1,000 tokens each across all ecosystem tokens plus 100 QURAN for staking and governance participation',
      price: 499999, // $4,999.99
      currency: 'usd',
      metadata: { type: 'one_time', service: 'ecosystem_enterprise_pack', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // AI AGENT SCHOOL (BLOCKCHAIN-POWERED)
    // =====================================================================
    {
      name: 'AI Agent School - Student Enrollment',
      description: 'Enroll AI agents in DarCloud AI Agent School - on-chain wallet, QLEARN token earning, training curriculum, and blockchain identity',
      price: 4999, // $49.99/month per agent
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'ai_school_student', platform: 'ai_agent_school' }
    },
    {
      name: 'AI Agent School - Enterprise Fleet',
      description: 'Enterprise AI agent fleet enrollment (up to 50 agents) - batch training, multi-token earning, workforce management dashboard',
      price: 99999, // $999.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'ai_school_enterprise', platform: 'ai_agent_school' }
    },
    {
      name: 'AI Agent License NFT Mint',
      description: 'Mint an AI Agent License NFT - tradable on QEX marketplace, proves agent training completion, includes 30% founder royalty on resale',
      price: 9999, // $99.99 per NFT mint
      currency: 'usd',
      metadata: { type: 'one_time', service: 'ai_agent_nft_mint', platform: 'ai_agent_school' }
    },
    {
      name: 'AI Agent Hiring Fee',
      description: 'Hire a trained AI agent from the marketplace - includes agent deployment, wallet transfer, and company token assignment',
      price: 24999, // $249.99 per hire
      currency: 'usd',
      metadata: { type: 'one_time', service: 'ai_agent_hire', platform: 'ai_agent_school' }
    },
    {
      name: 'AI Agent Training Module',
      description: 'Individual training module for AI agents - Foundation AI, Islamic AI, Quantum AI, Multi-Agent, or specialized service training',
      price: 1999, // $19.99 per module
      currency: 'usd',
      metadata: { type: 'one_time', service: 'ai_training_module', platform: 'ai_agent_school' }
    },

    // =====================================================================
    // QURANCHAIN BLOCKCHAIN ANALYTICS & MONITORING
    // =====================================================================
    {
      name: 'QuranChain Block Explorer Pro',
      description: 'Pro block explorer with advanced search, wallet tracking, smart contract interaction, validator monitoring, and real-time alerts',
      price: 1999, // $19.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'block_explorer_pro', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Analytics Dashboard',
      description: 'Enterprise analytics dashboard - network health, transaction volume, gas toll revenue, validator performance, and revenue forecasting',
      price: 14999, // $149.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'analytics_dashboard', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Revenue Tracking API',
      description: 'API for tracking gas toll, staking, bridge, and trading revenue in real-time - founder royalty reporting and automated distribution monitoring',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'revenue_tracking_api', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN DEFI PROTOCOLS
    // =====================================================================
    {
      name: 'QuranChain DeFi - Liquidity Provider',
      description: 'Provide liquidity to QuranChain DeFi pools - earn trading fees and QCOIN rewards, automated market making with halal compliance',
      price: 2999, // $29.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'defi_liquidity', platform: 'quranchain_blockchain', sharia_compliant: 'true' }
    },
    {
      name: 'QuranChain DeFi - Yield Optimizer',
      description: 'AI-optimized halal yield strategies across QuranChain DeFi - auto-compounding, risk management, and Sharia-screened protocols only',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'defi_yield_optimizer', platform: 'quranchain_blockchain', sharia_compliant: 'true' }
    },
    {
      name: 'QuranChain Token Swap',
      description: 'Instant token swap between QuranCoin, MuslimCoin, QCOIN, QLEARN, and ecosystem tokens - powered by on-chain AMM with 0.3% swap fee',
      price: 100, // $1.00 minimum swap fee
      currency: 'usd',
      metadata: { type: 'one_time', service: 'token_swap', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN GLOBAL VALIDATOR NETWORK
    // =====================================================================
    {
      name: 'Global Validator Deployment - Single',
      description: 'Deploy a QuranChain validator in one of 60+ global cities - includes cloud VM provisioning, node setup, genesis sync, and monitoring',
      price: 49999, // $499.99 per validator setup
      currency: 'usd',
      metadata: { type: 'one_time', service: 'validator_deploy_single', platform: 'quranchain_blockchain' }
    },
    {
      name: 'Global Validator Deployment - Regional',
      description: 'Deploy 10 validators across a region (Americas, Europe, Asia, etc.) - Terraform/Ansible automation, multi-cloud support',
      price: 399999, // $3,999.99 per region
      currency: 'usd',
      metadata: { type: 'one_time', service: 'validator_deploy_regional', platform: 'quranchain_blockchain' }
    },
    {
      name: 'Global Validator Deployment - Full Network',
      description: 'Deploy complete 100-validator network across 60+ cities worldwide - AWS/GCP/Azure, auto-scaling, Kubernetes orchestration',
      price: 2999999, // $29,999.99
      currency: 'usd',
      metadata: { type: 'one_time', service: 'validator_deploy_global', platform: 'quranchain_blockchain' }
    },
    {
      name: 'Validator Managed Hosting',
      description: 'Monthly managed hosting for deployed validators - 32 CPU, 128GB RAM, 8TB SSD, 10Gbps, 99.9% uptime SLA, auto-updates',
      price: 19999, // $199.99/month per validator
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'validator_hosting', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN BLOCKCHAIN SECURITY
    // =====================================================================
    {
      name: 'QuranChain AML/KYC Compliance Suite',
      description: 'On-chain AML/KYC compliance for QuranChain transactions - wallet screening, transaction monitoring, sanctions checks, and reporting',
      price: 14999, // $149.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'aml_kyc_suite', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Fraud Detection AI',
      description: 'AI-powered fraud detection for blockchain transactions - real-time pattern analysis, anomaly detection, and automated blocking',
      price: 24999, // $249.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'fraud_detection', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Multi-Sig Wallet',
      description: 'Multi-signature wallet for high-value blockchain assets - configurable approval thresholds, time-locked transactions, enterprise custody',
      price: 4999, // $49.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'multisig_wallet', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN COSMOS SDK SERVICES
    // =====================================================================
    {
      name: 'QuranChain IBC Relay Service',
      description: 'Inter-Blockchain Communication relay between QuranChain and Cosmos ecosystem chains - automatic packet relaying and channel management',
      price: 9999, // $99.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'ibc_relay', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain CosmWasm Development',
      description: 'CosmWasm smart contract development workspace - Rust/Go toolchain, testing environment, mainnet deployment pipeline, and documentation',
      price: 7999, // $79.99/month
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'cosmwasm_dev', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Chain Upgrade Service',
      description: 'Managed chain upgrade service for protocol updates - binary distribution, coordinated halt, migration scripts, and rollback protection',
      price: 49999, // $499.99 per upgrade
      currency: 'usd',
      metadata: { type: 'one_time', service: 'chain_upgrade', platform: 'quranchain_blockchain' }
    },

    // =====================================================================
    // QURANCHAIN ENTERPRISE BLOCKCHAIN SOLUTIONS
    // =====================================================================
    {
      name: 'QuranChain Enterprise Blockchain License',
      description: 'Full enterprise license for QuranChain blockchain technology - white-label deployment, custom chain creation, and dedicated support',
      price: 833333, // $8,333.33/month ($100K/year)
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { type: 'subscription', service: 'enterprise_blockchain_license', platform: 'quranchain_blockchain', tier: 'mega' }
    },
    {
      name: 'QuranChain Private Chain Deployment',
      description: 'Deploy a private/permissioned QuranChain instance for enterprise use - custom consensus, private validators, and data sovereignty',
      price: 499999, // $4,999.99 setup
      currency: 'usd',
      metadata: { type: 'one_time', service: 'private_chain_deploy', platform: 'quranchain_blockchain' }
    },
    {
      name: 'QuranChain Blockchain Consulting',
      description: 'Expert blockchain consulting - architecture design, tokenomics modeling, consensus optimization, and Islamic finance DeFi strategy',
      price: 99999, // $999.99 per engagement
      currency: 'usd',
      metadata: { type: 'one_time', service: 'blockchain_consulting', platform: 'quranchain_blockchain' }
    },
  ];

  const createdProducts = [];

  for (const productData of products) {
    try {
      console.log(`Creating product: ${productData.name}`);
      const result = await stripeService.createProduct(productData);
      createdProducts.push({
        product_id: result.product.id,
        price_id: result.price ? result.price.id : null,
        name: result.product.name,
        price: productData.price ? productData.price / 100 : null,
        currency: productData.currency,
        interval: productData.recurring?.interval || null,
        type: productData.metadata.type
      });
      console.log(`✓ Created ${productData.name}`);
    } catch (error) {
      console.error(`✗ Error creating product ${productData.name}:`, error.message);
    }
  }

  console.log('\nCreated Stripe Products:');
  createdProducts.forEach(p => {
    console.log(`- ${p.name}: ${JSON.stringify(p, null, 2)}`);
  });

  return createdProducts;
}

// Run setup if called directly
if (require.main === module) {
  setupStripeProducts()
    .then(() => {
      console.log('Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupStripeProducts;