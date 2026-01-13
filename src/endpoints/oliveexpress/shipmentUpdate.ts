import { D1UpdateEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { ShipmentModel } from "./models";

export class ShipmentUpdate extends D1UpdateEndpoint<HandleArgs> {
	_meta = {
		model: ShipmentModel,
		fields: ShipmentModel.schema.pick({
			status: true,
			carrier_id: true,
			corridor_id: true,
			pickup_date: true,
			estimated_delivery: true,
			actual_delivery: true,
			quranchain_contract_id: true,
			escrow_status: true,
		}),
	};
}
