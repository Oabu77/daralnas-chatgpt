import { D1CreateEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { ShipmentModel } from "./models";
import { z } from "zod";

export class ShipmentCreate extends D1CreateEndpoint<HandleArgs> {
	_meta = {
		model: ShipmentModel,
		fields: ShipmentModel.schema.pick({
			shipment_number: true,
			shipper_name: true,
			shipper_darcloud_id: true,
			consignee_name: true,
			consignee_darcloud_id: true,
			carrier_id: true,
			origin_port_id: true,
			destination_port_id: true,
			corridor_id: true,
			transport_mode: true,
			cargo_type: true,
			cargo_weight_kg: true,
			cargo_volume_m3: true,
			cargo_value_usd: true,
			shipment_type: true,
			estimated_delivery: true,
		}),
	};

	async handle(...[context]: HandleArgs) {
		const result = await super.handle(...[context]);
		
		// Auto-create QuranChain contract for commercial shipments
		const shipmentData = await context.req.json();
		if (shipmentData.shipment_type === 'COMMERCIAL' && result) {
			const shipmentId = (result as any).result?.id;
			if (shipmentId) {
				// Log contract creation (actual contract creation would be done via QuranChain service)
				console.log(`QuranChain contract creation queued for shipment ${shipmentId}`);
			}
		}
		
		return result;
	}
}
