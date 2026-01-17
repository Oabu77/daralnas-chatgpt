/**
 * Fungi Mesh Infrastructure Sentinel
 * Core monitoring and verification logic
 */

import {
	InfrastructureState,
	InfrastructureStatus,
	ControlPlaneState,
	TunnelState,
	PortListener,
	MeshTalkDataPlane,
	RedundancyStatus,
	ServiceStatus,
	HealthCheckStatus,
	ProcessState,
	DataPlaneStatus,
	RedundancyState,
	StateChange,
} from "./types";

/**
 * Verify control plane health (qc-agent)
 */
export async function verifyControlPlane(): Promise<ControlPlaneState> {
	const host = "127.0.0.1";
	const port = 7444;

	let qcAgentStatus: ServiceStatus = "OFFLINE";
	let healthCheck: HealthCheckStatus = "FAIL";

	try {
		// Try to check if the service is listening on port 7444
		// In a real implementation, this would use actual network checks
		// For now, we'll simulate the check
		const isListening = await checkPortListening(host, port);
		
		if (isListening) {
			qcAgentStatus = "ONLINE";
			
			// Try to hit the health endpoint
			try {
				const healthResponse = await fetch(`http://${host}:${port}/health`, {
					method: "GET",
					signal: AbortSignal.timeout(5000),
				});
				
				if (healthResponse.ok) {
					healthCheck = "PASS";
				} else {
					healthCheck = "FAIL";
					qcAgentStatus = "DEGRADED";
				}
			} catch (healthError) {
				healthCheck = "FAIL";
				qcAgentStatus = "DEGRADED";
				console.error("Health check failed:", healthError);
			}
		}
	} catch (error) {
		qcAgentStatus = "OFFLINE";
		healthCheck = "FAIL";
		console.error("Control plane verification failed:", error);
	}

	return {
		qcAgentStatus,
		healthCheck,
		port,
		host,
	};
}

/**
 * Check if a port is listening
 */
async function checkPortListening(host: string, port: number): Promise<boolean> {
	try {
		// This is a simplified check - in production, you'd use actual network utilities
		// For demonstration, we'll return false (service not running)
		return false;
	} catch (error) {
		console.error(`Error checking port ${host}:${port}:`, error);
		return false;
	}
}

/**
 * Detect active port listeners
 */
export async function detectPortListeners(): Promise<PortListener[]> {
	// In a real implementation, this would use system utilities like netstat, ss, or lsof
	// For now, we return a simulated list
	const listeners: PortListener[] = [];
	
	// Check for qc-agent on 7444
	const qcAgentListening = await checkPortListening("127.0.0.1", 7444);
	if (qcAgentListening) {
		listeners.push({
			port: 7444,
			protocol: "tcp",
			service: "qc-agent",
			state: "LISTENING",
		});
	}

	return listeners;
}

/**
 * Verify tunnel process state
 */
export async function verifyTunnelState(): Promise<TunnelState> {
	// In a real implementation, this would:
	// 1. Check for cloudflared process
	// 2. Parse tunnel configuration
	// 3. Extract public URL from logs or API
	
	return {
		type: "cloudflare-trycloudflare",
		processState: "STOPPED",
	};
}

/**
 * Verify MeshTalk data plane readiness
 */
export async function verifyMeshTalkDataPlane(): Promise<MeshTalkDataPlane> {
	// In a real implementation, this would:
	// 1. Check for WireGuard/Tailscale interfaces
	// 2. Verify UDP/TCP readiness
	// 3. Check overlay network status
	
	return {
		overlay: "none",
		status: "NOT_READY",
		udpReady: false,
		tcpReady: false,
	};
}

/**
 * Check redundancy status
 */
export async function checkRedundancyStatus(): Promise<RedundancyStatus> {
	// In a real implementation, this would check primary and secondary tunnel states
	
	return {
		primaryTunnel: "DOWN",
		secondaryTunnel: "NOT_PRESENT",
	};
}

/**
 * Determine overall infrastructure status
 */
export function determineInfrastructureStatus(
	controlPlane: ControlPlaneState,
	tunnel: TunnelState,
	meshTalk: MeshTalkDataPlane,
	redundancy: RedundancyStatus
): InfrastructureStatus {
	// A tunnel or endpoint is LIVE only if ALL conditions are true:
	// 1. The tunnel process is running
	// 2. A public endpoint (URL or hostname) is issued or resolvable
	// 3. The control-plane health endpoint responds successfully
	// 4. The local service port is actively listening
	// 5. No fatal errors appear in recent logs

	const conditions = {
		tunnelRunning: tunnel.processState === "RUNNING",
		publicEndpoint: !!(tunnel.publicUrl || tunnel.hostname),
		controlPlaneHealthy: controlPlane.healthCheck === "PASS",
		serviceListening: controlPlane.qcAgentStatus === "ONLINE",
	};

	// If any critical condition fails, not LIVE
	if (!conditions.tunnelRunning || !conditions.publicEndpoint) {
		return "OFFLINE";
	}

	if (!conditions.controlPlaneHealthy || !conditions.serviceListening) {
		return "DEGRADED";
	}

	// Check if we have all the data we need
	if (
		controlPlane.qcAgentStatus === "OFFLINE" &&
		tunnel.processState === "STOPPED" &&
		meshTalk.status === "NOT_READY"
	) {
		return "OFFLINE";
	}

	// If everything is good
	if (Object.values(conditions).every((c) => c === true)) {
		return "LIVE";
	}

	return "DEGRADED";
}

/**
 * Get current host/environment identifier
 */
function getCurrentHost(): string {
	// Try multiple environment detection strategies
	if (typeof process !== "undefined") {
		// Node.js environment
		return process.env.HOSTNAME || 
		       process.env.HOST || 
		       process.env.COMPUTERNAME || 
		       "unknown-host";
	}
	
	// Cloudflare Workers environment
	return "cloudflare-worker";
}

/**
 * Perform complete infrastructure verification
 * Follows the mandated verification order:
 * 1. Local control-plane health
 * 2. Listening ports
 * 3. Tunnel process state
 * 4. Public reachability
 * 5. MeshTalk data-plane readiness
 * 6. Redundancy / failover status
 */
export async function performInfrastructureVerification(
	environment: string = "DarCloud"
): Promise<InfrastructureState> {
	const notes: string[] = [];
	const timestamp = new Date().toISOString();
	const host = getCurrentHost();

	try {
		// Step 1: Verify control plane
		const controlPlane = await verifyControlPlane();
		
		// Step 2: Detect listening ports
		const ports = await detectPortListeners();
		
		// Step 3: Verify tunnel state
		const tunnel = await verifyTunnelState();
		
		// Step 4: Public reachability is part of tunnel verification
		
		// Step 5: Verify MeshTalk data plane
		const meshTalkDataPlane = await verifyMeshTalkDataPlane();
		
		// Step 6: Check redundancy
		const redundancy = await checkRedundancyStatus();

		// Determine overall status
		const status = determineInfrastructureStatus(
			controlPlane,
			tunnel,
			meshTalkDataPlane,
			redundancy
		);

		// Add notes based on findings
		if (controlPlane.qcAgentStatus === "OFFLINE") {
			notes.push("qc-agent service is not running");
		}
		if (tunnel.processState === "STOPPED") {
			notes.push("Tunnel process is not running");
		}
		if (meshTalkDataPlane.status === "NOT_READY") {
			notes.push("MeshTalk data plane is not ready");
		}
		if (redundancy.secondaryTunnel === "NOT_PRESENT") {
			notes.push("No secondary tunnel configured");
		}

		return {
			status,
			timestamp,
			host,
			environment,
			controlPlane,
			tunnel,
			ports,
			meshTalkDataPlane,
			redundancy,
			notes,
		};
	} catch (error) {
		notes.push(`Verification error: ${error instanceof Error ? error.message : String(error)}`);
		
		// Return incomplete state on error
		return {
			status: "INCOMPLETE_STATE",
			timestamp,
			host,
			environment,
			controlPlane: {
				qcAgentStatus: "OFFLINE",
				healthCheck: "UNKNOWN",
				port: 7444,
				host: "127.0.0.1",
			},
			tunnel: {
				type: "cloudflare-trycloudflare",
				processState: "UNKNOWN",
			},
			ports: [],
			meshTalkDataPlane: {
				overlay: "none",
				status: "UNKNOWN",
				udpReady: false,
				tcpReady: false,
			},
			redundancy: {
				primaryTunnel: "DOWN",
				secondaryTunnel: "NOT_PRESENT",
			},
			notes,
		};
	}
}

/**
 * Detect state changes between two infrastructure states
 */
export function detectStateChanges(
	previous: InfrastructureState | null,
	current: InfrastructureState
): StateChange[] {
	const changes: StateChange[] = [];

	if (!previous) {
		// First run, report current state
		if (current.status === "LIVE") {
			changes.push({
				type: "tunnel_online",
				timestamp: current.timestamp,
				currentState: current,
				description: "Tunnel came online",
			});
		}
		return changes;
	}

	// Check for tunnel state changes
	if (previous.tunnel.processState !== current.tunnel.processState) {
		if (current.tunnel.processState === "RUNNING") {
			changes.push({
				type: "tunnel_online",
				timestamp: current.timestamp,
				previousState: previous,
				currentState: current,
				description: "Tunnel process started",
			});
		} else if (current.tunnel.processState === "STOPPED") {
			changes.push({
				type: "tunnel_offline",
				timestamp: current.timestamp,
				previousState: previous,
				currentState: current,
				description: "Tunnel process stopped",
			});
		}
	}

	// Check for URL changes
	if (previous.tunnel.publicUrl !== current.tunnel.publicUrl) {
		changes.push({
			type: "tunnel_url_change",
			timestamp: current.timestamp,
			previousState: previous,
			currentState: current,
			description: `Tunnel URL changed from ${previous.tunnel.publicUrl || "none"} to ${current.tunnel.publicUrl || "none"}`,
		});
	}

	// Check for service status changes
	if (previous.controlPlane.qcAgentStatus !== current.controlPlane.qcAgentStatus) {
		if (current.controlPlane.qcAgentStatus === "ONLINE") {
			changes.push({
				type: "service_restart",
				timestamp: current.timestamp,
				previousState: previous,
				currentState: current,
				description: "qc-agent service restarted",
			});
		} else if (current.controlPlane.qcAgentStatus === "OFFLINE") {
			changes.push({
				type: "service_crash",
				timestamp: current.timestamp,
				previousState: previous,
				currentState: current,
				description: "qc-agent service crashed",
			});
		}
	}

	// Check for port changes
	const previousPorts = new Set(previous.ports.map(p => `${p.port}/${p.protocol}`));
	const currentPorts = new Set(current.ports.map(p => `${p.port}/${p.protocol}`));
	
	const portsChanged = previousPorts.size !== currentPorts.size ||
		[...previousPorts].some(p => !currentPorts.has(p));
	
	if (portsChanged) {
		changes.push({
			type: "port_change",
			timestamp: current.timestamp,
			previousState: previous,
			currentState: current,
			description: "Port listener configuration changed",
		});
	}

	// Check for MeshTalk changes
	if (previous.meshTalkDataPlane.status !== current.meshTalkDataPlane.status) {
		changes.push({
			type: "meshtalk_change",
			timestamp: current.timestamp,
			previousState: previous,
			currentState: current,
			description: `MeshTalk status changed from ${previous.meshTalkDataPlane.status} to ${current.meshTalkDataPlane.status}`,
		});
	}

	// Check for redundancy changes
	if (
		previous.redundancy.primaryTunnel !== current.redundancy.primaryTunnel ||
		previous.redundancy.secondaryTunnel !== current.redundancy.secondaryTunnel
	) {
		changes.push({
			type: "redundancy_change",
			timestamp: current.timestamp,
			previousState: previous,
			currentState: current,
			description: "Redundancy state changed",
		});
	}

	return changes;
}
