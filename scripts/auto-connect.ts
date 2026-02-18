#!/usr/bin/env tsx

/**
 * Auto-Connect Script
 * Automatically discovers and connects all network devices
 */

interface DeviceDiscoveryResponse {
	success: boolean;
	devices_found: number;
	devices: Array<{
		id: string;
		name: string;
		type: string;
		ip: string;
		mac: string;
		connection_status: string;
		performance_score?: number;
	}>;
	connections_established: number;
	scan_timestamp: string;
}

interface AutoMaintenanceResponse {
	success: boolean;
	enabled: boolean;
	interval_minutes: number;
	auto_optimize: boolean;
	auto_repair: boolean;
}

const API_URL = process.env.API_URL || "https://darcloud.host";
const SCAN_RANGE = process.env.SCAN_RANGE || "192.168.0.0/16";
const DEEP_SCAN = process.env.DEEP_SCAN !== "false";
const AUTO_CONNECT = process.env.AUTO_CONNECT !== "false";

async function discoverAndConnectDevices(): Promise<DeviceDiscoveryResponse> {
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log("🔌 AUTO-CONNECT - Device Discovery & Connection");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log("");
	console.log("📡 Configuration:");
	console.log(`   API URL: ${API_URL}`);
	console.log(`   Scan Range: ${SCAN_RANGE}`);
	console.log(`   Deep Scan: ${DEEP_SCAN}`);
	console.log(`   Auto Connect: ${AUTO_CONNECT}`);
	console.log("");

	console.log("🔍 Starting device discovery...");

	const response = await fetch(`${API_URL}/network/tools/discover`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			scan_range: SCAN_RANGE,
			deep_scan: DEEP_SCAN,
			auto_connect: AUTO_CONNECT,
		}),
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data: DeviceDiscoveryResponse = await response.json();

	console.log("");
	console.log("✅ Device Discovery Complete!");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log("📊 Results:");
	console.log(`   Devices Found: ${data.devices_found}`);
	console.log(`   Connections Established: ${data.connections_established}`);
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log("");

	return data;
}

async function enableAutoMaintenance(): Promise<AutoMaintenanceResponse> {
	console.log("🤖 Enabling auto-maintenance...");

	const response = await fetch(`${API_URL}/network/devices/auto-maintain`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			enabled: true,
			interval_minutes: 30,
			auto_optimize: true,
			auto_repair: true,
		}),
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const data: AutoMaintenanceResponse = await response.json();

	console.log("✅ Auto-maintenance enabled!");
	console.log(`   Check interval: ${data.interval_minutes} minutes`);
	console.log(`   Auto-optimize: ${data.auto_optimize ? "Enabled" : "Disabled"}`);
	console.log(`   Auto-repair: ${data.auto_repair ? "Enabled" : "Disabled"}`);
	console.log("");

	return data;
}

async function main() {
	try {
		// Discover and connect devices
		const discoveryResult = await discoverAndConnectDevices();

		// Enable auto-maintenance
		await enableAutoMaintenance();

		// Display connected devices
		console.log("📱 Connected Devices:");
		for (const device of discoveryResult.devices) {
			const status = device.connection_status === "connected" ? "✅" : "⚠️";
			const score = device.performance_score ? ` (${device.performance_score}%)` : "";
			console.log(`   ${status} ${device.name} - ${device.type} - ${device.ip}${score}`);
		}

		console.log("");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("✅ AUTO-CONNECT COMPLETE");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("");
		console.log("💡 Next steps:");
		console.log(`   • View network dashboard: ${API_URL}/network.html`);
		console.log(`   • API documentation: ${API_URL}/`);
		console.log("   • Monitor devices: npm run auto-monitor");
		console.log("");

		process.exit(0);
	} catch (error) {
		console.error("");
		console.error("❌ Error during auto-connect:");
		console.error(error);
		console.error("");
		console.error("💡 Troubleshooting:");
		console.error("   • Check that the API is running");
		console.error(`   • Verify API URL: ${API_URL}`);
		console.error("   • Ensure network connectivity");
		console.error("");
		process.exit(1);
	}
}

// Run if called directly
if (require.main === module) {
	main();
}

export { discoverAndConnectDevices, enableAutoMaintenance };
