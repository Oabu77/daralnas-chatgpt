import { Hono } from "hono";
import { fromHono } from "chanfana";
import { DeviceMonitor, AutoMaintenance, PerformanceReport } from "./devices";

export const networkRouter = fromHono(new Hono());

// Device Management
networkRouter.post("/devices/monitor", DeviceMonitor);
networkRouter.post("/devices/auto-maintain", AutoMaintenance);
networkRouter.get("/devices/performance", PerformanceReport);
