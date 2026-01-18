import { OpenAPIRoute, OpenAPIRouter } from "chanfana";
import { IranReliefAgent } from "../../agents/iran-relief-agent";

export class IranReliefAgentEndpoint extends OpenAPIRoute {
	schema = {
		summary: "Iran Humanitarian Relief Agent",
		description: "Aggressive auto-expansion agent for Iran telecom services and MeshTalkOS deployment",
		tags: ["Agents", "Iran", "Humanitarian"],
		request: {
			body: {
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								action: {
									type: "string",
									description: "Action to perform (discover, connect, deploy, telecom)",
									default: "full_cycle"
								}
							}
						}
					}
				}
			}
		},
		responses: {
			200: {
				description: "Agent operation completed",
				content: {
					"application/json": {
						schema: {
							type: "object",
							properties: {
								success: { type: "boolean" },
								iran_devices_discovered: { type: "number" },
								devices_connected: { type: "number" },
								meshtalk_deployed: { type: "number" },
								telecom_services: { type: "number" },
								status: { type: "string" }
							}
						}
					}
				}
			}
		}
	};

	async handle(c: any) {
		const agent = new IranReliefAgent();
		return await agent.handle();
	}
}

const router = new OpenAPIRouter();

router.post("/iran-relief-agent", IranReliefAgentEndpoint);

export { router as agentsRouter };