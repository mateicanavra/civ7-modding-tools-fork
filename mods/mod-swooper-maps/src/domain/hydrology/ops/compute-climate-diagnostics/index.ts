import { createOp } from "@swooper/mapgen-core/authoring";
import ComputeClimateDiagnosticsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeClimateDiagnostics = createOp(ComputeClimateDiagnosticsContract, {
  strategies: { default: defaultStrategy },
});

export type * from "./types.js";
export type * from "./contract.js";

export default computeClimateDiagnostics;
