import { OpenAPIRoute } from "chanfana";
import { HandleArgs } from "../../types";
import { z } from "zod";

// Tracking Update
export class TrackingUpdate extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["Tracking"],
		summary: "Update shipment location and status",
		request: {
			body: {
				content: {
					"application/json": {
						schema: z.object({
							shipment_id: z.number().int(),
							event_type: z.enum(['CREATED', 'DISPATCHED', 'CHECKPOINT', 'CUSTOMS', 'DELIVERED', 'DELAYED', 'DAMAGED']),
							latitude: z.number().optional(),
							longitude: z.number().optional(),
							location_name: z.string().optional(),
							event_data: z.record(z.any()).optional(),
						}),
					},
				},
			},
		},
		responses: {
			"200": {
				description: "Tracking updated successfully",
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const body = data.body;

		// Insert tracking event
		await context.env.DB.prepare(
			`INSERT INTO shipment_events 
			(shipment_id, event_type, event_status, latitude, longitude, location_name, event_data, recorded_at)
			VALUES (?, ?, 'RECORDED', ?, ?, ?, ?, datetime('now'))`
		).bind(
			body.shipment_id,
			body.event_type,
			body.latitude || null,
			body.longitude || null,
			body.location_name || null,
			body.event_data ? JSON.stringify(body.event_data) : null
		).run();

		// Update shipment status if applicable
		const statusMap: Record<string, string> = {
			'DISPATCHED': 'DISPATCHED',
			'CHECKPOINT': 'IN_TRANSIT',
			'CUSTOMS': 'AT_CUSTOMS',
			'DELIVERED': 'DELIVERED',
			'DELAYED': 'DELAYED',
			'DAMAGED': 'DISPUTED',
		};

		if (statusMap[body.event_type]) {
			await context.env.DB.prepare(
				`UPDATE shipments SET status = ?, updated_at = datetime('now') WHERE id = ?`
			).bind(statusMap[body.event_type], body.shipment_id).run();

			// If delivered, update actual delivery time
			if (body.event_type === 'DELIVERED') {
				await context.env.DB.prepare(
					`UPDATE shipments SET actual_delivery = datetime('now') WHERE id = ?`
				).bind(body.shipment_id).run();
			}
		}

		return {
			success: true,
			message: "Tracking updated successfully",
		};
	}
}

// Live Map Dashboard
export class LiveMap extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["Operations"],
		summary: "Get live shipment map data",
		request: {
			query: z.object({
				region: z.enum(['USA', 'MEXICO', 'JORDAN', 'ALL']).default('ALL'),
				status: z.string().optional(),
			}),
		},
		responses: {
			"200": {
				description: "Live map data",
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const query = data.query;

		let sql = `
			SELECT 
				s.id, s.shipment_number, s.status, s.transport_mode, s.shipment_type,
				p1.port_name as origin_name, p1.latitude as origin_lat, p1.longitude as origin_lon,
				p2.port_name as dest_name, p2.latitude as dest_lat, p2.longitude as dest_lon,
				se.latitude as current_lat, se.longitude as current_lon, se.location_name as current_location
			FROM shipments s
			JOIN ports p1 ON s.origin_port_id = p1.id
			JOIN ports p2 ON s.destination_port_id = p2.id
			LEFT JOIN (
				SELECT shipment_id, latitude, longitude, location_name
				FROM shipment_events
				WHERE (shipment_id, recorded_at) IN (
					SELECT shipment_id, MAX(recorded_at)
					FROM shipment_events
					WHERE latitude IS NOT NULL
					GROUP BY shipment_id
				)
			) se ON s.id = se.shipment_id
			WHERE s.status NOT IN ('DELIVERED', 'CANCELLED')
		`;

		const params: any[] = [];

		if (query.region !== 'ALL') {
			sql += ` AND p1.region = ?`;
			params.push(query.region);
		}

		if (query.status) {
			sql += ` AND s.status = ?`;
			params.push(query.status);
		}

		const stmt = context.env.DB.prepare(sql);
		const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

		return {
			success: true,
			active_shipments: result.results?.length || 0,
			shipments: result.results,
		};
	}
}

// Port Congestion Dashboard
export class PortCongestion extends OpenAPIRoute<HandleArgs> {
	schema = {
		tags: ["Operations"],
		summary: "Get port congestion status",
		request: {
			query: z.object({
				region: z.enum(['USA', 'MEXICO', 'JORDAN', 'ALL']).default('ALL'),
			}),
		},
		responses: {
			"200": {
				description: "Port congestion data",
			},
		},
	};

	async handle(...[context]: HandleArgs) {
		const data = await this.getValidatedData<typeof this.schema>();
		const query = data.query;

		let sql = `
			SELECT 
				p.id, p.port_code, p.port_name, p.country, p.region, p.port_type,
				p.capacity_status, p.congestion_level, p.operational_status,
				COUNT(DISTINCT CASE WHEN s.status = 'IN_TRANSIT' THEN s.id END) as active_arrivals,
				COUNT(DISTINCT CASE WHEN s.status = 'AT_CUSTOMS' THEN s.id END) as customs_queue
			FROM ports p
			LEFT JOIN shipments s ON (p.id = s.destination_port_id AND s.status IN ('IN_TRANSIT', 'AT_CUSTOMS'))
			WHERE 1=1
		`;

		const params: any[] = [];

		if (query.region !== 'ALL') {
			sql += ` AND p.region = ?`;
			params.push(query.region);
		}

		sql += ` GROUP BY p.id ORDER BY p.congestion_level DESC`;

		const stmt = context.env.DB.prepare(sql);
		const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

		const critical_ports = result.results?.filter((p: any) => p.congestion_level >= 80).length || 0;
		const congested_ports = result.results?.filter((p: any) => p.congestion_level >= 60).length || 0;

		return {
			success: true,
			total_ports: result.results?.length || 0,
			critical_congestion: critical_ports,
			high_congestion: congested_ports,
			ports: result.results,
		};
	}
}
