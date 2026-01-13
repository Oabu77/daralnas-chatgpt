-- Migration number: 0002 	 2026-01-13T02:36:00.000Z
-- OliveExpress™ Core Tables

-- Carriers and their identity
CREATE TABLE IF NOT EXISTS carriers (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    carrier_code TEXT UNIQUE NOT NULL,
    legal_name TEXT NOT NULL,
    operating_name TEXT NOT NULL,
    carrier_type TEXT NOT NULL, -- 'TRUCK', 'RAIL', 'SEA', 'AIR', 'MULTIMODAL'
    registration_country TEXT NOT NULL,
    darcloud_identity_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    trust_score REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Carrier compliance documents
CREATE TABLE IF NOT EXISTS carrier_compliance (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    carrier_id INTEGER NOT NULL,
    document_type TEXT NOT NULL, -- 'LICENSE', 'INSURANCE', 'CUSTOMS', 'SAFETY_CERT'
    document_url TEXT NOT NULL,
    darcloud_doc_id TEXT NOT NULL,
    issue_date DATETIME NOT NULL,
    expiry_date DATETIME NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'
    verified_at DATETIME,
    verified_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carrier_id) REFERENCES carriers(id)
);

-- Regional ports and terminals
CREATE TABLE IF NOT EXISTS ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    port_code TEXT UNIQUE NOT NULL,
    port_name TEXT NOT NULL,
    country TEXT NOT NULL,
    region TEXT NOT NULL, -- 'USA', 'MEXICO', 'JORDAN'
    port_type TEXT NOT NULL, -- 'SEA', 'AIR', 'LAND', 'RAIL'
    latitude REAL,
    longitude REAL,
    capacity_status TEXT DEFAULT 'NORMAL', -- 'NORMAL', 'CONGESTED', 'CRITICAL', 'CLOSED'
    congestion_level INTEGER DEFAULT 0, -- 0-100
    operational_status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Regional corridors and routes
CREATE TABLE IF NOT EXISTS corridors (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    corridor_code TEXT UNIQUE NOT NULL,
    corridor_name TEXT NOT NULL,
    origin_port_id INTEGER NOT NULL,
    destination_port_id INTEGER NOT NULL,
    corridor_type TEXT NOT NULL, -- 'COMMERCIAL', 'HUMANITARIAN', 'NGO', 'ZAKAT_EXEMPT'
    distance_km REAL NOT NULL,
    estimated_duration_hours REAL NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (origin_port_id) REFERENCES ports(id),
    FOREIGN KEY (destination_port_id) REFERENCES ports(id)
);

-- Shipments
CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    shipment_number TEXT UNIQUE NOT NULL,
    shipper_name TEXT NOT NULL,
    shipper_darcloud_id TEXT NOT NULL,
    consignee_name TEXT NOT NULL,
    consignee_darcloud_id TEXT NOT NULL,
    carrier_id INTEGER NOT NULL,
    origin_port_id INTEGER NOT NULL,
    destination_port_id INTEGER NOT NULL,
    corridor_id INTEGER,
    transport_mode TEXT NOT NULL, -- 'TRUCK', 'RAIL', 'SEA', 'AIR', 'MULTIMODAL'
    cargo_type TEXT NOT NULL,
    cargo_weight_kg REAL NOT NULL,
    cargo_volume_m3 REAL NOT NULL,
    cargo_value_usd REAL NOT NULL,
    shipment_type TEXT NOT NULL, -- 'COMMERCIAL', 'HUMANITARIAN', 'NGO'
    status TEXT NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'DISPATCHED', 'IN_TRANSIT', 'AT_CUSTOMS', 'DELIVERED', 'DELAYED', 'DISPUTED', 'CANCELLED'
    quranchain_contract_id TEXT,
    escrow_status TEXT, -- 'NONE', 'FUNDED', 'RELEASED', 'DISPUTED'
    pickup_date DATETIME,
    estimated_delivery DATETIME NOT NULL,
    actual_delivery DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (carrier_id) REFERENCES carriers(id),
    FOREIGN KEY (origin_port_id) REFERENCES ports(id),
    FOREIGN KEY (destination_port_id) REFERENCES ports(id),
    FOREIGN KEY (corridor_id) REFERENCES corridors(id)
);

-- Shipment tracking events
CREATE TABLE IF NOT EXISTS shipment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    shipment_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'CREATED', 'DISPATCHED', 'CHECKPOINT', 'CUSTOMS', 'DELIVERED', 'DELAYED', 'DAMAGED'
    event_status TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    location_name TEXT,
    event_data TEXT, -- JSON blob for additional data
    meshtalk_message_id TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- Cross-border customs data
CREATE TABLE IF NOT EXISTS customs_declarations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    shipment_id INTEGER NOT NULL,
    country_code TEXT NOT NULL,
    customs_type TEXT NOT NULL, -- 'EXPORT', 'IMPORT', 'TRANSIT'
    declaration_number TEXT,
    hs_codes TEXT NOT NULL, -- JSON array of HS codes
    declared_value_usd REAL NOT NULL,
    duties_taxes_usd REAL DEFAULT 0.0,
    declaration_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SUBMITTED', 'CLEARED', 'HELD', 'REJECTED'
    darcloud_doc_id TEXT,
    submitted_at DATETIME,
    cleared_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_carrier ON shipments(carrier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_contract ON shipments(quranchain_contract_id);
CREATE INDEX IF NOT EXISTS idx_carriers_status ON carriers(status);
CREATE INDEX IF NOT EXISTS idx_ports_region ON ports(region);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_customs_shipment ON customs_declarations(shipment_id);
