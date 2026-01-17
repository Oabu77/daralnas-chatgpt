import { OpenAPIRoute } from "chanfana";
import { HandleArgs } from "../../types";
import { z } from "zod";

// Invoice Generation
export class InvoiceGenerate extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["Treasury"],
		summary: "Generate invoice for shipment(s)",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							customer_name: z.string(),
							customer_darcloud_id: z.string(),
							customer_wallet: z.string(),
							invoice_type: z.enum(['MERCHANT', 'ENTERPRISE', 'GOVERNMENT', 'NGO']),
							shipment_ids: z.array(z.number().int()),
							due_days: z.number().int().default(30),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Invoice generated successfully",
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		// Get shipment details
		const placeholders = body.shipment_ids.map(() => '?').join(',');
		const shipments = await context.env.DB.prepare(
			`SELECT * FROM shipments WHERE id IN (${placeholders})`
		).bind(...body.shipment_ids).all();

		if (!shipments.results || shipments.results.length === 0) {
			return { success: false, error: "No shipments found" };
		}

		// Calculate total
		let total_amount = 0;
		const items: any[] = [];

		for (const shipment of shipments.results) {
			const freight_cost = (shipment as any).cargo_value_usd * 0.15; // 15% of cargo value
			total_amount += freight_cost;
			items.push({
				shipment_id: shipment.id,
				description: `Freight - ${(shipment as any).shipment_number}`,
				amount: freight_cost,
			});
		}

		const royalty_rate = body.invoice_type === 'NGO' ? 0 : 0.30;
		const founder_royalty = total_amount * royalty_rate;
		const net_amount = total_amount - founder_royalty;

		const invoice_number = `INV-${Date.now()}-${body.customer_darcloud_id.substring(0, 8)}`;
		const due_date = new Date();
		due_date.setDate(due_date.getDate() + body.due_days);

		// Create invoice
		const invoice_result = await context.env.DB.prepare(
			`INSERT INTO invoices 
			(invoice_number, invoice_type, customer_name, customer_darcloud_id, customer_wallet,
			 total_amount_usd, founder_royalty_usd, net_amount_usd, invoice_status, 
			 issued_at, due_date)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', datetime('now'), ?)`
		).bind(
			invoice_number,
			body.invoice_type,
			body.customer_name,
			body.customer_darcloud_id,
			body.customer_wallet,
			total_amount,
			founder_royalty,
			net_amount,
			due_date.toISOString()
		).run();

		const invoice_id = invoice_result.meta.last_row_id;

		// Add line items
		for (const item of items) {
			await context.env.DB.prepare(
				`INSERT INTO invoice_items 
				(invoice_id, shipment_id, item_description, item_type, unit_price_usd, total_price_usd)
				VALUES (?, ?, ?, 'FREIGHT', ?, ?)`
			).bind(
				invoice_id,
				item.shipment_id,
				item.description,
				item.amount,
				item.amount
			).run();
		}

		return {
			success: true,
			invoice_id,
			invoice_number,
			total_amount_usd: total_amount,
			founder_royalty_usd: founder_royalty,
			net_amount_usd: net_amount,
			due_date: due_date.toISOString(),
			payment_method: "QURANCHAIN",
		};
	}
}

// Revenue Analytics
export class RevenueAnalytics extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["Treasury"],
		summary: "Get revenue analytics by corridor/region",
		request: {
			query: z.object({
				region: z.enum(['USA', 'MEXICO', 'JORDAN', 'ALL']).default('ALL'),
				start_date: z.string().optional(),
				end_date: z.string().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Revenue analytics data",
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const query = data.query;

		let sql = `
			SELECT 
				p.region,
				s.shipment_type,
				COUNT(s.id) as shipment_count,
				SUM(s.cargo_value_usd) as total_cargo_value,
				SUM(s.cargo_weight_kg) as total_weight_kg,
				SUM(s.cargo_volume_m3) as total_volume_m3
			FROM shipments s
			JOIN ports p ON s.origin_port_id = p.id
			WHERE s.status = 'DELIVERED'
		`;

		const params: any[] = [];

		if (query.region !== 'ALL') {
			sql += ` AND p.region = ?`;
			params.push(query.region);
		}

		if (query.start_date) {
			sql += ` AND s.created_at >= ?`;
			params.push(query.start_date);
		}

		if (query.end_date) {
			sql += ` AND s.created_at <= ?`;
			params.push(query.end_date);
		}

		sql += ` GROUP BY p.region, s.shipment_type`;

		const stmt = context.env.DB.prepare(sql);
		const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

		// Calculate revenue estimates
		const analytics = (result.results || []).map((row: any) => {
			const gross_revenue = row.total_cargo_value * 0.15; // 15% freight rate
			const royalty_rate = row.shipment_type === 'NGO' || row.shipment_type === 'HUMANITARIAN' ? 0 : 0.30;
			const founder_royalty = gross_revenue * royalty_rate;
			const net_revenue = gross_revenue - founder_royalty;

			return {
				region: row.region,
				shipment_type: row.shipment_type,
				shipment_count: row.shipment_count,
				gross_revenue_usd: gross_revenue,
				founder_royalties_usd: founder_royalty,
				net_revenue_usd: net_revenue,
				total_weight_kg: row.total_weight_kg,
				total_volume_m3: row.total_volume_m3,
			};
		});

		const totals = analytics.reduce((acc: any, row: any) => ({
			shipment_count: acc.shipment_count + row.shipment_count,
			gross_revenue_usd: acc.gross_revenue_usd + row.gross_revenue_usd,
			founder_royalties_usd: acc.founder_royalties_usd + row.founder_royalties_usd,
			net_revenue_usd: acc.net_revenue_usd + row.net_revenue_usd,
		}), {
			shipment_count: 0,
			gross_revenue_usd: 0,
			founder_royalties_usd: 0,
			net_revenue_usd: 0,
		});

		return {
			success: true,
			period: {
				start: query.start_date || "inception",
				end: query.end_date || "now",
			},
			totals,
			by_region_and_type: analytics,
		};
	}
}
