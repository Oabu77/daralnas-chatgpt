export type LedgerEntry = {
        account: string;
        direction: "debit" | "credit";
        amount_cents: number;
        currency: string;
        entry_type: string;
};

export async function recordLedgerEntries(db: D1Database, transactionId: string, entries: LedgerEntry[]) {
        const statements = entries.map((entry) =>
                db
                        .prepare(
                                `INSERT INTO ledger_entries (id, transaction_id, account, direction, amount_cents, currency, entry_type)
                                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
                        )
                        .bind(
                                crypto.randomUUID(),
                                transactionId,
                                entry.account,
                                entry.direction,
                                entry.amount_cents,
                                entry.currency,
                                entry.entry_type,
                        ),
        );
        await db.batch(statements);
}

export function buildSettlementEntries(params: {
        transactionId: string;
        currency: string;
        amount_cents: number;
        platform_fee_cents: number;
        founder_royalty_cents: number;
        merchant_account: string;
}): LedgerEntry[] {
        const receivable: LedgerEntry = {
                account: "escrow:receivable",
                direction: "credit",
                amount_cents: params.amount_cents,
                currency: params.currency,
                entry_type: "payment_receivable",
        };
        const merchant: LedgerEntry = {
                account: `merchant:settlement:${params.merchant_account}`,
                direction: "debit",
                amount_cents: params.amount_cents - params.platform_fee_cents - params.founder_royalty_cents,
                currency: params.currency,
                entry_type: "merchant_settlement",
        };
        const platformFee: LedgerEntry = {
                account: "platform:fees",
                direction: "debit",
                amount_cents: params.platform_fee_cents,
                currency: params.currency,
                entry_type: "platform_fee",
        };
        const founderRoyalty: LedgerEntry = {
                account: "founder:royalty",
                direction: "debit",
                amount_cents: params.founder_royalty_cents,
                currency: params.currency,
                entry_type: "founder_royalty",
        };
        return [receivable, merchant, platformFee, founderRoyalty];
}
