-- Migration number: 0004 	 2026-01-13T02:38:00.000Z
-- AI/Analytics and Treasury Tables

-- Carrier trust scoring
CREATE TABLE IF NOT EXISTS carrier_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    carrier_id INTEGER NOT NULL,
    score_type TEXT NOT NULL, -- 'TRUST', 'PERFORMANCE', 'RELIABILITY', 'SAFETY'
    score_value REAL NOT NULL, -- 0.0 to 100.0
    contributing_factors TEXT, -- JSON blob
    calculated_by TEXT NOT NULL, -- 'AMAN_AI', 'OMAR_AI', 'MANUAL'
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME,
    FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

-- Delay predictions
CREATE TABLE IF NOT EXISTS delay_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    shipment_id INTEGER NOT NULL,
    predicted_delay_hours REAL NOT NULL,
    confidence_level REAL NOT NULL, -- 0.0 to 1.0
    prediction_factors TEXT, -- JSON blob
    predicted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actual_delay_hours REAL,
    prediction_accuracy REAL,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- Route optimization
CREATE TABLE IF NOT EXISTS route_optimizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    shipment_id INTEGER NOT NULL,
    original_corridor_id INTEGER,
    optimized_corridor_id INTEGER NOT NULL,
    optimization_reason TEXT NOT NULL,
    estimated_savings_usd REAL,
    estimated_time_saved_hours REAL,
    fuel_savings_liters REAL,
    co2_reduction_kg REAL,
    optimization_status TEXT NOT NULL DEFAULT 'SUGGESTED', -- 'SUGGESTED', 'APPROVED', 'APPLIED', 'REJECTED'
    optimized_by TEXT NOT NULL, -- 'OMAR_AI', 'AMAN_CONTROL', 'MANUAL'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id),
    FOREIGN KEY (original_corridor_id) REFERENCES corridors(id),
    FOREIGN KEY (optimized_corridor_id) REFERENCES corridors(id)
);

-- Auto-reassignment tracking
CREATE TABLE IF NOT EXISTS carrier_reassignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    shipment_id INTEGER NOT NULL,
    original_carrier_id INTEGER NOT NULL,
    new_carrier_id INTEGER NOT NULL,
    reassignment_reason TEXT NOT NULL, -- 'DELAY', 'BREAKDOWN', 'CAPACITY', 'OPTIMIZATION', 'EMERGENCY'
    reassignment_trigger TEXT NOT NULL, -- 'AUTO_AMAN', 'AUTO_OMAR', 'MANUAL'
    reassignment_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'EXECUTED', 'REJECTED'
    approval_required INTEGER DEFAULT 0,
    approved_by TEXT,
    reassigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id),
    FOREIGN KEY (original_carrier_id) REFERENCES carriers(id),
    FOREIGN KEY (new_carrier_id) REFERENCES carriers(id)
);

-- Treasury invoices
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_type TEXT NOT NULL, -- 'MERCHANT', 'ENTERPRISE', 'GOVERNMENT', 'NGO'
    customer_name TEXT NOT NULL,
    customer_darcloud_id TEXT NOT NULL,
    customer_wallet TEXT NOT NULL,
    total_amount_usd REAL NOT NULL,
    founder_royalty_usd REAL NOT NULL,
    net_amount_usd REAL NOT NULL,
    invoice_status TEXT NOT NULL DEFAULT 'ISSUED', -- 'ISSUED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED'
    payment_method TEXT NOT NULL DEFAULT 'QURANCHAIN', -- 'QURANCHAIN', 'ON_CHAIN'
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    paid_at DATETIME,
    transaction_hash TEXT
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    invoice_id INTEGER NOT NULL,
    shipment_id INTEGER,
    item_description TEXT NOT NULL,
    item_type TEXT NOT NULL, -- 'FREIGHT', 'CUSTOMS', 'INSURANCE', 'HANDLING', 'STORAGE', 'OTHER'
    quantity REAL DEFAULT 1.0,
    unit_price_usd REAL NOT NULL,
    total_price_usd REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- On-chain settlements
CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    settlement_id TEXT UNIQUE NOT NULL,
    invoice_id INTEGER,
    escrow_id TEXT,
    settlement_type TEXT NOT NULL, -- 'INVOICE_PAYMENT', 'ESCROW_RELEASE', 'REFUND', 'ROYALTY'
    payer_wallet TEXT NOT NULL,
    payee_wallet TEXT NOT NULL,
    amount_usd REAL NOT NULL,
    settlement_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    block_number INTEGER,
    transaction_hash TEXT,
    settled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (escrow_id) REFERENCES escrow_accounts(escrow_id)
);

-- Revenue analytics
CREATE TABLE IF NOT EXISTS revenue_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    corridor_id INTEGER,
    region TEXT,
    revenue_type TEXT NOT NULL, -- 'COMMERCIAL', 'HUMANITARIAN', 'TOTAL'
    gross_revenue_usd REAL NOT NULL,
    founder_royalties_usd REAL NOT NULL,
    net_revenue_usd REAL NOT NULL,
    shipment_count INTEGER NOT NULL,
    total_weight_kg REAL NOT NULL,
    total_volume_m3 REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (corridor_id) REFERENCES corridors(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_carrier_scores_carrier ON carrier_scores(carrier_id);
CREATE INDEX IF NOT EXISTS idx_delay_predictions_shipment ON delay_predictions(shipment_id);
CREATE INDEX IF NOT EXISTS idx_route_optimizations_shipment ON route_optimizations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_reassignments_shipment ON carrier_reassignments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_darcloud_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(settlement_status);
CREATE INDEX IF NOT EXISTS idx_revenue_corridor ON revenue_analytics(corridor_id);
CREATE INDEX IF NOT EXISTS idx_revenue_region ON revenue_analytics(region);
