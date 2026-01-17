/**
 * Fungi Mesh Infrastructure Sentinel Types
 * Type definitions for infrastructure monitoring and reporting
 */

export type ServiceStatus = "ONLINE" | "OFFLINE" | "DEGRADED";
export type HealthCheckStatus = "PASS" | "FAIL" | "UNKNOWN";
export type ProcessState = "RUNNING" | "STOPPED" | "UNKNOWN";
export type TunnelType = "cloudflare-trycloudflare" | "cloudflare-named" | "other";
export type OverlayType = "wireguard" | "tailscale" | "none";
export type DataPlaneStatus = "READY" | "NOT_READY" | "UNKNOWN";
export type RedundancyState = "ACTIVE" | "STANDBY" | "DOWN" | "NOT_PRESENT";
export type InfrastructureStatus = "LIVE" | "DEGRADED" | "OFFLINE" | "RECOVERED" | "INCOMPLETE_STATE";

export interface ControlPlaneState {
	qcAgentStatus: ServiceStatus;
	healthCheck: HealthCheckStatus;
	port: number;
	host: string;
}

export interface TunnelState {
	type: TunnelType;
	publicUrl?: string;
	hostname?: string;
	processState: ProcessState;
	processId?: number;
}

export interface PortListener {
	port: number;
	protocol: "tcp" | "udp";
	service: string;
	state: "LISTENING" | "CLOSED";
}

export interface MeshTalkDataPlane {
	overlay: OverlayType;
	status: DataPlaneStatus;
	interfaceName?: string;
	udpReady: boolean;
	tcpReady: boolean;
}

export interface RedundancyStatus {
	primaryTunnel: RedundancyState;
	secondaryTunnel: RedundancyState;
}

export interface InfrastructureState {
	status: InfrastructureStatus;
	timestamp: string;
	host: string;
	environment: string;
	controlPlane: ControlPlaneState;
	tunnel: TunnelState;
	ports: PortListener[];
	meshTalkDataPlane: MeshTalkDataPlane;
	redundancy: RedundancyStatus;
	notes: string[];
}

export interface SentinelReport {
	status: InfrastructureStatus;
	timestamp: string;
	host: string;
	environment: string;
	controlPlane: {
		qcAgent: ServiceStatus;
		healthCheck: HealthCheckStatus;
	};
	tunnel: {
		type: string;
		publicUrl?: string;
		hostname?: string;
		processState: ProcessState;
	};
	ports: string[];
	meshTalkDataPlane: {
		overlay: OverlayType;
		status: DataPlaneStatus;
	};
	redundancy: {
		primaryTunnel: RedundancyState;
		secondaryTunnel: RedundancyState;
	};
	notes: string[];
}

export interface StateChange {
	type: "tunnel_online" | "tunnel_offline" | "tunnel_url_change" | "service_restart" | "service_crash" | "port_change" | "meshtalk_change" | "redundancy_change";
	timestamp: string;
	previousState?: Partial<InfrastructureState>;
	currentState: InfrastructureState;
	description: string;
}
