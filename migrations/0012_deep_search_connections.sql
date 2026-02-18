-- Deep Search and Connection Tracking
CREATE TABLE IF NOT EXISTS device_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    connection_type TEXT NOT NULL CHECK(connection_type IN ('cloudflare_tunnel', 'direct_ip', 'relay', 'bluetooth', 'usb')),
    endpoint TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disconnected', 'reconnecting', 'failed')),
    last_ping TEXT,
    ping_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    connected_at TEXT NOT NULL,
    disconnected_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES network_devices(device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_connections_device ON device_connections(device_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_status ON device_connections(status);

-- Deep Search History
CREATE TABLE IF NOT EXISTS deep_search_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_type TEXT NOT NULL CHECK(scan_type IN ('quick', 'deep', 'cloudflare', 'relay')),
    ip_range TEXT,
    devices_found INTEGER DEFAULT 0,
    connections_established INTEGER DEFAULT 0,
    scan_duration_ms INTEGER,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
    results TEXT
);

CREATE INDEX IF NOT EXISTS idx_deep_search_scans_started ON deep_search_scans(started_at);
CREATE INDEX IF NOT EXISTS idx_deep_search_scans_status ON deep_search_scans(status);

-- Cloudflare Apps Registry
CREATE TABLE IF NOT EXISTS cloudflare_apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id TEXT UNIQUE NOT NULL,
    app_name TEXT NOT NULL,
    app_type TEXT NOT NULL CHECK(app_type IN ('worker', 'pages', 'tunnel', 'r2', 'kv', 'd1')),
    endpoint TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance')),
    last_health_check TEXT,
    health_status TEXT DEFAULT 'unknown' CHECK(health_status IN ('healthy', 'degraded', 'down', 'unknown')),
    metadata TEXT,
    discovered_at TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cloudflare_apps_type ON cloudflare_apps(app_type);
CREATE INDEX IF NOT EXISTS idx_cloudflare_apps_status ON cloudflare_apps(status);
