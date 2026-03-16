import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Agent launch endpoint", () => {
	it("launches Omar Ai 3.0 with all tools and skills by default", async () => {
		const response = await SELF.fetch("http://local.test/agent/launch", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const body = await response.json<any>();

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.result.agent.name).toBe("Omar Ai 3.0");
		expect(body.result.agent.status).toBe("launched");
		expect(body.result.ecosystem.name).toBe("QuranChain");
		expect(body.result.ecosystem.deployment_status).toBe("deployed");
		expect(body.result.capabilities.tools).toContain("exec_command");
		expect(body.result.capabilities.skills).toEqual([
			"skill-creator",
			"skill-installer",
		]);
	});

	it("accepts custom launch parameters", async () => {
		const response = await SELF.fetch("http://local.test/agent/launch", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Omar Ai 3.0",
				ecosystem: "QuranChain",
				mission: "Provide spiritual and technical guidance",
			}),
		});
		const body = await response.json<any>();

		expect(response.status).toBe(200);
		expect(body.result.agent.mission).toBe(
			"Provide spiritual and technical guidance",
		);
	});
});
