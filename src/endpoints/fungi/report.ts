/**
 * Fungi Mesh Sentinel Report Endpoint
 */

import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { TriggerReportSchema, ReportResponseSchema } from "./models";
import { performInfrastructureVerification, detectStateChanges } from "./sentinel";
import {
	formatSentinelReport,
	toJSONReport,
	formatWorkerReport,
	formatHeartbeatReport,
	formatMeshTalkBroadcast,
} from "./formatter";

// In-memory store for previous state (in production, this would be in a database)
let previousState: any = null;

export class SentinelReportEndpoint extends OpenAPIRoute {
	schema = {
		tags: ["Fungi Mesh Sentinel"],
		summary: "Trigger infrastructure status report",
		description: "Manually trigger an infrastructure status report. Reports are generated only when state changes are detected unless force=true.",
		request: {
			body: {
				content: {
					"application/json": {
						schema: TriggerReportSchema,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Report generated",
				content: {
					"application/json": {
						schema: ReportResponseSchema,
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { environment, format, force } = data.body;

		// Perform infrastructure verification
		const currentState = await performInfrastructureVerification(environment);

		// Detect state changes
		const stateChanges = detectStateChanges(previousState, currentState);

		// Determine if we should report
		const shouldReport = force || stateChanges.length > 0;

		let report: string | object;
		if (shouldReport) {
			// Format report based on requested format
			switch (format) {
				case "json":
					report = toJSONReport(currentState);
					break;
				case "worker":
					report = formatWorkerReport(currentState);
					break;
				case "heartbeat":
					report = formatHeartbeatReport(currentState);
					break;
				case "meshtalk":
					report = formatMeshTalkBroadcast(currentState);
					break;
				case "full":
				default:
					report = formatSentinelReport(currentState);
					break;
			}

			// Update previous state
			previousState = currentState;
		} else {
			report = "No state changes detected. Report not generated.";
		}

		return {
			success: true,
			data: {
				reported: shouldReport,
				stateChanges: stateChanges.map(change => change.description),
				report,
			},
		};
	}
}
