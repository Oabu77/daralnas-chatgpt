# OliveExpress™ Logistics Platform

**Status**: 🟢 LIVE - Production logistics network with QuranChain integration

> **✅ THIS IS THE MOST COMPLETE, UP-TO-DATE CODE WHERE ALL NETWORKS AND SYSTEMS ARE INTEGRATED AND WORKING**  
> See [ANSWER.md](./ANSWER.md) for verification | [INTEGRATION_STATUS.md](./INTEGRATION_STATUS.md) for details | [SYSTEM_INTEGRATION_MAP.md](./SYSTEM_INTEGRATION_MAP.md) for code locations

Production-ready logistics platform for the Dar Al-Nas ecosystem with full-scale operations across USA, Mexico, and Jordan. Includes QuranChain smart contracts, AI-powered dispatch (Omar AI / AMĀN Control), multi-modal transport, and humanitarian corridor support.

## 🚀 Platform Overview

OliveExpress™ is a complete, revenue-generating logistics network featuring:

- **Multi-Regional Operations**: USA (8 ports), Mexico (6 ports), Jordan (4 ports)
- **QuranChain Integration**: Smart contracts, escrow, auto-release, dispute resolution
- **AI Dispatch**: Omar AI optimization, AMĀN Control scoring, delay prediction
- **Multi-Modal Transport**: Truck, Rail, Sea, Air, and multimodal shipments
- **Cross-Border**: Mexico-USA and international customs handling
- **Humanitarian Corridors**: Zakat-exempt NGO routes, emergency logistics
- **On-Chain Settlement**: 100% QuranChain, zero traditional banking
- **Founder Economics**: 2.5% royalty on commercial (0% on humanitarian)

## Architecture

### Backend Stack
- **Cloudflare Workers**: Serverless, globally distributed edge computing
- **Hono Framework**: High-performance HTTP routing
- **Chanfana**: OpenAPI-first REST API generation
- **D1 Database**: SQLite-based, auto-scaling storage (28+ tables)
- **TypeScript**: Type-safe development
- **Zod**: Runtime validation

### Database Schema (25+ Tables)
- **Core**: shipments, carriers, ports, corridors, customs_declarations
- **QuranChain**: contracts, escrow_accounts, disputes, founder_royalties, zakat_shipments
- **AI/Analytics**: carrier_scores, delay_predictions, route_optimizations, carrier_reassignments
- **Treasury**: invoices, invoice_items, settlements, revenue_analytics
- **Integration**: darcloud_identities, meshtalk_messages, oliveair_handoffs, carrier_wallets

### Regional Coverage
- **USA**: 8 ports (LA, Long Beach, NYC, Savannah, Houston, Miami, DFW, Memphis)
- **Mexico**: 6 ports (Veracruz, Manzanillo, Lázaro Cárdenas, Tijuana, Mexico City, Juárez)
- **Jordan**: 4 ports (Aqaba Sea, QAIA Air, Amman Land, Aqaba Rail)
- **Corridors**: 10 active routes (7 commercial, 2 humanitarian, 1 NGO)

## Quick Start

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```

2. Apply database migrations:
   ```bash
   npm run seedLocalDb
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Access API:
   - OpenAPI Docs: http://localhost:8787/
   - Dashboard: http://localhost:8787/dashboard.html
   - Ports API: http://localhost:8787/oliveexpress/ports

### Production Deployment
```bash
# Apply migrations to production DB
npm run predeploy

# Deploy to Cloudflare Workers
npm run deploy
```

## API Endpoints (60+)

### Shipment Management
- `POST /oliveexpress/shipments` - Create shipment
- `GET /oliveexpress/shipments` - List all shipments
- `GET /oliveexpress/shipments/:id` - Get shipment details
- `PUT /oliveexpress/shipments/:id` - Update shipment

### Carrier Operations
- `POST /oliveexpress/onboarding/carrier` - Onboard new carrier
- `GET /oliveexpress/carriers` - List carriers
- `PUT /oliveexpress/carriers/:id` - Update carrier

### Port & Corridor
- `GET /oliveexpress/ports` - List all ports (USA, Mexico, Jordan)
- `GET /oliveexpress/corridors` - List all corridors
- `PUT /oliveexpress/ports/:id` - Update port congestion

### QuranChain Integration
- `POST /oliveexpress/quranchain/deploy` - Deploy shipment contract
- `POST /oliveexpress/quranchain/escrow/fund` - Fund escrow account
- `POST /oliveexpress/quranchain/escrow/release` - Auto-release on delivery
- `POST /oliveexpress/quranchain/dispute` - File dispute

### AI & Automation (Omar AI / AMĀN)
- `POST /oliveexpress/ai/dispatch/optimize` - Optimize carrier/route
- `POST /oliveexpress/ai/carrier/score` - Calculate trust score
- `POST /oliveexpress/ai/delay/predict` - Predict delays
- `POST /oliveexpress/ai/carrier/reassign` - Auto-reassign carrier

### Operations Dashboard
- `GET /oliveexpress/operations/live-map` - Live shipment tracking
- `GET /oliveexpress/operations/port-congestion` - Port status
- `POST /oliveexpress/tracking/update` - Update tracking event

### Treasury & Finance
- `POST /oliveexpress/treasury/invoice/generate` - Generate invoice
- `GET /oliveexpress/treasury/revenue/analytics` - Revenue analytics

See [API_TESTS.md](./API_TESTS.md) for complete API testing guide.

## System Integration

### DarCloud™ Identity
- Digital identity for all participants
- KYC/AML verification
- Document storage and compliance
- Multi-level verification

### QuranChain™ Blockchain
- Shipment smart contracts
- Automated escrow (funded → released on delivery)
- Dispute resolution workflow
- Founder royalty enforcement (2.5% commercial, 0% humanitarian)
- Zakat-exempt route tracking

### MeshTalk OS™ Communication
- Driver-dispatcher messaging
- Offline-capable operations
- Emergency routing triggers
- Real-time shipment updates

### OliveAir™ Integration
- Air-to-ground cargo handoff
- International freight coordination
- Emergency humanitarian lift
- Multi-modal continuity

### Omar AI / AMĀN Control
- Dispatch optimization (route + carrier selection)
- Carrier trust scoring (performance-based, 0-100)
- Delay prediction with confidence levels
- Automatic carrier reassignment
- Revenue optimization

### Dar Al-Nas Treasury
- Multi-customer invoicing (Merchant, Enterprise, Gov, NGO)
- On-chain settlement only (no banks)
- Automated founder royalty distribution
- Zakat compliance tracking

## Revenue Model

### Commercial Shipments
- **Freight Rate**: 15% of cargo value
- **Founder Royalty**: 2.5% of transaction value
- **Settlement**: 100% on-chain via QuranChain
- **Example**: $50,000 cargo → $7,500 freight → $187.50 royalty

### NGO & Humanitarian
- **Freight Rate**: Cost recovery only
- **Founder Royalty**: 0% (zakat-exempt)
- **Settlement**: On-chain via QuranChain
- **Tracking**: Transparent humanitarian volume reporting

### Payment Processing
- ✅ QuranChain smart contracts only
- ✅ No traditional banking integration
- ✅ Automated escrow and release
- ✅ Dispute mediation on-chain

## Compliance & Ethics

### Halal Finance
- ❌ No riba (interest)
- ❌ No speculative yield
- ❌ No guaranteed returns
- ✅ Transparent founder economics
- ✅ Zakat-exempt humanitarian routes

### Governance
- ✅ Multi-jurisdiction support (USA, Mexico, Jordan)
- ✅ Cross-border customs compliance
- ✅ Carrier verification and scoring
- ✅ Dispute resolution mechanisms
- ✅ Humanitarian corridor prioritization

### Security
- ✅ No wallet custody
- ✅ HTTPS/TLS enforced
- ✅ Rate limiting enabled
- ✅ DDoS protection (Cloudflare)
- ✅ On-chain settlement only

## Deployment

### Quick Deploy

**Verify deployment readiness:**
```bash
# Run automated verification
./scripts/verify-deployment-ready.sh

# Or manually check
npm test
```

**Deploy to production:**
```bash
# Option 1: Automated via GitHub Actions (recommended)
# - Merge PR to main branch
# - CI/CD will automatically deploy

# Option 2: Manual deployment
npm run predeploy  # Apply database migrations
npm run deploy     # Deploy to Cloudflare Workers
```

See [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) for complete pre-deployment verification.

### Infrastructure
- **Hosting**: Cloudflare Workers (edge computing)
- **Database**: D1 (SQLite, auto-scaling)
- **CDN**: Cloudflare global network
- **Monitoring**: Cloudflare Analytics + Observability
- **CI/CD**: GitHub Actions

### Environment Variables
```bash
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<your-api-token>
```

### Docker Support
```bash
# Build container
docker build -t oliveexpress .

# Run locally
docker-compose up
```

### Production Checklist
- [x] Database schema deployed (28 tables)
- [x] Regional ports seeded (18 total)
- [x] Corridors configured (10 routes)
- [x] QuranChain integration active
- [x] AI systems operational
- [x] Revenue processing enabled
- [x] Carrier onboarding live
- [x] Public API exposed
- [x] Documentation complete
- [x] CI/CD pipeline configured
- [x] Monitoring enabled

## Documentation

### ⭐ Start Here
- **[ANSWER.md](./ANSWER.md)** - **PROOF: This is the most complete, integrated code** ✅

### Integration & System Status
- [INTEGRATION_STATUS.md](./INTEGRATION_STATUS.md) - Complete integration verification (ALL SYSTEMS WORKING)
- [SYSTEM_INTEGRATION_MAP.md](./SYSTEM_INTEGRATION_MAP.md) - Quick reference map to all integrated code
- [LIVE_STATUS.md](./LIVE_STATUS.md) - Live system confirmation and statistics
- [LAUNCH_CONFIRMATION.md](./LAUNCH_CONFIRMATION.md) - Production launch details

### Operations & Deployment
- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) - **Pre-deployment verification checklist** ✅
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide and infrastructure
- [API_TESTS.md](./API_TESTS.md) - Complete API testing guide
- `scripts/verify-deployment-ready.sh` - Automated deployment readiness verification script

## Telegram Bot (Legacy)

The repository also contains a Python-based Telegram bot for educational AI interactions:

- **FastAPI + python-telegram-bot 20.x**: webhook server with `/webhook` for Telegram updates, `/health` for monitoring, and static Mini Apps at `/miniapps/{name}`.
- **Modules**: `/daralnas`, `/quranchain`, `/meshtalk`, `/fungi`, `/donate`, `/ask`, and `/start` are wired into a single Telegram Application instance.
- **AI guardrails**: replies are ≤120 words, avoid advice/rulings, and escalate sensitive topics to humans. OpenAI is optional; canned messaging is used if the key is absent.
- **Jurisdiction gating**: optional `ALLOWED_COUNTRIES` env var forces a country declaration (e.g., `Country: UAE`) before regulated flows like `/ask`.
- **Founder economics**: surfaced transparently (gas-fee shares, IP licensing, governance stipends) without speculative language.
- **No custody**: Telegram is the interface only; no keys are stored or requested.

## Local development
1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Set required secrets:
   ```bash
   export BOT_TOKEN="<telegram-bot-token>"
   export ADMIN_ID="<numeric-admin-id>"  # optional
   export OPENAI_API_KEY="<optional-openai-key>"
   export WEBHOOK_URL="https://<your-public-url>"  # optional for local testing with tunnels
   export ALLOWED_COUNTRIES="UAE,SA,UK"  # optional
   ```
3. Run the server (single command startup):
   ```bash
   python -m daralnas_bot.server
   ```
   Health check: `curl http://localhost:8000/health`

## Deployment (Railway)
1. Create a new Railway service from this repository.
2. Set environment variables in the Railway dashboard: `BOT_TOKEN`, `OPENAI_API_KEY` (optional), `ADMIN_ID` (optional), `WEBHOOK_URL` (public HTTPS endpoint), and `ALLOWED_COUNTRIES` if gating is needed.
3. Railway uses the provided `Procfile`: `web: python -m daralnas_bot.server`.
4. Configure Telegram webhook to `${WEBHOOK_URL}/webhook` (the server auto-sets it during startup when `WEBHOOK_URL` is provided).
5. Enable auto-redeploys and logging in Railway for operational visibility.

## Mini Apps
Static educational shells live under `daralnas_bot/templates`:
- `daralnas.html` – halal financing primer and pre-qualification disclaimer
- `quranchain.html` – settlement transparency and infrastructure fees
- `meshtalk.html` – governance and deliberation UX
- `fungi.html` – reputation and trust visualization

These are intentionally simple HTML/JS entry points and can be expanded with Telegram Mini App JS SDK while keeping ethics, gating, and transparency.

## Compliance and ethics defaults
- No riba, speculative yield, or guaranteed returns.
- Jurisdiction-aware flows with human review escalation.
- AI is educational only; no approvals, fatwas, or financial advice.
- Secrets are sourced from environment variables only.
- Logging is enabled at startup; extend with Railway log drains for audits.
