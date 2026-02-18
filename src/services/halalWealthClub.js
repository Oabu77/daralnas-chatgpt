/**
 * 🕌 Halal Wealth Club — Islamic Wealth Building Community
 * =========================================================
 * Global membership platform for Muslims seeking halal financial growth.
 * 
 * Membership Tiers:
 *   🌱 Seed   ($9.99/mo)  — Islamic finance basics, halal stock screener, community access
 *   🌿 Growth ($29.99/mo) — Advanced courses, portfolio tools, live webinars, Zakat calculator
 *   🌳 Legacy ($99.99/mo) — Private advisor, halal REIT access, sharia board reviews, VIP events
 * 
 * Revenue Distribution (immutable):
 *   30% Founder (Omar Mohammad Abunadi™)
 *   40% AI Validators
 *   10% Hardware Hosts
 *   18% Ecosystem
 *    2% Zakat
 * 
 * Founder: Omar Mohammad Abunadi™
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Constants ──────────────────────────────────────────────
const FOUNDER_ROYALTY_RATE = 0.30; // IMMUTABLE — 30%
const ZAKAT_RATE = 0.02;

const DATA_DIR = path.join(__dirname, '../../data');
const MEMBERS_FILE = path.join(DATA_DIR, 'halal_wealth_club_members.json');
const ACTIVITY_LOG = path.join(DATA_DIR, 'halal_wealth_club_activity.json');

// ── Membership Tiers ───────────────────────────────────────
const MEMBERSHIP_TIERS = {
  seed: {
    id: 'seed',
    name: '🌱 Seed Membership',
    price: 9.99,
    interval: 'month',
    currency: 'usd',
    features: [
      'Islamic Finance 101 Course Library',
      'Halal Stock Screener (basic — 50 queries/day)',
      'Community Forum Access',
      'Weekly Halal Market Newsletter',
      'Zakat Calculator (basic)',
      'Quran-referenced financial principles library',
    ],
    stripe_product_id: 'prod_TzfXD2fD1fzz9T',
    stripe_price_id: 'price_1T1gCkAqs2ifkfkqcK8SrQMp',
    payment_link: 'https://buy.stripe.com/eVqcN42Ey67p31jbmUcEw3u',
    max_portfolio_scans: 50,
    webinar_access: false,
    private_advisor: false,
  },
  growth: {
    id: 'growth',
    name: '🌿 Growth Membership',
    price: 29.99,
    interval: 'month',
    currency: 'usd',
    features: [
      'Everything in Seed, plus:',
      'Advanced Halal Investment Courses',
      'Unlimited Halal Stock & Crypto Screener',
      'Live Weekly Webinars with Islamic scholars',
      'Halal Portfolio Builder & Tracker',
      'Advanced Zakat Calculator with automated reports',
      'Sharia-compliant ETF recommendations',
      'Priority Community Support',
      'Halal Real Estate market reports',
    ],
    stripe_product_id: 'prod_TzfXP10HOkpC5Q',
    stripe_price_id: 'price_1T1gCkAqs2ifkfkquStHRL23',
    payment_link: 'https://buy.stripe.com/cNibJ07YSdzReK1aiQcEw3v',
    max_portfolio_scans: -1, // unlimited
    webinar_access: true,
    private_advisor: false,
  },
  legacy: {
    id: 'legacy',
    name: '🌳 Legacy Membership',
    price: 99.99,
    interval: 'month',
    currency: 'usd',
    features: [
      'Everything in Growth, plus:',
      'Private Islamic Finance Advisor (1-on-1 monthly)',
      'Halal REIT Access & blockchain-recorded ownership',
      'Sharia Board Review for personal investments',
      'VIP Events & Conferences (virtual + in-person)',
      'Islamic Estate Planning Tools',
      'Halal Venture Capital Deal Flow',
      'White-glove portfolio migration to halal assets',
      'Family Wealth Transfer planning',
      'Exclusive Legacy Members Majlis (council)',
    ],
    stripe_product_id: 'prod_TzfX5kHcwRYlth',
    stripe_price_id: 'price_1T1gClAqs2ifkfkqipzTeNrz',
    payment_link: 'https://buy.stripe.com/4gM4gy6UO9jB6dvaiQcEw3w',
    max_portfolio_scans: -1,
    webinar_access: true,
    private_advisor: true,
  },
};

// ── Regional Targeting ─────────────────────────────────────
const GLOBAL_REGIONS = {
  middle_east: {
    name: 'Middle East & North Africa',
    countries: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'EG', 'MA', 'TN', 'JO', 'LB', 'IQ'],
    languages: ['ar', 'en'],
    population_muslim_millions: 380,
    timezone: 'Asia/Riyadh',
  },
  south_asia: {
    name: 'South Asia',
    countries: ['PK', 'BD', 'IN', 'AF', 'MV'],
    languages: ['ur', 'bn', 'hi', 'en'],
    population_muslim_millions: 600,
    timezone: 'Asia/Karachi',
  },
  southeast_asia: {
    name: 'Southeast Asia',
    countries: ['ID', 'MY', 'BN', 'SG', 'PH', 'TH'],
    languages: ['id', 'ms', 'en'],
    population_muslim_millions: 270,
    timezone: 'Asia/Jakarta',
  },
  europe: {
    name: 'Europe',
    countries: ['TR', 'GB', 'DE', 'FR', 'NL', 'BE', 'SE', 'AT', 'BA', 'XK', 'AL'],
    languages: ['tr', 'en', 'de', 'fr', 'nl', 'sv'],
    population_muslim_millions: 50,
    timezone: 'Europe/Istanbul',
  },
  africa: {
    name: 'Sub-Saharan Africa',
    countries: ['NG', 'ET', 'TZ', 'KE', 'SN', 'ML', 'NE', 'SO', 'SD'],
    languages: ['en', 'fr', 'ha', 'sw', 'ar'],
    population_muslim_millions: 300,
    timezone: 'Africa/Lagos',
  },
  north_america: {
    name: 'North America',
    countries: ['US', 'CA'],
    languages: ['en', 'ar', 'ur'],
    population_muslim_millions: 7,
    timezone: 'America/New_York',
  },
  central_asia: {
    name: 'Central Asia',
    countries: ['UZ', 'KZ', 'TJ', 'KG', 'TM', 'AZ'],
    languages: ['uz', 'kk', 'ru', 'en'],
    population_muslim_millions: 80,
    timezone: 'Asia/Tashkent',
  },
};

// ── Halal Screening Criteria ───────────────────────────────
const HARAM_INDUSTRIES = [
  'alcohol', 'gambling', 'pork', 'tobacco', 'weapons',
  'adult_entertainment', 'conventional_banking', 'conventional_insurance',
  'cannabis', 'speculative_derivatives',
];

const HALAL_CRITERIA = {
  max_debt_ratio: 0.33,              // Max 33% debt-to-assets (Islamic standard)
  max_interest_income_ratio: 0.05,   // Max 5% income from interest
  max_haram_revenue_ratio: 0.05,     // Max 5% revenue from haram sources
  min_tangible_assets_ratio: 0.10,   // Min 10% tangible assets
};

// ── Data Persistence ───────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadMembers() {
  ensureDataDir();
  if (!fs.existsSync(MEMBERS_FILE)) return { members: {}, stats: { total: 0, by_tier: {}, by_region: {} } };
  try { return JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf8')); }
  catch { return { members: {}, stats: { total: 0, by_tier: {}, by_region: {} } }; }
}

function saveMembers(data) {
  ensureDataDir();
  fs.writeFileSync(MEMBERS_FILE, JSON.stringify(data, null, 2));
}

function logActivity(event) {
  ensureDataDir();
  let log = [];
  if (fs.existsSync(ACTIVITY_LOG)) {
    try { log = JSON.parse(fs.readFileSync(ACTIVITY_LOG, 'utf8')); } catch {}
  }
  log.push({ ...event, timestamp: new Date().toISOString() });
  // Keep last 10,000 events
  if (log.length > 10000) log = log.slice(-10000);
  fs.writeFileSync(ACTIVITY_LOG, JSON.stringify(log, null, 2));
}

// ── Core Class ─────────────────────────────────────────────
class HalalWealthClub {
  constructor() {
    this.tiers = MEMBERSHIP_TIERS;
    this.regions = GLOBAL_REGIONS;
    this.halalCriteria = HALAL_CRITERIA;
    this.haramIndustries = HARAM_INDUSTRIES;
    this.founderRoyalty = FOUNDER_ROYALTY_RATE;
    this.zakatRate = ZAKAT_RATE;
    this.data = loadMembers();
    console.log(`  🕌 Halal Wealth Club initialized — ${this.data.stats.total || 0} members`);
  }

  // ── Member Registration ──────────────────────────────────
  registerMember({ name, email, country, tier = 'seed', referralCode = null, language = 'en' }) {
    if (!name || !email) throw new Error('Name and email required');
    if (!this.tiers[tier]) throw new Error(`Invalid tier: ${tier}. Choose: seed, growth, legacy`);

    const memberId = `HWC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const region = this._detectRegion(country);

    const member = {
      id: memberId,
      name,
      email: email.toLowerCase(),
      country: (country || 'US').toUpperCase(),
      region,
      tier,
      language,
      referral_code: referralCode,
      personal_referral_code: `HWC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      status: 'pending_payment',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      portfolio_scans_today: 0,
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      features_used: [],
      webinars_attended: 0,
      courses_completed: 0,
      zakat_calculated_total: 0,
    };

    this.data.members[memberId] = member;
    this.data.stats.total = Object.keys(this.data.members).length;
    this.data.stats.by_tier[tier] = (this.data.stats.by_tier[tier] || 0) + 1;
    if (region) {
      this.data.stats.by_region[region] = (this.data.stats.by_region[region] || 0) + 1;
    }
    saveMembers(this.data);

    logActivity({
      type: 'member_registered',
      memberId,
      tier,
      country,
      region,
      referralCode,
    });

    return member;
  }

  // ── Activate (after Stripe payment) ──────────────────────
  activateMember(memberId, stripeCustomerId, stripeSubscriptionId) {
    const member = this.data.members[memberId];
    if (!member) throw new Error(`Member not found: ${memberId}`);

    member.status = 'active';
    member.stripe_customer_id = stripeCustomerId;
    member.stripe_subscription_id = stripeSubscriptionId;
    member.updated_at = new Date().toISOString();
    saveMembers(this.data);

    logActivity({ type: 'member_activated', memberId, tier: member.tier });
    return member;
  }

  // ── Upgrade/Downgrade Tier ───────────────────────────────
  changeTier(memberId, newTier) {
    const member = this.data.members[memberId];
    if (!member) throw new Error(`Member not found: ${memberId}`);
    if (!this.tiers[newTier]) throw new Error(`Invalid tier: ${newTier}`);

    const oldTier = member.tier;
    this.data.stats.by_tier[oldTier] = Math.max(0, (this.data.stats.by_tier[oldTier] || 1) - 1);
    this.data.stats.by_tier[newTier] = (this.data.stats.by_tier[newTier] || 0) + 1;

    member.tier = newTier;
    member.updated_at = new Date().toISOString();
    saveMembers(this.data);

    logActivity({ type: 'tier_changed', memberId, oldTier, newTier });
    return member;
  }

  // ── Halal Stock Screening ────────────────────────────────
  screenInvestment(ticker, financialData) {
    const result = {
      ticker,
      screened_at: new Date().toISOString(),
      halal: true,
      violations: [],
      score: 100,
    };

    // Check haram industry
    if (financialData.industry && this.haramIndustries.includes(financialData.industry.toLowerCase())) {
      result.halal = false;
      result.violations.push(`Haram industry: ${financialData.industry}`);
      result.score = 0;
      return result;
    }

    // Debt ratio check
    if (financialData.debt_to_assets > this.halalCriteria.max_debt_ratio) {
      result.violations.push(`Debt ratio ${(financialData.debt_to_assets * 100).toFixed(1)}% > 33% threshold`);
      result.score -= 30;
    }

    // Interest income check
    if (financialData.interest_income_ratio > this.halalCriteria.max_interest_income_ratio) {
      result.violations.push(`Interest income ${(financialData.interest_income_ratio * 100).toFixed(1)}% > 5% threshold`);
      result.score -= 25;
    }

    // Haram revenue check
    if (financialData.haram_revenue_ratio > this.halalCriteria.max_haram_revenue_ratio) {
      result.violations.push(`Haram revenue ${(financialData.haram_revenue_ratio * 100).toFixed(1)}% > 5% threshold`);
      result.score -= 25;
    }

    if (result.score < 60) result.halal = false;
    result.compliance_level = result.score >= 90 ? 'excellent' : result.score >= 70 ? 'acceptable' : result.score >= 60 ? 'borderline' : 'non-compliant';

    return result;
  }

  // ── Zakat Calculator ─────────────────────────────────────
  calculateZakat(assets) {
    const nisab_gold = 85 * 2300;  // 85g gold at ~$2300/oz (approximate)
    const nisab_silver = 595 * 28; // 595g silver at ~$28/oz

    const totalAssets =
      (assets.cash || 0) +
      (assets.savings || 0) +
      (assets.investments || 0) +
      (assets.gold_value || 0) +
      (assets.silver_value || 0) +
      (assets.business_assets || 0) +
      (assets.rental_income || 0) +
      (assets.crypto_value || 0);

    const liabilities =
      (assets.debts || 0) +
      (assets.expenses_due || 0);

    const zakatableAmount = Math.max(0, totalAssets - liabilities);
    const meetsNisab = zakatableAmount >= Math.min(nisab_gold, nisab_silver);

    return {
      total_assets: totalAssets,
      total_liabilities: liabilities,
      zakatable_amount: zakatableAmount,
      nisab_threshold: Math.min(nisab_gold, nisab_silver),
      meets_nisab: meetsNisab,
      zakat_due: meetsNisab ? +(zakatableAmount * 0.025).toFixed(2) : 0,
      zakat_rate: '2.5%',
      calculated_at: new Date().toISOString(),
      note: meetsNisab
        ? 'Zakat is obligatory. May Allah accept your worship.'
        : 'Your wealth is below the Nisab threshold. Zakat is not obligatory, but voluntary sadaqah is always rewarded.',
    };
  }

  // ── Revenue Distribution ─────────────────────────────────
  distributeRevenue(amount) {
    return {
      total: amount,
      founder: +(amount * 0.30).toFixed(2),
      ai_validators: +(amount * 0.40).toFixed(2),
      hardware_hosts: +(amount * 0.10).toFixed(2),
      ecosystem: +(amount * 0.18).toFixed(2),
      zakat: +(amount * 0.02).toFixed(2),
    };
  }

  // ── Dashboard Stats ──────────────────────────────────────
  getStats() {
    const members = Object.values(this.data.members);
    const active = members.filter(m => m.status === 'active');

    const mrr = active.reduce((sum, m) => sum + (this.tiers[m.tier]?.price || 0), 0);

    return {
      total_members: members.length,
      active_members: active.length,
      pending_members: members.filter(m => m.status === 'pending_payment').length,
      by_tier: this.data.stats.by_tier,
      by_region: this.data.stats.by_region,
      mrr: +mrr.toFixed(2),
      arr: +(mrr * 12).toFixed(2),
      revenue_distribution: this.distributeRevenue(mrr),
      tiers_available: Object.keys(this.tiers),
      regions_covered: Object.keys(this.regions).length,
      total_muslim_population_millions: Object.values(this.regions).reduce((s, r) => s + r.population_muslim_millions, 0),
      global_reach: Object.values(this.regions).reduce((acc, r) => acc.concat(r.countries), []),
    };
  }

  // ── List Members ─────────────────────────────────────────
  listMembers({ tier, region, status, limit = 50, offset = 0 } = {}) {
    let members = Object.values(this.data.members);
    if (tier) members = members.filter(m => m.tier === tier);
    if (region) members = members.filter(m => m.region === region);
    if (status) members = members.filter(m => m.status === status);

    return {
      total: members.length,
      offset,
      limit,
      members: members.slice(offset, offset + limit).map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        tier: m.tier,
        country: m.country,
        region: m.region,
        status: m.status,
        joined_at: m.joined_at,
      })),
    };
  }

  // ── Get Member ───────────────────────────────────────────
  getMember(memberId) {
    return this.data.members[memberId] || null;
  }

  // ── Get Member by Email ──────────────────────────────────
  getMemberByEmail(email) {
    return Object.values(this.data.members).find(m => m.email === email.toLowerCase()) || null;
  }

  // ── Content Library ──────────────────────────────────────
  getContentLibrary(tier = 'seed') {
    const tierIndex = ['seed', 'growth', 'legacy'].indexOf(tier);

    const content = {
      courses: [
        { id: 'IF101', title: 'Islamic Finance 101', tier: 'seed', modules: 12, duration_hours: 6 },
        { id: 'HS101', title: 'Halal Stock Screening Masterclass', tier: 'seed', modules: 8, duration_hours: 4 },
        { id: 'ZK101', title: 'Zakat & Wealth Purification', tier: 'seed', modules: 6, duration_hours: 3 },
        { id: 'IF201', title: 'Advanced Islamic Portfolio Management', tier: 'growth', modules: 16, duration_hours: 10 },
        { id: 'RE201', title: 'Halal Real Estate Investing', tier: 'growth', modules: 12, duration_hours: 8 },
        { id: 'CR201', title: 'Sharia-Compliant Crypto Investing', tier: 'growth', modules: 10, duration_hours: 6 },
        { id: 'EP301', title: 'Islamic Estate Planning', tier: 'legacy', modules: 14, duration_hours: 9 },
        { id: 'VC301', title: 'Halal Venture Capital & Startups', tier: 'legacy', modules: 10, duration_hours: 7 },
        { id: 'WQ301', title: 'Waqf & Endowment Management', tier: 'legacy', modules: 8, duration_hours: 5 },
      ],
      webinars: tier !== 'seed' ? [
        { title: 'Weekly Halal Market Analysis', frequency: 'weekly', next: 'Every Friday 7PM UTC' },
        { title: 'Scholar Q&A on Islamic Finance', frequency: 'bi-weekly', next: 'Every other Saturday 3PM UTC' },
        { title: 'Halal Investment Opportunities Review', frequency: 'monthly', next: 'First Monday of month 6PM UTC' },
      ] : [],
    };

    // Filter by tier access
    content.courses = content.courses.filter(c => {
      const courseTierIndex = ['seed', 'growth', 'legacy'].indexOf(c.tier);
      return courseTierIndex <= tierIndex;
    });

    return content;
  }

  // ── Pricing Info ─────────────────────────────────────────
  getPricing() {
    return Object.values(this.tiers).map(t => ({
      id: t.id,
      name: t.name,
      price: t.price,
      interval: t.interval,
      currency: t.currency,
      features: t.features,
      stripe_price_id: t.stripe_price_id,
    }));
  }

  // ── Internal Helpers ─────────────────────────────────────
  _detectRegion(countryCode) {
    if (!countryCode) return 'north_america';
    const cc = countryCode.toUpperCase();
    for (const [regionId, region] of Object.entries(this.regions)) {
      if (region.countries.includes(cc)) return regionId;
    }
    return 'other';
  }
}

// ── Singleton Export ────────────────────────────────────────
const halalWealthClub = new HalalWealthClub();
module.exports = halalWealthClub;
module.exports.HalalWealthClub = HalalWealthClub;
module.exports.MEMBERSHIP_TIERS = MEMBERSHIP_TIERS;
module.exports.GLOBAL_REGIONS = GLOBAL_REGIONS;
module.exports.HALAL_CRITERIA = HALAL_CRITERIA;
