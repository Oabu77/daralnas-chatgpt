/**
 * AI Router - Workers AI Integration
 */

import { fromHono } from "chanfana";
import { Hono } from "hono";
import { WorkersAIEndpoint, WorkersAIEmbeddingEndpoint, WorkersAIImageEndpoint } from "./workers-ai";

export const aiRouter = fromHono(new Hono());

// Text generation
aiRouter.post("/ai/generate", WorkersAIEndpoint);

// Text embeddings
aiRouter.post("/ai/embeddings", WorkersAIEmbeddingEndpoint);

// Image generation
aiRouter.post("/ai/image", WorkersAIImageEndpoint);

// AI Models list
aiRouter.get("/ai/models", async (c) => {
	const models = {
		text_generation: [
			"@cf/meta/llama-3.1-8b-instruct",
			"@cf/meta/llama-3.1-70b-instruct",
			"@cf/mistral/mistral-7b-instruct-v0.1",
			"@cf/microsoft/phi-2",
		],
		embeddings: [
			"@cf/baai/bge-base-en-v1.5",
			"@cf/baai/bge-large-en-v1.5",
			"@cf/baai/bge-small-en-v1.5",
		],
		image_generation: [
			"@cf/stabilityai/stable-diffusion-xl-base-1.0",
			"@cf/bytedance/stable-diffusion-xl-lightning",
		],
		translation: [
			"@cf/meta/m2m100-1.2b",
		],
		speech_recognition: [
			"@cf/openai/whisper",
		],
	};

	return c.json({
		success: true,
		models,
		count: Object.values(models).flat().length,
	});
});

// AI Health check
aiRouter.get("/ai/health", async (c) => {
	const aiAvailable = !!c.env.AI;
	
	return c.json({
		success: true,
		ai_enabled: aiAvailable,
		timestamp: new Date().toISOString(),
		status: aiAvailable ? "operational" : "not_configured",
	});
});
