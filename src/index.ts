import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { tasksRouter } from "./endpoints/tasks/router";
import { oliveexpressRouter } from "./endpoints/oliveexpress/router";
import { fungiRouter } from "./endpoints/fungi/router";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { ChatGPTEndpoint } from "./endpoints/chatgpt";

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
			title: "OliveExpress™ Logistics Platform API",
			version: "1.0.0",
			description: "Production logistics platform for Dar Al-Nas ecosystem with QuranChain integration, AI-powered dispatch, and multi-regional operations (USA, Mexico, Jordan).",
		},
	},
});

// Register Tasks Sub router
openapi.route("/tasks", tasksRouter);

// Register OliveExpress™ Platform
openapi.route("/oliveexpress", oliveexpressRouter);

// Register Fungi Mesh Sentinel
openapi.route("/fungi", fungiRouter);

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);
openapi.post("/chatgpt", ChatGPTEndpoint);

// Export the Hono app
export default app;
