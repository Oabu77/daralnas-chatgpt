/**
 * Fungi Mesh Sentinel API Models
 * Zod schemas for API request/response validation
 */

import { z } from "zod";

// Request schemas
export const SentinelStatusQuerySchema = z.object({
	environment: z.string().optional().default("DarCloud"),
	format: z.enum(["full", "json", "worker", "heartbeat", "meshtalk"]).optional().default("full"),
});

export const TriggerReportSchema = z.object({
	environment: z.string().optional().default("DarCloud"),
	format: z.enum(["full", "json", "worker", "heartbeat", "meshtalk"]).optional().default("full"),
	force: z.boolean().optional().default(false),
});

// Response schemas
export const HealthResponseSchema = z.object({
	status: z.string(),
	timestamp: z.string(),
	sentinel: z.object({
		operational: z.boolean(),
		version: z.string(),
	}),
});

export const StatusResponseSchema = z.object({
	success: z.boolean(),
	data: z.object({
		status: z.string(),
		timestamp: z.string(),
		host: z.string(),
		environment: z.string(),
		report: z.union([z.string(), z.record(z.any())]),
	}),
});

export const ReportResponseSchema = z.object({
	success: z.boolean(),
	data: z.object({
		reported: z.boolean(),
		stateChanges: z.array(z.string()),
		report: z.union([z.string(), z.record(z.any())]),
	}),
});
