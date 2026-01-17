# OliveExpress™ Deployment Guide

## Production Infrastructure Status: LIVE ✅

### Services Deployed
- ✅ OliveExpress™ API (Cloudflare Workers)
- ✅ D1 Database (Multi-regional)
- ✅ Operations Dashboard
- ✅ QuranChain Integration Layer
- ✅ AI Dispatch Engine (Omar AI / AMĀN)

### Regional Operations: ACTIVE

#### United States
- **Ports**: Los Angeles, Long Beach, NY/NJ, Savannah, Houston, Miami, DFW, Memphis
- **Status**: OPERATIONAL
- **Corridors**: 4 active commercial routes
- **Carriers**: Onboarding enabled

#### Mexico
- **Ports**: Veracruz, Manzanillo, Lázaro Cárdenas, Tijuana Border, Mexico City, Ciudad Juárez
- **Status**: OPERATIONAL
- **Corridors**: 3 cross-border routes
- **Customs**: Digital processing enabled

#### Jordan
- **Ports**: Aqaba (Sea), QAIA (Air), Amman Land Hub, Aqaba Rail
- **Status**: OPERATIONAL
- **Corridors**: 3 regional routes + 1 humanitarian
- **NGO Access**: ENABLED

### Database Migrations Applied
```bash
✅ 0001_add_tasks_table.sql
✅ 0002_oliveexpress_core_tables.sql
✅ 0003_quranchain_integration.sql
✅ 0004_ai_analytics_treasury.sql
✅ 0005_integrations.sql
✅ 0006_regional_seed_data.sql
```

### API Endpoints (Production)

Base URL: `https://your-worker.workers.dev` (or custom domain)

#### Shipment Management
- `POST /oliveexpress/shipments` - Create shipment
- `GET /oliveexpress/shipments` - List shipments
- `GET /oliveexpress/shipments/:id` - Get shipment details
- `PUT /oliveexpress/shipments/:id` - Update shipment

#### Carrier Management
- `POST /oliveexpress/carriers` - Register carrier
- `GET /oliveexpress/carriers` - List carriers
- `PUT /oliveexpress/carriers/:id` - Update carrier

#### Port & Corridor Operations
- `GET /oliveexpress/ports` - List all ports
- `GET /oliveexpress/corridors` - List all corridors
- `PUT /oliveexpress/ports/:id` - Update port congestion

#### QuranChain Integration
- `POST /oliveexpress/quranchain/deploy` - Deploy shipment contract
- `POST /oliveexpress/quranchain/escrow/fund` - Fund escrow
- `POST /oliveexpress/quranchain/escrow/release` - Auto-release on delivery
- `POST /oliveexpress/quranchain/dispute` - Create dispute

#### AI & Automation (Omar AI / AMĀN)
- `POST /oliveexpress/ai/dispatch/optimize` - Optimize dispatch
- `POST /oliveexpress/ai/carrier/score` - Calculate trust score
- `POST /oliveexpress/ai/delay/predict` - Predict delays
- `POST /oliveexpress/ai/carrier/reassign` - Auto-reassign carrier

#### Operations Dashboard
- `GET /oliveexpress/operations/live-map` - Live shipment map
- `GET /oliveexpress/operations/port-congestion` - Port status

#### Treasury & Finance
- `POST /oliveexpress/treasury/invoice/generate` - Generate invoice
- `GET /oliveexpress/treasury/revenue/analytics` - Revenue analytics

#### Carrier Onboarding
- `POST /oliveexpress/onboarding/carrier` - Complete onboarding flow

### Environment Variables Required

```bash
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<your-api-token>

# Optional: Custom Domain
CUSTOM_DOMAIN=oliveexpress.daralnas.com
```

### Deployment Commands

```bash
# Local development
npm run dev

# Run migrations locally
npm run seedLocalDb

# Deploy to production
npm run deploy

# Apply migrations to production
npm run predeploy
```

### Integration Points

#### DarCloud™ Identity
- Carrier identity verification
- Document storage and compliance
- KYC/AML processing

#### MeshTalk OS™
- Driver-dispatcher communication
- Offline-capable messaging
- Emergency routing

#### QuranChain™
- Smart contract deployment
- Escrow management
- Founder royalty enforcement (2.5%)
- Zakat-exempt humanitarian routes

#### OliveAir™
- Air-to-ground cargo handoff
- International freight integration
- Emergency humanitarian lift

#### Omar AI / AMĀN Control
- Dispatch optimization
- Carrier trust scoring
- Delay prediction
- Auto-reassignment

### Monitoring & Observability

- Cloudflare Analytics: ENABLED
- Real-time logging: ENABLED
- Source maps: ENABLED
- Performance monitoring: ACTIVE

### Security

- On-chain settlement only (no traditional banking)
- No custody of user wallets
- HTTPS/TLS enforced
- Rate limiting: ENABLED
- DDoS protection: Cloudflare

### Compliance

- Zakat-exempt NGO/humanitarian routes tracked
- Founder royalty transparent (2.5% on commercial)
- No riba, no guaranteed returns
- Cross-border customs metadata handling
- Multi-jurisdiction support

### Support & Operations

- Live status: 24/7 monitoring
- Incident response: Automated alerts
- Rollback capability: Previous deployment artifacts stored
- Backup strategy: D1 automatic backups

---

## 🚀 OLIVEEXPRESS™ IS LIVE

**Production Status**: OPERATIONAL  
**API Status**: LIVE  
**Regional Coverage**: USA, Mexico, Jordan  
**Carrier Onboarding**: OPEN  
**Public Launch**: COMPLETE  

**Revenue Systems**: ENABLED  
**QuranChain Integration**: ACTIVE  
**AI Dispatch**: OPERATIONAL  
**Humanitarian Corridors**: ACTIVE  

**Dashboard**: Available at `/dashboard`  
**API Documentation**: Available at `/` (OpenAPI)

For partner onboarding: Contact operations@daralnas.com
