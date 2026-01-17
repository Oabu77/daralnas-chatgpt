-- Revenue Transactions Table for Live Earnings
CREATE TABLE IF NOT EXISTS revenue_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT UNIQUE NOT NULL,
    invoice_id TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('QURANCHAIN', 'BANK_TRANSFER', 'MOBILE_WALLET')),
    total_amount REAL NOT NULL,
    founder_royalty REAL NOT NULL,
    carrier_payment REAL NOT NULL,
    royalty_rate REAL NOT NULL,
    payer_wallet TEXT NOT NULL,
    founder_wallet TEXT NOT NULL,
    carrier_wallet TEXT,
    blockchain_hash TEXT,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE INDEX IF NOT EXISTS idx_revenue_transactions_created ON revenue_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_invoice ON revenue_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_status ON revenue_transactions(status);

-- QuranChain Transactions Table for Blockchain Payments
CREATE TABLE IF NOT EXISTS quranchain_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_hash TEXT UNIQUE NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('REVENUE_PAYMENT', 'CONTRACT_DEPLOY', 'TOKEN_TRANSFER')),
    from_wallet TEXT NOT NULL,
    to_wallet TEXT NOT NULL,
    amount REAL NOT NULL,
    gas_fee REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'CONFIRMED', 'FAILED')),
    created_at TEXT NOT NULL,
    confirmed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_quranchain_tx_hash ON quranchain_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_quranchain_tx_status ON quranchain_transactions(status);

-- Founder earnings summary view
CREATE VIEW IF NOT EXISTS founder_revenue_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as transactions,
    SUM(total_amount) as total_revenue,
    SUM(founder_royalty) as founder_earnings,
    SUM(carrier_payment) as carrier_payments,
    AVG(royalty_rate) * 100 as avg_royalty_percent
FROM revenue_transactions
WHERE status = 'COMPLETED'
GROUP BY DATE(created_at)
ORDER BY date DESC;
