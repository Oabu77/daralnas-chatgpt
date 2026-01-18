/**
 * Fungi Mesh Sentinel Router
 */

import { fromHono } from "chanfana";
import { Hono } from "hono";
import { SentinelHealthEndpoint } from "./health";
import { SentinelStatusEndpoint } from "./status";
import { SentinelReportEndpoint } from "./report";
import expansionRouter from "./expansion";

// Create Fungi Mesh sub-router
const fungiApp = new Hono<{ Bindings: Env }>();

export const fungiRouter = fromHono(fungiApp);

// Register sentinel endpoints
fungiRouter.get("/sentinel/health", SentinelHealthEndpoint);
fungiRouter.get("/sentinel/status", SentinelStatusEndpoint);
fungiRouter.post("/sentinel/report", SentinelReportEndpoint);

// Register expansion endpoints
fungiRouter.route("/expansion", expansionRouter);

export { fungiRouter as default };
