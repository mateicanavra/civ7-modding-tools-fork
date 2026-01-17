import { createOp } from "@swooper/mapgen-core/authoring";
import ComputeEvaporationSourcesContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeEvaporationSources = createOp(ComputeEvaporationSourcesContract, {
  strategies: { default: defaultStrategy },
});

export type * from "./types.js";
export type * from "./contract.js";

export default computeEvaporationSources;
