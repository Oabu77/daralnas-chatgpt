-- Network Nodes Table for Scaling
CREATE TABLE IF NOT EXISTS network_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT UNIQUE NOT NULL,
    node_type TEXT NOT NULL CHECK(node_type IN ('worker', 'cache', 'analytics', 'gateway')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance', 'failed')),
    capacity_percent INTEGER DEFAULT 0,
    memory_mb INTEGER DEFAULT 0,
    cpu_cores INTEGER DEFAULT 0,
    launched_at TEXT NOT NULL,
    last_health_check TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_network_nodes_status ON network_nodes(status);
CREATE INDEX IF NOT EXISTS idx_network_nodes_type ON network_nodes(node_type);

-- Network Configuration
CREATE TABLE IF NOT EXISTS network_config (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    auto_scaling_enabled INTEGER DEFAULT 1,
    growth_strategy TEXT DEFAULT 'balanced',
    max_nodes INTEGER DEFAULT 100,
    auto_healing INTEGER DEFAULT 1,
    load_balancing INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config
INSERT OR IGNORE INTO network_config (id, auto_scaling_enabled, growth_strategy, max_nodes)
VALUES (1, 1, 'balanced', 100);

-- Network Growth Analytics
CREATE TABLE IF NOT EXISTS network_growth_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nodes_before INTEGER,
    nodes_after INTEGER,
    action TEXT NOT NULL,
    growth_rate REAL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_network_growth_timestamp ON network_growth_log(timestamp);
