import { createOp } from "@swooper/mapgen-core/authoring";

import ComputeCoastlineMetricsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const computeCoastlineMetrics = createOp(ComputeCoastlineMetricsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default computeCoastlineMetrics;
