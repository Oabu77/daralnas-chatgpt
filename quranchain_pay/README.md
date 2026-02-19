<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

# QuranChain Pay™

**Production Payment Orchestration Platform**

© QuranChain™ | Omar Mohammad Abunadi™

---

## Overview

QuranChain Pay is a Stripe-like payments orchestration platform that:

- Onboards merchants
- Creates payment intents
- Automatically selects the cheapest payment rail
- Routes payments away from card networks when possible
- Falls back to cards only when required
- Enforces a founder royalty on EVERY payment
- Records immutable ledgers

## Quick Start

### 1. Clone and Configure

```bash
cd quranchain_pay
cp .env.example .env
# Edit .env with your production values
```

### 2. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. Access

- **API**: http://localhost:8080
- **Docs**: http://localhost:8080/docs
- **Health**: http://localhost:8080/health

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/merchant/onboard` | Onboard new merchant |
| `POST` | `/payment_intents` | Create payment intent |
| `POST` | `/payment_intents/{id}/confirm` | Confirm and execute payment |
| `GET` | `/payments/{id}` | Get payment details |
| `GET` | `/rails/fees?amount=X` | Compare rail fees |
| `GET` | `/health` | Health check |

## Payment Rails

Rails are selected automatically in order of cost (cheapest first):

| Rail | Fee | Fixed | Settlement |
|------|-----|-------|------------|
| USDC | 0.1% | $0.00 | Instant |
| ACH | 0.8% | $0.25 | 2 days |
| BTC | 0.5% | $0.50 | ~1 hour |
| CARD | 2.9% | $0.30 | 3 days |

## Founder Royalty

**2.5%** of every transaction is collected as founder royalty.

This is enforced at settlement time across ALL payment rails.

## Environment Variables

```bash
# Required
SECRET_KEY=              # 32+ character secret
DATABASE_URL=            # PostgreSQL connection string
FOUNDER_USDC_ADDRESS=    # USDC payout address
FOUNDER_ETH_ADDRESS=     # ETH payout address

# Blockchain RPC (for USDC settlement)
ETH_RPC_URL=             # Ethereum mainnet RPC
POLYGON_RPC_URL=         # Polygon mainnet RPC

# Payment Providers
STRIPE_SECRET_KEY=       # For card fallback
ACH_PROVIDER_API_KEY=    # For ACH transfers
```

## Example Usage

### Onboard Merchant

```bash
curl -X POST http://localhost:8080/merchant/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Acme Corp",
    "email": "payments@acme.com",
    "accepts_usdc": true,
    "accepts_card": true,
    "payout_usdc_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3"
  }'
```

### Create Payment Intent

```bash
curl -X POST http://localhost:8080/payment_intents \
  -H "Content-Type: application/json" \
  -H "X-API-Key: qcp_live_your_api_key_here" \
  -d '{
    "amount": 10000,
    "currency": "usd",
    "customer_email": "customer@example.com",
    "description": "Order #12345"
  }'
```

### Confirm Payment

```bash
curl -X POST http://localhost:8080/payment_intents/pi_xxx/confirm \
  -H "X-API-Key: qcp_live_your_api_key_here" \
  -d '{}'
```

## File Structure

```
quranchain_pay/
├── app/
│   ├── __init__.py          # Package init
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── security.py          # Auth & rate limiting
│   ├── rail_selector.py     # Rail selection logic
│   └── settlement.py        # Settlement providers
├── tests/
│   └── test_api.py          # Test suite
├── database/
│   └── init.sql             # PostgreSQL schema
├── nginx/
│   └── nginx.conf           # Reverse proxy config
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD pipeline
├── Dockerfile               # Container build
├── docker-compose.yml       # Multi-service orchestration
├── requirements.txt         # Python dependencies
├── .env.example             # Environment template
├── deploy.sh                # One-command deployment
└── README.md                # This file
```

## Deployment Options

### Docker (Recommended)

```bash
./deploy.sh
```

### Manual

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

### Cloud

- **AWS**: Deploy to ECS/Fargate
- **GCP**: Deploy to Cloud Run
- **Render/Railway**: Connect GitHub repo

## CI/CD

GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. Runs tests on all PRs
2. Builds Docker image on merge to `main`
3. Deploys to production server
4. Runs security scan

## Security

- API key authentication required
- Rate limiting (100 req/min default)
- Idempotency keys for replay protection
- Input validation on all endpoints
- No secrets in code
- Non-root Docker user

## License

Proprietary - © QuranChain™ | Omar Mohammad Abunadi™

---

**Built for production. Real money. Real merchants.**
