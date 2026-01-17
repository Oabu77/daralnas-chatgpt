-- Network Devices Monitoring
CREATE TABLE IF NOT EXISTS network_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK(device_type IN ('router', 'mobile', 'computer', 'tablet', 'iot', 'other')),
    ip_address TEXT,
    mac_address TEXT,
    performance_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'unknown' CHECK(status IN ('optimal', 'good', 'warning', 'critical', 'unknown')),
    last_scan TEXT NOT NULL,
    last_optimized TEXT,
    optimizations_applied TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_network_devices_status ON network_devices(status);
CREATE INDEX IF NOT EXISTS idx_network_devices_last_scan ON network_devices(last_scan);

-- Maintenance Configuration
CREATE TABLE IF NOT EXISTS maintenance_config (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    enabled INTEGER DEFAULT 1,
    interval_minutes INTEGER DEFAULT 30,
    auto_optimize INTEGER DEFAULT 1,
    auto_repair INTEGER DEFAULT 1,
    next_check TEXT,
    last_run TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config
INSERT OR IGNORE INTO maintenance_config (id, enabled, interval_minutes, auto_optimize, auto_repair)
VALUES (1, 1, 30, 1, 1);

-- Optimization History
CREATE TABLE IF NOT EXISTS optimization_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    optimization_type TEXT NOT NULL,
    before_score INTEGER,
    after_score INTEGER,
    improvements TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES network_devices(device_id)
);

CREATE INDEX IF NOT EXISTS idx_optimization_history_device ON optimization_history(device_id);
CREATE INDEX IF NOT EXISTS idx_optimization_history_created ON optimization_history(created_at);

-- Device Performance Logs
CREATE TABLE IF NOT EXISTS device_performance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    cpu_usage REAL,
    memory_usage REAL,
    network_speed REAL,
    response_time REAL,
    battery_level INTEGER,
    logged_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES network_devices(device_id)
);

CREATE INDEX IF NOT EXISTS idx_performance_logs_device ON device_performance_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_time ON device_performance_logs(logged_at);
