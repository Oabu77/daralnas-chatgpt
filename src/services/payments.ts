import { enforceShariaCompliance, evaluateZakat } from "./compliance";
import { buildSettlementEntries, recordLedgerEntries } from "./ledger";

export type PaymentInput = {
        merchant_id: string;
        amount_cents: number;
        currency: string;
        payment_method: string;
        description?: string;
        metadata?: Record<string, unknown>;
        category?: string;
        idempotency_key?: string;
};

export type PaymentRecord = {
        id: string;
        merchant_id: string;
        amount_cents: number;
        currency: string;
        payment_method: string;
        description: string | null;
        metadata: string | null;
        status: string;
        founder_royalty_cents: number;
        platform_fee_cents: number;
        net_amount_cents: number;
        zakat_blocked: number;
        sharia_block_reason: string | null;
        created_at: string;
};

export function calculateFees(amountCents: number, env: Env) {
        const platformBps = Number(env.PLATFORM_FEE_BPS || "150");
        const founderBps = Number(env.FOUNDER_ROYALTY_BPS || "1000");
        const platform_fee_cents = Math.floor((amountCents * platformBps) / 10000);
        const founder_royalty_cents = Math.floor((amountCents * founderBps) / 10000);
        const net_amount_cents = amountCents - platform_fee_cents - founder_royalty_cents;
        return { platform_fee_cents, founder_royalty_cents, net_amount_cents };
}

export async function createPayment(db: D1Database, env: Env, payload: PaymentInput): Promise<PaymentRecord> {
        const merchant = await db
                .prepare(`SELECT id, status, sharia_screened, allowed_categories, wallet_address FROM merchants WHERE id = ?1`)
                .bind(payload.merchant_id)
                .first();
        if (!merchant) {
                throw new Error("Merchant not found");
        }
        if (merchant.status !== "approved") {
                throw new Error("Merchant not approved for payments");
        }
        if (!merchant.sharia_screened) {
                throw new Error("Merchant not Sharia-screened");
        }
        const shariaResult = enforceShariaCompliance(payload.category, env);
        if (shariaResult.blocked) {
                throw new Error(shariaResult.reason || "Sharia compliance failed");
        }
        const zakat_blocked = evaluateZakat(payload.amount_cents, env) ? 1 : 0;
        const { platform_fee_cents, founder_royalty_cents, net_amount_cents } = calculateFees(payload.amount_cents, env);
        const transactionId = crypto.randomUUID();
        const now = new Date().toISOString();
        const metadataString = payload.metadata ? JSON.stringify(payload.metadata) : null;

        if (payload.idempotency_key) {
                const existing = await db
                        .prepare(`SELECT id FROM transactions WHERE idempotency_key = ?1`)
                        .bind(payload.idempotency_key)
                        .first();
                if (existing) {
                        const record = await db.prepare(`SELECT * FROM transactions WHERE id = ?1`).bind(existing.id).first();
                        return record as PaymentRecord;
                }
        }

        await db
                .prepare(
                        `INSERT INTO transactions (
                                id, merchant_id, amount_cents, currency, payment_method, description, metadata, status,
                                founder_royalty_cents, platform_fee_cents, net_amount_cents, zakat_blocked, sharia_block_reason, idempotency_key, created_at, updated_at
                        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'captured', ?8, ?9, ?10, ?11, NULL, ?12, ?13, ?13)`,
                )
                .bind(
                        transactionId,
                        payload.merchant_id,
                        payload.amount_cents,
                        payload.currency,
                        payload.payment_method,
                        payload.description || null,
                        metadataString,
                        founder_royalty_cents,
                        platform_fee_cents,
                        net_amount_cents,
                        zakat_blocked,
                        payload.idempotency_key || null,
                        now,
                )
                .run();

        const entries = buildSettlementEntries({
                transactionId,
                currency: payload.currency,
                amount_cents: payload.amount_cents,
                platform_fee_cents,
                founder_royalty_cents,
                merchant_account: merchant.wallet_address,
        });
        await recordLedgerEntries(db, transactionId, entries);

        await db
                .prepare(`INSERT INTO audit_logs (id, actor, scope, action, details) VALUES (?1, ?2, ?3, ?4, ?5)`)
                .bind(
                        crypto.randomUUID(),
                        payload.merchant_id,
                        "payment",
                        "create",
                        JSON.stringify({
                                transactionId,
                                amount_cents: payload.amount_cents,
                                currency: payload.currency,
                                platform_fee_cents,
                                founder_royalty_cents,
                                zakat_blocked,
                        }),
                )
                .run();

        const record = await db.prepare(`SELECT * FROM transactions WHERE id = ?1`).bind(transactionId).first();
        return record as PaymentRecord;
}

export async function getPayment(db: D1Database, id: string): Promise<PaymentRecord | null> {
        const record = await db.prepare(`SELECT * FROM transactions WHERE id = ?1`).bind(id).first();
        return (record as PaymentRecord) || null;
}

export async function summarizeRevenue(db: D1Database) {
        const totals = await db
                .prepare(
                        `SELECT 
                                SUM(amount_cents) as gross_cents,
                                SUM(platform_fee_cents) as platform_fee_cents,
                                SUM(founder_royalty_cents) as founder_royalty_cents,
                                SUM(net_amount_cents) as net_amount_cents
                        FROM transactions WHERE status = 'captured'`,
                )
                .first();
        return {
                gross_cents: totals?.gross_cents || 0,
                platform_fee_cents: totals?.platform_fee_cents || 0,
                founder_royalty_cents: totals?.founder_royalty_cents || 0,
                net_amount_cents: totals?.net_amount_cents || 0,
        };
}

export async function merchantRevenue(db: D1Database, merchantId: string) {
        const totals = await db
                .prepare(
                        `SELECT 
                                SUM(amount_cents) as gross_cents,
                                SUM(platform_fee_cents) as platform_fee_cents,
                                SUM(founder_royalty_cents) as founder_royalty_cents,
                                SUM(net_amount_cents) as net_amount_cents
                        FROM transactions WHERE status = 'captured' AND merchant_id = ?1`,
                )
                .bind(merchantId)
                .first();
        return {
                gross_cents: totals?.gross_cents || 0,
                platform_fee_cents: totals?.platform_fee_cents || 0,
                founder_royalty_cents: totals?.founder_royalty_cents || 0,
                net_amount_cents: totals?.net_amount_cents || 0,
        };
}
