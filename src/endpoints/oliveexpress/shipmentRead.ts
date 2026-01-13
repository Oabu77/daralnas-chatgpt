import { D1ReadEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { ShipmentModel } from "./models";

export class ShipmentRead extends D1ReadEndpoint<HandleArgs> {
	_meta = {
		model: ShipmentModel,
	};
}
