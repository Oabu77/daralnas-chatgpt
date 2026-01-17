-- Migration: 0002 - Initialize QuranChain Pay core tables
CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    allowed_categories TEXT NOT NULL DEFAULT '[]',
    sharia_screened INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS merchant_keys (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    description TEXT,
    metadata TEXT,
    status TEXT NOT NULL,
    founder_royalty_cents INTEGER NOT NULL DEFAULT 0,
    platform_fee_cents INTEGER NOT NULL DEFAULT 0,
    net_amount_cents INTEGER NOT NULL DEFAULT 0,
    zakat_blocked INTEGER NOT NULL DEFAULT 0,
    sharia_block_reason TEXT,
    idempotency_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    account TEXT NOT NULL,
    direction TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    entry_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    target_url TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    signature TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    scope TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    scheduled_for DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_status ON transactions(merchant_id, status);
