import { createStage } from "@swooper/mapgen-core/authoring";
import { steps } from "./steps/index.js";

export default createStage({
  id: "ecology",
  steps: [steps.biomes, steps.features, steps.plotEffects],
} as const);
