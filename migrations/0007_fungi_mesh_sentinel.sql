-- Migration: Fungi Mesh Sentinel Infrastructure Monitoring
-- Description: Add tables for infrastructure sentinel state tracking and reporting
-- Created: 2026-01-17

-- Sentinel infrastructure state tracking
CREATE TABLE IF NOT EXISTS sentinel_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  environment TEXT NOT NULL,
  host TEXT NOT NULL,
  status TEXT NOT NULL, -- LIVE, DEGRADED, OFFLINE, RECOVERED, INCOMPLETE_STATE
  
  -- Control Plane State
  cp_qc_agent_status TEXT NOT NULL, -- ONLINE, OFFLINE, DEGRADED
  cp_health_check TEXT NOT NULL, -- PASS, FAIL, UNKNOWN
  cp_port INTEGER NOT NULL DEFAULT 7444,
  cp_host TEXT NOT NULL DEFAULT '127.0.0.1',
  
  -- Tunnel State
  tunnel_type TEXT NOT NULL, -- cloudflare-trycloudflare, cloudflare-named, other
  tunnel_public_url TEXT,
  tunnel_hostname TEXT,
  tunnel_process_state TEXT NOT NULL, -- RUNNING, STOPPED, UNKNOWN
  tunnel_process_id INTEGER,
  
  -- MeshTalk Data Plane
  meshtalk_overlay TEXT NOT NULL, -- wireguard, tailscale, none
  meshtalk_status TEXT NOT NULL, -- READY, NOT_READY, UNKNOWN
  meshtalk_interface TEXT,
  meshtalk_udp_ready BOOLEAN NOT NULL DEFAULT 0,
  meshtalk_tcp_ready BOOLEAN NOT NULL DEFAULT 0,
  
  -- Redundancy Status
  redundancy_primary TEXT NOT NULL, -- ACTIVE, STANDBY, DOWN, NOT_PRESENT
  redundancy_secondary TEXT NOT NULL, -- ACTIVE, STANDBY, DOWN, NOT_PRESENT
  
  -- Full state snapshot (JSON)
  state_json TEXT NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sentinel_state_timestamp ON sentinel_state(timestamp);
CREATE INDEX IF NOT EXISTS idx_sentinel_state_environment ON sentinel_state(environment);
CREATE INDEX IF NOT EXISTS idx_sentinel_state_status ON sentinel_state(status);

-- Sentinel tunnel status tracking
CREATE TABLE IF NOT EXISTS tunnel_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  environment TEXT NOT NULL,
  tunnel_type TEXT NOT NULL,
  public_url TEXT,
  hostname TEXT,
  process_state TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tunnel_status_timestamp ON tunnel_status(timestamp);
CREATE INDEX IF NOT EXISTS idx_tunnel_status_environment ON tunnel_status(environment);

-- Sentinel generated reports
CREATE TABLE IF NOT EXISTS sentinel_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  environment TEXT NOT NULL,
  change_type TEXT NOT NULL, -- tunnel_online, tunnel_offline, tunnel_url_change, service_restart, service_crash, port_change, meshtalk_change, redundancy_change
  status TEXT NOT NULL, -- LIVE, DEGRADED, OFFLINE, RECOVERED
  description TEXT NOT NULL,
  report_format TEXT NOT NULL DEFAULT 'full', -- full, json, worker, heartbeat, meshtalk
  report_text TEXT NOT NULL,
  
  -- State references
  previous_state_id INTEGER,
  current_state_id INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (previous_state_id) REFERENCES sentinel_state(id),
  FOREIGN KEY (current_state_id) REFERENCES sentinel_state(id)
);

CREATE INDEX IF NOT EXISTS idx_sentinel_reports_timestamp ON sentinel_reports(timestamp);
CREATE INDEX IF NOT EXISTS idx_sentinel_reports_environment ON sentinel_reports(environment);
CREATE INDEX IF NOT EXISTS idx_sentinel_reports_change_type ON sentinel_reports(change_type);

-- Port listeners tracking
CREATE TABLE IF NOT EXISTS port_listeners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sentinel_state_id INTEGER NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL, -- tcp, udp
  service TEXT NOT NULL,
  state TEXT NOT NULL, -- LISTENING, CLOSED
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (sentinel_state_id) REFERENCES sentinel_state(id)
);

-- State change events
CREATE TABLE IF NOT EXISTS state_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  environment TEXT NOT NULL,
  change_type TEXT NOT NULL,
  description TEXT NOT NULL,
  previous_state_id INTEGER,
  current_state_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (previous_state_id) REFERENCES sentinel_state(id),
  FOREIGN KEY (current_state_id) REFERENCES sentinel_state(id)
);

CREATE INDEX IF NOT EXISTS idx_state_changes_timestamp ON state_changes(timestamp);
CREATE INDEX IF NOT EXISTS idx_state_changes_environment ON state_changes(environment);

-- Sentinel configuration
CREATE TABLE IF NOT EXISTS sentinel_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  environment TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  monitoring_interval_seconds INTEGER NOT NULL DEFAULT 300, -- 5 minutes
  report_on_change_only BOOLEAN NOT NULL DEFAULT 1,
  notification_endpoint TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT OR IGNORE INTO sentinel_config (environment, enabled, monitoring_interval_seconds, report_on_change_only)
VALUES 
  ('DarCloud', 1, 300, 1),
  ('Fungi Node', 1, 300, 1),
  ('Backup', 1, 600, 1);
