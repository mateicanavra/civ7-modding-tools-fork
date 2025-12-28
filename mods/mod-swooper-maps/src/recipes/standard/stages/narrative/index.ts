import { createStage } from "@swooper/mapgen-core/authoring";
import {
  storyCorridorsPost,
  storyCorridorsPre,
  storyHotspots,
  storyOrogeny,
  storyRifts,
  storySeed,
  storySwatches,
} from "./steps/index.js";

export default createStage({
  id: "narrative",
  steps: [
    storySeed,
    storyHotspots,
    storyRifts,
    storyOrogeny,
    storyCorridorsPre,
    storySwatches,
    storyCorridorsPost,
  ],
} as const);
