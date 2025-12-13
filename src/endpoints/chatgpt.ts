import { contentJson, OpenAPIRoute } from "chanfana";
import { AppContext } from "../types";
import { z } from "zod";
import OpenAI from "openai";

export class ChatGPTEndpoint extends OpenAPIRoute {
	public schema = {
		tags: ["ChatGPT"],
		summary: "Send a message to ChatGPT and get a response",
		operationId: "chatgpt-completion",
		request: {
			body: contentJson(
				z.object({
					message: z.string().min(1).describe("The message to send to ChatGPT"),
                                        model: z
                                                .string()
                                                .optional()
                                                .default("gpt-4o-mini")
                                                .describe("The OpenAI model to use"),
					temperature: z
						.number()
						.min(0)
						.max(2)
						.optional()
						.default(0.7)
						.describe("Sampling temperature"),
				}),
			),
		},
		responses: {
			"200": {
				description: "Returns the ChatGPT response",
				...contentJson({
					success: z.boolean(),
					result: z.object({
						message: z.string(),
						model: z.string(),
						usage: z.object({
							prompt_tokens: z.number(),
							completion_tokens: z.number(),
							total_tokens: z.number(),
						}),
					}),
				}),
			},
			"400": {
				description: "Bad request - missing or invalid parameters",
				...contentJson({
					success: z.boolean(),
					errors: z.array(
						z.object({
							code: z.number(),
							message: z.string(),
						}),
					),
				}),
			},
			"500": {
				description: "Internal server error",
				...contentJson({
					success: z.boolean(),
					errors: z.array(
						z.object({
							code: z.number(),
							message: z.string(),
						}),
					),
				}),
			},
		},
	};

	public async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		// Get the OpenAI API key from environment variables
		const apiKey = c.env.OPENAI_API_KEY;
		if (!apiKey) {
			return c.json(
				{
					success: false,
					errors: [
						{
							code: 4001,
							message: "OpenAI API key not configured",
						},
					],
				},
				500,
			);
		}

		try {
			const openai = new OpenAI({
				apiKey: apiKey,
			});

			const completion = await openai.chat.completions.create({
				model: data.body.model,
				messages: [
					{
						role: "user",
						content: data.body.message,
					},
				],
				temperature: data.body.temperature,
			});

			if (
				!completion.choices ||
				completion.choices.length === 0 ||
				!completion.choices[0]?.message?.content
			) {
				return c.json(
					{
						success: false,
						errors: [
							{
								code: 5001,
								message: "No response from ChatGPT",
							},
						],
					},
					500,
				);
			}

			const responseMessage = completion.choices[0].message.content;

			return {
				success: true,
				result: {
					message: responseMessage,
					model: completion.model,
					usage: {
						prompt_tokens: completion.usage?.prompt_tokens || 0,
						completion_tokens: completion.usage?.completion_tokens || 0,
						total_tokens: completion.usage?.total_tokens || 0,
					},
				},
			};
		} catch (error) {
			console.error("Error calling OpenAI API:", error);
			return c.json(
				{
					success: false,
					errors: [
						{
							code: 5002,
							message:
								error instanceof Error
									? error.message
									: "Failed to get response from ChatGPT",
						},
					],
				},
				500,
			);
		}
	}
}
