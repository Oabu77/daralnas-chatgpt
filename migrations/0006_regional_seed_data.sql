-- OliveExpress™ Regional Activation Data
-- USA Ports
INSERT INTO ports (port_code, port_name, country, region, port_type, latitude, longitude, capacity_status, congestion_level, operational_status, created_at, updated_at) VALUES
('USLAX', 'Port of Los Angeles', 'USA', 'USA', 'SEA', 33.7405, -118.2718, 'NORMAL', 35, 'ACTIVE', datetime('now'), datetime('now')),
('USLGB', 'Port of Long Beach', 'USA', 'USA', 'SEA', 33.7701, -118.1937, 'NORMAL', 40, 'ACTIVE', datetime('now'), datetime('now')),
('USNYC', 'Port of New York/New Jersey', 'USA', 'USA', 'SEA', 40.6682, -74.0751, 'CONGESTED', 65, 'ACTIVE', datetime('now'), datetime('now')),
('USSAV', 'Port of Savannah', 'USA', 'USA', 'SEA', 32.1289, -81.1431, 'NORMAL', 30, 'ACTIVE', datetime('now'), datetime('now')),
('USHOU', 'Port of Houston', 'USA', 'USA', 'SEA', 29.7372, -95.2698, 'NORMAL', 45, 'ACTIVE', datetime('now'), datetime('now')),
('USMIA', 'Port of Miami', 'USA', 'USA', 'SEA', 25.7743, -80.1673, 'NORMAL', 25, 'ACTIVE', datetime('now'), datetime('now')),
('USDFW', 'Dallas Fort Worth Airport', 'USA', 'USA', 'AIR', 32.8998, -97.0403, 'NORMAL', 20, 'ACTIVE', datetime('now'), datetime('now')),
('USMEM', 'Memphis International Airport', 'USA', 'USA', 'AIR', 35.0423, -89.9767, 'NORMAL', 15, 'ACTIVE', datetime('now'), datetime('now'));

-- Mexico Ports
INSERT INTO ports (port_code, port_name, country, region, port_type, latitude, longitude, capacity_status, congestion_level, operational_status, created_at, updated_at) VALUES
('MXVER', 'Port of Veracruz', 'Mexico', 'MEXICO', 'SEA', 19.1903, -96.1364, 'NORMAL', 30, 'ACTIVE', datetime('now'), datetime('now')),
('MXMZT', 'Port of Manzanillo', 'Mexico', 'MEXICO', 'SEA', 19.0544, -104.3197, 'NORMAL', 35, 'ACTIVE', datetime('now'), datetime('now')),
('MXLAZ', 'Port of Lázaro Cárdenas', 'Mexico', 'MEXICO', 'SEA', 17.9556, -102.2000, 'NORMAL', 25, 'ACTIVE', datetime('now'), datetime('now')),
('MXTIJ', 'Tijuana Border Crossing', 'Mexico', 'MEXICO', 'LAND', 32.5448, -117.0382, 'CONGESTED', 70, 'ACTIVE', datetime('now'), datetime('now')),
('MXMEX', 'Mexico City International Airport', 'Mexico', 'MEXICO', 'AIR', 19.4363, -99.0721, 'NORMAL', 40, 'ACTIVE', datetime('now'), datetime('now')),
('MXCDJ', 'Ciudad Juárez Border Crossing', 'Mexico', 'MEXICO', 'LAND', 31.7619, -106.4850, 'NORMAL', 50, 'ACTIVE', datetime('now'), datetime('now'));

-- Jordan Ports
INSERT INTO ports (port_code, port_name, country, region, port_type, latitude, longitude, capacity_status, congestion_level, operational_status, created_at, updated_at) VALUES
('JOAQJ', 'Port of Aqaba', 'Jordan', 'JORDAN', 'SEA', 29.5267, 35.0067, 'NORMAL', 20, 'ACTIVE', datetime('now'), datetime('now')),
('JOAMM', 'Queen Alia International Airport', 'Jordan', 'JORDAN', 'AIR', 31.7226, 35.9932, 'NORMAL', 25, 'ACTIVE', datetime('now'), datetime('now')),
('JOAMM-LAND', 'Amman Land Hub', 'Jordan', 'JORDAN', 'LAND', 31.9454, 35.9284, 'NORMAL', 15, 'ACTIVE', datetime('now'), datetime('now')),
('JOAQJ-RAIL', 'Aqaba Rail Terminal', 'Jordan', 'JORDAN', 'RAIL', 29.5330, 35.0070, 'NORMAL', 10, 'ACTIVE', datetime('now'), datetime('now'));

-- USA Corridors
INSERT INTO corridors (corridor_code, corridor_name, origin_port_id, destination_port_id, corridor_type, distance_km, estimated_duration_hours, active, created_at) VALUES
('USA-WEST-COAST', 'West Coast Express', 1, 2, 'COMMERCIAL', 45, 2, 1, datetime('now')),
('USA-CROSS-COUNTRY', 'LA to NYC Corridor', 1, 3, 'COMMERCIAL', 4500, 96, 1, datetime('now')),
('USA-SOUTH-ROUTE', 'Houston to Miami', 5, 6, 'COMMERCIAL', 1600, 36, 1, datetime('now')),
('USA-AIR-FREIGHT', 'DFW to Memphis Air', 7, 8, 'COMMERCIAL', 730, 2, 1, datetime('now'));

-- Mexico Cross-Border Corridors
INSERT INTO corridors (corridor_code, corridor_name, origin_port_id, destination_port_id, corridor_type, distance_km, estimated_duration_hours, active, created_at) VALUES
('MEXICO-BORDER-TJ', 'Tijuana to LA Corridor', 10, 1, 'COMMERCIAL', 200, 8, 1, datetime('now')),
('MEXICO-PACIFIC', 'Manzanillo to Veracruz', 9, 8, 'COMMERCIAL', 850, 24, 1, datetime('now')),
('MEXICO-US-JUAREZ', 'Ciudad Juárez to DFW', 12, 7, 'COMMERCIAL', 950, 18, 1, datetime('now'));

-- Jordan Regional Corridors
INSERT INTO corridors (corridor_code, corridor_name, origin_port_id, destination_port_id, corridor_type, distance_km, estimated_duration_hours, active, created_at) VALUES
('JORDAN-AQABA-AMM', 'Aqaba Gateway to Amman', 13, 15, 'COMMERCIAL', 335, 6, 1, datetime('now')),
('JORDAN-AIR-HUB', 'Aqaba to QAIA', 13, 14, 'COMMERCIAL', 300, 1, 1, datetime('now')),
('JORDAN-RAIL', 'Aqaba Rail to Amman', 16, 15, 'COMMERCIAL', 340, 8, 1, datetime('now'));

-- Humanitarian Corridors
INSERT INTO corridors (corridor_code, corridor_name, origin_port_id, destination_port_id, corridor_type, distance_km, estimated_duration_hours, active, created_at) VALUES
('JORDAN-HUMANITARIAN', 'Aqaba Humanitarian Gateway', 13, 15, 'HUMANITARIAN', 335, 6, 1, datetime('now')),
('USA-NGO-ROUTE', 'Miami NGO Distribution', 6, 4, 'NGO', 1100, 24, 1, datetime('now'));
