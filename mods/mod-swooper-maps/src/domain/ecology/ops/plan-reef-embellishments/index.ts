import { createOp } from "@swooper/mapgen-core/authoring";
import PlanReefEmbellishmentsContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const planReefEmbellishments = createOp(PlanReefEmbellishmentsContract, {
  strategies: {
    default: defaultStrategy,
  },
});

export type * from "./contract.js";
export type * from "./types.js";

export default planReefEmbellishments;
