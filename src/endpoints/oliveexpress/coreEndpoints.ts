import { D1CreateEndpoint, D1ListEndpoint, D1ReadEndpoint, D1UpdateEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { CarrierModel, PortModel, CorridorModel } from "./models";

// Carrier endpoints
export class CarrierCreate extends D1CreateEndpoint<HandleArgs> {
	_meta = {
		model: CarrierModel,
		fields: CarrierModel.schema.pick({
			carrier_code: true,
			legal_name: true,
			operating_name: true,
			carrier_type: true,
			registration_country: true,
			darcloud_identity_id: true,
			wallet_address: true,
		}),
	};
}

export class CarrierList extends D1ListEndpoint<HandleArgs> {
	_meta = {
		model: CarrierModel,
	};
}

export class CarrierRead extends D1ReadEndpoint<HandleArgs> {
	_meta = {
		model: CarrierModel,
	};
}

export class CarrierUpdate extends D1UpdateEndpoint<HandleArgs> {
	_meta = {
		model: CarrierModel,
		fields: CarrierModel.schema.pick({
			operating_name: true,
			trust_score: true,
			status: true,
		}),
	};
}

// Port endpoints
export class PortCreate extends D1CreateEndpoint<HandleArgs> {
	_meta = {
		model: PortModel,
		fields: PortModel.schema.pick({
			port_code: true,
			port_name: true,
			country: true,
			region: true,
			port_type: true,
			latitude: true,
			longitude: true,
		}),
	};
}

export class PortList extends D1ListEndpoint<HandleArgs> {
	_meta = {
		model: PortModel,
	};
}

export class PortRead extends D1ReadEndpoint<HandleArgs> {
	_meta = {
		model: PortModel,
	};
}

export class PortUpdate extends D1UpdateEndpoint<HandleArgs> {
	_meta = {
		model: PortModel,
		fields: PortModel.schema.pick({
			capacity_status: true,
			congestion_level: true,
			operational_status: true,
		}),
	};
}

// Corridor endpoints
export class CorridorCreate extends D1CreateEndpoint<HandleArgs> {
	_meta = {
		model: CorridorModel,
		fields: CorridorModel.schema.pick({
			corridor_code: true,
			corridor_name: true,
			origin_port_id: true,
			destination_port_id: true,
			corridor_type: true,
			distance_km: true,
			estimated_duration_hours: true,
		}),
	};
}

export class CorridorList extends D1ListEndpoint<HandleArgs> {
	_meta = {
		model: CorridorModel,
	};
}

export class CorridorRead extends D1ReadEndpoint<HandleArgs> {
	_meta = {
		model: CorridorModel,
	};
}

export class CorridorUpdate extends D1UpdateEndpoint<HandleArgs> {
	_meta = {
		model: CorridorModel,
		fields: CorridorModel.schema.pick({
			corridor_name: true,
			active: true,
			estimated_duration_hours: true,
		}),
	};
}
