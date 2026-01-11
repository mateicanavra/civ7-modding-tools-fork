import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { storyCorridorsPre, storyHotspots, storyRifts, storySeed } from "./steps/index.js";

export default createStage({
  id: "narrative-pre",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  steps: [storySeed, storyHotspots, storyRifts, storyCorridorsPre],
} as const);
