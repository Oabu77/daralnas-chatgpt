/**
 * Auto-Accept Configuration
 * All operations proceed automatically without user confirmation
 */

export const AUTO_ACCEPT_CONFIG = {
  // PWA Installation
  pwa_auto_install: true,
  pwa_install_delay_ms: 0, // Instant, no delay
  
  // Permissions
  auto_grant_notifications: true,
  auto_grant_location: true,
  auto_grant_camera: true,
  auto_grant_microphone: true,
  auto_grant_storage: true,
  auto_grant_bluetooth: true,
  auto_grant_usb: true,
  
  // Device Control
  auto_accept_device_takeover: true,
  auto_optimize_devices: true,
  auto_repair_issues: true,
  auto_update_apps: true,
  auto_clear_cache: true,
  
  // Network Operations
  auto_connect_devices: true,
  auto_pair_bluetooth: true,
  auto_connect_usb: true,
  auto_optimize_network: true,
  auto_scale_nodes: true,
  auto_grow_network: true,
  
  // Background Operations