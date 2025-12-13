# QuranChain End-to-End Commerce Architecture

This document captures the production-grade reference design for QuranChain, covering the full lifecycle from user intent in ChatGPT through settlement, fulfillment, accounting, and auditability. It reflects the finalized requirements for a custodial, compliant, AI-driven commerce stack where all signing authority remains within QuranChain.

## 0. Core Anchor
- Codex/ChatGPT never signs, holds keys, or broadcasts transactions.
- QuranChain retains settlement, custody, compliance, and revenue control.

## 1. Entry Point — ChatGPT / ACP User Journey
1. User interacts with a ChatGPT sales agent.
2. Agent recommends a QuranChain product or service.
3. User confirms purchase.
4. ChatGPT invokes the ACP Adapter and exits the flow (no custody or payments handled directly by ChatGPT).

## 2. ACP Adapter — Commerce Orchestrator
- Translates AI commerce intent into a deterministic transaction plan.
- Endpoints (finalized):
  - `GET /acp/feed`
  - `POST /acp/checkout/create`
  - `POST /acp/checkout/confirm`
  - `POST /acp/payment/intent`
  - `GET /acp/fulfillment/status/{order_id}`
- Responsibilities: validate product and price, enforce Sharia rules, lock inventory, generate `order_id`, invoke Routing Engine.
- Explicitly avoids private keys, blind gas selection, and direct blockchain interaction.

## 3. Routing Engine — Deterministic Path Selection
- Inputs: `order_id`, amount, settlement asset, urgency (normal/fast), compliance flags.
- Outputs: `cheapest_chain`, `cheapest_bridge`, `total_cost`, `rpc_endpoint`, `execution_plan_id`.

### 3.1 Cheapest-Chain Gas Selection
- Data sources: live RPCs for Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Avalanche.
- Factors: base fee, priority fee, and L2 overhead where applicable.
- Canonical calculation: `total_chain_cost = (gas_limit × effective_gas_price) + l2_overhead + bridge_fee`. Lowest total wins.

### 3.2 Bridge Fee Comparison
- Production bridges: Hop (ETH L2), Wormhole, LayerZero, Axelar, and native L2 bridges.
- Selection: same asset → cheapest bridge; different asset → cheapest + fastest; fallback paths for bridge outages.
- Example output:
  ```json
  {
    "chain": "polygon",
    "bridge": "hop",
    "expected_fee": "...",
    "rpc": "https://polygon-rpc.com"
  }
  ```

## 4. Unsigned Transaction Builder
- Constructs unsigned transactions only, including nonce, gas, maxFeePerGas, calldata, and route metadata.
- Output artifact (immutable and logged):
  ```json
  {
    "order_id": "ord_123",
    "chain": "polygon",
    "unsigned_tx": { "...": "..." },
    "route": { "...": "..." }
  }
  ```

## 5. QuranChain Relayer — Sole Signing Authority
- Security: hardware wallet or HSM, per-chain key isolation, per-tx/day spend limits, IP allowlist, and order-bound signing.
- API (final): `POST /relay/submit` with `order_id`, `chain`, `unsigned_tx`, `execution_plan_id` → returns `{ tx_hash, chain }` after signing and broadcasting, and emits internal events.

## 6. On-Chain Receipt Verification
- Requirements: transaction mined, success status = 1, matches expected recipient and amount.
- Performed via read-only RPC; no signing, no retries with signing.
- Failure handling: auto-reroute for stuck txs, policy-driven auto-refunds, manual override path.

## 7. QuranChain Ledger — System of Record
- Immutable entry for every transaction, including `order_id`, `chain`, `tx_hash`, `gas_paid`, `bridge_used`, `timestamp`, and `founder_royalty` (10%).
- Drives accounting, audits, compliance, and analytics.

## 8. Founder Royalty Enforcement
- 10% of gross revenue, computed post-settlement and credited immediately without manual intervention.

## 9. Fulfillment Engine
- Product-type specific fulfillment backends:
  - Digital → Instant
  - Subscription → Smart contract
  - Telecom → MeshTalk
  - Health → DarHealth
  - Travel → OliveAir
  - Logistics → OliveExpress
  - Real Estate → Reservation escrow
- Status callback to ACP: `{ "status": "fulfilled", "tracking_id": "trk_789" }`.

## 10. ACP Final Response to ChatGPT
- ChatGPT receives confirmation only (no secrets or internal details).
- User-facing message: “Your purchase is complete and active.”

## 11. Multi-Environment Strategy
- dev: testnets with mock relayer
- staging: testnet with real routing
- prod: mainnet; Codex restricted to audit/simulation/verification (never deploys)

## 12. Finalized Coverage
- Cheapest-chain routing, bridge fee optimization, unsigned transaction lifecycle, secure relayer boundary, receipt verification, immutable ledger, founder royalty enforcement, ACP integration, fulfillment closure, and audit-grade determinism are all addressed to deliver a production-ready, Sharia-compliant, AI-driven commerce system.
