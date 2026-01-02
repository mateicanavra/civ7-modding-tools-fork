import { createStage } from "@swooper/mapgen-core/authoring";
import { biomes, features, plotEffects } from "./steps/index.js";

export default createStage({
  id: "ecology",
  steps: [biomes, features, plotEffects],
} as const);
