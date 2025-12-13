# Dar Al-Nas ACP Deployment Guide

This guide describes how to expose the full Dar Al-Nas commerce catalog to OpenAI Agentic Commerce Platform (ACP) without surrendering revenue, settlement, or compliance logic.

## Architecture Guardrails
- **ACP = interface only**. ACP calls `/acp/catalog` for discovery and `/acp/checkout` to generate a QuranChain-settled checkout. No keys are ever shared.
- **DarCommerce orchestrates** fulfillment and routing. ACP responses always return fulfillment hints pointing to DarCommerce-owned channels.
- **QuranChain settles** all amounts. Settlement instructions in responses explicitly flag `scheme: quranchain` and set `requires_private_key: false` to keep custody outside ACP.
- **Founder royalty is immutable**. A 10% skim is calculated on every checkout and logged in `royalty_ledger_reference`.

## Endpoints
- `GET /acp/catalog` – Returns the canonical catalog for ACP discovery. Each product includes Sharia constraints, fulfillment type, settlement target, and vendor identity.
- `POST /acp/checkout` – Accepts a customer payload, line items, and optional bundles. Responds with:
  - Quranchain settlement instruction (amount, currency, memo)
  - Founder royalty amount (10%) and ledger reference
  - Fulfillment routing hints (e.g., DarCommerce Gateway or OliveExpress)
  - Compliance envelope showing riba-free, non-speculative defaults

All routes are registered under the OpenAPI registry in `src/index.ts` and inherit the global error handler.

## Environment
No additional secrets are required for the ACP adapter. Existing runtime bindings from `wrangler.jsonc` remain unchanged. Keep sensitive customer data upstream; the checkout endpoint only expects minimal contact fields.

## Deployment Steps
1. Build the worker bundle: `npm run build` (or `wrangler deploy --dry-run`).
2. Deploy to Cloudflare Workers: `npm run deploy` (requires authenticated Wrangler).
3. Point ACP to the public Worker URL and map:
   - Discovery -> `GET /acp/catalog`
   - Checkout -> `POST /acp/checkout`
4. Route settlements through QuranChain using the returned settlement memo and emit receipts once the ledger hash is confirmed.

## Compliance Notes
- All catalog items enforce `{ riba_free: true, gharar_free: true, haram_excluded: true }`.
- No speculative pricing: bundle concessions are fixed at 5% and declared in `bundle_notes`.
- Data minimization: customer payload limits to name, contact, and country; ACP never receives payment credentials.
- Taxes should be applied by DarCommerce with jurisdiction-aware logic before final settlement submission.

## Done Criteria
A successful integration means ACP can:
1. Discover products via `/acp/catalog`.
2. Create a checkout with `/acp/checkout` including bundle concessions.
3. Trigger QuranChain settlement using the provided instruction.
4. Route fulfillment to DarCommerce/OliveExpress as indicated.
5. Emit receipts referencing `royalty_ledger_reference` and the QuranChain settlement hash.
