import { defineDomain } from "@swooper/mapgen-core/authoring";

import ops from "./ops/contracts.js";

const domain = defineDomain({ id: "hydrology", ops } as const);

export default domain;

export * from "@mapgen/domain/hydrology/climate/index.js";
