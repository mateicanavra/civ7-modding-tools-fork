import { createStage } from "@swooper/mapgen-core/authoring";
import { biomes, features } from "./steps/index.js";

export default createStage({
  id: "ecology",
  steps: [biomes, features],
} as const);
