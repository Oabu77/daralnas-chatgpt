import { OpenAPIRoute, Query } from "chanfana";
import { z } from "zod";

export class RevenueStream extends OpenAPIRoute {
	schema = {
		tags: ["Revenue"],
		summary: "Process live revenue and distribute 30% founder royalty",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							invoice_id: z.string().describe("Invoice ID to process payment"),
							payment_method: z.enum(["QURANCHAIN", "BANK_TRANSFER", "MOBILE_WALLET"]),
							payment_amount: z.number().describe("Total payment in USD"),
							payer_wallet: z.string().describe("Wallet address of payer"),
							transaction_hash: z.string().optional().describe("Blockchain transaction hash"),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Payment processed, revenue distributed",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							revenue: z.object({
								total_payment: z.number(),
								founder_royalty: z.number(),
								carrier_payment: z.number(),
								royalty_percentage: z.number(),
							}),
							transaction_id: z.string(),
							founder_wallet: z.string(),
							carrier_wallet: z.string(),
							timestamp: z.string(),
						}),
					},
				},
			},
		},
	};

	async handle(c) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;
		const db = c.env.DB;

		// Fetch invoice details
		const invoice = await db
			.prepare("SELECT * FROM invoices WHERE id = ?")
			.bind(body.invoice_id)
			.first();

		if (!invoice) {
			return c.json({ error: "Invoice not found" }, 404);
		}

		// Calculate revenue split (30% founder, 70% carrier)
		const total_payment = body.payment_amount;
		const royalty_rate = invoice.invoice_type === 'NGO' ? 0 : 0.30; // 30% for commercial
		const founder_royalty = total_payment * royalty_rate;
		const carrier_payment = total_payment - founder_royalty;

		// Founder wallet (Daralnas)
		const founder_wallet = "0xDaralnas77FounderWalletMainAddress";

		// Record revenue transaction
		const transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		const now = new Date().toISOString();

		await db
			.prepare(
				`INSERT INTO revenue_transactions 
				(transaction_id, invoice_id, payment_method, total_amount, founder_royalty, 
				carrier_payment, royalty_rate, payer_wallet, founder_wallet, carrier_wallet,
				blockchain_hash, status, created_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)`
			)
			.bind(
				transaction_id,
				body.invoice_id,
				body.payment_method,
				total_payment,
				founder_royalty,
				carrier_payment,
				royalty_rate,
				body.payer_wallet,
				founder_wallet,
				invoice.carrier_wallet || "PENDING",
				body.transaction_hash || null,
				now
			)
			.run();

		// Update invoice status
		await db
			.prepare("UPDATE invoices SET invoice_status = 'PAID', paid_at = ? WHERE id = ?")
			.bind(now, body.invoice_id)
			.run();

		// If QuranChain payment, record on blockchain
		if (body.payment_method === "QURANCHAIN" && body.transaction_hash) {
			await db
				.prepare(
					`INSERT INTO quranchain_transactions 
					(transaction_hash, transaction_type, from_wallet, to_wallet, amount, 
					gas_fee, status, created_at)
					VALUES (?, 'REVENUE_PAYMENT', ?, ?, ?, 0, 'CONFIRMED', ?)`
				)
				.bind(
					body.transaction_hash,
					body.payer_wallet,
					founder_wallet,
					founder_royalty,
					now
				)
				.run();
		}

		return c.json({
			success: true,
			revenue: {
				total_payment,
				founder_royalty,
				carrier_payment,
				royalty_percentage: royalty_rate * 100,
			},
			transaction_id,
			founder_wallet,
			carrier_wallet: invoice.carrier_wallet || "PENDING",
			timestamp: now,
		});
	}
}

export class RevenueAnalytics extends OpenAPIRoute {
	schema = {
		tags: ["Revenue"],
		summary: "Get live revenue analytics and earnings",
		request: {
			query: z.object({
				period: z.enum(["today", "week", "month", "all"]).default("all"),
			}),
		},
		responses: {
			"200": {
				description: "Revenue analytics",
				content: {
					"application/json": {
						schema: z.object({
							period: z.string(),
							total_revenue: z.number(),
							founder_earnings: z.number(),
							carrier_earnings: z.number(),
							transaction_count: z.number(),
							average_royalty_rate: z.number(),
							breakdown_by_type: z.any(),
						}),
					},
				},
			},
		},
	};

	async handle(c) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { period } = data.query;
		const db = c.env.DB;

		// Calculate date filter
		let dateFilter = "";
		const now = new Date();
		if (period === "today") {
			const today = now.toISOString().split("T")[0];
			dateFilter = `WHERE created_at >= '${today}T00:00:00'`;
		} else if (period === "week") {
			const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
			dateFilter = `WHERE created_at >= '${weekAgo}'`;
		} else if (period === "month") {
			const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
			dateFilter = `WHERE created_at >= '${monthAgo}'`;
		}

		// Get revenue totals
		const totals = await db
			.prepare(
				`SELECT 
					COUNT(*) as transaction_count,
					SUM(total_amount) as total_revenue,
					SUM(founder_royalty) as founder_earnings,
					SUM(carrier_payment) as carrier_earnings,
					AVG(royalty_rate) as avg_royalty_rate
				FROM revenue_transactions ${dateFilter}`
			)
			.first();

		// Get breakdown by invoice type
		const breakdown = await db
			.prepare(
				`SELECT 
					i.invoice_type,
					COUNT(*) as count,
					SUM(r.total_amount) as revenue,
					SUM(r.founder_royalty) as founder_cut
				FROM revenue_transactions r
				JOIN invoices i ON r.invoice_id = i.id
				${dateFilter}
				GROUP BY i.invoice_type`
			)
			.all();

		return c.json({
			period,
			total_revenue: totals?.total_revenue || 0,
			founder_earnings: totals?.founder_earnings || 0,
			carrier_earnings: totals?.carrier_earnings || 0,
			transaction_count: totals?.transaction_count || 0,
			average_royalty_rate: (totals?.avg_royalty_rate || 0) * 100,
			breakdown_by_type: breakdown.results,
		});
	}
}
