-- Migration number: 0003 	 2026-01-13T02:37:00.000Z
-- QuranChain Integration Tables

-- Smart contract records
CREATE TABLE IF NOT EXISTS quranchain_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    contract_id TEXT UNIQUE NOT NULL,
    shipment_id INTEGER NOT NULL,
    contract_type TEXT NOT NULL, -- 'SHIPMENT', 'ESCROW', 'DISPUTE'
    shipper_wallet TEXT NOT NULL,
    carrier_wallet TEXT NOT NULL,
    consignee_wallet TEXT,
    contract_value_usd REAL NOT NULL,
    founder_royalty_usd REAL NOT NULL,
    contract_data TEXT NOT NULL, -- JSON blob with contract terms
    contract_status TEXT NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED'
    block_number INTEGER,
    transaction_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- Escrow records
CREATE TABLE IF NOT EXISTS escrow_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    escrow_id TEXT UNIQUE NOT NULL,
    contract_id TEXT NOT NULL,
    shipment_id INTEGER NOT NULL,
    funded_amount_usd REAL NOT NULL,
    founder_royalty_usd REAL NOT NULL,
    carrier_payment_usd REAL NOT NULL,
    release_conditions TEXT NOT NULL, -- JSON blob
    escrow_status TEXT NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'FUNDED', 'RELEASED', 'PARTIAL_RELEASED', 'DISPUTED', 'REFUNDED'
    funded_at DATETIME,
    release_scheduled_at DATETIME,
    released_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES quranchain_contracts(contract_id),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- Dispute records
CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    dispute_id TEXT UNIQUE NOT NULL,
    contract_id TEXT NOT NULL,
    shipment_id INTEGER NOT NULL,
    raised_by_wallet TEXT NOT NULL,
    dispute_type TEXT NOT NULL, -- 'DELAY', 'DAMAGE', 'LOSS', 'QUALITY', 'PAYMENT', 'OTHER'
    dispute_reason TEXT NOT NULL,
    evidence_urls TEXT, -- JSON array of DarCloud document IDs
    dispute_status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'UNDER_REVIEW', 'MEDIATION', 'RESOLVED', 'ESCALATED', 'CLOSED'
    resolution_type TEXT, -- 'FULL_REFUND', 'PARTIAL_REFUND', 'REDELIVERY', 'COMPENSATION', 'DISMISSED'
    resolution_amount_usd REAL,
    resolution_notes TEXT,
    raised_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (contract_id) REFERENCES quranchain_contracts(contract_id),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- Founder royalty tracking
CREATE TABLE IF NOT EXISTS founder_royalties (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    contract_id TEXT NOT NULL,
    shipment_id INTEGER NOT NULL,
    transaction_value_usd REAL NOT NULL,
    royalty_rate REAL NOT NULL, -- percentage
    royalty_amount_usd REAL NOT NULL,
    royalty_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COLLECTED', 'DISTRIBUTED'
    collected_at DATETIME,
    distributed_at DATETIME,
    block_number INTEGER,
    transaction_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES quranchain_contracts(contract_id),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- Zakat tracking for humanitarian routes
CREATE TABLE IF NOT EXISTS zakat_shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    shipment_id INTEGER NOT NULL,
    humanitarian_org TEXT NOT NULL,
    org_darcloud_id TEXT NOT NULL,
    cargo_category TEXT NOT NULL, -- 'FOOD', 'MEDICAL', 'SHELTER', 'EDUCATION', 'EMERGENCY'
    beneficiary_region TEXT NOT NULL,
    zakat_exempt INTEGER DEFAULT 1,
    verification_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED'
    verified_by TEXT,
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contracts_shipment ON quranchain_contracts(shipment_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON quranchain_contracts(contract_status);
CREATE INDEX IF NOT EXISTS idx_escrow_contract ON escrow_accounts(contract_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_accounts(escrow_status);
CREATE INDEX IF NOT EXISTS idx_disputes_contract ON disputes(contract_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(dispute_status);
CREATE INDEX IF NOT EXISTS idx_royalties_contract ON founder_royalties(contract_id);
CREATE INDEX IF NOT EXISTS idx_zakat_shipment ON zakat_shipments(shipment_id);
