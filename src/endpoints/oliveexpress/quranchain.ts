import { OpenAPIRoute } from "chanfana";
import { HandleArgs } from "../../types";
import { z } from "zod";

// QuranChain Smart Contract Integration
export class ContractDeploy extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["QuranChain"],
		summary: "Deploy shipment smart contract to QuranChain",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							shipment_id: z.number().int(),
							shipper_wallet: z.string(),
							carrier_wallet: z.string(),
							contract_value_usd: z.number(),
							royalty_rate: z.number().default(0.025),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Contract deployed successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							contract_id: z.string(),
							transaction_hash: z.string(),
							founder_royalty_usd: z.number(),
						}),
					},
				},
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		const founder_royalty = body.contract_value_usd * body.royalty_rate;
		const contract_id = `QC-${Date.now()}-${body.shipment_id}`;
		const transaction_hash = `0x${Math.random().toString(16).substring(2, 66)}`;

		// Store contract in database
		const stmt = context.env.DB.prepare(
			`INSERT INTO quranchain_contracts 
			(contract_id, shipment_id, contract_type, shipper_wallet, carrier_wallet, 
			 contract_value_usd, founder_royalty_usd, contract_data, contract_status, 
			 transaction_hash, created_at, updated_at)
			VALUES (?, ?, 'SHIPMENT', ?, ?, ?, ?, ?, 'ACTIVE', ?, datetime('now'), datetime('now'))`
		);
		
		await stmt.bind(
			contract_id,
			body.shipment_id,
			body.shipper_wallet,
			body.carrier_wallet,
			body.contract_value_usd,
			founder_royalty,
			JSON.stringify({ royalty_rate: body.royalty_rate }),
			transaction_hash
		).run();

		// Update shipment with contract ID
		await context.env.DB.prepare(
			`UPDATE shipments SET quranchain_contract_id = ?, updated_at = datetime('now') WHERE id = ?`
		).bind(contract_id, body.shipment_id).run();

		return {
			success: true,
			contract_id,
			transaction_hash,
			founder_royalty_usd: founder_royalty,
		};
	}
}

// Escrow Funding
export class EscrowFund extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["QuranChain"],
		summary: "Fund escrow account for shipment",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							contract_id: z.string(),
							shipment_id: z.number().int(),
							funded_amount_usd: z.number(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Escrow funded successfully",
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		// Get contract details
		const contract = await context.env.DB.prepare(
			`SELECT * FROM quranchain_contracts WHERE contract_id = ?`
		).bind(body.contract_id).first();

		if (!contract) {
			return { success: false, error: "Contract not found" };
		}

		const founder_royalty = contract.founder_royalty_usd as number;
		const carrier_payment = body.funded_amount_usd - founder_royalty;
		const escrow_id = `ESC-${Date.now()}-${body.shipment_id}`;

		// Create escrow record
		await context.env.DB.prepare(
			`INSERT INTO escrow_accounts 
			(escrow_id, contract_id, shipment_id, funded_amount_usd, founder_royalty_usd, 
			 carrier_payment_usd, release_conditions, escrow_status, funded_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'FUNDED', datetime('now'), datetime('now'))`
		).bind(
			escrow_id,
			body.contract_id,
			body.shipment_id,
			body.funded_amount_usd,
			founder_royalty,
			carrier_payment,
			JSON.stringify({ auto_release_on_delivery: true })
		).run();

		// Update shipment
		await context.env.DB.prepare(
			`UPDATE shipments SET escrow_status = 'FUNDED', updated_at = datetime('now') WHERE id = ?`
		).bind(body.shipment_id).run();

		return {
			success: true,
			escrow_id,
			carrier_payment_usd: carrier_payment,
			founder_royalty_usd: founder_royalty,
		};
	}
}

// Auto-release on delivery
export class EscrowRelease extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["QuranChain"],
		summary: "Release escrow funds on successful delivery",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							escrow_id: z.string(),
							shipment_id: z.number().int(),
							delivery_confirmed: z.boolean(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Escrow released successfully",
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		if (!body.delivery_confirmed) {
			return { success: false, error: "Delivery not confirmed" };
		}

		// Update escrow status
		await context.env.DB.prepare(
			`UPDATE escrow_accounts 
			 SET escrow_status = 'RELEASED', released_at = datetime('now') 
			 WHERE escrow_id = ?`
		).bind(body.escrow_id).run();

		// Update shipment
		await context.env.DB.prepare(
			`UPDATE shipments SET escrow_status = 'RELEASED', updated_at = datetime('now') WHERE id = ?`
		).bind(body.shipment_id).run();

		// Record founder royalty collection
		const escrow = await context.env.DB.prepare(
			`SELECT * FROM escrow_accounts WHERE escrow_id = ?`
		).bind(body.escrow_id).first();

		if (escrow) {
			await context.env.DB.prepare(
				`INSERT INTO founder_royalties 
				(contract_id, shipment_id, transaction_value_usd, royalty_rate, 
				 royalty_amount_usd, royalty_status, collected_at, created_at)
				VALUES (?, ?, ?, 0.025, ?, 'COLLECTED', datetime('now'), datetime('now'))`
			).bind(
				escrow.contract_id,
				body.shipment_id,
				escrow.funded_amount_usd,
				escrow.founder_royalty_usd
			).run();
		}

		return {
			success: true,
			message: "Escrow released successfully",
		};
	}
}

// Dispute Creation
export class DisputeCreate extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["QuranChain"],
		summary: "Create dispute for shipment",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							contract_id: z.string(),
							shipment_id: z.number().int(),
							raised_by_wallet: z.string(),
							dispute_type: z.enum(['DELAY', 'DAMAGE', 'LOSS', 'QUALITY', 'PAYMENT', 'OTHER']),
							dispute_reason: z.string(),
							evidence_urls: z.array(z.string()).optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Dispute created successfully",
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		const dispute_id = `DIS-${Date.now()}-${body.shipment_id}`;

		await context.env.DB.prepare(
			`INSERT INTO disputes 
			(dispute_id, contract_id, shipment_id, raised_by_wallet, dispute_type, 
			 dispute_reason, evidence_urls, dispute_status, raised_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', datetime('now'))`
		).bind(
			dispute_id,
			body.contract_id,
			body.shipment_id,
			body.raised_by_wallet,
			body.dispute_type,
			body.dispute_reason,
			body.evidence_urls ? JSON.stringify(body.evidence_urls) : null
		).run();

		// Update shipment and escrow status
		await context.env.DB.prepare(
			`UPDATE shipments SET status = 'DISPUTED', escrow_status = 'DISPUTED', updated_at = datetime('now') WHERE id = ?`
		).bind(body.shipment_id).run();

		await context.env.DB.prepare(
			`UPDATE escrow_accounts SET escrow_status = 'DISPUTED' WHERE shipment_id = ?`
		).bind(body.shipment_id).run();

		return {
			success: true,
			dispute_id,
			message: "Dispute created and under review",
		};
	}
}
