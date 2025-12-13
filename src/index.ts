import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { tasksRouter } from "./endpoints/tasks/router";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { ChatGPTEndpoint } from "./endpoints/chatgpt";
import { financeRouter } from "./endpoints/finance/router";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
	if (err instanceof ApiException) {
		// If it's a Chanfana ApiException, let Chanfana handle the response
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode,
		);
	}

	console.error("Global error handler caught:", err); // Log the error if it's not known

	// For other errors, return a generic 500 response
	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
        schema: {
                info: {
                        title: "QuranChain CFO Edge API",
                        version: "1.0.0",
                        description:
                                "Revenue-first orchestrator with Founder-controlled approvals, fee capture, and Sharia-compliant safeguards.",
                },
        },
});

// Register Tasks Sub router
openapi.route("/tasks", tasksRouter);

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);
openapi.post("/chatgpt", ChatGPTEndpoint);
openapi.route("/finance", financeRouter);

// Export the Hono app
export default app;
