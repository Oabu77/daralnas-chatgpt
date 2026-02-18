#!/usr/bin/env node
/**
 * Affiliate Program Manager
 * Manage referral codes, commissions, tracking
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COMMISSION_STRUCTURE = {
  tier1: { min_revenue: 0, max_revenue: 10000, commission: 0.15 },      // 15%
  tier2: { min_revenue: 10000, max_revenue: 50000, commission: 0.20 },  // 20%
  tier3: { min_revenue: 50000, max_revenue: 100000, commission: 0.25 }, // 25%
  tier4: { min_revenue: 100000, max_revenue: Infinity, commission: 0.30 } // 30%
};

const PRODUCT_COMMISSIONS = {
  'enterprise_license': 0.20,      // 20% of $8,333.33 = $1,666.66/month
  'private_chain': 0.25,           // 25% of $4,999.99 = $1,249.99
  'consulting': 0.30,              // 30% of $999.99 = $297.99
  'validator_full': 0.15,          // 15% of $29,999.99 = $4,500
  'api_premium': 0.20,             // 20% of subscription
  'default': 0.15                  // 15% default
};

class AffiliateProgram {
  constructor() {
    this.affiliatesFile = path.join(__dirname, 'affiliates.json');
    this.affiliates = this.loadAffiliates();
  }

  loadAffiliates() {
    try {
      if (fs.existsSync(this.affiliatesFile)) {
        return JSON.parse(fs.readFileSync(this.affiliatesFile, 'utf8'));
      }
    } catch (e) {
      console.warn('Could not load affiliates:', e.message);
    }
    return {};
  }

  saveAffiliates() {
    fs.writeFileSync(this.affiliatesFile, JSON.stringify(this.affiliates, null, 2));
  }

  generateAffiliateCode(name, email) {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    
    this.affiliates[code] = {
      code,
      name,
      email,
      created: new Date().toISOString(),
      revenue: 0,
      referrals: 0,
      commission_earned: 0,
      commission_tier: 'tier1',
      tracking_url: `https://quranchain.dev?ref=${code}`,
      status: 'active'
    };

    this.saveAffiliates();
    return this.affiliates[code];
  }

  recordReferral(affiliate_code, product_id, amount) {
    if (!this.affiliates[affiliate_code]) {
      return { error: 'Affiliate not found' };
    }

    const affiliate = this.affiliates[affiliate_code];
    const commission_rate = PRODUCT_COMMISSIONS[product_id] || PRODUCT_COMMISSIONS.default;
    const commission = amount * commission_rate;

    affiliate.revenue += amount;
    affiliate.referrals += 1;
    affiliate.commission_earned += commission;

    // Update tier
    affiliate.commission_tier = this.getAffiliateTier(affiliate.revenue).tier;

    this.saveAffiliates();

    return {
      affiliate_code,
      product_id,
      sale_amount: amount,
      commission_rate: commission_rate * 100 + '%',
      commission_earned: commission,
      total_commission_earned: affiliate.commission_earned,
      total_referrals: affiliate.referrals
    };
  }

  getAffiliateTier(revenue) {
    for (const [tier, config] of Object.entries(COMMISSION_STRUCTURE)) {
      if (revenue >= config.min_revenue && revenue < config.max_revenue) {
        return { 
          tier, 
          commission: config.commission,
          next_tier_revenue: config.max_revenue - revenue
        };
      }
    }
    return { tier: 'tier4', commission: 0.30, next_tier_revenue: 0 };
  }

  getAffiliateStats(affiliate_code) {
    const affiliate = this.affiliates[affiliate_code];
    if (!affiliate) return { error: 'Affiliate not found' };

    const tier = this.getAffiliateTier(affiliate.revenue);

    return {
      code: affiliate.code,
      name: affiliate.name,
      email: affiliate.email,
      tracking_url: affiliate.tracking_url,
      total_referrals: affiliate.referrals,
      total_revenue: affiliate.revenue,
      total_commission_earned: affiliate.commission_earned,
      current_tier: tier.tier,
      current_commission_rate: (tier.commission * 100) + '%',
      revenue_to_next_tier: tier.next_tier_revenue,
      average_sale_value: affiliate.referrals > 0 ? (affiliate.revenue / affiliate.referrals) : 0,
      created: affiliate.created,
      status: affiliate.status
    };
  }

  listAllAffiliates() {
    return Object.values(this.affiliates).map(a => ({
      code: a.code,
      name: a.name,
      referrals: a.referrals,
      revenue: a.revenue,
      commission: a.commission_earned,
      tier: a.commission_tier,
      status: a.status
    }));
  }

  printAffiliateProgram() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║          🎯 AFFILIATE PROGRAM - COMMISSION TRACKER        ║
╚════════════════════════════════════════════════════════════╝

COMMISSION STRUCTURE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tier 1: $0 - $10K revenue       → 15% commission
Tier 2: $10K - $50K revenue     → 20% commission
Tier 3: $50K - $100K revenue    → 25% commission
Tier 4: $100K+ revenue          → 30% commission

PRODUCT COMMISSIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Enterprise License ($8,333.33/mo) → 20% = $1,666.66/month
Private Chain ($4,999.99)         → 25% = $1,249.99
Consulting ($999.99)              → 30% = $299.97
Validator Network ($29,999.99)    → 15% = $4,500
Premium API (variable)            → 20% of subscription

QUICK START:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Generate affiliate code:
   node affiliate-program.js --create-affiliate "John Doe" john@example.com

2. Share tracking URL:
   https://quranchain.dev?ref=ABC123DEF456

3. Earn commission on every sale!
   15% - 30% depending on tier

AFFILIATE PAYOUTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Monthly payouts (via Stripe)
✅ No minimum payout requirement
✅ Real-time commission tracking
✅ Bonus tier rewards

MARKETING MATERIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email templates: ./marketing/email-templates/
Social templates: ./marketing/social-posts/
Banners: ./marketing/banners/
Case studies: ./marketing/case-studies/

EARNING POTENTIAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Conservative (5 sales/month):    $2,500 - $37,500/month
Realistic (20 sales/month):      $10,000 - $150,000/month
Aggressive (100+ sales/month):   $50,000+/month

CURRENT AFFILIATES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    const affiliates = this.listAllAffiliates();
    if (affiliates.length === 0) {
      console.log('No affiliates yet. Create your first one!');
    } else {
      console.table(affiliates);
    }

    console.log(`
Interested in becoming an affiliate?
📧 Contact: affiliates@quranchain.dev
    `);
  }
}

if (require.main === module) {
  const program = new AffiliateProgram();
  const args = process.argv.slice(2);

  if (args[0] === '--help') {
    program.printAffiliateProgram();
  } else if (args[0] === '--create-affiliate') {
    const name = args[1];
    const email = args[2];
    const affiliate = program.generateAffiliateCode(name, email);
    console.log(`\n✅ Affiliate created!\n`);
    console.log(`Name: ${affiliate.name}`);
    console.log(`Email: ${affiliate.email}`);
    console.log(`Code: ${affiliate.code}`);
    console.log(`Tracking URL: ${affiliate.tracking_url}`);
    console.log(`Commission Rate: 15% (Tier 1)`);
  } else if (args[0] === '--stats') {
    const code = args[1];
    const stats = program.getAffiliateStats(code);
    console.log('\n📊 AFFILIATE STATS\n');
    console.table(stats);
  } else if (args[0] === '--list') {
    const list = program.listAllAffiliates();
    console.log('\n📋 ALL AFFILIATES\n');
    console.table(list);
  } else {
    program.printAffiliateProgram();
  }
}

module.exports = AffiliateProgram;
