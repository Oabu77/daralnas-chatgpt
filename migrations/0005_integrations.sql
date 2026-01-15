-- Migration number: 0005 	 2026-01-13T02:39:00.000Z
-- Integration Tables for DarCloud, MeshTalk, and OliveAir

-- DarCloud identity integration
CREATE TABLE IF NOT EXISTS darcloud_identities (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    darcloud_id TEXT UNIQUE NOT NULL,
    identity_type TEXT NOT NULL, -- 'DRIVER', 'CARRIER', 'SHIPPER', 'CONSIGNEE', 'ENTERPRISE'
    entity_id INTEGER, -- Foreign key to carriers, etc.
    verification_level TEXT NOT NULL, -- 'BASIC', 'VERIFIED', 'PREMIUM', 'ENTERPRISE'
    kyc_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED'
    document_count INTEGER DEFAULT 0,
    last_verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- MeshTalk communication logs
CREATE TABLE IF NOT EXISTS meshtalk_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    message_id TEXT UNIQUE NOT NULL,
    shipment_id INTEGER,
    sender_darcloud_id TEXT NOT NULL,
    recipient_darcloud_id TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'DISPATCH', 'UPDATE', 'ALERT', 'EMERGENCY', 'INSTRUCTION'
    message_priority TEXT NOT NULL DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'
    message_content TEXT NOT NULL,
    offline_capable INTEGER DEFAULT 1,
    delivery_status TEXT NOT NULL DEFAULT 'SENT', -- 'SENT', 'DELIVERED', 'READ', 'FAILED'
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivered_at DATETIME,
    read_at DATETIME,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- Emergency routing
CREATE TABLE IF NOT EXISTS emergency_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    emergency_id TEXT UNIQUE NOT NULL,
    shipment_id INTEGER NOT NULL,
    emergency_type TEXT NOT NULL, -- 'WEATHER', 'ACCIDENT', 'BREAKDOWN', 'SECURITY', 'NATURAL_DISASTER'
    original_route TEXT NOT NULL, -- JSON blob
    emergency_route TEXT NOT NULL, -- JSON blob
    activation_reason TEXT NOT NULL,
    activated_by TEXT NOT NULL, -- 'AUTO_MESHTALK', 'DRIVER', 'DISPATCHER', 'AMAN_CONTROL'
    route_status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED', 'ABANDONED'
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- OliveAir cargo handoff
CREATE TABLE IF NOT EXISTS oliveair_handoffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    handoff_id TEXT UNIQUE NOT NULL,
    shipment_id INTEGER NOT NULL,
    flight_number TEXT,
    origin_airport TEXT NOT NULL,
    destination_airport TEXT NOT NULL,
    handoff_type TEXT NOT NULL, -- 'AIR_TO_GROUND', 'GROUND_TO_AIR', 'INTERNATIONAL_FREIGHT', 'EMERGENCY_LIFT'
    handoff_status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    cargo_category TEXT, -- 'COMMERCIAL', 'HUMANITARIAN', 'EMERGENCY'
    scheduled_departure DATETIME NOT NULL,
    actual_departure DATETIME,
    scheduled_arrival DATETIME NOT NULL,
    actual_arrival DATETIME,
    ground_carrier_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id),
    FOREIGN KEY (ground_carrier_id) REFERENCES carriers(id)
);

-- Carrier wallet management
CREATE TABLE IF NOT EXISTS carrier_wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    carrier_id INTEGER NOT NULL,
    wallet_address TEXT UNIQUE NOT NULL,
    wallet_type TEXT NOT NULL, -- 'PRIMARY', 'ESCROW', 'ROYALTY'
    blockchain TEXT NOT NULL DEFAULT 'QURANCHAIN',
    wallet_status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'LOCKED'
    balance_usd REAL DEFAULT 0.0,
    pending_settlements_usd REAL DEFAULT 0.0,
    total_earned_usd REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

-- Dispatch operations
CREATE TABLE IF NOT EXISTS dispatch_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    dispatch_id TEXT UNIQUE NOT NULL,
    shipment_id INTEGER NOT NULL,
    carrier_id INTEGER NOT NULL,
    dispatcher_darcloud_id TEXT NOT NULL,
    dispatch_type TEXT NOT NULL, -- 'SCHEDULED', 'IMMEDIATE', 'EMERGENCY', 'OPTIMIZED'
    dispatch_priority TEXT NOT NULL DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'
    dispatch_instructions TEXT,
    dispatch_status TEXT NOT NULL DEFAULT 'ASSIGNED', -- 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id),
    FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_darcloud_identities_type ON darcloud_identities(identity_type);
CREATE INDEX IF NOT EXISTS idx_meshtalk_shipment ON meshtalk_messages(shipment_id);
CREATE INDEX IF NOT EXISTS idx_meshtalk_delivery ON meshtalk_messages(delivery_status);
CREATE INDEX IF NOT EXISTS idx_emergency_routes_shipment ON emergency_routes(shipment_id);
CREATE INDEX IF NOT EXISTS idx_oliveair_shipment ON oliveair_handoffs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_oliveair_status ON oliveair_handoffs(handoff_status);
CREATE INDEX IF NOT EXISTS idx_wallets_carrier ON carrier_wallets(carrier_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_shipment ON dispatch_operations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_carrier ON dispatch_operations(carrier_id);
