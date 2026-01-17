import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { tasksRouter } from "./endpoints/tasks/router";
import { oliveexpressRouter } from "./endpoints/oliveexpress/router";
import { fungiRouter } from "./endpoints/fungi/router";
import { networkRouter } from "./endpoints/network/router";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { ChatGPTEndpoint } from "./endpoints/chatgpt";
import { MobileAssistantEndpoint } from "./endpoints/assistant";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all origins - auto allow everything
app.use('*', cors({
	origin: '*',
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
	exposeHeaders: ['Content-Length', 'X-Request-Id'],
	maxAge: 86400,
	credentials: false,
}));

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

// Register Network Device Management
openapi.route("/network", networkRouter);

// Register Mobile AI Assistant
openapi.post("/assistant/chat", MobileAssistantEndpoint);

// Serve PWA files
app.get("/assistant", async (c) => {
	const html = await c.env.ASSETS?.fetch(new Request("https://fake-host/assistant.html"));
	return html || c.text("Assistant not available", 404);
});

app.get("/manifest.json", async (c) => {
	const manifest = await c.env.ASSETS?.fetch(new Request("https://fake-host/manifest.json"));
	return manifest || c.json({}, 404);
});

app.get("/sw.js", async (c) => {
	const sw = await c.env.ASSETS?.fetch(new Request("https://fake-host/sw.js"));
	if (sw) {
		const response = new Response(sw.body, sw);
		response.headers.set("Content-Type", "application/javascript");
		response.headers.set("Service-Worker-Allowed", "/");
		return response;
	}
	return c.text("Service worker not available", 404);
});

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);
openapi.post("/chatgpt", ChatGPTEndpoint);

// Export the Hono app
export default app;
