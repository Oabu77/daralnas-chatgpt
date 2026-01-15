import { D1ListEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { ShipmentModel } from "./models";

export class ShipmentList extends D1ListEndpoint<HandleArgs> {
	_meta = {
		model: ShipmentModel,
	};
}
