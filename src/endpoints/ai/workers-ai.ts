/**
 * Workers AI Integration Endpoint
 * Provides AI-powered features using Cloudflare Workers AI
 */

import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

// Request schema
const AIRequestSchema = z.object({
	prompt: z.string().min(1).max(4000).describe("The prompt to send to the AI model"),
	model: z.string().optional().default("@cf/meta/llama-3.1-8b-instruct").describe("AI model to use"),
	stream: z.boolean().optional().default(false).describe("Enable streaming response"),
	max_tokens: z.number().optional().default(512).describe("Maximum tokens in response"),
	temperature: z.number().min(0).max(2).optional().default(0.7).describe("Temperature for response creativity"),
});

// Response schema
const AIResponseSchema = z.object({
	success: z.boolean(),
	model: z.string(),
	response: z.string(),
	usage: z.object({
		prompt_tokens: z.number().optional(),
		completion_tokens: z.number().optional(),
		total_tokens: z.number().optional(),
	}).optional(),
	timestamp: z.string(),
});

export class WorkersAIEndpoint extends OpenAPIRoute {
	schema = {
		tags: ["AI Services"],
		summary: "Workers AI - Text Generation",
		description: "Generate text using Cloudflare Workers AI models",
		request: {
			body: {
				content: {
					"application/json": {
						schema: AIRequestSchema,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "AI response generated successfully",
				content: {
					"application/json": {
						schema: AIResponseSchema,
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body as z.infer<typeof AIRequestSchema>;

		try {
			// Check if AI binding is available
			if (!c.env.AI) {
				return c.json({
					success: false,
					error: "Workers AI not configured. Please add AI binding to wrangler.jsonc",
					model: body.model,
					response: "",
					timestamp: new Date().toISOString(),
				}, 503);
			}

			// Call Workers AI
			const response = await c.env.AI.run(body.model, {
				prompt: body.prompt,
				max_tokens: body.max_tokens,
				temperature: body.temperature,
				stream: body.stream,
			});

			return {
				success: true,
				model: body.model,
				response: response.response || JSON.stringify(response),
				usage: {
					prompt_tokens: response.usage?.prompt_tokens,
					completion_tokens: response.usage?.completion_tokens,
					total_tokens: response.usage?.total_tokens,
				},
				timestamp: new Date().toISOString(),
			};
		} catch (error: any) {
			console.error("Workers AI Error:", error);
			return c.json({
				success: false,
				error: error.message || "AI request failed",
				model: body.model,
				response: "",
				timestamp: new Date().toISOString(),
			}, 500);
		}
	}
}

// Text Embedding endpoint
const EmbeddingRequestSchema = z.object({
	text: z.string().min(1).max(2000).describe("Text to generate embeddings for"),
	model: z.string().optional().default("@cf/baai/bge-base-en-v1.5").describe("Embedding model"),
});

export class WorkersAIEmbeddingEndpoint extends OpenAPIRoute {
	schema = {
		tags: ["AI Services"],
		summary: "Workers AI - Text Embeddings",
		description: "Generate text embeddings using Cloudflare Workers AI",
		request: {
			body: {
				content: {
					"application/json": {
						schema: EmbeddingRequestSchema,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Embeddings generated successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body as z.infer<typeof EmbeddingRequestSchema>;

		try {
			if (!c.env.AI) {
				return c.json({
					success: false,
					error: "Workers AI not configured",
				}, 503);
			}

			const response = await c.env.AI.run(body.model, {
				text: body.text,
			});

			return {
				success: true,
				model: body.model,
				embeddings: response.data || response,
				timestamp: new Date().toISOString(),
			};
		} catch (error: any) {
			console.error("Embedding Error:", error);
			return c.json({
				success: false,
				error: error.message || "Embedding generation failed",
			}, 500);
		}
	}
}

// Image Generation endpoint
const ImageGenRequestSchema = z.object({
	prompt: z.string().min(1).max(1000).describe("Image description prompt"),
	model: z.string().optional().default("@cf/stabilityai/stable-diffusion-xl-base-1.0").describe("Image model"),
	num_steps: z.number().optional().default(20).describe("Number of inference steps"),
});

export class WorkersAIImageEndpoint extends OpenAPIRoute {
	schema = {
		tags: ["AI Services"],
		summary: "Workers AI - Image Generation",
		description: "Generate images using Cloudflare Workers AI",
		request: {
			body: {
				content: {
					"application/json": {
						schema: ImageGenRequestSchema,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Image generated successfully",
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body as z.infer<typeof ImageGenRequestSchema>;

		try {
			if (!c.env.AI) {
				return c.json({
					success: false,
					error: "Workers AI not configured",
				}, 503);
			}

			const response = await c.env.AI.run(body.model, {
				prompt: body.prompt,
				num_steps: body.num_steps,
			});

			// Convert image to base64 if needed
			return c.json({
				success: true,
				model: body.model,
				image: response,
				timestamp: new Date().toISOString(),
			});
		} catch (error: any) {
			console.error("Image generation error:", error);
			return c.json({
				success: false,
				error: error.message || "Image generation failed",
			}, 500);
		}
	}
}
