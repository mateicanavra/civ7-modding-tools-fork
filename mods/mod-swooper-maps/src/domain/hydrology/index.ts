import { defineDomain } from "@swooper/mapgen-core/authoring";

import ops from "./ops/contracts.js";
export { HydrologyWindFieldSchema } from "./ops/shared/wind-field.js";

const domain = defineDomain({ id: "hydrology", ops } as const);

export default domain;
