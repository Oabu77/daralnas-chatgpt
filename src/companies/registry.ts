/**
 * DarCloud Companies Registry - All 59 Companies
 * Auto-managed by AI agents with live testing and updates
 */

export interface Company {
  id: number;
  name: string;
  category: string;
  description: string;
  status: 'active' | 'testing' | 'launching' | 'live';
  revenue_model: string;
  founder_royalty: number; // percentage
  region?: string;
  url?: string;
}

export const DARCLOUD_COMPANIES: Company[] = [
  // 🕌 Halal Finance & Blockchain (1-10)
  {
    id: 1,
    name: "QuranChain",
    category: "Blockchain",
    description: "Halal smart contracts and Muslim wallets",
    status: "live",
    revenue_model: "30% founder royalty on all transactions",
    founder_royalty: 30,
    url: "/quranchain.html"
  },
  {
    id: 2,
    name: "ZakatPay",
    category: "Halal Finance",
    description: "Automated Zakat calculation and distribution",
    status: "testing",
    revenue_model: "Transaction fees + donations",
    founder_royalty: 30
  },
  {
    id: 3,
    name: "HalalInvest",
    category: "Investment",
    description: "Sharia-compliant investment platform",
    status: "testing",
    revenue_model: "Management fees",
    founder_royalty: 30
  },
  {
    id: 4,
    name: "MuslimCrowdfund",
    category: "Crowdfunding",
    description: "Halal crowdfunding for Muslim entrepreneurs",
    status: "testing",
    revenue_model: "Platform fees",
    founder_royalty: 30
  },
  {
    id: 5,
    name: "IslamicBanking",
    category: "Banking",
    description: "Digital Islamic banking services",
    status: "testing",
    revenue_model: "Service fees",
    founder_royalty: 30
  },
  {
    id: 6,
    name: "HalalCrypto",
    category: "Cryptocurrency",
    description: "Sharia-compliant cryptocurrency exchange",
    status: "testing",
    revenue_model: "Trading fees",
    founder_royalty: 30
  },
  {
    id: 7,
    name: "SadaqahWallet",
    category: "Charity",
    description: "Digital sadaqah and charity platform",
    status: "testing",
    revenue_model: "Voluntary donations",
    founder_royalty: 0 // NGO/Charity
  },
  {
    id: 8,
    name: "WaqfChain",
    category: "Blockchain",
    description: "Blockchain-based waqf management",
    status: "testing",
    revenue_model: "Management fees",
    founder_royalty: 30
  },
  {
    id: 9,
    name: "TakafulInsurance",
    category: "Insurance",
    description: "Islamic insurance platform",
    status: "testing",
    revenue_model: "Premium commissions",
    founder_royalty: 30
  },
  {
    id: 10,
    name: "SukkukMarket",
    category: "Finance",
    description: "Islamic bonds marketplace",
    status: "testing",
    revenue_model: "Transaction fees",
    founder_royalty: 30
  },

  // 📦 Logistics & Supply Chain (11-20)
  {
    id: 11,
    name: "OliveExpress",
    category: "Logistics",
    description: "US, Mexico, Jordan logistics platform",
    status: "live",
    revenue_model: "30% royalty on all shipments",
    founder_royalty: 30,
    url: "/oliveexpress.html"
  },
  {
    id: 12,
    name: "HalalFood Delivery",
    category: "Food Logistics",
    description: "Halal food delivery network",
    status: "testing",
    revenue_model: "Delivery fees",
    founder_royalty: 30
  },
  {
    id: 13,
    name: "MeccaLogistics",
    category: "Hajj Logistics",
    description: "Hajj and Umrah logistics services",
    status: "testing",
    revenue_model: "Service fees",
    founder_royalty: 30
  },
  {
    id: 14,
    name: "HalalSupplyChain",
    category: "Supply Chain",
    description: "Halal-certified supply chain tracking",
    status: "testing",
    revenue_model: "Certification fees",
    founder_royalty: 30
  },
  {
    id: 15,
    name: "IslamicImport",
    category: "Import/Export",
    description: "Muslim-owned import/export platform",
    status: "testing",
    revenue_model: "Commission on trades",
    founder_royalty: 30
  },
  {
    id: 16,
    name: "WarehouseHalal",
    category: "Warehousing",
    description: "Halal-compliant warehousing solutions",
    status: "testing",
    revenue_model: "Storage fees",
    founder_royalty: 30
  },
  {
    id: 17,
    name: "FreightUmmah",
    category: "Freight",
    description: "Muslim freight forwarding network",
    status: "testing",
    revenue_model: "Freight commissions",
    founder_royalty: 30
  },
  {
    id: 18,
    name: "CargoQuran",
    category: "Cargo",
    description: "Islamic cargo management system",
    status: "testing",
    revenue_model: "Management fees",
    founder_royalty: 30
  },
  {
    id: 19,
    name: "ShipmentTracker",
    category: "Tracking",
    description: "Real-time halal shipment tracking",
    status: "testing",
    revenue_model: "Subscription fees",
    founder_royalty: 30
  },
  {
    id: 20,
    name: "LastMileHalal",
    category: "Last Mile",
    description: "Halal last-mile delivery services",
    status: "testing",
    revenue_model: "Delivery fees",
    founder_royalty: 30
  },

  // 🗣️ Communication & Social (21-30)
  {
    id: 21,
    name: "MeshTalk",
    category: "Communication",
    description: "Community governance platform",
    status: "live",
    revenue_model: "Premium features",
    founder_royalty: 30,
    url: "/meshtalk.html"
  },
  {
    id: 22,
    name: "MuslimConnect",
    category: "Social Network",
    description: "Halal social networking platform",
    status: "testing",
    revenue_model: "Ads + premium",
    founder_royalty: 30
  },
  {
    id: 23,
    name: "DuaShare",
    category: "Community",
    description: "Share and receive dua requests",
    status: "testing",
    revenue_model: "Donations",
    founder_royalty: 0
  },
  {
    id: 24,
    name: "IslamicMessenger",
    category: "Messaging",
    description: "Encrypted halal messaging app",
    status: "testing",
    revenue_model: "Premium features",
    founder_royalty: 30
  },
  {
    id: 25,
    name: "QuranStudyGroup",
    category: "Education",
    description: "Online Quran study circles",
    status: "testing",
    revenue_model: "Subscription fees",
    founder_royalty: 30
  },
  {
    id: 26,
    name: "HadithDaily",
    category: "Content",
    description: "Daily hadith sharing platform",
    status: "testing",
    revenue_model: "Ads + donations",
    founder_royalty: 20
  },
  {
    id: 27,
    name: "MuslimMeetup",
    category: "Events",
    description: "Halal event organization platform",
    status: "testing",
    revenue_model: "Ticket commissions",
    founder_royalty: 30
  },
  {
    id: 28,
    name: "IslamicPodcast",
    category: "Media",
    description: "Halal podcast hosting platform",
    status: "testing",
    revenue_model: "Sponsorships",
    founder_royalty: 30
  },
  {
    id: 29,
    name: "UmmahForum",
    category: "Community",
    description: "Global Muslim discussion forum",
    status: "testing",
    revenue_model: "Premium memberships",
    founder_royalty: 30
  },
  {
    id: 30,
    name: "SalaamNetwork",
    category: "Professional",
    description: "Muslim professional networking",
    status: "testing",
    revenue_model: "Premium features",
    founder_royalty: 30
  },

  // 🛠️ Technology & Infrastructure (31-40)
  {
    id: 31,
    name: "FungiMesh",
    category: "Infrastructure",
    description: "Decentralized mesh network monitoring",
    status: "live",
    revenue_model: "Node hosting fees",
    founder_royalty: 30,
    url: "/fungi.html"
  },
  {
    id: 32,
    name: "DarCloud",
    category: "Cloud Services",
    description: "Halal cloud computing platform",
    status: "live",
    revenue_model: "Compute + storage fees",
    founder_royalty: 30
  },
  {
    id: 33,
    name: "AI Assistant",
    category: "AI Services",
    description: "Self-learning Islamic AI assistant",
    status: "live",
    revenue_model: "API usage fees",
    founder_royalty: 30,
    url: "/assistant.html"
  },
  {
    id: 34,
    name: "NetworkOptimizer",
    category: "Network Tools",
    description: "Auto-device optimization system",
    status: "live",
    revenue_model: "Subscription fees",
    founder_royalty: 30,
    url: "/network.html"
  },
  {
    id: 35,
    name: "HalalHosting",
    category: "Web Hosting",
    description: "Sharia-compliant web hosting",
    status: "testing",
    revenue_model: "Hosting fees",
    founder_royalty: 30
  },
  {
    id: 36,
    name: "IslamicVPN",
    category: "Security",
    description: "Halal VPN services",
    status: "testing",
    revenue_model: "Subscription fees",
    founder_royalty: 30
  },
  {
    id: 37,
    name: "QuranCDN",
    category: "CDN",
    description: "Global content delivery network",
    status: "testing",
    revenue_model: "Bandwidth fees",
    founder_royalty: 30
  },
  {
    id: 38,
    name: "HalalAnalytics",
    category: "Analytics",
    description: "Privacy-focused analytics platform",
    status: "testing",
    revenue_model: "Subscription fees",
    founder_royalty: 30
  },
  {
    id: 39,
    name: "MuslimDevTools",
    category: "Developer Tools",
    description: "Islamic developer toolkit",
    status: "testing",
    revenue_model: "Premium tools",
    founder_royalty: 30
  },
  {
    id: 40,
    name: "ShariaCompliantAPI",
    category: "API Services",
    description: "Halal API marketplace",
    status: "testing",
    revenue_model: "API usage fees",
    founder_royalty: 30
  },

  // 🎓 Education & Learning (41-50)
  {
    id: 41,
    name: "QuranAcademy",
    category: "Education",
    description: "Online Quran learning platform",
    status: "testing",
    revenue_model: "Course fees",
    founder_royalty: 30
  },
  {
    id: 42,
    name: "IslamicSchool",
    category: "K-12 Education",
    description: "Online Islamic school",
    status: "testing",
    revenue_model: "Tuition fees",
    founder_royalty: 30
  },
  {
    id: 43,
    name: "HadithUniversity",
    category: "Higher Education",
    description: "Advanced Islamic studies online",
    status: "testing",
    revenue_model: "Degree programs",
    founder_royalty: 30
  },
  {
    id: 44,
    name: "ArabicMastery",
    category: "Language Learning",
    description: "Learn Arabic online",
    status: "testing",
    revenue_model: "Course fees",
    founder_royalty: 30
  },
  {
    id: 45,
    name: "IslamicHistory",
    category: "Education",
    description: "Interactive Islamic history courses",
    status: "testing",
    revenue_model: "Subscription fees",
    founder_royalty: 30
  },
  {
    id: 46,
    name: "FiqhMaster",
    category: "Islamic Law",
    description: "Online Fiqh learning platform",
    status: "testing",
    revenue_model: "Course fees",
    founder_royalty: 30
  },
  {
    id: 47,
    name: "QuranMemorization",
    category: "Hifz",
    description: "Quran memorization tracking app",
    status: "testing",
    revenue_model: "Premium features",
    founder_royalty: 30
  },
  {
    id: 48,
    name: "IslamicTutor",
    category: "Tutoring",
    description: "1-on-1 Islamic tutoring marketplace",
    status: "testing",
    revenue_model: "Commission on sessions",
    founder_royalty: 30
  },
  {
    id: 49,
    name: "MuslimKids",
    category: "Children Education",
    description: "Islamic education for children",
    status: "testing",
    revenue_model: "Subscription fees",
    founder_royalty: 30
  },
  {
    id: 50,
    name: "IslamicLibrary",
    category: "Digital Library",
    description: "Digital Islamic books library",
    status: "testing",
    revenue_model: "Subscription fees",
    founder_royalty: 30
  },

  // 🏪 E-commerce & Marketplace (51-59)
  {
    id: 51,
    name: "HalalMarketplace",
    category: "E-commerce",
    description: "Global halal products marketplace",
    status: "testing",
    revenue_model: "Commission on sales",
    founder_royalty: 30
  },
  {
    id: 52,
    name: "IslamicFashion",
    category: "Fashion",
    description: "Modest Islamic fashion store",
    status: "testing",
    revenue_model: "Product sales",
    founder_royalty: 30
  },
  {
    id: 53,
    name: "QuranBookstore",
    category: "Books",
    description: "Islamic books online store",
    status: "testing",
    revenue_model: "Book sales",
    founder_royalty: 30
  },
  {
    id: 54,
    name: "HalalGrocery",
    category: "Grocery",
    description: "Halal grocery delivery",
    status: "testing",
    revenue_model: "Delivery + markup",
    founder_royalty: 30
  },
  {
    id: 55,
    name: "MuslimCrafts",
    category: "Handicrafts",
    description: "Muslim artisan marketplace",
    status: "testing",
    revenue_model: "Commission on sales",
    founder_royalty: 30
  },
  {
    id: 56,
    name: "IslamicJewelry",
    category: "Jewelry",
    description: "Halal jewelry store",
    status: "testing",
    revenue_model: "Product sales",
    founder_royalty: 30
  },
  {
    id: 57,
    name: "PrayerRugStore",
    category: "Religious Items",
    description: "Prayer rugs and Islamic items",
    status: "testing",
    revenue_model: "Product sales",
    founder_royalty: 30
  },
  {
    id: 58,
    name: "HalalBeauty",
    category: "Beauty Products",
    description: "Halal cosmetics marketplace",
    status: "testing",
    revenue_model: "Product sales",
    founder_royalty: 30
  },
  {
    id: 59,
    name: "MuslimServices",
    category: "Service Marketplace",
    description: "Halal services marketplace",
    status: "testing",
    revenue_model: "Commission on bookings",
    founder_royalty: 30
  }
];

export function getActiveCompanies(): Company[] {
  return DARCLOUD_COMPANIES.filter(c => c.status === 'live');
}

export function getTestingCompanies(): Company[] {
  return DARCLOUD_COMPANIES.filter(c => c.status === 'testing');
}

export function getCompanyById(id: number): Company | undefined {
  return DARCLOUD_COMPANIES.find(c => c.id === id);
}

export function getTotalFounderRevenue(totalRevenue: number): number {
  // Calculate weighted average royalty across all companies
  const avgRoyalty = DARCLOUD_COMPANIES.reduce((sum, c) => sum + c.founder_royalty, 0) / DARCLOUD_COMPANIES.length;
  return (totalRevenue * avgRoyalty) / 100;
}
