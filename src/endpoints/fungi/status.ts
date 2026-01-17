/**
 * Fungi Mesh Sentinel Status Endpoint
 */

import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { SentinelStatusQuerySchema, StatusResponseSchema } from "./models";
import { performInfrastructureVerification } from "./sentinel";
import {
	formatSentinelReport,
	toJSONReport,
	formatWorkerReport,
	formatHeartbeatReport,
	formatMeshTalkBroadcast,
} from "./formatter";

export class SentinelStatusEndpoint extends OpenAPIRoute {
	schema = {
		tags: ["Fungi Mesh Sentinel"],
		summary: "Get current infrastructure status",
		description: "Retrieve the current status of DarCloud and QuranChain infrastructure",
		request: {
			query: SentinelStatusQuerySchema,
		},
		responses: {
			"200": {
				description: "Current infrastructure status",
				content: {
					"application/json": {
						schema: StatusResponseSchema,
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { environment, format } = data.query;

		// Perform infrastructure verification
		const state = await performInfrastructureVerification(environment);

		// Format report based on requested format
		let report: string | object;
		switch (format) {
			case "json":
				report = toJSONReport(state);
				break;
			case "worker":
				report = formatWorkerReport(state);
				break;
			case "heartbeat":
				report = formatHeartbeatReport(state);
				break;
			case "meshtalk":
				report = formatMeshTalkBroadcast(state);
				break;
			case "full":
			default:
				report = formatSentinelReport(state);
				break;
		}

		return {
			success: true,
			data: {
				status: state.status,
				timestamp: state.timestamp,
				host: state.host,
				environment: state.environment,
				report,
			},
		};
	}
}
