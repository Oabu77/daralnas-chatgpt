/**
 * Fungi Mesh Infrastructure Sentinel Report Formatter
 * Formats infrastructure state into required report format
 */

import { InfrastructureState, SentinelReport } from "./types";

/**
 * Format infrastructure state into the mandatory report format
 */
export function formatSentinelReport(state: InfrastructureState): string {
	const report = `🔔 DARCloud Tunnel Status Update

Status: ${state.status}
Timestamp (UTC): ${state.timestamp}
Host / Node: ${state.host}
Environment: ${state.environment}

Control Plane:
- qc-agent: ${state.controlPlane.qcAgentStatus}
- Health Check: ${state.controlPlane.healthCheck}

Tunnel:
- Type: ${formatTunnelType(state.tunnel.type)}
- Public URL / Hostname: ${state.tunnel.publicUrl || state.tunnel.hostname || "NOT AVAILABLE"}
- Process State: ${state.tunnel.processState}

Ports:
${formatPorts(state)}

MeshTalk Data Plane:
- Overlay: ${formatOverlay(state.meshTalkDataPlane.overlay)}
- Status: ${state.meshTalkDataPlane.status}

Redundancy:
- Primary Tunnel: ${state.redundancy.primaryTunnel}
- Secondary Tunnel: ${state.redundancy.secondaryTunnel}

Notes:
${formatNotes(state.notes)}`;

	return report;
}

/**
 * Format tunnel type for display
 */
function formatTunnelType(type: string): string {
	switch (type) {
		case "cloudflare-trycloudflare":
			return "Cloudflare (trycloudflare)";
		case "cloudflare-named":
			return "Cloudflare (named)";
		default:
			return type;
	}
}

/**
 * Format overlay type for display
 */
function formatOverlay(overlay: string): string {
	switch (overlay) {
		case "wireguard":
			return "WireGuard";
		case "tailscale":
			return "Tailscale";
		case "none":
			return "None";
		default:
			return overlay;
	}
}

/**
 * Format ports section
 */
function formatPorts(state: InfrastructureState): string {
	if (state.ports.length === 0) {
		return "- No active listeners detected";
	}

	const portLines = state.ports.map(port => {
		return `- ${port.port}/${port.protocol} → ${port.service}`;
	});

	// Always include the qc-agent port line
	const hasQcAgent = state.ports.some(p => p.port === 7444);
	if (!hasQcAgent) {
		portLines.unshift("- 7444/tcp → qc-agent (NOT LISTENING)");
	}

	return portLines.join("\n");
}

/**
 * Format notes section
 */
function formatNotes(notes: string[]): string {
	if (notes.length === 0) {
		return "- No issues detected";
	}

	return notes.map(note => `- ${note}`).join("\n");
}

/**
 * Convert infrastructure state to JSON report format
 */
export function toJSONReport(state: InfrastructureState): SentinelReport {
	return {
		status: state.status,
		timestamp: state.timestamp,
		host: state.host,
		environment: state.environment,
		controlPlane: {
			qcAgent: state.controlPlane.qcAgentStatus,
			healthCheck: state.controlPlane.healthCheck,
		},
		tunnel: {
			type: formatTunnelType(state.tunnel.type),
			publicUrl: state.tunnel.publicUrl,
			hostname: state.tunnel.hostname,
			processState: state.tunnel.processState,
		},
		ports: state.ports.map(p => `${p.port}/${p.protocol} → ${p.service}`),
		meshTalkDataPlane: {
			overlay: state.meshTalkDataPlane.overlay,
			status: state.meshTalkDataPlane.status,
		},
		redundancy: {
			primaryTunnel: state.redundancy.primaryTunnel,
			secondaryTunnel: state.redundancy.secondaryTunnel,
		},
		notes: state.notes,
	};
}

/**
 * Format a minimal worker report (lightweight variant)
 */
export function formatWorkerReport(state: InfrastructureState): string {
	const statusEmoji = state.status === "LIVE" ? "🟢" : 
	                    state.status === "DEGRADED" ? "🟡" :
	                    state.status === "RECOVERED" ? "🔵" : "🔴";
	
	return `${statusEmoji} ${state.status} | ${state.environment} | ${state.timestamp}
CP: ${state.controlPlane.qcAgentStatus} | Tunnel: ${state.tunnel.processState} | Mesh: ${state.meshTalkDataPlane.status}`;
}

/**
 * Create a heartbeat/cron-friendly compact report
 */
export function formatHeartbeatReport(state: InfrastructureState): string {
	return JSON.stringify({
		ts: state.timestamp,
		env: state.environment,
		status: state.status,
		cp: state.controlPlane.qcAgentStatus === "ONLINE",
		tunnel: state.tunnel.processState === "RUNNING",
		url: state.tunnel.publicUrl || null,
	});
}

/**
 * Create MeshTalk-native broadcast message
 */
export function formatMeshTalkBroadcast(state: InfrastructureState): object {
	return {
		type: "infrastructure.status",
		version: "1.0",
		timestamp: state.timestamp,
		source: state.host,
		environment: state.environment,
		payload: {
			status: state.status,
			services: {
				controlPlane: state.controlPlane.qcAgentStatus,
				tunnel: state.tunnel.processState,
				meshTalk: state.meshTalkDataPlane.status,
			},
			endpoints: {
				tunnelUrl: state.tunnel.publicUrl,
				tunnelHostname: state.tunnel.hostname,
			},
			redundancy: state.redundancy,
		},
		alerts: state.notes,
	};
}
