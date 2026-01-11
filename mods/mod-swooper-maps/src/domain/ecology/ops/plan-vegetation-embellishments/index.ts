import { createOp } from "@swooper/mapgen-core/authoring";
import PlanVegetationEmbellishmentsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planVegetationEmbellishments = createOp(PlanVegetationEmbellishmentsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planVegetationEmbellishments;
