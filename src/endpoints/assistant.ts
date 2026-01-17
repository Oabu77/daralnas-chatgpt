/**
 * Mobile AI Assistant Endpoint
 * Handles mobile PWA requests and AI chat
 */

import { OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

const ChatMessageSchema = z.object({
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
});

const ChatRequestSchema = z.object({
	messages: z.array(ChatMessageSchema),
	stream: z.boolean().optional().default(false),
	learn: z.boolean().optional().default(true),
});

export class MobileAssistantEndpoint extends OpenAPIRoute {
	schema = {
		tags: ["Mobile AI Assistant"],
		summary: "Mobile AI chat endpoint",
		description: "Always-on AI assistant for mobile devices",
		request: {
			body: {
				content: {
					"application/json": {
						schema: ChatRequestSchema,
					},
				},
			},
		},
		responses: {
			"200": {
				description: "AI response",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							response: z.string(),
							learned: z.boolean().optional(),
							context_id: z.string().optional(),
						}),
					},
				},
			},
		},
	};

	async handle(c: Context) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { messages, stream, learn } = data.body;

		try {
			// Get OpenAI API key from environment
			const openaiKey = c.env.OPENAI_API_KEY;
			
			if (!openaiKey) {
				return {
					success: false,
					response: "AI service is not configured. I'm running in basic mode.",
					learned: false,
				};
			}

			// Build context-aware system prompt
			const systemPrompt = {
				role: "system",
				content: `You are DarCloud AI Assistant, an always-on mobile AI agent integrated with:
- DarCloud infrastructure
- Fungi Mesh Network monitoring
- OliveExpress™ shipment management
- QuranChain integration

You are learning from every conversation to become a more personalized and effective assistant. 
You can help with:
- Network status monitoring
- Shipment tracking and optimization
- AI-powered dispatch decisions
- Real-time analytics
- Infrastructure management

Be concise for mobile users, but comprehensive when needed. Always be helpful, learning, and proactive.`,
			};

			// Prepare messages for OpenAI
			const aiMessages = [systemPrompt, ...messages];

			// Call OpenAI API
			const response = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${openaiKey}`,
				},
				body: JSON.stringify({
					model: "gpt-4",
					messages: aiMessages,
					temperature: 0.7,
					max_tokens: 500, // Optimized for mobile
					presence_penalty: 0.6,
					frequency_penalty: 0.3,
				}),
			});

			if (!response.ok) {
				throw new Error(`OpenAI API error: ${response.statusText}`);
			}

			const result = await response.json();
			const aiResponse = result.choices?.[0]?.message?.content || "I'm here to help! What can I do for you?";

			// Store conversation context in D1 if learning is enabled
			let contextId = null;
			if (learn && c.env.DB) {
				try {
					const userMessage = messages[messages.length - 1]?.content || "";
					const timestamp = new Date().toISOString();
					
					const insertResult = await c.env.DB.prepare(
						"INSERT INTO ai_conversations (user_message, ai_response, created_at) VALUES (?, ?, ?) RETURNING id"
					).bind(userMessage, aiResponse, timestamp).first();
					
					contextId = insertResult?.id;
				} catch (dbError) {
					console.error("Failed to store conversation:", dbError);
					// Continue anyway - learning is optional
				}
			}

			return {
				success: true,
				response: aiResponse,
				learned: learn && contextId !== null,
				context_id: contextId,
			};

		} catch (error) {
			console.error("AI Assistant error:", error);
			
			// Fallback to basic responses if AI fails
			return {
				success: false,
				response: "I'm experiencing some difficulties. Please try again in a moment. In the meantime, you can check /fungi/sentinel/status for system health.",
				learned: false,
			};
		}
	}
}
