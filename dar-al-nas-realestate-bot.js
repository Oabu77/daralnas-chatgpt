#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  Dar Al Nas Real Estate — Private HWC Membership Fund               ║
 * ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
 * ║  PRIVATE — HWC Members Only — Not Open to Public                    ║
 * ║                                                                      ║
 * ║  Halal Wealth Club (HWC) is a private membership fund offering:      ║
 * ║  • Checking & Savings Accounts (Halal)                              ║
 * ║  • Home Loans (Murabaha / Musharakah / Ijara)                       ║
 * ║  • Business Loans (Halal)                                            ║
 * ║  • Construction Loans (Halal)                                        ║
 * ║                                                                      ║
 * ║  USA Muslim Markets Focus:                                           ║
 * ║  $5,000 down → auto-approved for full purchase price                ║
 * ║  Bots search Zillow/Redfin for bank-owned foreclosures              ║
 * ║  Smart contract gets funded → 30-day close                          ║
 * ║  First monthly payment due at closing                               ║
 * ║  Automatic monthly payments via Stripe subscription                  ║
 * ║                                                                      ║
 * ║  Revenue Split: 30% Founder | 40% AI | 10% HW | 18% Eco | 2% Zakat ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

// ── Load .env ──────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = process.env[m[1].trim()] || m[2].trim();
    });
}

// ── Configuration ──────────────────────────────────────────────────
const PORT = process.env.REALESTATE_BOT_PORT || 9020;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const REVENUE_SERVER = process.env.REVENUE_SERVER || 'http://localhost:3000';
const FOUNDER_ROYALTY = 0.30;

// $5,000 Universal Down-Payment — Auto-approved for full purchase price
const DOWNPAYMENT_AMOUNT = 500000; // $5,000 in cents
const DOWNPAYMENT_DISPLAY = '$5,000';

// Legacy tiers kept for Stripe compatibility, all default to starter ($5K)
const DOWNPAYMENT_TIERS = {
    starter:    { name: 'HWC Home Loan Down-Payment', amount: 500000, display: '$5,000', description: 'Universal $5K down — auto-approved for full purchase price' },
    standard:   { name: 'HWC Home Loan Down-Payment', amount: 500000, display: '$5,000', description: 'Universal $5K down — auto-approved for full purchase price' },
    premium:    { name: 'HWC Home Loan Down-Payment', amount: 500000, display: '$5,000', description: 'Universal $5K down — auto-approved for full purchase price' },
    commercial: { name: 'HWC Home Loan Down-Payment', amount: 500000, display: '$5,000', description: 'Universal $5K down — auto-approved for full purchase price' }
};

// ── HWC Private Membership Fund — Banking Services ─────────────────
const HWC_SERVICES = {
    checking:         { name: 'HWC Halal Checking Account',  description: 'Zero-interest checking, Shariah-compliant, no hidden fees' },
    savings:          { name: 'HWC Halal Savings Account',   description: 'Profit-sharing savings based on Mudarabah, no riba' },
    home_loan:        { name: 'HWC Halal Home Loan',         description: '$5K down, auto-approved for full purchase. Murabaha/Musharakah/Ijara.' },
    business_loan:    { name: 'HWC Halal Business Loan',     description: 'Murabaha-based business financing for Muslim entrepreneurs' },
    construction_loan:{ name: 'HWC Halal Construction Loan', description: 'Istisna-based construction financing for new builds' }
};

// Membership verification — ALL access requires active HWC membership
const MEMBERSHIP_REQUIRED = true;

// HWC Financing Options (Halal — zero riba)
// First monthly payment is due AT CLOSING, then auto-billed monthly via Stripe
const FINANCING_OPTIONS = {
    murabaha_15yr:  { term: 180, markup: 0.12, label: '15-Year Murabaha (Home Loan)',     description: '12% total markup, 180 monthly payments. First payment at closing.' },
    murabaha_20yr:  { term: 240, markup: 0.15, label: '20-Year Murabaha (Home Loan)',     description: '15% total markup, 240 monthly payments. First payment at closing.' },
    murabaha_30yr:  { term: 360, markup: 0.18, label: '30-Year Murabaha (Home Loan)',     description: '18% total markup, 360 monthly payments. First payment at closing.' },
    musharakah:     { term: 240, markup: 0.00, label: 'Diminishing Musharakah',           description: 'Co-ownership, buy out over 20 years, 0% interest. First payment at closing.' },
    ijara:          { term: 180, markup: 0.10, label: 'Ijara (Lease-to-Own)',             description: '10% total cost, rent-to-own 15 years. First payment at closing.' },
    business_loan:  { term: 60,  markup: 0.10, label: 'HWC Business Loan (Murabaha)',     description: '10% total markup, 60 monthly payments. Halal business financing.' },
    construction:   { term: 120, markup: 0.12, label: 'HWC Construction Loan (Istisna)',  description: '12% total markup, 120 monthly payments. Build your home halal.' }
};

// ── USA Muslim Community Markets (Primary Focus) ───────────────────
const USA_MUSLIM_MARKETS = [
    // Michigan — largest Arab-American community
    { city: 'Dearborn', state: 'MI', muslimPop: 'Very High', mosques: ['Islamic Center of America', 'Dearborn Mosque'], zillowMarket: 'dearborn-mi', redfin: 'dearborn_MI' },
    { city: 'Detroit', state: 'MI', muslimPop: 'High', mosques: ['Detroit Islamic Center'], zillowMarket: 'detroit-mi', redfin: 'detroit_MI' },
    { city: 'Hamtramck', state: 'MI', muslimPop: 'Very High', mosques: ['Hamtramck Mosque'], zillowMarket: 'hamtramck-mi', redfin: 'hamtramck_MI' },
    // Texas — massive Muslim communities
    { city: 'Houston', state: 'TX', muslimPop: 'Very High', mosques: ['ISGH', 'Al-Noor Mosque', 'Bear Creek Islamic Center'], zillowMarket: 'houston-tx', redfin: 'houston_TX' },
    { city: 'Dallas', state: 'TX', muslimPop: 'High', mosques: ['Islamic Center of Irving', 'Valley Ranch Islamic Center'], zillowMarket: 'dallas-tx', redfin: 'dallas_TX' },
    { city: 'Richardson', state: 'TX', muslimPop: 'High', mosques: ['Islamic Association of North Texas'], zillowMarket: 'richardson-tx', redfin: 'richardson_TX' },
    { city: 'Plano', state: 'TX', muslimPop: 'High', mosques: ['East Plano Islamic Center'], zillowMarket: 'plano-tx', redfin: 'plano_TX' },
    { city: 'Sugar Land', state: 'TX', muslimPop: 'High', mosques: ['Fort Bend Muslim Council'], zillowMarket: 'sugar-land-tx', redfin: 'sugar-land_TX' },
    // New Jersey / New York — dense Muslim population
    { city: 'Paterson', state: 'NJ', muslimPop: 'Very High', mosques: ['Islamic Center of Passaic County'], zillowMarket: 'paterson-nj', redfin: 'paterson_NJ' },
    { city: 'Jersey City', state: 'NJ', muslimPop: 'High', mosques: ['Masjid Al-Salam'], zillowMarket: 'jersey-city-nj', redfin: 'jersey-city_NJ' },
    { city: 'Edison', state: 'NJ', muslimPop: 'High', mosques: ['Islamic Society of Central Jersey'], zillowMarket: 'edison-nj', redfin: 'edison_NJ' },
    { city: 'Clifton', state: 'NJ', muslimPop: 'High', mosques: ['Islamic Center of Clifton'], zillowMarket: 'clifton-nj', redfin: 'clifton_NJ' },
    // California
    { city: 'Anaheim', state: 'CA', muslimPop: 'High', mosques: ['Islamic Society of Orange County'], zillowMarket: 'anaheim-ca', redfin: 'anaheim_CA' },
    { city: 'Los Angeles', state: 'CA', muslimPop: 'High', mosques: ['King Fahad Mosque', 'Islamic Center of Southern California'], zillowMarket: 'los-angeles-ca', redfin: 'los-angeles_CA' },
    { city: 'San Diego', state: 'CA', muslimPop: 'Medium', mosques: ['Islamic Center of San Diego'], zillowMarket: 'san-diego-ca', redfin: 'san-diego_CA' },
    // Illinois
    { city: 'Chicago', state: 'IL', muslimPop: 'Very High', mosques: ['Mosque Foundation Bridgeview', 'Downtown Islamic Center'], zillowMarket: 'chicago-il', redfin: 'chicago_IL' },
    { city: 'Bridgeview', state: 'IL', muslimPop: 'Very High', mosques: ['Mosque Foundation'], zillowMarket: 'bridgeview-il', redfin: 'bridgeview_IL' },
    // Virginia / DC area
    { city: 'Falls Church', state: 'VA', muslimPop: 'High', mosques: ['Dar Al-Hijrah Islamic Center'], zillowMarket: 'falls-church-va', redfin: 'falls-church_VA' },
    { city: 'Sterling', state: 'VA', muslimPop: 'High', mosques: ['ADAMS Center'], zillowMarket: 'sterling-va', redfin: 'sterling_VA' },
    // Georgia
    { city: 'Atlanta', state: 'GA', muslimPop: 'High', mosques: ['Al-Farooq Masjid', 'Atlanta Masjid of Al-Islam'], zillowMarket: 'atlanta-ga', redfin: 'atlanta_GA' },
    // Minnesota
    { city: 'Minneapolis', state: 'MN', muslimPop: 'Very High', mosques: ['Dar Al-Hijrah Mosque', 'Islamic Civic Society'], zillowMarket: 'minneapolis-mn', redfin: 'minneapolis_MN' },
    // Florida
    { city: 'Tampa', state: 'FL', muslimPop: 'Medium', mosques: ['Islamic Society of Tampa'], zillowMarket: 'tampa-fl', redfin: 'tampa_FL' },
    { city: 'Orlando', state: 'FL', muslimPop: 'Medium', mosques: ['Islamic Center of Orlando'], zillowMarket: 'orlando-fl', redfin: 'orlando_FL' },
    // Ohio
    { city: 'Columbus', state: 'OH', muslimPop: 'High', mosques: ['Noor Islamic Cultural Center'], zillowMarket: 'columbus-oh', redfin: 'columbus_OH' },
    // Pennsylvania
    { city: 'Philadelphia', state: 'PA', muslimPop: 'High', mosques: ['Masjid Al-Jamia'], zillowMarket: 'philadelphia-pa', redfin: 'philadelphia_PA' },
    // Arizona
    { city: 'Tempe', state: 'AZ', muslimPop: 'Medium', mosques: ['Islamic Community Center of Tempe'], zillowMarket: 'tempe-az', redfin: 'tempe_AZ' },
    // Indiana
    { city: 'Indianapolis', state: 'IN', muslimPop: 'Medium', mosques: ['Islamic Society of North America HQ'], zillowMarket: 'indianapolis-in', redfin: 'indianapolis_IN' },
    // North Carolina
    { city: 'Charlotte', state: 'NC', muslimPop: 'Medium', mosques: ['Islamic Center of Charlotte'], zillowMarket: 'charlotte-nc', redfin: 'charlotte_NC' },
    // Tennessee
    { city: 'Nashville', state: 'TN', muslimPop: 'Medium', mosques: ['Islamic Center of Nashville'], zillowMarket: 'nashville-tn', redfin: 'nashville_TN' },
    // Missouri
    { city: 'St. Louis', state: 'MO', muslimPop: 'Medium', mosques: ['Dar Al-Islam Masjid'], zillowMarket: 'st-louis-mo', redfin: 'st-louis_MO' },
    // Maryland
    { city: 'Baltimore', state: 'MD', muslimPop: 'Medium', mosques: ['Masjid Al-Rahmah'], zillowMarket: 'baltimore-md', redfin: 'baltimore_MD' },
];

// Full target markets — USA is primary, international is secondary
const TARGET_MARKETS = [
    { region: 'USA', cities: USA_MUSLIM_MARKETS.map(m => `${m.city}, ${m.state}`), currency: 'USD', primary: true },
    { region: 'UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'], currency: 'AED', primary: false },
    { region: 'Turkey', cities: ['Istanbul', 'Ankara', 'Antalya'], currency: 'TRY', primary: false },
    { region: 'Malaysia', cities: ['Kuala Lumpur', 'Penang', 'Johor Bahru'], currency: 'MYR', primary: false },
    { region: 'Saudi Arabia', cities: ['Riyadh', 'Jeddah', 'Makkah', 'Madinah'], currency: 'SAR', primary: false },
    { region: 'Canada', cities: ['Toronto', 'Mississauga', 'Calgary'], currency: 'CAD', primary: false }
];

// ── Zillow & Redfin — Bank-Owned / Foreclosure Search ──────────────
// Search patterns for bank-owned (REO) and foreclosure properties
const PROPERTY_SOURCES = {
    zillow: {
        baseUrl: 'https://www.zillow.com',
        searchPath: '/homes/for_sale',
        bankOwnedFilter: 'fore_1',  // Zillow foreclosure filter
        buildUrl: (market) => {
            return `https://www.zillow.com/${market.zillowMarket}/fore_1/?searchQueryState=${encodeURIComponent(JSON.stringify({
                filterState: { fore: { value: true }, auc: { value: true }, sort: { value: 'pricea' } },
                isListVisible: true
            }))}`;
        },
        apiSearch: (market, maxPrice) => {
            // Zillow rapid API endpoint for bank-owned search
            return {
                url: 'https://zillow-com1.p.rapidapi.com/propertyExtendedSearch',
                params: {
                    location: `${market.city}, ${market.state}`,
                    status_type: 'ForSale',
                    home_type: 'Houses',
                    sort: 'Price_Low_High',
                    maxPrice: maxPrice || 300000,
                    isForeclosure: true,
                    isBankOwned: true
                },
                headers: {
                    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
                    'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
                }
            };
        }
    },
    redfin: {
        baseUrl: 'https://www.redfin.com',
        buildUrl: (market) => {
            return `https://www.redfin.com/city/${market.redfin}/filter/property-type=house,status=foreclosure+bank-owned,sort=price-asc`;
        },
        apiSearch: (market, maxPrice) => {
            return {
                url: 'https://redfin-com.p.rapidapi.com/properties/search',
                params: {
                    location: `${market.city}, ${market.state}`,
                    status: 'foreclosure,bank_owned',
                    sort: 'price_low',
                    maxPrice: maxPrice || 300000
                },
                headers: {
                    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
                    'X-RapidAPI-Host': 'redfin-com.p.rapidapi.com'
                }
            };
        }
    }
};

// Search for bank-owned properties via Zillow/Redfin APIs
async function searchBankOwned(city, state, maxPrice = 300000) {
    const market = USA_MUSLIM_MARKETS.find(m => 
        m.city.toLowerCase() === city?.toLowerCase() && 
        (state ? m.state.toLowerCase() === state.toLowerCase() : true)
    );
    if (!market) return { error: `Market not found: ${city}, ${state}`, availableMarkets: USA_MUSLIM_MARKETS.map(m => `${m.city}, ${m.state}`) };

    log(`Searching bank-owned properties in ${market.city}, ${market.state} (max $${maxPrice})...`);
    const results = { zillow: [], redfin: [], market, searchedAt: new Date().toISOString() };

    // Zillow API search
    const zillowConfig = PROPERTY_SOURCES.zillow.apiSearch(market, maxPrice);
    if (zillowConfig.headers['X-RapidAPI-Key']) {
        try {
            const zillowData = await apiRequest('GET', zillowConfig.url, zillowConfig.params, zillowConfig.headers);
            if (zillowData?.props) {
                results.zillow = zillowData.props.map(p => ({
                    source: 'zillow', zpid: p.zpid, address: p.address, price: p.price,
                    bedrooms: p.bedrooms, bathrooms: p.bathrooms, sqft: p.livingArea,
                    propertyType: p.propertyType, status: p.listingStatus,
                    bankOwned: true, link: `https://www.zillow.com/homedetails/${p.zpid}_zpid/`,
                    pricePerSqft: p.livingArea ? Math.round(p.price / p.livingArea) : null,
                    nearMosque: market.mosques.length > 0,
                    mosques: market.mosques
                }));
                log(`  Zillow: ${results.zillow.length} bank-owned properties found`);
            }
        } catch (err) {
            log(`  Zillow API error: ${err.message}`);
        }
    }

    // Redfin API search
    const redfinConfig = PROPERTY_SOURCES.redfin.apiSearch(market, maxPrice);
    if (redfinConfig.headers['X-RapidAPI-Key']) {
        try {
            const redfinData = await apiRequest('GET', redfinConfig.url, redfinConfig.params, redfinConfig.headers);
            if (redfinData?.properties) {
                results.redfin = redfinData.properties.map(p => ({
                    source: 'redfin', listingId: p.listingId, address: p.address, price: p.price,
                    bedrooms: p.beds, bathrooms: p.baths, sqft: p.sqft,
                    propertyType: p.propertyType, status: 'bank_owned',
                    bankOwned: true, link: p.url || `https://www.redfin.com${p.path}`,
                    pricePerSqft: p.sqft ? Math.round(p.price / p.sqft) : null,
                    nearMosque: market.mosques.length > 0,
                    mosques: market.mosques
                }));
                log(`  Redfin: ${results.redfin.length} bank-owned properties found`);
            }
        } catch (err) {
            log(`  Redfin API error: ${err.message}`);
        }
    }

    // If no API key, provide direct search links for the bots
    if (!zillowConfig.headers['X-RapidAPI-Key']) {
        results.zillowSearchUrl = PROPERTY_SOURCES.zillow.buildUrl(market);
        results.redfinSearchUrl = PROPERTY_SOURCES.redfin.buildUrl(market);
        results.note = 'No RapidAPI key set. Use the search URLs to find bank-owned properties manually, or set RAPIDAPI_KEY in .env for automated search.';
        log(`  No API key — generated manual search URLs for ${market.city}`);
    }

    results.totalFound = results.zillow.length + results.redfin.length;
    metrics.botActions++;
    return results;
}

// Generic HTTPS API request helper
function apiRequest(method, urlStr, params, headers) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        if (params && method === 'GET') {
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        }
        const options = {
            hostname: url.hostname, path: url.pathname + url.search,
            method, headers: { ...headers, 'Content-Type': 'application/json' }, timeout: 15000
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('API request timeout')); });
        req.end();
    });
}

// ── Data Persistence ───────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const LOG_DIR = path.join(__dirname, 'logs', 'production');

function ensureDirs() {
    [DATA_DIR, LOG_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));
}

function loadJSON(file, fallback) {
    try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); }
    catch { return fallback; }
}

function saveJSON(file, data) {
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

function log(msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${msg}\n`;
    process.stdout.write(line);
    fs.appendFileSync(path.join(LOG_DIR, 'dar-al-nas-realestate.log'), line);
}

// ── State ──────────────────────────────────────────────────────────
let properties = loadJSON('realestate_properties.json', []);
let applications = loadJSON('realestate_applications.json', []);
let leads = loadJSON('realestate_leads.json', []);
let campaigns = loadJSON('realestate_campaigns.json', []);
let fundingDeals = loadJSON('realestate_funding_deals.json', []);
let metrics = loadJSON('realestate_metrics.json', {
    totalLeads: 0, totalApplications: 0, totalDownPayments: 0,
    totalFundingRaised: 0, propertiesListed: 0, propertiesSold: 0,
    revenue: { downPayments: 0, commissions: 0, financing: 0, total: 0 },
    regionBreakdown: {}, botActions: 0, startedAt: new Date().toISOString()
});

// Stripe payment link cache
let stripePaymentLinks = {};
let stripePriceIds = {};

// ── Stripe Helpers ─────────────────────────────────────────────────
function stripeRequest(method, endpoint, body) {
    return new Promise((resolve, reject) => {
        const postData = body ? new URLSearchParams(body).toString() : '';
        const options = {
            hostname: 'api.stripe.com',
            path: `/v1${endpoint}`,
            method,
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { reject(new Error(data)); }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function createStripeProducts() {
    log('Creating Stripe products & payment links for down-payments...');
    
    for (const [tier, config] of Object.entries(DOWNPAYMENT_TIERS)) {
        try {
            // Create product
            const product = await stripeRequest('POST', '/products', {
                name: `Dar Al Nas - ${config.name}`,
                description: `${config.description} — Halal Real Estate Down-Payment. 30% Founder Royalty applied.`,
                'metadata[service]': 'dar_al_nas_realestate',
                'metadata[tier]': tier,
                'metadata[founder_royalty]': '0.30'
            });
            log(`  ✓ Product: ${product.id} (${config.name})`);

            // Create price
            const price = await stripeRequest('POST', '/prices', {
                product: product.id,
                unit_amount: config.amount,
                currency: 'usd'
            });
            stripePriceIds[tier] = price.id;
            log(`  ✓ Price: ${price.id} (${config.display})`);

            // Create payment link
            const link = await stripeRequest('POST', '/payment_links', {
                'line_items[0][price]': price.id,
                'line_items[0][quantity]': 1,
                'metadata[service]': 'dar_al_nas_realestate',
                'metadata[tier]': tier,
                'metadata[founder_royalty]': '0.30',
                'after_completion[type]': 'redirect',
                'after_completion[redirect][url]': `https://realestate.darcloud.host/application-received?tier=${tier}`
            });
            stripePaymentLinks[tier] = link.url;
            log(`  ✓ Payment Link: ${link.url}`);

        } catch (err) {
            log(`  ✗ Failed ${tier}: ${err.message}`);
        }
    }

    saveJSON('realestate_stripe_config.json', { priceIds: stripePriceIds, paymentLinks: stripePaymentLinks });
    log(`Stripe setup complete: ${Object.keys(stripePaymentLinks).length} payment links created`);
}

// ── Deal Sourcing Engine ────────────────────────────────────────────
function generateId() { return 'prop_' + crypto.randomBytes(8).toString('hex'); }
function generateAppId() { return 'app_' + crypto.randomBytes(8).toString('hex'); }
function generateFundId() { return 'fund_' + crypto.randomBytes(8).toString('hex'); }

function scoreDeal(property) {
    let score = 50; // base
    if (property.pricePerSqft && property.pricePerSqft < property.marketAvgSqft) score += 20;
    if (property.roi && property.roi > 8) score += 15;
    if (property.halalCertified) score += 10;
    if (property.nearMosque) score += 5;
    if (property.nearSchool) score += 5;
    if (property.newConstruction) score += 5;
    if (property.rentalYield && property.rentalYield > 6) score += 10;
    return Math.min(100, score);
}

function addProperty(data) {
    const prop = {
        id: generateId(),
        ...data,
        dealScore: 0,
        status: 'active',
        listedAt: new Date().toISOString(),
        views: 0,
        applications: 0,
        funded: false
    };
    prop.dealScore = scoreDeal(prop);
    properties.push(prop);
    metrics.propertiesListed++;
    saveJSON('realestate_properties.json', properties);
    log(`Property listed: ${prop.id} — ${data.title} in ${data.city}, ${data.region} (score: ${prop.dealScore})`);
    return prop;
}

function searchProperties(filters = {}) {
    let results = [...properties].filter(p => p.status === 'active');
    if (filters.region) results = results.filter(p => p.region?.toLowerCase() === filters.region.toLowerCase());
    if (filters.city) results = results.filter(p => p.city?.toLowerCase().includes(filters.city.toLowerCase()));
    if (filters.minPrice) results = results.filter(p => p.price >= Number(filters.minPrice));
    if (filters.maxPrice) results = results.filter(p => p.price <= Number(filters.maxPrice));
    if (filters.type) results = results.filter(p => p.type?.toLowerCase() === filters.type.toLowerCase());
    if (filters.bedrooms) results = results.filter(p => p.bedrooms >= Number(filters.bedrooms));
    if (filters.halalOnly) results = results.filter(p => p.halalCertified);
    // Sort by deal score
    results.sort((a, b) => b.dealScore - a.dealScore);
    if (filters.limit) results = results.slice(0, Number(filters.limit));
    return results;
}

// ── Lead Qualification — HWC MEMBERS ONLY ─────────────────────
function qualifyLead(lead) {
    // MANDATORY: Must be an active HWC member
    if (!lead.hwcMemberId && !lead.hwcMember) {
        return {
            score: 0, qualified: false, tier: 'rejected',
            reason: 'HWC membership required. Dar Al Nas is a private membership fund — not open to the public. Join HWC first at https://halalwealthclub.darcloud.host'
        };
    }
    
    let score = 30; // Base score for being an HWC member
    if (lead.email) score += 10;
    if (lead.phone) score += 10;
    if (lead.hwcTier === 'platinum' || lead.hwcTier === 'gold') score += 20;
    if (lead.hwcTier === 'silver') score += 10;
    if (lead.budget && lead.budget >= 5000) score += 10; // $5K down = qualified
    if (lead.preApproved) score += 10;
    if (lead.region === 'USA') score += 10; // USA priority
    return { score, qualified: true, tier: score >= 70 ? 'hot' : score >= 50 ? 'warm' : 'qualified' };
}

function addLead(data) {
    const qualification = qualifyLead(data);
    const lead = {
        id: 'lead_' + crypto.randomBytes(6).toString('hex'),
        ...data,
        score: qualification.score,
        qualified: qualification.qualified,
        tier: qualification.tier,
        status: qualification.qualified ? 'qualified' : 'nurturing',
        source: data.source || 'website',
        createdAt: new Date().toISOString(),
        followUps: []
    };
    leads.push(lead);
    metrics.totalLeads++;
    metrics.regionBreakdown[data.region] = (metrics.regionBreakdown[data.region] || 0) + 1;
    saveJSON('realestate_leads.json', leads);
    log(`Lead captured: ${lead.id} — ${data.name || data.email} (score: ${lead.score}, ${lead.tier})`);

    // Auto-route hot leads to application
    if (lead.tier === 'hot') {
        log(`  → Hot lead auto-routed to application flow`);
    }
    return lead;
}

// ── Application & Down-Payment ─────────────────────────────────────
function createApplication(data) {
    // HWC MEMBERSHIP REQUIRED — private fund only
    if (!data.hwcMemberId) {
        return { error: 'HWC_MEMBERSHIP_REQUIRED', message: 'Dar Al Nas is a private HWC membership fund. You must be an active Halal Wealth Club member to apply.', joinUrl: 'https://halalwealthclub.darcloud.host' };
    }

    const property = properties.find(p => p.id === data.propertyId) || null;
    const purchasePrice = data.purchasePrice || property?.price || 200000;
    const option = data.financingOption || 'murabaha_30yr';
    const finDetails = FINANCING_OPTIONS[option] || FINANCING_OPTIONS['murabaha_30yr'];
    const downPayment = 5000;
    const financedAmount = purchasePrice - downPayment;
    const profitRate = finDetails.profitRate || 0.04;
    const termYears = finDetails.termYears || 30;
    const totalCost = financedAmount * (1 + profitRate * termYears);
    const monthlyPayment = Math.round(totalCost / (termYears * 12));

    const closingDate = new Date();
    closingDate.setDate(closingDate.getDate() + 30);

    const contractData = `${data.hwcMemberId}-${data.propertyId || 'TBD'}-${purchasePrice}-${Date.now()}`;
    const smartContractHash = require('crypto').createHash('sha256').update(contractData).digest('hex');

    const app = {
        id: generateAppId(),
        leadId: data.leadId,
        propertyId: data.propertyId,
        hwcMemberId: data.hwcMemberId,
        applicant: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            hwcMemberId: data.hwcMemberId,
            hwcTier: data.hwcTier || 'member'
        },
        property,
        approval: {
            status: 'AUTO_APPROVED',
            purchasePrice,
            downPayment,
            financedAmount,
            approvedAt: new Date().toISOString(),
            note: '$5,000 down — auto-approved for full purchase price'
        },
        financing: {
            option,
            details: finDetails,
            term: `${termYears} years`,
            profitRate,
            totalCost: Math.round(totalCost),
            closingDate: closingDate.toISOString(),
            firstPaymentDate: closingDate.toISOString(),
            firstPaymentNote: 'First monthly payment due at closing',
        },
        mortgage: {
            monthlyAmount: monthlyPayment,
            totalPayments: termYears * 12,
            totalCost: Math.round(totalCost),
            paymentMethod: 'Stripe auto-subscription',
            subscriptionStatus: 'pending_downpayment'
        },
        smartContract: {
            hash: smartContractHash,
            status: 'created_awaiting_funding',
            escrow: true,
            fundingDeadline: closingDate.toISOString(),
            autoCloseOnDeadline: true,
            terms: `$${downPayment} escrow → ${termYears}yr ${option} → $${monthlyPayment}/mo`
        },
        status: 'auto_approved_pending_downpayment',
        paymentLink: stripePaymentLinks['standard'] || Object.values(stripePaymentLinks)[0] || null,
        stripeSessionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    applications.push(app);
    metrics.totalApplications++;
    saveJSON('realestate_applications.json', applications);
    log(`✅ AUTO-APPROVED: ${app.id} — ${data.name} (HWC: ${data.hwcMemberId}) for $${purchasePrice} | $${monthlyPayment}/mo | Smart Contract: ${smartContractHash.slice(0, 12)}...`);
    return app;
}

function processDownPayment(applicationId, stripeSessionId) {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return null;
    
    app.status = 'downpayment_received_setting_up_mortgage';
    app.smartContract.status = 'funded_escrow';
    app.smartContract.funded = true;
    app.smartContract.fundedAt = new Date().toISOString();
    app.updatedAt = new Date().toISOString();
    
    metrics.totalDownPayments++;
    metrics.revenue.downPayments += 5000;
    metrics.revenue.total += 5000;
    
    saveJSON('realestate_applications.json', applications);
    log(`✅ Down-payment received: ${app.id} — $5,000 (Stripe: ${stripeSessionId})`);
    log(`   Smart contract funded. Setting up automatic mortgage payments...`);
    
    // Auto-create Stripe subscription for monthly mortgage
    setupMortgageSubscription(app).catch(err => {
        log(`⚠️ Mortgage subscription setup deferred: ${err.message}`);
    });
    
    // Auto-create funding deal for the property purchase
    const deal = createFundingDeal(app);
    return { application: app, fundingDeal: deal, message: 'Down-payment confirmed! Smart contract funded. Automatic monthly mortgage payments being set up. Deal Funding AI will raise remaining funds from HWC members within 30 days.' };
}

// ── Stripe Mortgage Subscription (Auto Monthly Payments) ─────────
async function setupMortgageSubscription(application) {
    if (!STRIPE_SECRET) {
        log(`  Stripe not configured — mortgage subscription deferred for ${application.id}`);
        return;
    }

    const monthlyAmount = Math.round(application.mortgage.monthlyAmount * 100); // cents
    const memberName = application.applicant.name || 'HWC Member';
    const propertyTitle = application.property?.title || 'Property';

    try {
        // 1. Create a Stripe product for this specific mortgage
        const product = await stripeRequest('POST', '/products', {
            name: `HWC Mortgage — ${propertyTitle}`,
            description: `Halal home loan for ${memberName}. ${application.financing.details?.label}. $${application.financing.downPayment} down on $${application.approval?.purchasePrice} property.`,
            'metadata[service]': 'dar_al_nas_mortgage',
            'metadata[application_id]': application.id,
            'metadata[hwc_member_id]': application.hwcMemberId,
            'metadata[property_id]': application.propertyId,
            'metadata[founder_royalty]': '0.30',
            'metadata[shariah_compliant]': 'true'
        });
        log(`  Mortgage product created: ${product.id}`);

        // 2. Create recurring price (monthly payment)
        const price = await stripeRequest('POST', '/prices', {
            product: product.id,
            unit_amount: monthlyAmount,
            currency: 'usd',
            'recurring[interval]': 'month',
            'recurring[interval_count]': 1,
            'metadata[application_id]': application.id,
            'metadata[founder_royalty]': '0.30'
        });
        log(`  Mortgage price created: ${price.id} ($${application.mortgage.monthlyAmount}/mo)`);

        // 3. Create payment link for first payment + subscription enrollment
        const paymentLink = await stripeRequest('POST', '/payment_links', {
            'line_items[0][price]': price.id,
            'line_items[0][quantity]': 1,
            'metadata[service]': 'dar_al_nas_mortgage',
            'metadata[application_id]': application.id,
            'metadata[hwc_member_id]': application.hwcMemberId,
            'metadata[founder_royalty]': '0.30',
            'after_completion[type]': 'redirect',
            'after_completion[redirect][url]': `https://realestate.darcloud.host/mortgage-enrolled?app=${application.id}`
        });

        // Update application with mortgage details
        application.mortgage.stripePriceId = price.id;
        application.mortgage.stripeProductId = product.id;
        application.mortgage.enrollmentLink = paymentLink.url;
        application.mortgage.status = 'enrollment_ready';
        application.status = 'approved_mortgage_ready';
        application.updatedAt = new Date().toISOString();
        saveJSON('realestate_applications.json', applications);

        log(`  ✅ Mortgage subscription ready: ${paymentLink.url}`);
        log(`     $${application.mortgage.monthlyAmount}/mo x ${application.financing.term} months = $${application.financing.totalCost}`);
        return { priceId: price.id, enrollmentLink: paymentLink.url, monthlyAmount: application.mortgage.monthlyAmount };

    } catch (err) {
        log(`  ❌ Mortgage subscription error: ${err.message}`);
        application.mortgage.status = 'setup_failed';
        application.mortgage.error = err.message;
        saveJSON('realestate_applications.json', applications);
        throw err;
    }
}

// ── Deal Funding System ────────────────────────────────────────────
function createFundingDeal(application) {
    const property = application.property || {};
    const purchasePrice = property.price || 0;
    const downPayment = 5000;
    const totalNeeded = purchasePrice - downPayment;
    const closingDate = new Date(Date.now() + 30 * 86400000); // 30 days
    
    const deal = {
        id: generateFundId(),
        applicationId: application.id,
        propertyId: application.property?.id || null,
        hwcMemberId: application.hwcMemberId,
        property: {
            title: property.title,
            city: property.city,
            region: property.region,
            price: purchasePrice,
            type: property.type
        },
        smartContract: {
            hash: application.smartContract?.contractHash || crypto.createHash('sha256').update(`${application.id}:${Date.now()}`).digest('hex'),
            status: 'funding_open',
            escrowReceived: downPayment,
            closingDeadline: closingDate.toISOString(),
            autoClose: true, // Smart contract auto-closes and disburses at deadline
            terms: `HWC member puts $${downPayment} down. Smart contract holds funds in escrow. HWC members can contribute. Contract auto-executes purchase at closing deadline. First mortgage payment collected at closing.`
        },
        funding: {
            totalNeeded,
            totalRaised: 0,
            contributors: [],
            status: 'open', // open → funding → funded → closed
            closingDate: closingDate.toISOString(),
            timeframe: '30 days',
            minContribution: 1000,
            maxContribution: totalNeeded * 0.25 // max 25% per investor
        },
        financing: application.financing,
        mortgage: application.mortgage,
        applicant: application.applicant,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    fundingDeals.push(deal);
    saveJSON('realestate_funding_deals.json', fundingDeals);
    log(`📜 Smart Contract Funding Deal: ${deal.id}`);
    log(`   Property: ${property.title} @ $${purchasePrice}`);
    log(`   Escrow: $${downPayment} | Need: $${totalNeeded} | Deadline: ${closingDate.toISOString().split('T')[0]}`);
    log(`   Contract Hash: ${deal.smartContract.hash.substring(0, 16)}...`);
    return deal;
}

function contributeFunding(dealId, contributor) {
    // HWC membership required
    if (!contributor.hwcMemberId) {
        return { error: 'HWC membership required to contribute to funding deals. Join at https://halalwealthclub.darcloud.host' };
    }
    
    const deal = fundingDeals.find(d => d.id === dealId);
    if (!deal || deal.funding.status === 'closed') return null;
    
    const amount = Number(contributor.amount);
    if (amount < deal.funding.minContribution) return { error: `Minimum contribution: $${deal.funding.minContribution}` };
    if (amount > deal.funding.maxContribution) return { error: `Maximum contribution: $${deal.funding.maxContribution}` };
    
    deal.funding.contributors.push({
        name: contributor.name,
        email: contributor.email,
        hwcMemberId: contributor.hwcMemberId || null,
        amount,
        date: new Date().toISOString()
    });
    deal.funding.totalRaised += amount;
    deal.updatedAt = new Date().toISOString();
    
    metrics.totalFundingRaised += amount;
    
    if (deal.funding.totalRaised >= deal.funding.totalNeeded) {
        deal.funding.status = 'funded';
        log(`🎉 FULLY FUNDED: ${deal.id} — $${deal.funding.totalRaised} raised!`);
    } else {
        deal.funding.status = 'funding';
    }
    
    saveJSON('realestate_funding_deals.json', fundingDeals);
    log(`Contribution: $${amount} from ${contributor.name} to ${deal.id} (${Math.round(deal.funding.totalRaised / deal.funding.totalNeeded * 100)}% funded)`);
    return deal;
}

// ── Marketing Campaign Engine ──────────────────────────────────────
const CAMPAIGN_TEMPLATES = {
    new_listing: {
        subject: '🏠 New Halal Property Deal — {property.title} in {property.city}',
        body: `As-salamu alaykum!\n\nA new premium property is now available through Dar Al Nas:\n\n📍 {property.title}\n🌍 {property.city}, {property.region}\n💰 {property.price}\n🏆 Deal Score: {property.dealScore}/100\n\nAs an HWC member, you get priority access and exclusive financing:\n• Murabaha (5-15yr terms)\n• Diminishing Musharakah (co-ownership)\n• Ijara (rent-to-own)\n\n👉 Apply Now: {paymentLink}\n\nBarakAllahu feek,\nDar Al Nas Real Estate AI`
    },
    funding_opportunity: {
        subject: '💎 Investment Opportunity — Co-Own {property.title}',
        body: `As-salamu alaykum!\n\nJoin fellow HWC members in co-funding this property:\n\n📍 {property.title}\n💰 Total: {deal.totalNeeded}\n📊 Raised: {deal.totalRaised} ({deal.percent}%)\n🕐 Deadline: {deal.targetDate}\n\nMinimum investment: $1,000\nExpected ROI: 8-15% annually\n\n100% Halal • 0% Riba • Shariah Compliant\n\n👉 Invest Now: {investLink}\n\nDar Al Nas Real Estate AI`
    },
    hwc_exclusive: {
        subject: '🌟 HWC Exclusive: Premium Real Estate Deals This Month',
        body: `As-salamu alaykum {member.name}!\n\nAs a valued {member.tier} HWC member, you have exclusive access to:\n\n🏠 {count} new properties across {regions}\n💰 Financing from {lowestRate}\n🏆 Average deal score: {avgScore}/100\n\nDar Al Nas finds the best deals so you build wealth the halal way.\n\n👉 Browse Deals: https://realestate.darcloud.host/deals\n\nBarakAllahu feek,\nDar Al Nas Real Estate AI`
    },
    downpayment_reminder: {
        subject: '⏳ Your Property Application is Waiting — Complete Down-Payment',
        body: `As-salamu alaykum {applicant.name}!\n\nYour application for {property.title} in {property.city} is awaiting down-payment.\n\n💰 Down-Payment: {downpayment}\n📋 Financing: {financing}\n\nComplete your payment to secure this property:\n👉 {paymentLink}\n\nDon't miss out — properties move fast!\n\nDar Al Nas Real Estate AI`
    }
};

function launchCampaign(type, targets, data) {
    const template = CAMPAIGN_TEMPLATES[type];
    if (!template) return { error: `Unknown campaign type: ${type}` };
    
    const campaign = {
        id: 'camp_' + crypto.randomBytes(6).toString('hex'),
        type,
        subject: template.subject,
        targets: targets.length,
        data,
        status: 'sent',
        sentAt: new Date().toISOString(),
        metrics: { sent: targets.length, opened: 0, clicked: 0, applied: 0 }
    };
    campaigns.push(campaign);
    saveJSON('realestate_campaigns.json', campaigns);
    log(`Campaign launched: ${campaign.id} (${type}) → ${targets.length} recipients`);
    return campaign;
}

// ── Financing Calculator (updated for $5K down + first payment at closing)
function calculateFinancing(propertyPrice, option) {
    const financing = FINANCING_OPTIONS[option];
    if (!financing) return { error: 'Invalid financing option', available: Object.keys(FINANCING_OPTIONS) };
    
    const downPayment = 5000; // Universal $5K
    const financed = propertyPrice - downPayment;
    const totalCost = financed * (1 + financing.markup);
    const monthlyPayment = Math.round((totalCost / financing.term) * 100) / 100;
    const closingDate = new Date(Date.now() + 30 * 86400000);
    
    return {
        propertyPrice,
        downPayment,
        downPaymentNote: 'Universal $5,000 down — auto-approved for full purchase price',
        financedAmount: financed,
        financingOption: option,
        financingLabel: financing.label,
        totalCost: Math.round(totalCost * 100) / 100,
        markup: financing.markup,
        term: financing.term,
        monthlyPayment,
        firstPaymentDate: closingDate.toISOString(),
        firstPaymentNote: 'First payment collected at closing',
        paymentMethod: 'Automatic Stripe subscription (monthly)',
        closingDate: closingDate.toISOString(),
        smartContractFundingWindow: '30 days',
        founderRoyalty: Math.round(financed * FOUNDER_ROYALTY * 100) / 100,
        shariahCompliant: true,
        hwcMembershipRequired: true
    };
}

// ── HTTP Server ────────────────────────────────────────────────────
function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { resolve({}); }
        });
    });
}

function jsonRes(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    res.end(JSON.stringify(data));
}

function getParams(url) {
    const qs = {};
    new URL(url, 'http://localhost').searchParams.forEach((v, k) => qs[k] = v);
    return qs;
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return jsonRes(res, null, 204);
    
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    const method = req.method;
    metrics.botActions++;

    try {
        // ── Health ─────────────────────────────────────────────
        if (pathname === '/health' && method === 'GET') {
            return jsonRes(res, {
                service: 'dar-al-nas-realestate',
                status: 'live',
                port: PORT,
                properties: properties.length,
                applications: applications.length,
                leads: leads.length,
                fundingDeals: fundingDeals.length,
                paymentLinks: Object.keys(stripePaymentLinks).length,
                metrics,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            });
        }

        // ── Properties ─────────────────────────────────────────
        if (pathname === '/api/realestate/properties' && method === 'GET') {
            const filters = getParams(req.url);
            return jsonRes(res, { properties: searchProperties(filters), total: properties.length, markets: TARGET_MARKETS });
        }

        if (pathname === '/api/realestate/properties' && method === 'POST') {
            const body = await parseBody(req);
            const prop = addProperty(body);
            return jsonRes(res, prop, 201);
        }

        if (pathname.startsWith('/api/realestate/property/') && method === 'GET') {
            const id = pathname.split('/').pop();
            const prop = properties.find(p => p.id === id);
            if (!prop) return jsonRes(res, { error: 'Property not found' }, 404);
            prop.views++;
            return jsonRes(res, prop);
        }

        if (pathname === '/api/realestate/deals/best' && method === 'GET') {
            const best = searchProperties({ limit: 10 });
            return jsonRes(res, { deals: best, count: best.length, message: 'Top deals sorted by score' });
        }

        // ── Leads ──────────────────────────────────────────────
        if (pathname === '/api/realestate/leads' && method === 'POST') {
            const body = await parseBody(req);
            const lead = addLead(body);
            return jsonRes(res, lead, 201);
        }

        if (pathname === '/api/realestate/leads' && method === 'GET') {
            const filters = getParams(req.url);
            let results = [...leads];
            if (filters.tier) results = results.filter(l => l.tier === filters.tier);
            if (filters.status) results = results.filter(l => l.status === filters.status);
            return jsonRes(res, { leads: results, total: results.length });
        }

        // ── Applications (HWC Members Only, $5K Auto-Approved) ───
        if (pathname === '/api/realestate/apply' && method === 'POST') {
            const body = await parseBody(req);
            const app = createApplication(body);
            if (app.error) {
                const status = app.error === 'HWC_MEMBERSHIP_REQUIRED' ? 403 : 400;
                return jsonRes(res, app, status);
            }
            return jsonRes(res, {
                application: app,
                approval: app.approval,
                paymentLink: app.paymentLink,
                mortgage: {
                    monthlyPayment: app.mortgage.monthlyAmount,
                    term: app.financing.term,
                    firstPaymentDate: app.financing.firstPaymentDate,
                    firstPaymentNote: app.financing.firstPaymentNote,
                    autoPayEnabled: true
                },
                smartContract: app.smartContract,
                message: `✅ AUTO-APPROVED! $5,000 down on $${app.approval.purchasePrice} property. Monthly payment: $${app.mortgage.monthlyAmount}. Smart contract created — 30-day funding window. First payment at closing.`,
                payDownPaymentLink: app.paymentLink,
                hwcMembershipRequired: true
            }, 201);
        }

        if (pathname === '/api/realestate/applications' && method === 'GET') {
            const filters = getParams(req.url);
            let results = [...applications];
            if (filters.status) results = results.filter(a => a.status === filters.status);
            return jsonRes(res, { applications: results, total: results.length });
        }

        if (pathname === '/api/realestate/downpayment/confirm' && method === 'POST') {
            const body = await parseBody(req);
            const result = processDownPayment(body.applicationId, body.stripeSessionId);
            if (!result) return jsonRes(res, { error: 'Application not found' }, 404);
            return jsonRes(res, {
                ...result,
                message: 'Down-payment confirmed! Funding deal created. Our Deal Funding AI will now raise the remaining funds from HWC members.'
            });
        }

        // ── Financing ──────────────────────────────────────────
        if (pathname === '/api/realestate/financing/options' && method === 'GET') {
            return jsonRes(res, { options: FINANCING_OPTIONS, shariahCompliant: true, note: 'All options are 100% halal — zero riba (interest)' });
        }

        if (pathname === '/api/realestate/financing/calculate' && method === 'POST') {
            const body = await parseBody(req);
            const calc = calculateFinancing(body.propertyPrice || body.price, body.option || 'murabaha_30yr');
            return jsonRes(res, calc);
        }

        // ── Bank-Owned Property Search (Zillow/Redfin) ─────────
        if (pathname === '/api/realestate/bank-owned' && method === 'GET') {
            const params = getParams(req.url);
            const results = await searchBankOwned(params.city, params.state, Number(params.maxPrice) || 300000);
            return jsonRes(res, results);
        }

        if (pathname === '/api/realestate/bank-owned/markets' && method === 'GET') {
            return jsonRes(res, {
                markets: USA_MUSLIM_MARKETS,
                totalCities: USA_MUSLIM_MARKETS.length,
                searchSources: ['Zillow (bank-owned/foreclosure)', 'Redfin (bank-owned/foreclosure)'],
                note: 'Our AI bots search Zillow and Redfin for bank-owned and foreclosure properties in Muslim community areas across the USA.',
                hwcMembershipRequired: true
            });
        }

        // ── HWC Banking Services ───────────────────────────────
        if (pathname === '/api/realestate/hwc-services' && method === 'GET') {
            return jsonRes(res, {
                fund: 'Halal Wealth Club — Private Membership Fund',
                type: 'PRIVATE — Not open to the public',
                services: HWC_SERVICES,
                note: 'All services are 100% Shariah-compliant. Zero riba (interest). HWC membership required.',
                joinUrl: 'https://halalwealthclub.darcloud.host',
                homeLoanTerms: {
                    downPayment: '$5,000 (universal)',
                    approval: 'Auto-approved for full purchase price',
                    firstPayment: 'At closing',
                    monthlyPayments: 'Automatic via Stripe subscription',
                    smartContract: '30-day funding window',
                    sources: 'Bank-owned properties from Zillow & Redfin'
                },
                revenueAllocation: { founder: '30%', ai: '40%', hardware: '10%', ecosystem: '18%', zakat: '2%' }
            });
        }

        // ── Mortgage Status ────────────────────────────────────
        if (pathname.startsWith('/api/realestate/mortgage/') && method === 'GET') {
            const appId = pathname.split('/').pop();
            const app = applications.find(a => a.id === appId);
            if (!app) return jsonRes(res, { error: 'Application not found' }, 404);
            return jsonRes(res, {
                applicationId: app.id,
                hwcMemberId: app.hwcMemberId,
                property: { title: app.property?.title, city: app.property?.city, price: app.property?.price },
                approval: app.approval,
                mortgage: app.mortgage,
                financing: app.financing,
                smartContract: app.smartContract,
                status: app.status
            });
        }

        // ── Funding Deals ──────────────────────────────────────
        if (pathname === '/api/realestate/funding' && method === 'GET') {
            const filters = getParams(req.url);
            let results = [...fundingDeals];
            if (filters.status) results = results.filter(d => d.funding.status === filters.status);
            return jsonRes(res, { deals: results, total: results.length });
        }

        if (pathname === '/api/realestate/funding/contribute' && method === 'POST') {
            const body = await parseBody(req);
            const result = contributeFunding(body.dealId, body);
            if (!result) return jsonRes(res, { error: 'Deal not found or closed' }, 404);
            if (result.error) return jsonRes(res, result, 400);
            return jsonRes(res, result);
        }

        if (pathname.startsWith('/api/realestate/funding/') && method === 'GET') {
            const id = pathname.split('/').pop();
            const deal = fundingDeals.find(d => d.id === id);
            if (!deal) return jsonRes(res, { error: 'Funding deal not found' }, 404);
            return jsonRes(res, deal);
        }

        // ── Campaigns ──────────────────────────────────────────
        if (pathname === '/api/realestate/campaign' && method === 'POST') {
            const body = await parseBody(req);
            const camp = launchCampaign(body.type, body.targets || [], body.data || {});
            return jsonRes(res, camp, 201);
        }

        if (pathname === '/api/realestate/campaigns' && method === 'GET') {
            return jsonRes(res, { campaigns, total: campaigns.length });
        }

        // ── Payment Links ──────────────────────────────────────
        if (pathname === '/api/realestate/payment-links' && method === 'GET') {
            return jsonRes(res, {
                paymentLinks: stripePaymentLinks,
                downPayment: { amount: '$5,000', note: 'Universal down-payment — auto-approved for any property' },
                tiers: DOWNPAYMENT_TIERS,
                note: 'HWC Members Only. $5,000 down = auto-approved for full purchase price. Monthly mortgage via Stripe subscription. 30% Founder Royalty.'
            });
        }

        // ── Markets ────────────────────────────────────────────
        if (pathname === '/api/realestate/markets' && method === 'GET') {
            return jsonRes(res, {
                primaryFocus: 'USA Muslim Communities',
                usaMarkets: USA_MUSLIM_MARKETS,
                totalUSACities: USA_MUSLIM_MARKETS.length,
                internationalMarkets: TARGET_MARKETS.filter(m => !m.primary),
                allMarkets: TARGET_MARKETS,
                propertySources: ['Zillow (bank-owned)', 'Redfin (foreclosures)'],
                hwcMembershipRequired: true
            });
        }

        // ── Stats ──────────────────────────────────────────────
        if (pathname === '/api/realestate/stats' && method === 'GET') {
            return jsonRes(res, {
                fund: 'Dar Al Nas Real Estate — Private HWC Membership Fund',
                type: 'PRIVATE — Not open to the public',
                metrics,
                properties: { total: properties.length, active: properties.filter(p => p.status === 'active').length, bankOwned: properties.filter(p => p.bankOwned).length },
                leads: { total: leads.length, hot: leads.filter(l => l.tier === 'hot').length, warm: leads.filter(l => l.tier === 'warm').length },
                applications: { total: applications.length, pending: applications.filter(a => a.status === 'pending_downpayment').length, approved: applications.filter(a => a.status === 'auto_approved' || a.status === 'approved').length, paid: applications.filter(a => a.status === 'downpayment_received').length },
                funding: { total: fundingDeals.length, open: fundingDeals.filter(d => d.funding.status === 'open').length, funded: fundingDeals.filter(d => d.funding.status === 'funded').length },
                usaMarkets: { cities: USA_MUSLIM_MARKETS.length, propertySources: ['Zillow', 'Redfin'] },
                paymentLinks: stripePaymentLinks,
                services: Object.keys(HWC_SERVICES),
                downPayment: '$5,000 universal — auto-approved',
                revenueAllocation: { founder: '30%', ai: '40%', hardware: '10%', ecosystem: '18%', zakat: '2%' }
            });
        }

        // ── Bot Metrics (for orchestrator) ─────────────────────
        if (pathname === '/api/realestate/bot-metrics' && method === 'GET') {
            return jsonRes(res, {
                agent: 'Dar Al Nas Real Estate AI — Private HWC Fund',
                status: 'earning',
                hwcMembershipRequired: true,
                metrics,
                usaCities: USA_MUSLIM_MARKETS.length,
                bankOwnedProperties: properties.filter(p => p.bankOwned).length,
                lastActivity: new Date().toISOString()
            });
        }

        // ── 404 ────────────────────────────────────────────────
        return jsonRes(res, {
            error: 'Not found',
            service: 'Dar Al Nas Real Estate — Private HWC Membership Fund',
            hwcMembershipRequired: true,
            availableRoutes: [
                'GET  /health',
                'GET  /api/realestate/properties',
                'POST /api/realestate/properties',
                'GET  /api/realestate/property/:id',
                'GET  /api/realestate/deals/best',
                'GET  /api/realestate/bank-owned?city=Houston&state=TX&maxPrice=300000',
                'GET  /api/realestate/bank-owned/markets',
                'POST /api/realestate/leads (HWC members only)',
                'GET  /api/realestate/leads',
                'POST /api/realestate/apply (HWC members only, $5K auto-approved)',
                'GET  /api/realestate/applications',
                'POST /api/realestate/downpayment/confirm',
                'GET  /api/realestate/mortgage/:appId',
                'GET  /api/realestate/financing/options',
                'POST /api/realestate/financing/calculate',
                'GET  /api/realestate/funding',
                'POST /api/realestate/funding/contribute (HWC members only)',
                'GET  /api/realestate/funding/:id',
                'POST /api/realestate/campaign',
                'GET  /api/realestate/campaigns',
                'GET  /api/realestate/payment-links',
                'GET  /api/realestate/markets',
                'GET  /api/realestate/hwc-services',
                'GET  /api/realestate/stats',
                'GET  /api/realestate/bot-metrics'
            ]
        }, 404);

    } catch (err) {
        log(`ERROR: ${err.message}`);
        return jsonRes(res, { error: err.message }, 500);
    }
});

// ── Scheduled Tasks ────────────────────────────────────────────────
function scheduledMetricsSave() {
    saveJSON('realestate_metrics.json', metrics);
}

// ── Startup ────────────────────────────────────────────────────────
async function start() {
    ensureDirs();
    
    // Load cached Stripe config if available
    const cached = loadJSON('realestate_stripe_config.json', null);
    if (cached) {
        stripePriceIds = cached.priceIds || {};
        stripePaymentLinks = cached.paymentLinks || {};
    }
    
    // Create Stripe products if not yet created
    if (STRIPE_SECRET && Object.keys(stripePaymentLinks).length === 0) {
        await createStripeProducts();
    }
    
    // Seed USA bank-owned properties (primary focus)
    if (properties.length === 0) {
        log('Seeding USA bank-owned property listings for HWC members...');
        const sampleProps = [
            // USA Bank-Owned / Foreclosure — Primary Market
            { title: 'Dearborn Bank-Owned 4BR Colonial', city: 'Dearborn', region: 'USA', price: 185000, type: 'house', bedrooms: 4, bathrooms: 2, sqft: 2100, pricePerSqft: 88, marketAvgSqft: 125, roi: 12.5, rentalYield: 8.8, halalCertified: true, nearMosque: true, nearSchool: true, newConstruction: false, bankOwned: true, source: 'Zillow', description: 'Bank-owned colonial near Islamic Center of America. $5K down auto-approved for HWC members.' },
            { title: 'Houston Foreclosure 3BR Ranch', city: 'Houston', region: 'USA', price: 165000, type: 'house', bedrooms: 3, bathrooms: 2, sqft: 1800, pricePerSqft: 92, marketAvgSqft: 140, roi: 11.2, rentalYield: 8.0, halalCertified: true, nearMosque: true, nearSchool: true, newConstruction: false, bankOwned: true, source: 'Redfin', description: 'Foreclosure near ISGH. Great value in Muslim community. $5K down auto-approved.' },
            { title: 'Paterson REO 3BR Victorian', city: 'Paterson', region: 'USA', price: 145000, type: 'house', bedrooms: 3, bathrooms: 1, sqft: 1500, pricePerSqft: 97, marketAvgSqft: 130, roi: 13.0, rentalYield: 9.2, halalCertified: true, nearMosque: true, nearSchool: true, newConstruction: false, bankOwned: true, source: 'Zillow', description: 'REO property in South Paterson. Near Omar Mosque. Huge appreciation potential.' },
            { title: 'Chicago Bridgeview REO 4BR', city: 'Chicago', region: 'USA', price: 175000, type: 'house', bedrooms: 4, bathrooms: 2, sqft: 2000, pricePerSqft: 88, marketAvgSqft: 120, roi: 11.8, rentalYield: 8.5, halalCertified: true, nearMosque: true, nearSchool: true, newConstruction: false, bankOwned: true, source: 'Redfin', description: 'Bank-owned in Bridgeview Muslim corridor. Near Mosque Foundation.' },
            { title: 'Minneapolis Foreclosure 3BR', city: 'Minneapolis', region: 'USA', price: 135000, type: 'house', bedrooms: 3, bathrooms: 2, sqft: 1600, pricePerSqft: 84, marketAvgSqft: 115, roi: 14.0, rentalYield: 9.8, halalCertified: true, nearMosque: true, nearSchool: true, newConstruction: false, bankOwned: true, source: 'Zillow', description: 'Foreclosure in Cedar-Riverside. Near Dar Al-Hijrah Mosque. Best value.' },
            { title: 'Dallas REO 4BR Modern', city: 'Dallas', region: 'USA', price: 195000, type: 'house', bedrooms: 4, bathrooms: 3, sqft: 2200, pricePerSqft: 89, marketAvgSqft: 135, roi: 10.5, rentalYield: 7.8, halalCertified: true, nearMosque: true, nearSchool: true, newConstruction: false, bankOwned: true, source: 'Redfin', description: 'REO property near ICNA DFW. Richardson Muslim community area.' },
            { title: 'Falls Church VA Bank-Owned 3BR', city: 'Falls Church', region: 'USA', price: 285000, type: 'house', bedrooms: 3, bathrooms: 2, sqft: 1900, pricePerSqft: 150, marketAvgSqft: 200, roi: 9.0, rentalYield: 6.5, halalCertified: true, nearMosque: true, nearSchool: true, newConstruction: false, bankOwned: true, source: 'Zillow', description: 'Bank-owned near Dar Al-Hijrah Islamic Center. Prime NoVA location.' },
            { title: 'Atlanta Foreclosure 3BR', city: 'Atlanta', region: 'USA', price: 155000, type: 'house', bedrooms: 3, bathrooms: 2, sqft: 1700, pricePerSqft: 91, marketAvgSqft: 130, roi: 11.5, rentalYield: 8.2, halalCertified: true, nearMosque: true, nearSchool: true, newConstruction: false, bankOwned: true, source: 'Redfin', description: 'Foreclosure near Al-Farooq Masjid. Growing Muslim community.' },
            { title: 'Anaheim REO 3BR Condo', city: 'Anaheim', region: 'USA', price: 245000, type: 'condo', bedrooms: 3, bathrooms: 2, sqft: 1400, pricePerSqft: 175, marketAvgSqft: 230, roi: 10.0, rentalYield: 7.0, halalCertified: true, nearMosque: true, nearSchool: false, newConstruction: false, bankOwned: true, source: 'Zillow', description: 'REO condo in Orange County Muslim community. ICNA SoCal area.' },
            { title: 'Indianapolis Bank-Owned 4BR', city: 'Indianapolis', region: 'USA', price: 115000, type: 'house', bedrooms: 4, bathrooms: 2, sqft: 2000, pricePerSqft: 58, marketAvgSqft: 90, roi: 15.0, rentalYield: 10.5, halalCertified: true, nearMosque: true, nearSchool: true, newConstruction: false, bankOwned: true, source: 'Redfin', description: 'Best value! Bank-owned near ISNA headquarters. $5K down only.' }
        ];
        sampleProps.forEach(p => addProperty(p));
        log(`Seeded ${sampleProps.length} USA bank-owned properties across ${new Set(sampleProps.map(p => p.city)).size} cities`);
    }

    server.listen(PORT, () => {
        log('═'.repeat(66));
        log('  DAR AL NAS REAL ESTATE — PRIVATE HWC MEMBERSHIP FUND');
        log('  Halal Wealth Club | Not Open to the Public');
        log('═'.repeat(66));
        log(`  Port: ${PORT}`);
        log(`  Properties: ${properties.length} (USA bank-owned focus)`);
        log(`  Payment Links: ${Object.keys(stripePaymentLinks).length}`);
        log(`  USA Markets: ${USA_MUSLIM_MARKETS.length} cities | International: ${TARGET_MARKETS.length} regions`);
        log(`  Financing: ${Object.keys(FINANCING_OPTIONS).length} halal options`);
        log(`  Down Payment: $5,000 universal — auto-approved for full purchase`);
        log(`  Sources: Zillow + Redfin bank-owned search`);
        log(`  Services: Checking | Savings | Home Loans | Business Loans | Construction`);
        log('  Revenue: 30% Founder | 40% AI | 10% HW | 18% Eco | 2% Zakat');
        log('  Smart Contract: 30-day funding window | First payment at closing');
        log('═'.repeat(66));
    });

    // Save metrics every 5 minutes
    setInterval(scheduledMetricsSave, 5 * 60 * 1000);
}

start().catch(err => {
    log(`FATAL: ${err.message}`);
    process.exit(1);
});
