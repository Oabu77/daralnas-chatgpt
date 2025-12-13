© QuranChain™ | Dar Al-Nas™
Founder: Omar Mohammad Abunadi
Ownership Signature Enforced

# QuranChain™ Operational Architecture

## Control and Data Flow Overview
- **OmarAi Core (Coordinator):** Orchestrates treasury, risk, authority, and audit services. It prepares intents with revenue hooks, triggers risk validation, and routes approvals to Founder Authority before any settlement action.
- **Founder Authority Gate:** A mandatory approval layer secured by the Founder token and signer ID. It gates transaction state transitions (approve/reject) and can trigger the kill switch. No private keys are held by the platform.
- **Kill Switch:** Globally halts transaction preparation and broadcasting. State persisted to disk and enforced across services and FastAPI endpoints before any side-effectful action.
- **Treasury & Revenue Logic:** Central ledger managing balances, fee capture, and the 10% Founder royalty. Allocation occurs during intent preparation to ensure revenue-first flows and readiness for external signers/escrow.
- **Transaction Service:** Builds intents with chain/asset metadata, performs risk checks (amount thresholds, whitelist), and records every state change to the audit ledger. Broadcast is only possible after Founder approval and kill-switch clearance.
- **Audit Ledger:** Append-only JSONL ledger with hash-chained records for tamper detection. Every authorization, kill-switch event, and transaction state change is immutably recorded.
- **QuranChain Settlement Layer (Future Hook):** Transaction records carry chain/asset metadata so signer adapters (e.g., Muslim Wallet, smart-contract escrow) can be injected without changing core logic. Broadcasting is deferred until an external signer signs.
- **CFO Treasury Logic:** Provides treasury snapshots, revenue accounting, founder royalty accruals, and payout tracking. Readiness hooks for routing-based fee strategies support logistics triggers.

## Life Cycle
1. **Intent Declaration:** OmarAi builds a `TransactionIntent` with purpose, asset, destination, chain, and fee/royalty schedule.
2. **Risk Check:** Kill switch is enforced; thresholds and whitelists are validated; treasury allocates fees and royalty.
3. **Authorization:** Founder Authority verifies the Founder token and signer ID before moving a transaction from `PENDING` to `APPROVED` or `REJECTED`.
4. **Execution Hook:** After approval, external signer/escrow adapters can sign and broadcast. No private keys are stored in the platform.
5. **Verification & Audit:** Settlement confirmation hooks append receipts to the audit ledger. Hash-chained JSONL records make the log append-only.
6. **Kill Switch:** When engaged, all preparation, approval, and broadcasting paths short-circuit, protecting capital until explicitly released by the Founder.

## Safety & Compliance
- **No Custody:** The system never stores private keys; only unsigned payloads and metadata are produced.
- **Mandatory Approval:** All transaction state changes require Founder authentication and are recorded in the audit ledger.
- **Append-Only Evidence:** Audit entries are chained by hashes for tamper detection and periodic verification.
- **Revenue Enforcement:** Fee hooks, usage metering, and 10% Founder royalty are applied at intent time to guarantee capture.
- **Future-Ready Modules:** Pluggable signer adapters, escrow triggers, and logistics delivery proofs can attach to the transaction service without altering core safety guarantees.
