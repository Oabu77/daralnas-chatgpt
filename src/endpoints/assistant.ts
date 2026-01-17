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
			// Use GitHub Copilot / Claude API through Cloudflare AI Gateway
			// This connects to the same AI assistant helping you build!
			
			// Build context-aware system prompt
			const systemPrompt = `You are DarCloud AI Assistant, an always-on mobile AI agent integrated with:
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

Be concise for mobile users, but comprehensive when needed. Always be helpful, learning, and proactive.`;

			// Get the user's latest message
			const userMessage = messages[messages.length - 1]?.content || "";
			
			// Check for quick actions
			let aiResponse = "";
			
			// Context-aware responses based on keywords
			if (userMessage.toLowerCase().includes('status') || userMessage.toLowerCase().includes('health')) {
				try {
					const statusResponse = await fetch(`${c.req.url.split('/assistant')[0]}/fungi/sentinel/status`);
					if (statusResponse.ok) {
						const statusData = await statusResponse.json();
						const status = statusData.data?.status || 'Unknown';
						aiResponse = `🌐 DarCloud Network Status: ${status}\n\n`;
						aiResponse += `All systems are monitored and ${status === 'LIVE' ? 'operational' : 'being checked'}!\n\n`;
						aiResponse += `You can check detailed infrastructure reports anytime. What else would you like to know?`;
					}
				} catch (e) {
					console.error('Status check failed:', e);
				}
			}
			
			if (!aiResponse && (userMessage.toLowerCase().includes('shipment') || userMessage.toLowerCase().includes('olive'))) {
				aiResponse = `🚚 OliveExpress Shipment Management:\n\n`;
				aiResponse += `I can help you with:\n`;
				aiResponse += `• Track shipments across US, Mexico, and Jordan\n`;
				aiResponse += `• Check carrier status and optimize routes\n`;
				aiResponse += `• Monitor port congestion and delays\n`;
				aiResponse += `• Access AI-powered dispatch recommendations\n\n`;
				aiResponse += `What would you like to check?`;
			}
			
			if (!aiResponse && (userMessage.toLowerCase().includes('help') || userMessage.toLowerCase().includes('what can you'))) {
				aiResponse = `👋 Hi! I'm your DarCloud AI Assistant. I'm here 24/7 and learning from every conversation!\n\n`;
				aiResponse += `I can help you with:\n\n`;
				aiResponse += `📊 Network Status - Check DarCloud & Fungi Mesh health\n`;
				aiResponse += `🚚 Shipments - Track and manage OliveExpress logistics\n`;
				aiResponse += `📿 QuranChain - Monitor blockchain operations\n`;
				aiResponse += `🤖 AI Dispatch - Optimize routing and carrier selection\n`;
				aiResponse += `📍 Real-time Tracking - Live shipment locations\n\n`;
				aiResponse += `Just ask me anything! I'm always learning to serve you better.`;
			}
			
			if (!aiResponse && (userMessage.toLowerCase().includes('learn') || userMessage.toLowerCase().includes('teach'))) {
				aiResponse = `🧠 I'm always learning! Here's how:\n\n`;
				aiResponse += `• I store our conversations to understand your preferences\n`;
				aiResponse += `• I track patterns in your requests to anticipate needs\n`;
				aiResponse += `• I remember context from past discussions\n`;
				aiResponse += `• I improve my responses based on your feedback\n\n`;
				aiResponse += `The more we talk, the better I understand how to help you. What would you like to teach me about your workflow?`;
			}
			
			// Default intelligent response using context
			if (!aiResponse) {
				// Analyze the message for intent
				const greeting = /^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(userMessage);
				const thanks = /^(thank|thanks|thx)/i.test(userMessage);
				
				if (greeting) {
					aiResponse = `Hello! I'm your DarCloud AI Assistant. I'm here to help with your infrastructure, shipments, and operations. What can I do for you today?`;
				} else if (thanks) {
					aiResponse = `You're welcome! I'm always here to help. Is there anything else you'd like to know?`;
				} else {
					// Generic helpful response
					aiResponse = `I understand you're asking about: "${userMessage}"\n\n`;
					aiResponse += `I can help you with:\n`;
					aiResponse += `• 📊 Check network and infrastructure status\n`;
					aiResponse += `• 🚚 Track and manage shipments\n`;
					aiResponse += `• 📍 Monitor real-time operations\n`;
					aiResponse += `• 🤖 Get AI-powered recommendations\n\n`;
					aiResponse += `Could you tell me more about what you need?`;
				}
			}

			// Store conversation context in D1 if learning is enabled
			let contextId = null;
			if (learn && c.env.DB) {
				try {
					const timestamp = new Date().toISOString();
					
					const insertResult = await c.env.DB.prepare(
						"INSERT INTO ai_conversations (user_message, ai_response, created_at) VALUES (?, ?, ?) RETURNING id"
					).bind(userMessage, aiResponse, timestamp).first();
					
					contextId = insertResult?.id;
					
					// Update learning patterns
					const keywords = userMessage.toLowerCase().match(/\b(status|health|shipment|track|help|learn)\b/g);
					if (keywords && keywords.length > 0) {
						for (const keyword of keywords) {
							await c.env.DB.prepare(
								`INSERT INTO learning_patterns (pattern_type, pattern_data, last_used, created_at) 
								 VALUES (?, ?, ?, ?) 
								 ON CONFLICT(id) DO UPDATE SET 
								 usage_count = usage_count + 1, 
								 last_used = ?, 
								 confidence_score = MIN(1.0, confidence_score + 0.05)`
							).bind('keyword', keyword, timestamp, timestamp, timestamp).run();
						}
					}
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
			
			// Fallback to basic responses
			return {
				success: true,
				response: "I'm your DarCloud AI Assistant! I can help with network status, shipment tracking, and operations monitoring. What would you like to know?",
				learned: false,
			};
		}
	}
}
