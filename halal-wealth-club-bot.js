#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                     ║
 * ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                       ║
 * ║  Immutable Founder Royalty: 30% · License: See /LICENSE                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
/**
 * 🤖 Halal Wealth Club — AI Membership Sign-Up Bot
 * ==================================================
 * Autonomous AI agent that recruits Muslim members globally.
 * 
 * Capabilities:
 *   • Processes sign-up requests via REST API
 *   • Auto-qualifies leads by region, language, financial interest
 *   • Sends personalized onboarding based on region & language
 *   • Generates referral codes for viral growth
 *   • Tracks conversion funnel (lead → trial → paid member)
 *   • Runs scheduled outreach campaigns by timezone
 *   • Reports performance metrics to AI orchestrator
 * 
 * Port: 9015
 * Health: GET /health
 * 
 * Founder: Omar Mohammad Abunadi™
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const halalWealthClub = require('./src/services/halalWealthClub');

const app = express();
app.use(express.json());

const LOG_DIR = path.join(__dirname, 'logs/production');
const LOG_FILE = path.join(LOG_DIR, 'halal-wealth-bot.log');
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'hwc_leads.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'hwc_campaigns.json');
const BOT_METRICS_FILE = path.join(DATA_DIR, 'hwc_bot_metrics.json');

const PORT = parseInt(process.env.HWC_BOT_PORT || '9015', 10);

// ── Logging ────────────────────────────────────────────────
function ensureDirs() {
  [LOG_DIR, DATA_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));
}

function log(msg) {
  const line = `[${new Date().toISOString()}] [HWC-BOT] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(`🤖 ${msg}`);
}

// ── Data Helpers ───────────────────────────────────────────
function loadJSON(file, fallback = []) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

function saveJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ── Bot State ──────────────────────────────────────────────
const botState = {
  started_at: new Date().toISOString(),
  leads_captured: 0,
  members_signed_up: 0,
  campaigns_sent: 0,
  conversions: { seed: 0, growth: 0, legacy: 0 },
  top_regions: {},
  active: true,
};

// ── Localized Welcome Messages ─────────────────────────────
const WELCOME_MESSAGES = {
  ar: {
    greeting: 'السلام عليكم ورحمة الله وبركاته',
    welcome: 'مرحباً بك في نادي الثروة الحلال! 🕌',
    tagline: 'استثمر حلالاً — ازدهر بإذن الله',
    cta: 'ابدأ رحلتك المالية الإسلامية اليوم',
  },
  en: {
    greeting: 'Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh',
    welcome: 'Welcome to the Halal Wealth Club! 🕌',
    tagline: 'Invest Halal — Prosper by the Will of Allah',
    cta: 'Start your Islamic finance journey today',
  },
  ur: {
    greeting: 'السلام علیکم',
    welcome: 'حلال ویلتھ کلب میں خوش آمدید! 🕌',
    tagline: 'حلال سرمایہ کاری — اللہ کی مرضی سے ترقی',
    cta: 'آج ہی اپنا اسلامی مالیاتی سفر شروع کریں',
  },
  bn: {
    greeting: 'আসসালামু আলাইকুম',
    welcome: 'হালাল ওয়েলথ ক্লাবে স্বাগতম! 🕌',
    tagline: 'হালাল বিনিয়োগ করুন — আল্লাহর ইচ্ছায় সমৃদ্ধ হন',
    cta: 'আজই আপনার ইসলামিক অর্থনৈতিক যাত্রা শুরু করুন',
  },
  id: {
    greeting: 'Assalamualaikum Warahmatullahi Wabarakatuh',
    welcome: 'Selamat datang di Halal Wealth Club! 🕌',
    tagline: 'Investasi Halal — Sejahtera dengan Izin Allah',
    cta: 'Mulai perjalanan keuangan Islam Anda hari ini',
  },
  tr: {
    greeting: 'Selamün Aleyküm',
    welcome: 'Helal Servet Kulübü\'ne hoş geldiniz! 🕌',
    tagline: 'Helal Yatırım — Allah\'ın İzniyle Refah',
    cta: 'İslami finans yolculuğunuza bugün başlayın',
  },
  fr: {
    greeting: 'Assalamou Aleykoum',
    welcome: 'Bienvenue au Club de la Richesse Halal! 🕌',
    tagline: 'Investissez Halal — Prospérez par la Volonté d\'Allah',
    cta: 'Commencez votre parcours financier islamique aujourd\'hui',
  },
  ms: {
    greeting: 'Assalamualaikum',
    welcome: 'Selamat datang ke Kelab Kekayaan Halal! 🕌',
    tagline: 'Pelaburan Halal — Makmur Dengan Izin Allah',
    cta: 'Mulakan perjalanan kewangan Islam anda hari ini',
  },
};

// ── Lead Qualification Engine ──────────────────────────────
function qualifyLead(lead) {
  let score = 0;
  const reasons = [];

  // Email provided
  if (lead.email) { score += 20; reasons.push('email_provided'); }

  // Muslim-majority country
  const muslimMajority = ['SA', 'AE', 'PK', 'BD', 'ID', 'MY', 'EG', 'TR', 'NG', 'QA', 'KW', 'BH', 'OM', 'JO', 'IQ'];
  if (muslimMajority.includes((lead.country || '').toUpperCase())) {
    score += 25;
    reasons.push('muslim_majority_country');
  }

  // Financial interest expressed
  if (lead.interests && lead.interests.length > 0) {
    score += 15;
    reasons.push('financial_interest');
  }

  // Specified tier preference (growth/legacy = higher intent)
  if (lead.preferred_tier === 'legacy') { score += 25; reasons.push('high_tier_intent'); }
  else if (lead.preferred_tier === 'growth') { score += 15; reasons.push('mid_tier_intent'); }
  else { score += 5; reasons.push('entry_level_intent'); }

  // Referral
  if (lead.referral_code) { score += 10; reasons.push('referred'); }

  const qualified = score >= 40;
  return { score, qualified, reasons, recommended_tier: score >= 70 ? 'growth' : 'seed' };
}

// ── Onboarding Message Generator ───────────────────────────
function generateOnboardingMessage(member, language = 'en') {
  const msg = WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en;
  const tier = halalWealthClub.tiers[member.tier];

  return {
    subject: `${msg.greeting} — ${msg.welcome}`,
    body: [
      msg.greeting,
      '',
      `${msg.welcome}`,
      '',
      `${msg.tagline}`,
      '',
      `Your Membership: ${tier.name}`,
      `Monthly: $${tier.price}/month`,
      '',
      'Your benefits include:',
      ...tier.features.map(f => `  ✅ ${f}`),
      '',
      `Your Referral Code: ${member.personal_referral_code}`,
      'Share with friends & family to grow the Ummah\'s financial literacy!',
      '',
      msg.cta,
      '',
      '— Halal Wealth Club AI Assistant',
      '   Powered by QuranChain™ & DarCloud™',
      '',
      '🕌 "And whoever puts their trust in Allah, He will be enough for them." — Quran 65:3',
    ].join('\n'),
    language,
    member_id: member.id,
    tier: member.tier,
  };
}

// ── Campaign Templates ─────────────────────────────────────
const CAMPAIGN_TEMPLATES = {
  ramadan_special: {
    name: 'Ramadan Special — Purify Your Wealth',
    subject_en: '🌙 Ramadan Special: Purify Your Wealth with Halal Investing',
    subject_ar: '🌙 عرض رمضان: طهّر مالك بالاستثمار الحلال',
    discount_percent: 25,
    tier_target: 'all',
    duration_days: 30,
  },
  eid_celebration: {
    name: 'Eid Celebration — New Beginning Offer',
    subject_en: '🎉 Eid Mubarak! Start Your Halal Wealth Journey — 20% Off',
    subject_ar: '🎉 عيد مبارك! ابدأ رحلتك في الثروة الحلال — خصم 20%',
    discount_percent: 20,
    tier_target: 'all',
    duration_days: 7,
  },
  friday_reminder: {
    name: 'Jummah Wealth Reminder',
    subject_en: '🕌 Jummah Reminder: Are Your Investments Halal?',
    subject_ar: '🕌 تذكير الجمعة: هل استثماراتك حلال؟',
    discount_percent: 0,
    tier_target: 'seed',
    duration_days: 1,
  },
  hajj_season: {
    name: 'Hajj Season — Legacy Membership Launch',
    subject_en: '🕋 Hajj Season: Secure Your Family\'s Financial Legacy',
    subject_ar: '🕋 موسم الحج: أمّن مستقبل عائلتك المالي',
    discount_percent: 15,
    tier_target: 'legacy',
    duration_days: 14,
  },
  new_year_hijri: {
    name: 'Islamic New Year — Fresh Financial Start',
    subject_en: '📅 Islamic New Year: A Fresh Start for Your Finances',
    subject_ar: '📅 رأس السنة الهجرية: بداية جديدة لأموالك',
    discount_percent: 30,
    tier_target: 'all',
    duration_days: 10,
  },
};

// ══════════════════════════════════════════════════════════
//  API ENDPOINTS
// ══════════════════════════════════════════════════════════

// ── Health Check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'live',
    service: 'halal-wealth-club-bot',
    agent: 'HWC Membership AI Agent',
    uptime_seconds: Math.round((Date.now() - new Date(botState.started_at).getTime()) / 1000),
    leads_captured: botState.leads_captured,
    members_signed_up: botState.members_signed_up,
    campaigns_available: Object.keys(CAMPAIGN_TEMPLATES).length,
    regions_covered: Object.keys(halalWealthClub.regions).length,
    languages_supported: Object.keys(WELCOME_MESSAGES).length,
    active: botState.active,
    timestamp: new Date().toISOString(),
  });
});

// ── Capture Lead ───────────────────────────────────────────
app.post('/api/hwc/lead', (req, res) => {
  try {
    const { name, email, country, phone, interests, preferred_tier, referral_code, language } = req.body;

    if (!email) return res.status(400).json({ error: 'Email is required' });

    const lead = {
      id: `LEAD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      name: name || 'Prospective Member',
      email: email.toLowerCase(),
      country: (country || '').toUpperCase(),
      phone: phone || null,
      interests: interests || [],
      preferred_tier: preferred_tier || 'seed',
      referral_code: referral_code || null,
      language: language || 'en',
      captured_at: new Date().toISOString(),
      source: req.headers['x-source'] || 'direct',
      user_agent: req.headers['user-agent'] || 'unknown',
    };

    // Qualify the lead
    const qualification = qualifyLead(lead);
    lead.qualification = qualification;

    // Save lead
    const leads = loadJSON(LEADS_FILE, []);
    leads.push(lead);
    saveJSON(LEADS_FILE, leads);

    botState.leads_captured++;
    log(`Lead captured: ${lead.email} from ${lead.country} — Score: ${qualification.score} ${qualification.qualified ? '✅' : '⏳'}`);

    // Auto-sign-up if qualified
    let member = null;
    let onboarding = null;
    if (qualification.qualified) {
      try {
        member = halalWealthClub.registerMember({
          name: lead.name,
          email: lead.email,
          country: lead.country,
          tier: qualification.recommended_tier,
          referralCode: lead.referral_code,
          language: lead.language,
        });
        botState.members_signed_up++;
        botState.conversions[member.tier] = (botState.conversions[member.tier] || 0) + 1;
        botState.top_regions[member.region] = (botState.top_regions[member.region] || 0) + 1;

        onboarding = generateOnboardingMessage(member, lead.language);
        log(`Auto-registered member: ${member.id} (${member.tier}) — ${member.email}`);
      } catch (err) {
        log(`Auto-register failed for ${lead.email}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      lead_id: lead.id,
      qualification,
      member: member ? {
        id: member.id,
        tier: member.tier,
        referral_code: member.personal_referral_code,
        status: member.status,
      } : null,
      onboarding_preview: onboarding ? { subject: onboarding.subject, language: onboarding.language } : null,
      next_step: member
        ? `Complete payment at /api/hwc/checkout/${member.id}`
        : 'Lead captured — our AI agent will reach out shortly',
    });
  } catch (err) {
    log(`Lead capture error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ── Direct Sign-Up ─────────────────────────────────────────
app.post('/api/hwc/signup', (req, res) => {
  try {
    const { name, email, country, tier, referral_code, language } = req.body;

    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    // Check if already a member
    const existing = halalWealthClub.getMemberByEmail(email);
    if (existing) {
      return res.json({
        success: true,
        message: 'Already a member!',
        member: { id: existing.id, tier: existing.tier, status: existing.status },
      });
    }

    const member = halalWealthClub.registerMember({
      name,
      email,
      country: country || 'US',
      tier: tier || 'seed',
      referralCode: referral_code,
      language: language || 'en',
    });

    botState.members_signed_up++;
    botState.conversions[member.tier] = (botState.conversions[member.tier] || 0) + 1;
    botState.top_regions[member.region] = (botState.top_regions[member.region] || 0) + 1;

    const onboarding = generateOnboardingMessage(member, language || 'en');

    log(`New sign-up: ${member.id} (${member.tier}) — ${member.email} from ${member.country}`);

    res.json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        tier: member.tier,
        referral_code: member.personal_referral_code,
        status: member.status,
        features: halalWealthClub.tiers[member.tier].features,
      },
      onboarding,
      checkout_url: `/api/hwc/checkout/${member.id}`,
      message: `${WELCOME_MESSAGES[language || 'en']?.greeting || 'Assalamu Alaikum'} — Welcome to the Halal Wealth Club!`,
    });
  } catch (err) {
    log(`Sign-up error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ── Checkout (Stripe integration) ──────────────────────────
app.post('/api/hwc/checkout/:memberId', async (req, res) => {
  try {
    const member = halalWealthClub.getMember(req.params.memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const tier = halalWealthClub.tiers[member.tier];

    // Build checkout URL (integrates with revenue-server Stripe)
    const checkoutData = {
      member_id: member.id,
      email: member.email,
      tier: member.tier,
      price: tier.price,
      stripe_price_id: tier.stripe_price_id,
      product_name: `Halal Wealth Club — ${tier.name}`,
      success_url: `https://darcloud.host/api/hwc/welcome/${member.id}`,
      cancel_url: 'https://darcloud.host/api/hwc/pricing',
    };

    log(`Checkout initiated for ${member.id} (${tier.name} — $${tier.price}/mo)`);

    res.json({
      success: true,
      checkout: checkoutData,
      message: 'Proceed to payment to activate your membership',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Welcome Page (after payment) ───────────────────────────
app.get('/api/hwc/welcome/:memberId', (req, res) => {
  const member = halalWealthClub.getMember(req.params.memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const msg = WELCOME_MESSAGES[member.language] || WELCOME_MESSAGES.en;
  const content = halalWealthClub.getContentLibrary(member.tier);

  res.json({
    greeting: msg.greeting,
    welcome: msg.welcome,
    member: {
      id: member.id,
      name: member.name,
      tier: member.tier,
      referral_code: member.personal_referral_code,
    },
    content_available: {
      courses: content.courses.length,
      webinars: content.webinars.length,
    },
    next_steps: [
      'Complete your profile',
      'Start Islamic Finance 101 course',
      'Screen your first stock with the Halal Screener',
      'Share your referral code with friends & family',
    ],
  });
});

// ── Pricing ────────────────────────────────────────────────
app.get('/api/hwc/pricing', (req, res) => {
  res.json({
    club: 'Halal Wealth Club',
    tagline: 'Invest Halal — Prosper by the Will of Allah',
    tiers: halalWealthClub.getPricing(),
    revenue_model: {
      founder_royalty: '30%',
      ai_validators: '40%',
      hardware_hosts: '10%',
      ecosystem: '18%',
      zakat: '2%',
      note: 'Founder royalty is immutable — 30%',
    },
    regions: Object.entries(halalWealthClub.regions).map(([id, r]) => ({
      id, name: r.name, countries: r.countries.length, population_millions: r.population_muslim_millions,
    })),
    languages: Object.keys(WELCOME_MESSAGES),
  });
});

// ── Stats Dashboard ────────────────────────────────────────
app.get('/api/hwc/stats', (req, res) => {
  const clubStats = halalWealthClub.getStats();

  res.json({
    club: clubStats,
    bot: {
      ...botState,
      uptime_hours: +((Date.now() - new Date(botState.started_at).getTime()) / 3600000).toFixed(2),
    },
    campaigns: {
      available: Object.keys(CAMPAIGN_TEMPLATES),
      sent: botState.campaigns_sent,
    },
  });
});

// ── List Members ───────────────────────────────────────────
app.get('/api/hwc/members', (req, res) => {
  const { tier, region, status, limit, offset } = req.query;
  res.json(halalWealthClub.listMembers({
    tier, region, status,
    limit: parseInt(limit) || 50,
    offset: parseInt(offset) || 0,
  }));
});

// ── Get Member ─────────────────────────────────────────────
app.get('/api/hwc/member/:id', (req, res) => {
  const member = halalWealthClub.getMember(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  res.json(member);
});

// ── Halal Screener ─────────────────────────────────────────
app.post('/api/hwc/screen', (req, res) => {
  try {
    const { ticker, financials } = req.body;
    if (!ticker) return res.status(400).json({ error: 'Ticker required' });

    const result = halalWealthClub.screenInvestment(ticker, financials || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Zakat Calculator ───────────────────────────────────────
app.post('/api/hwc/zakat', (req, res) => {
  try {
    const result = halalWealthClub.calculateZakat(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Content Library ────────────────────────────────────────
app.get('/api/hwc/content/:tier', (req, res) => {
  const content = halalWealthClub.getContentLibrary(req.params.tier);
  res.json(content);
});

// ── Launch Campaign ────────────────────────────────────────
app.post('/api/hwc/campaign', (req, res) => {
  try {
    const { template, target_regions, custom_message } = req.body;
    const campaignTemplate = CAMPAIGN_TEMPLATES[template];
    if (!campaignTemplate) {
      return res.status(400).json({
        error: `Unknown template. Available: ${Object.keys(CAMPAIGN_TEMPLATES).join(', ')}`,
      });
    }

    const campaign = {
      id: `CAMP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      template,
      ...campaignTemplate,
      target_regions: target_regions || Object.keys(halalWealthClub.regions),
      custom_message: custom_message || null,
      launched_at: new Date().toISOString(),
      status: 'launched',
    };

    const campaigns = loadJSON(CAMPAIGNS_FILE, []);
    campaigns.push(campaign);
    saveJSON(CAMPAIGNS_FILE, campaigns);

    botState.campaigns_sent++;
    log(`Campaign launched: ${campaign.name} — targeting ${campaign.target_regions.length} regions`);

    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Campaigns ──────────────────────────────────────────
app.get('/api/hwc/campaigns', (req, res) => {
  const campaigns = loadJSON(CAMPAIGNS_FILE, []);
  res.json({
    templates: Object.keys(CAMPAIGN_TEMPLATES),
    launched: campaigns.length,
    campaigns: campaigns.slice(-20),
  });
});

// ── Referral Lookup ────────────────────────────────────────
app.get('/api/hwc/referral/:code', (req, res) => {
  const members = Object.values(halalWealthClub.data.members);
  const referrer = members.find(m => m.personal_referral_code === req.params.code);
  if (!referrer) return res.status(404).json({ error: 'Invalid referral code' });

  const referrals = members.filter(m => m.referral_code === req.params.code);
  res.json({
    referrer: { id: referrer.id, name: referrer.name, tier: referrer.tier },
    referrals_count: referrals.length,
    referrals: referrals.map(r => ({ id: r.id, tier: r.tier, joined: r.joined_at })),
  });
});

// ── Bot Metrics (for orchestrator) ─────────────────────────
app.get('/api/hwc/bot-metrics', (req, res) => {
  const metrics = {
    agent_name: 'HWC Membership Sign-Up Bot',
    agent_type: 'membership_recruitment',
    status: botState.active ? 'active' : 'paused',
    performance: {
      leads_captured: botState.leads_captured,
      members_signed_up: botState.members_signed_up,
      conversion_rate: botState.leads_captured > 0
        ? +((botState.members_signed_up / botState.leads_captured) * 100).toFixed(1)
        : 0,
      campaigns_sent: botState.campaigns_sent,
      conversions_by_tier: botState.conversions,
      top_regions: botState.top_regions,
    },
    capabilities: [
      'lead_capture',
      'lead_qualification',
      'auto_signup',
      'onboarding_messages',
      'campaign_management',
      'halal_screening',
      'zakat_calculation',
      'referral_tracking',
      'multi_language_support',
    ],
    languages: Object.keys(WELCOME_MESSAGES),
    regions: Object.keys(halalWealthClub.regions),
    revenue_model: {
      founder_royalty: '30%',
      note: 'Immutable',
    },
    uptime_hours: +((Date.now() - new Date(botState.started_at).getTime()) / 3600000).toFixed(2),
  };

  saveJSON(BOT_METRICS_FILE, metrics);
  res.json(metrics);
});

// ══════════════════════════════════════════════════════════
//  AUTONOMOUS SCHEDULED TASKS
// ══════════════════════════════════════════════════════════

// ── Friday Jummah Campaign (auto-runs every Friday) ────────
function scheduleJummahReminder() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 5=Fri

  // Calculate ms until next Friday 12:00 UTC
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(now);
  nextFriday.setUTCDate(now.getUTCDate() + daysUntilFriday);
  nextFriday.setUTCHours(12, 0, 0, 0);

  const msUntilFriday = nextFriday.getTime() - now.getTime();

  setTimeout(() => {
    log('📢 Auto-launching Jummah wealth reminder campaign');
    botState.campaigns_sent++;
    const campaigns = loadJSON(CAMPAIGNS_FILE, []);
    campaigns.push({
      id: `CAMP-JUMMAH-${Date.now().toString(36)}`,
      template: 'friday_reminder',
      ...CAMPAIGN_TEMPLATES.friday_reminder,
      auto_launched: true,
      launched_at: new Date().toISOString(),
    });
    saveJSON(CAMPAIGNS_FILE, campaigns);

    // Reschedule for next week
    scheduleJummahReminder();
  }, msUntilFriday);

  log(`Jummah reminder scheduled in ${(msUntilFriday / 3600000).toFixed(1)} hours`);
}

// ── Periodic Metrics Save ──────────────────────────────────
setInterval(() => {
  saveJSON(BOT_METRICS_FILE, {
    ...botState,
    saved_at: new Date().toISOString(),
    club_stats: halalWealthClub.getStats(),
  });
}, 5 * 60 * 1000); // Every 5 minutes

// ══════════════════════════════════════════════════════════
//  STARTUP
// ══════════════════════════════════════════════════════════

ensureDirs();

app.listen(PORT, () => {
  log('══════════════════════════════════════════');
  log('  🕌 Halal Wealth Club — AI Membership Bot');
  log(`  Port: ${PORT}`);
  log(`  Health: http://localhost:${PORT}/health`);
  log(`  Sign-Up: POST /api/hwc/signup`);
  log(`  Lead Capture: POST /api/hwc/lead`);
  log(`  Pricing: GET /api/hwc/pricing`);
  log(`  Stats: GET /api/hwc/stats`);
  log(`  Regions: ${Object.keys(halalWealthClub.regions).length}`);
  log(`  Languages: ${Object.keys(WELCOME_MESSAGES).length} (${Object.keys(WELCOME_MESSAGES).join(', ')})`);
  log(`  Campaign Templates: ${Object.keys(CAMPAIGN_TEMPLATES).length}`);
  log('  Revenue: 30% Founder | 40% AI | 10% HW | 18% Eco | 2% Zakat');
  log('══════════════════════════════════════════');

  // Start autonomous tasks
  scheduleJummahReminder();
});
