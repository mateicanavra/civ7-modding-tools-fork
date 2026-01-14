import { defineDomain } from "@swooper/mapgen-core/authoring";

import ops from "./ops/contracts.js";
export { HydrologyWindFieldSchema } from "./ops/compute-wind-fields/contract.js";

const domain = defineDomain({ id: "hydrology", ops } as const);

export default domain;
