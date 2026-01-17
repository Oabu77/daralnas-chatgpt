import { Hono } from "hono";
import { fromHono } from "chanfana";
import { ShipmentList } from "./shipmentList";
import { ShipmentCreate } from "./shipmentCreate";
import { ShipmentRead } from "./shipmentRead";
import { ShipmentUpdate } from "./shipmentUpdate";
import { 
	CarrierCreate, CarrierList, CarrierRead, CarrierUpdate,
	PortCreate, PortList, PortRead, PortUpdate,
	CorridorCreate, CorridorList, CorridorRead, CorridorUpdate
} from "./coreEndpoints";
import { ContractDeploy, EscrowFund, EscrowRelease, DisputeCreate } from "./quranchain";
import { DispatchOptimize, CarrierScoring, DelayPredict, CarrierReassign } from "./ai";
import { TrackingUpdate, LiveMap, PortCongestion } from "./tracking";
import { InvoiceGenerate, RevenueAnalytics } from "./treasury";
import { CarrierOnboard } from "./onboarding";
import { RevenueStream, RevenueAnalytics as LiveRevenueAnalytics } from "./revenue";

export const oliveexpressRouter = fromHono(new Hono());

// Shipment Management
oliveexpressRouter.get("/shipments", ShipmentList);
oliveexpressRouter.post("/shipments", ShipmentCreate);
oliveexpressRouter.get("/shipments/:id", ShipmentRead);
oliveexpressRouter.put("/shipments/:id", ShipmentUpdate);

// Carrier Management
oliveexpressRouter.get("/carriers", CarrierList);
oliveexpressRouter.post("/carriers", CarrierCreate);
oliveexpressRouter.get("/carriers/:id", CarrierRead);
oliveexpressRouter.put("/carriers/:id", CarrierUpdate);

// Port Management
oliveexpressRouter.get("/ports", PortList);
oliveexpressRouter.post("/ports", PortCreate);
oliveexpressRouter.get("/ports/:id", PortRead);
oliveexpressRouter.put("/ports/:id", PortUpdate);

// Corridor Management
oliveexpressRouter.get("/corridors", CorridorList);
oliveexpressRouter.post("/corridors", CorridorCreate);
oliveexpressRouter.get("/corridors/:id", CorridorRead);
oliveexpressRouter.put("/corridors/:id", CorridorUpdate);

// QuranChain Integration
oliveexpressRouter.post("/quranchain/deploy", ContractDeploy);
oliveexpressRouter.post("/quranchain/escrow/fund", EscrowFund);
oliveexpressRouter.post("/quranchain/escrow/release", EscrowRelease);
oliveexpressRouter.post("/quranchain/dispute", DisputeCreate);

// AI & Automation
oliveexpressRouter.post("/ai/dispatch/optimize", DispatchOptimize);
oliveexpressRouter.post("/ai/carrier/score", CarrierScoring);
oliveexpressRouter.post("/ai/delay/predict", DelayPredict);
oliveexpressRouter.post("/ai/carrier/reassign", CarrierReassign);

// Tracking & Operations
oliveexpressRouter.post("/tracking/update", TrackingUpdate);
oliveexpressRouter.get("/operations/live-map", LiveMap);
oliveexpressRouter.get("/operations/port-congestion", PortCongestion);

// Treasury
oliveexpressRouter.post("/treasury/invoice/generate", InvoiceGenerate);
oliveexpressRouter.get("/treasury/revenue/analytics", RevenueAnalytics);

// Live Revenue Processing (30% Founder Royalty)
oliveexpressRouter.post("/revenue/process", RevenueStream);
oliveexpressRouter.get("/revenue/analytics", LiveRevenueAnalytics);

// Carrier Onboarding
oliveexpressRouter.post("/onboarding/carrier", CarrierOnboard);
