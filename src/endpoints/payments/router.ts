import { Hono } from "hono";
import { fromHono } from "chanfana";
import { merchantPayload, paymentPayload, webhookPayload } from "./models";
import { createPayment, getPayment, merchantRevenue, summarizeRevenue } from "../../services/payments";

export const paymentsRouter = fromHono(new Hono());

paymentsRouter.post("/merchants", async (c) => {
        const body = merchantPayload.parse(await c.req.json());
        const merchantId = crypto.randomUUID();
        const categories = JSON.stringify(body.categories || []);
        await c.env.DB
                .prepare(
                        `INSERT INTO merchants (id, name, contact_email, wallet_address, status, allowed_categories, sharia_screened)
                         VALUES (?1, ?2, ?3, ?4, 'approved', ?5, 1)`,
                )
                .bind(merchantId, body.name, body.contact_email, body.wallet_address, categories)
                .run();
        await c.env.DB
                .prepare(`INSERT INTO audit_logs (id, actor, scope, action, details) VALUES (?1, ?2, 'merchant', 'create', ?3)`)
                .bind(crypto.randomUUID(), merchantId, JSON.stringify({ name: body.name, contact_email: body.contact_email }))
                .run();
        return c.json({ merchant_id: merchantId, status: "approved" });
});

paymentsRouter.get("/merchants/:id/revenue", async (c) => {
        const merchantId = c.req.param("id");
        const revenue = await merchantRevenue(c.env.DB, merchantId);
        return c.json({ merchant_id: merchantId, revenue });
});

paymentsRouter.post("/payments", async (c) => {
        const payload = paymentPayload.parse(await c.req.json());
        const payment = await createPayment(c.env.DB, c.env, payload);
        return c.json({ payment });
});

paymentsRouter.get("/payments/:id", async (c) => {
        const payment = await getPayment(c.env.DB, c.req.param("id"));
        if (!payment) {
                return c.json({ error: "Not found" }, 404);
        }
        return c.json({ payment });
});

paymentsRouter.post("/webhooks", async (c) => {
        const body = webhookPayload.parse(await c.req.json());
        const exists = await c.env.DB
                .prepare(`SELECT id FROM webhook_events WHERE id = ?1`)
                .bind(body.signature)
                .first();
        if (exists) {
                return c.json({ status: "ignored" });
        }
        await c.env.DB
                .prepare(
                        `INSERT INTO webhook_events (id, transaction_id, target_url, event_type, payload, status, signature)
                         VALUES (?1, ?2, ?3, ?4, ?5, 'received', ?6)`,
                )
                .bind(crypto.randomUUID(), body.transaction_id, body.target_url, body.event_type, JSON.stringify(body.payload), body.signature)
                .run();
        return c.json({ status: "accepted" });
});

paymentsRouter.get("/revenue", async (c) => {
        const revenue = await summarizeRevenue(c.env.DB);
        return c.json({ revenue });
});
