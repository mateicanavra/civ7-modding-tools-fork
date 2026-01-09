import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { storyHotspots, storyRifts, storySeed } from "./steps/index.js";

export default createStage({
  id: "narrative-pre",
  knobsSchema: Type.Object({}, { additionalProperties: false, default: {} }),
  steps: [storySeed, storyHotspots, storyRifts],
} as const);
