# QuranChain Pay™ Backend (Cloudflare Worker)

Production-ready payment rail enforcing Sharia compliance, automatic founder royalty capture, and unified settlement for the QuranChain™ ecosystem.

## Architecture (concise)
- **Edge API (Fast routing via Hono/Chanfana)**: Versioned `/v1` endpoints for merchants, payments, webhooks, and revenue intelligence.
- **Ledger & Compliance Core (D1/SQLite compatible schema)**: Double-entry ledger tables, audit log, royalty/fee attribution, and idempotent webhook receipts.
- **Sharia Enforcement Layer**: Category blocklist enforcement, zakat review thresholds, merchant screening flags, and immutable audit logging.
- **Royalty & Fee Engine**: BPS-driven platform fees plus mandatory 10% founder royalty on every captured transaction.
- **Observability**: Health endpoint, revenue summaries (platform + founder), merchant-level revenue snapshots, and webhook receipts.

## Environment Variables
| Name | Purpose |
| --- | --- |
| `DB` | Cloudflare D1 binding for ledger/merchant data. |
| `OPENAI_API_KEY` | Required for existing ChatGPT endpoint. |
| `PLATFORM_FEE_BPS` | Basis points charged as platform fee (e.g., `150` = 1.5%). |
| `FOUNDER_ROYALTY_BPS` | Basis points for founder royalty (default 1000 = 10%). |
| `SHARIA_BLOCKLIST` | Comma-separated prohibited categories (defaults include alcohol, gambling, riba, weapons, adult, tobacco). |
| `ZAKAT_REVIEW_THRESHOLD_CENTS` | Amount (in cents) triggering zakat review/flagging. |

## Database Schema (D1)
- `merchants(id, name, contact_email, wallet_address, status, allowed_categories, sharia_screened, created_at, updated_at)`
- `merchant_keys(id, merchant_id, public_key, created_at)`
- `transactions(id, merchant_id, amount_cents, currency, payment_method, description, metadata, status, founder_royalty_cents, platform_fee_cents, net_amount_cents, zakat_blocked, sharia_block_reason, idempotency_key, created_at, updated_at)`
- `ledger_entries(id, transaction_id, account, direction, amount_cents, currency, entry_type, created_at)`
- `webhook_events(id, transaction_id, target_url, event_type, payload, status, signature, created_at)`
- `audit_logs(id, actor, scope, action, details, created_at)`
- `payouts(id, merchant_id, amount_cents, currency, status, scheduled_for, created_at)`

## Key Endpoints
- `GET /health` – service heartbeat.
- `POST /v1/merchants` – onboard and Sharia-screen merchant (auto-approve with screening flag).
- `GET /v1/merchants/:id/revenue` – merchant revenue snapshot (gross, platform fee, founder royalty, net).
- `POST /v1/payments` – capture payment with fee + founder royalty + zakat review + double-entry ledgering.
- `GET /v1/payments/:id` – payment status/detail.
- `POST /v1/webhooks` – idempotent webhook receipt with signature persistence.
- `GET /v1/revenue` – platform-wide revenue and founder royalty totals.

## Deployment
### Cloudflare Worker
```bash
npm install
npm run seedLocalDb   # applies migrations locally
npm run dev           # local dev
npm run test          # dry-run deploy + vitest
npm run deploy        # production deploy (ensure DB binding + secrets configured)
```

### Docker (wrangler dev)
```bash
docker run --rm -it -v $(pwd):/app -w /app node:20 bash -lc "npm install && npm run dev"
```

### Bare metal
```bash
npm install
npx wrangler d1 migrations apply DB --remote
npx wrangler secret put OPENAI_API_KEY
npm run deploy
```

## Verification Checklist (Founder)
- Confirm `/health` returns `{ status: "ok", service: "quranchain-mcp" }`.
- Onboard a merchant via `POST /v1/merchants`; ensure response shows `status: "approved"` and entry exists in `merchants`.
- Execute `POST /v1/payments` with valid merchant: verify response includes `platform_fee_cents`, `founder_royalty_cents`, `net_amount_cents` and `status: "captured"`.
- Inspect `ledger_entries` for matching debit/credit rows referencing the transaction ID.
- Query `GET /v1/revenue` and verify founder royalty increases by 10% of gross.
- Submit duplicate idempotency key and confirm second payment request returns the original transaction.
- Trigger zakat review by sending `amount_cents >= ZAKAT_REVIEW_THRESHOLD_CENTS`; confirm `zakat_blocked` flag is `1`.
- Send webhook payload to `POST /v1/webhooks` and confirm a single row is added to `webhook_events` even if retried.

## Notes
- No interest-bearing methods are permitted; category blocklist enforces Sharia-compliant usage.
- All transactions are ledgered with automatic platform fee + founder royalty capture for every payment.
