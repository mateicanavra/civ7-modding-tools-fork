import { createOp } from "@swooper/mapgen-core/authoring";
import ApplyAlbedoFeedbackContract from "./contract.js";
import { defaultStrategy } from "./strategies/index.js";

const applyAlbedoFeedback = createOp(ApplyAlbedoFeedbackContract, {
  strategies: { default: defaultStrategy },
});

export type * from "./types.js";
export type * from "./contract.js";

export default applyAlbedoFeedback;
