import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";

const messageSchema = z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1).describe("Message content"),
});

export class WorkersAIChatEndpoint extends OpenAPIRoute {
        public schema = {
                tags: ["Workers AI"],
                summary: "Send chat prompts through Cloudflare AI Gateway to Workers AI",
                operationId: "workers-ai-chat",
                request: {
                        body: contentJson(
                                z.object({
                                        messages: z
                                                .array(messageSchema)
                                                .min(1)
                                                .refine(
                                                        (messages) =>
                                                                messages.some((message) => message.role === "user"),
                                                        {
                                                                message: "At least one user message is required",
                                                        },
                                                ),
                                        system: z
                                                .string()
                                                .optional()
                                                .describe("Optional system prompt to prepend to the conversation"),
                                }),
                        ),
                },
                responses: {
                        "200": {
                                description: "Returns the Workers AI response",
                                ...contentJson({
                                        success: z.boolean(),
                                        result: z.object({
                                                model: z.string(),
                                                response: z.string(),
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

                if (!c.env.AI_GATEWAY_ID) {
                        return c.json(
                                {
                                        success: false,
                                        errors: [
                                                {
                                                        code: 4001,
                                                        message: "AI Gateway ID is not configured",
                                                },
                                        ],
                                },
                                500,
                        );
                }

                const messages = [
                        {
                                role: "system",
                                content:
                                        data.body.system?.trim() ||
                                        "You are a helpful assistant responding with concise, factual answers.",
                        },
                        ...data.body.messages.map((message) => ({
                                role: message.role,
                                content: message.content,
                        })),
                ];

                try {
                        const result = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
                                messages,
                                gateway: {
                                        id: c.env.AI_GATEWAY_ID,
                                        cache: true,
                                },
                        });

                        if (!result || typeof result.response !== "string") {
                                return c.json(
                                        {
                                                success: false,
                                                errors: [
                                                        {
                                                                code: 5001,
                                                                message: "No response from Workers AI",
                                                        },
                                                ],
                                        },
                                        500,
                                );
                        }

                        return c.json({
                                success: true,
                                result: {
                                        model: "@cf/meta/llama-3.1-8b-instruct",
                                        response: result.response,
                                },
                        });
                } catch (error) {
                        return c.json(
                                {
                                        success: false,
                                        errors: [
                                                {
                                                        code: 5002,
                                                        message:
                                                                error instanceof Error
                                                                        ? error.message
                                                                        : "Failed to get response from Workers AI",
                                                },
                                        ],
                                },
                                500,
                        );
                }
        }
}
