import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface ApiError {
	code: number;
	message: string;
}

interface ErrorResponse {
	success: boolean;
	errors: ApiError[];
}

describe("ChatGPT API Integration Tests", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
	});

	describe("POST /chatgpt", () => {
		it("should return 500 if OPENAI_API_KEY is not configured", async () => {
			const requestBody = {
				message: "Hello, ChatGPT!",
			};
			const response = await SELF.fetch(`http://local.test/chatgpt`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			});
			const body = await response.json<ErrorResponse>();

			expect(response.status).toBe(500);
			expect(body.success).toBe(false);
			expect(body.errors).toBeInstanceOf(Array);
			expect(body.errors[0]).toEqual(
				expect.objectContaining({
					code: 4001,
					message: "OpenAI API key not configured",
				}),
			);
		});

		it("should return 400 for invalid request body (missing message)", async () => {
			const invalidRequestBody = {
				// Missing required 'message' field
				model: "gpt-3.5-turbo",
			};
			const response = await SELF.fetch(`http://local.test/chatgpt`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(invalidRequestBody),
			});
			const body = await response.json();

			expect(response.status).toBe(400);
			expect(body.success).toBe(false);
			expect(body.errors).toBeInstanceOf(Array);
		});

		it("should return 400 for empty message", async () => {
			const invalidRequestBody = {
				message: "",
			};
			const response = await SELF.fetch(`http://local.test/chatgpt`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(invalidRequestBody),
			});
			const body = await response.json();

			expect(response.status).toBe(400);
			expect(body.success).toBe(false);
			expect(body.errors).toBeInstanceOf(Array);
		});

		it("should return 400 for invalid temperature", async () => {
			const invalidRequestBody = {
				message: "Hello",
				temperature: 3, // Invalid: should be between 0 and 2
			};
			const response = await SELF.fetch(`http://local.test/chatgpt`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(invalidRequestBody),
			});
			const body = await response.json();

			expect(response.status).toBe(400);
			expect(body.success).toBe(false);
			expect(body.errors).toBeInstanceOf(Array);
		});
	});
});
