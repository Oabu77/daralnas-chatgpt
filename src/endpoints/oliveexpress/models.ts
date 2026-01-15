import { z } from "zod";

// Carrier Models
export const carrier = z.object({
	id: z.number().int(),
	carrier_code: z.string(),
	legal_name: z.string(),
	operating_name: z.string(),
	carrier_type: z.enum(['TRUCK', 'RAIL', 'SEA', 'AIR', 'MULTIMODAL']),
	registration_country: z.string(),
	darcloud_identity_id: z.string(),
	wallet_address: z.string(),
	trust_score: z.number(),
	status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED']),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});

export const CarrierModel = {
	tableName: "carriers",
	primaryKeys: ["id"],
	schema: carrier,
};

// Shipment Models
export const shipment = z.object({
	id: z.number().int(),
	shipment_number: z.string(),
	shipper_name: z.string(),
	shipper_darcloud_id: z.string(),
	consignee_name: z.string(),
	consignee_darcloud_id: z.string(),
	carrier_id: z.number().int(),
	origin_port_id: z.number().int(),
	destination_port_id: z.number().int(),
	corridor_id: z.number().int().optional().nullable(),
	transport_mode: z.enum(['TRUCK', 'RAIL', 'SEA', 'AIR', 'MULTIMODAL']),
	cargo_type: z.string(),
	cargo_weight_kg: z.number(),
	cargo_volume_m3: z.number(),
	cargo_value_usd: z.number(),
	shipment_type: z.enum(['COMMERCIAL', 'HUMANITARIAN', 'NGO']),
	status: z.enum(['CREATED', 'DISPATCHED', 'IN_TRANSIT', 'AT_CUSTOMS', 'DELIVERED', 'DELAYED', 'DISPUTED', 'CANCELLED']),
	quranchain_contract_id: z.string().optional().nullable(),
	escrow_status: z.enum(['NONE', 'FUNDED', 'RELEASED', 'DISPUTED']).optional().nullable(),
	pickup_date: z.string().datetime().optional().nullable(),
	estimated_delivery: z.string().datetime(),
	actual_delivery: z.string().datetime().optional().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});

export const ShipmentModel = {
	tableName: "shipments",
	primaryKeys: ["id"],
	schema: shipment,
};

// Port Models
export const port = z.object({
	id: z.number().int(),
	port_code: z.string(),
	port_name: z.string(),
	country: z.string(),
	region: z.enum(['USA', 'MEXICO', 'JORDAN']),
	port_type: z.enum(['SEA', 'AIR', 'LAND', 'RAIL']),
	latitude: z.number().optional().nullable(),
	longitude: z.number().optional().nullable(),
	capacity_status: z.enum(['NORMAL', 'CONGESTED', 'CRITICAL', 'CLOSED']),
	congestion_level: z.number().int(),
	operational_status: z.string(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});

export const PortModel = {
	tableName: "ports",
	primaryKeys: ["id"],
	schema: port,
};

// Corridor Models
export const corridor = z.object({
	id: z.number().int(),
	corridor_code: z.string(),
	corridor_name: z.string(),
	origin_port_id: z.number().int(),
	destination_port_id: z.number().int(),
	corridor_type: z.enum(['COMMERCIAL', 'HUMANITARIAN', 'NGO', 'ZAKAT_EXEMPT']),
	distance_km: z.number(),
	estimated_duration_hours: z.number(),
	active: z.boolean(),
	created_at: z.string().datetime(),
});

export const CorridorModel = {
	tableName: "corridors",
	primaryKeys: ["id"],
	schema: corridor,
	serializer: (obj: object) => {
		const record = obj as Record<string, string | number | boolean>;
		return {
			...record,
			active: Boolean(record.active),
		};
	},
	serializerObject: corridor,
};

// QuranChain Contract Models
export const quranchain_contract = z.object({
	id: z.number().int(),
	contract_id: z.string(),
	shipment_id: z.number().int(),
	contract_type: z.enum(['SHIPMENT', 'ESCROW', 'DISPUTE']),
	shipper_wallet: z.string(),
	carrier_wallet: z.string(),
	consignee_wallet: z.string().optional().nullable(),
	contract_value_usd: z.number(),
	founder_royalty_usd: z.number(),
	contract_data: z.string(),
	contract_status: z.enum(['CREATED', 'ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED']),
	block_number: z.number().int().optional().nullable(),
	transaction_hash: z.string().optional().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});

export const QuranChainContractModel = {
	tableName: "quranchain_contracts",
	primaryKeys: ["id"],
	schema: quranchain_contract,
};

// Escrow Models
export const escrow_account = z.object({
	id: z.number().int(),
	escrow_id: z.string(),
	contract_id: z.string(),
	shipment_id: z.number().int(),
	funded_amount_usd: z.number(),
	founder_royalty_usd: z.number(),
	carrier_payment_usd: z.number(),
	release_conditions: z.string(),
	escrow_status: z.enum(['CREATED', 'FUNDED', 'RELEASED', 'PARTIAL_RELEASED', 'DISPUTED', 'REFUNDED']),
	funded_at: z.string().datetime().optional().nullable(),
	release_scheduled_at: z.string().datetime().optional().nullable(),
	released_at: z.string().datetime().optional().nullable(),
	created_at: z.string().datetime(),
});

export const EscrowAccountModel = {
	tableName: "escrow_accounts",
	primaryKeys: ["id"],
	schema: escrow_account,
};

// Dispute Models
export const dispute = z.object({
	id: z.number().int(),
	dispute_id: z.string(),
	contract_id: z.string(),
	shipment_id: z.number().int(),
	raised_by_wallet: z.string(),
	dispute_type: z.enum(['DELAY', 'DAMAGE', 'LOSS', 'QUALITY', 'PAYMENT', 'OTHER']),
	dispute_reason: z.string(),
	evidence_urls: z.string().optional().nullable(),
	dispute_status: z.enum(['OPEN', 'UNDER_REVIEW', 'MEDIATION', 'RESOLVED', 'ESCALATED', 'CLOSED']),
	resolution_type: z.enum(['FULL_REFUND', 'PARTIAL_REFUND', 'REDELIVERY', 'COMPENSATION', 'DISMISSED']).optional().nullable(),
	resolution_amount_usd: z.number().optional().nullable(),
	resolution_notes: z.string().optional().nullable(),
	raised_at: z.string().datetime(),
	resolved_at: z.string().datetime().optional().nullable(),
});

export const DisputeModel = {
	tableName: "disputes",
	primaryKeys: ["id"],
	schema: dispute,
};

// Invoice Models
export const invoice = z.object({
	id: z.number().int(),
	invoice_number: z.string(),
	invoice_type: z.enum(['MERCHANT', 'ENTERPRISE', 'GOVERNMENT', 'NGO']),
	customer_name: z.string(),
	customer_darcloud_id: z.string(),
	customer_wallet: z.string(),
	total_amount_usd: z.number(),
	founder_royalty_usd: z.number(),
	net_amount_usd: z.number(),
	invoice_status: z.enum(['ISSUED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED']),
	payment_method: z.enum(['QURANCHAIN', 'ON_CHAIN']),
	issued_at: z.string().datetime(),
	due_date: z.string().datetime(),
	paid_at: z.string().datetime().optional().nullable(),
	transaction_hash: z.string().optional().nullable(),
});

export const InvoiceModel = {
	tableName: "invoices",
	primaryKeys: ["id"],
	schema: invoice,
};
