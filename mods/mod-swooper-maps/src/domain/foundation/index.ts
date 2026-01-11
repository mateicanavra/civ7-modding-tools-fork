import { defineDomain } from "@swooper/mapgen-core/authoring";

import ops from "./ops/contracts.js";

const domain = defineDomain({ id: "foundation", ops } as const);

export default domain;

export * from "./types.js";
export * from "./plate-seed.js";
export * from "./plates.js";
