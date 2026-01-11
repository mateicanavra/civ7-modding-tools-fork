import { defineDomain } from "@swooper/mapgen-core/authoring";

import ops from "./ops/contracts.js";

const domain = defineDomain({ id: "morphology", ops } as const);

export default domain;

export * from "@mapgen/domain/morphology/landmass/index.js";
export * from "@mapgen/domain/morphology/coastlines/index.js";
export * from "@mapgen/domain/morphology/islands/index.js";
export * from "@mapgen/domain/morphology/mountains/index.js";
export * from "@mapgen/domain/morphology/volcanoes/index.js";
