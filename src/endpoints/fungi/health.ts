/**
 * Fungi Mesh Sentinel Health Check Endpoint
 */

import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { z } from "zod";
import { HealthResponseSchema } from "./models";

export class SentinelHealthEndpoint extends OpenAPIRoute {
	schema = {
		tags: ["Fungi Mesh Sentinel"],
		summary: "Sentinel health check",
		description: "Check if the Fungi Mesh Infrastructure Sentinel is operational",
		responses: {
			"200": {
				description: "Sentinel is healthy",
				content: {
					"application/json": {
						schema: HealthResponseSchema,
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const timestamp = new Date().toISOString();

		return {
			status: "healthy",
			timestamp,
			sentinel: {
				operational: true,
				version: "1.0.0",
			},
		};
	}
}
