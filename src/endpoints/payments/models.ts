import { z } from "zod";

export const merchantPayload = z.object({
        name: z.string().min(3),
        contact_email: z.string().email(),
        wallet_address: z.string().min(10),
        categories: z.array(z.string()).default([]),
});

export const paymentPayload = z.object({
        merchant_id: z.string().uuid(),
        amount_cents: z.number().int().positive(),
        currency: z.string().min(3),
        payment_method: z.string().min(2),
        description: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        category: z.string().optional(),
        idempotency_key: z.string().uuid().optional(),
});

export const webhookPayload = z.object({
        transaction_id: z.string().uuid(),
        target_url: z.string().url(),
        event_type: z.string(),
        payload: z.record(z.any()),
        signature: z.string(),
});
