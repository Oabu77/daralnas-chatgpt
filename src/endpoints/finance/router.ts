import { Hono } from "hono";
import { fromHono } from "chanfana";
import { TransferIntentEndpoint } from "./transferIntent";

export const financeRouter = fromHono(new Hono());

financeRouter.post("/transfer-intents", TransferIntentEndpoint);
