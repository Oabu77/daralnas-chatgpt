import { OpenAPIRoute } from "chanfana";
import { HandleArgs } from "../../types";
import { z } from "zod";

// Carrier Onboarding
export class CarrierOnboard extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["Onboarding"],
		summary: "Complete carrier onboarding process",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							legal_name: z.string(),
							operating_name: z.string(),
							carrier_type: z.enum(['TRUCK', 'RAIL', 'SEA', 'AIR', 'MULTIMODAL']),
							registration_country: z.string(),
							email: z.string().email(),
							phone: z.string(),
							compliance_documents: z.array(z.object({
								document_type: z.enum(['LICENSE', 'INSURANCE', 'CUSTOMS', 'SAFETY_CERT']),
								document_url: z.string(),
								issue_date: z.string().datetime(),
								expiry_date: z.string().datetime(),
							})),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Carrier onboarded successfully",
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		// Step 1: Create DarCloud Identity
		const darcloud_id = `DC-${Date.now()}-CARRIER`;
		await context.env.DB.prepare(
			`INSERT INTO darcloud_identities 
			(darcloud_id, identity_type, verification_level, kyc_status, document_count, created_at, updated_at)
			VALUES (?, 'CARRIER', 'BASIC', 'PENDING', ?, datetime('now'), datetime('now'))`
		).bind(darcloud_id, body.compliance_documents.length).run();

		// Step 2: Issue Wallet
		const wallet_address = `0x${Math.random().toString(16).substring(2, 42)}`;

		// Step 3: Create Carrier Record
		const carrier_code = `CAR-${Date.now().toString().substring(7)}`;
		const carrier_result = await context.env.DB.prepare(
			`INSERT INTO carriers 
			(carrier_code, legal_name, operating_name, carrier_type, registration_country,
			 darcloud_identity_id, wallet_address, trust_score, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, 50.0, 'PENDING', datetime('now'), datetime('now'))`
		).bind(
			carrier_code,
			body.legal_name,
			body.operating_name,
			body.carrier_type,
			body.registration_country,
			darcloud_id,
			wallet_address
		).run();

		const carrier_id = carrier_result.meta.last_row_id;

		// Update DarCloud identity with entity reference
		await context.env.DB.prepare(
			`UPDATE darcloud_identities SET entity_id = ? WHERE darcloud_id = ?`
		).bind(carrier_id, darcloud_id).run();

		// Step 4: Store Compliance Documents
		for (const doc of body.compliance_documents) {
			const darcloud_doc_id = `DOC-${Date.now()}-${doc.document_type}`;
			await context.env.DB.prepare(
				`INSERT INTO carrier_compliance 
				(carrier_id, document_type, document_url, darcloud_doc_id, 
				 issue_date, expiry_date, verification_status, created_at)
				VALUES (?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'))`
			).bind(
				carrier_id,
				doc.document_type,
				doc.document_url,
				darcloud_doc_id,
				doc.issue_date,
				doc.expiry_date
			).run();
		}

		// Step 5: Create Wallet Record
		await context.env.DB.prepare(
			`INSERT INTO carrier_wallets 
			(carrier_id, wallet_address, wallet_type, blockchain, wallet_status, created_at, updated_at)
			VALUES (?, ?, 'PRIMARY', 'QURANCHAIN', 'ACTIVE', datetime('now'), datetime('now'))`
		).bind(carrier_id, wallet_address).run();

		// Step 6: Initial Trust Score Assignment
		await context.env.DB.prepare(
			`INSERT INTO carrier_scores 
			(carrier_id, score_type, score_value, contributing_factors, calculated_by, calculated_at)
			VALUES (?, 'TRUST', 50.0, ?, 'SYSTEM', datetime('now'))`
		).bind(
			carrier_id,
			JSON.stringify({ reason: "Initial onboarding score" })
		).run();

		return {
			success: true,
			carrier_id,
			carrier_code,
			darcloud_identity_id: darcloud_id,
			wallet_address,
			status: "PENDING_VERIFICATION",
			message: "Carrier onboarded successfully. Compliance documents under review.",
			next_steps: [
				"Complete KYC verification",
				"Await compliance document approval",
				"Receive dispatch access upon activation",
			],
		};
	}
}
