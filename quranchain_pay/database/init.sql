-- ═══════════════════════════════════════════════════════════════════════════════
-- QuranChain Pay™ - Database Schema
-- © QuranChain™ | Omar Mohammad Abunadi™
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment Rails Enum
CREATE TYPE payment_rail AS ENUM ('usdc', 'ach', 'btc', 'card');

-- Payment Intent Status Enum
CREATE TYPE payment_status AS ENUM ('requires_payment', 'processing', 'succeeded', 'failed', 'canceled');

-- ═══════════════════════════════════════════════════════════════════════════════
-- MERCHANTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    api_key_hash VARCHAR(64) NOT NULL UNIQUE,
    api_key_prefix VARCHAR(12) NOT NULL,
    
    -- Accepted rails
    accepts_usdc BOOLEAN DEFAULT TRUE,
    accepts_ach BOOLEAN DEFAULT TRUE,
    accepts_btc BOOLEAN DEFAULT TRUE,
    accepts_card BOOLEAN DEFAULT TRUE,
    
    -- Payout destinations
    payout_usdc_address VARCHAR(42),
    payout_ach_routing VARCHAR(9),
    payout_ach_account VARCHAR(17),
    payout_btc_address VARCHAR(62),
    payout_bank_name VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_merchants_email ON merchants(email);
CREATE INDEX idx_merchants_api_key_prefix ON merchants(api_key_prefix);
CREATE INDEX idx_merchants_api_key_hash ON merchants(api_key_hash);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PAYMENT INTENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    
    -- Amount (in smallest unit, e.g., cents)
    amount NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    
    -- Customer info
    customer_email VARCHAR(255),
    customer_wallet VARCHAR(42),
    description TEXT,
    
    -- Status
    status payment_status DEFAULT 'requires_payment',
    
    -- Rail selection
    selected_rail payment_rail,
    rail_selection_reason TEXT,
    
    -- External reference
    external_tx_id VARCHAR(255),
    
    -- Idempotency
    idempotency_key VARCHAR(64) UNIQUE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payment_intents_merchant ON payment_intents(merchant_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_created ON payment_intents(created_at DESC);
CREATE INDEX idx_payment_intents_idempotency ON payment_intents(idempotency_key);

-- ═══════════════════════════════════════════════════════════════════════════════
-- LEDGER ENTRIES TABLE (Immutable)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_intent_id UUID NOT NULL UNIQUE REFERENCES payment_intents(id),
    
    -- Amounts
    gross_amount NUMERIC(20, 8) NOT NULL,
    founder_fee NUMERIC(20, 8) NOT NULL,
    merchant_net NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- Rail
    rail payment_rail NOT NULL,
    
    -- Transaction references
    settlement_tx_hash VARCHAR(66),
    founder_payout_tx VARCHAR(66),
    merchant_payout_tx VARCHAR(66),
    
    -- Addresses
    founder_payout_address VARCHAR(62) NOT NULL,
    merchant_payout_address VARCHAR(62) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ledger_created ON ledger_entries(created_at DESC);
CREATE INDEX idx_ledger_rail ON ledger_entries(rail);
CREATE INDEX idx_ledger_payment_intent ON ledger_entries(payment_intent_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RAIL FEES CONFIGURATION
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rail_fees (
    id SERIAL PRIMARY KEY,
    rail payment_rail NOT NULL UNIQUE,
    percentage_fee NUMERIC(5, 4) NOT NULL,  -- e.g., 0.0010 = 0.1%
    fixed_fee_cents INTEGER NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default fees
INSERT INTO rail_fees (rail, percentage_fee, fixed_fee_cents, is_available) VALUES
    ('usdc', 0.0010, 0, TRUE),     -- 0.1%, $0.00 fixed
    ('ach', 0.0080, 25, TRUE),     -- 0.8%, $0.25 fixed
    ('btc', 0.0050, 50, TRUE),     -- 0.5%, $0.50 fixed (network fee estimate)
    ('card', 0.0290, 30, TRUE)     -- 2.9%, $0.30 fixed (Stripe rates)
ON CONFLICT (rail) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID,
    actor_type VARCHAR(50),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- UPDATE TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_merchants_updated_at
    BEFORE UPDATE ON merchants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_intents_updated_at
    BEFORE UPDATE ON payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- © QuranChain™ | Omar Mohammad Abunadi™
-- ═══════════════════════════════════════════════════════════════════════════════
