import { createStage } from "@swooper/mapgen-core/authoring";
import { storyHotspots, storyRifts, storySeed } from "./steps/index.js";

export default createStage({
  id: "narrative-pre",
  steps: [storySeed, storyHotspots, storyRifts],
} as const);
