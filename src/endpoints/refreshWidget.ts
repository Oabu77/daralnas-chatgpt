import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";

const WIDGET_URI = "widget://refresh";

export class RefreshWidgetEndpoint extends OpenAPIRoute {
        public schema = {
                tags: ["Widget"],
                summary: "Trigger a widget-only refresh",
                operationId: "refresh-widget",
                request: {},
                responses: {
                        "200": {
                                description: "Returns widget refresh confirmation with metadata",
                                ...contentJson(
                                        z.object({
                                                success: z.literal(true),
                                                structuredContent: z.object({
                                                        message: z.string(),
                                                }),
                                                content: z.array(
                                                        z.object({
                                                                type: z.string(),
                                                                text: z.string(),
                                                        }),
                                                ),
                                                annotations: z.object({
                                                        readOnlyHint: z.boolean(),
                                                        idempotentHint: z.boolean(),
                                                }),
                                                _meta: z.object({
                                                        "openai/outputTemplate": z.string(),
                                                        "openai/widgetAccessible": z.boolean(),
                                                        "openai/visibility": z.literal("private"),
                                                        "openai/toolInvocation/invoking": z.string(),
                                                        "openai/toolInvocation/invoked": z.string(),
                                                        widgetSessionNote: z.string(),
                                                }),
                                        }),
                                ),
                        },
                },
        };

        public async handle() {
                const annotations = {
                        readOnlyHint: true,
                        idempotentHint: true,
                } as const;

                const _meta = {
                        "openai/outputTemplate": WIDGET_URI,
                        "openai/widgetAccessible": true,
                        "openai/visibility": "private" as const,
                        "openai/toolInvocation/invoking": "Refreshing...",
                        "openai/toolInvocation/invoked": "Widget refreshed.",
                        widgetSessionNote: "Private tool for widget refresh.",
                } as const;

                return {
                        success: true,
                        structuredContent: { message: "Widget-only refresh complete." },
                        content: [
                                {
                                        type: "text",
                                        text: "Widget-only tool executed successfully.",
                                },
                        ],
                        annotations,
                        _meta,
                };
        }
}
