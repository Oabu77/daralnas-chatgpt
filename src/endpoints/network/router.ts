import { Hono } from "hono";
import { fromHono } from "chanfana";
import { DeviceMonitor, AutoMaintenance, PerformanceReport } from "./devices";
import { DeviceDiscovery, MemoryOptimizer, NodeScaler, NetworkGrowth } from "./tools";

export const networkRouter = fromHono(new Hono());

// Device Management
networkRouter.post("/devices/monitor", DeviceMonitor);
networkRouter.post("/devices/auto-maintain", AutoMaintenance);
networkRouter.get("/devices/performance", PerformanceReport);

// Network Tools
networkRouter.post("/tools/discover", DeviceDiscovery);
networkRouter.post("/tools/optimize-memory", MemoryOptimizer);
networkRouter.post("/tools/scale-nodes", NodeScaler);
networkRouter.post("/tools/auto-grow", NetworkGrowth);
