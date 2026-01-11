import { defineDomain } from "@swooper/mapgen-core/authoring";

import ops from "./ops/contracts.js";

const domain = defineDomain({ id: "narrative", ops } as const);

export default domain;

export * from "@mapgen/domain/narrative/overlays/index.js";
export * from "@mapgen/domain/narrative/models.js";
export * from "@mapgen/domain/narrative/tagging/index.js";
export * from "@mapgen/domain/narrative/orogeny/index.js";
export * from "@mapgen/domain/narrative/corridors/index.js";
export * from "@mapgen/domain/narrative/swatches.js";
export * from "@mapgen/domain/narrative/paleo/index.js";
