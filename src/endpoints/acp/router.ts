import { Hono } from "hono";
import { fromHono } from "chanfana";
import { CatalogEndpoint } from "./catalog";
import { CheckoutEndpoint } from "./checkout";

export const acpRouter = fromHono(new Hono());

acpRouter.get("/catalog", CatalogEndpoint);
acpRouter.post("/checkout", CheckoutEndpoint);
