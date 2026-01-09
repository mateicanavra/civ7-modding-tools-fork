import { createStage } from "@swooper/mapgen-core/authoring";
import { steps } from "./steps/index.js";

export default createStage({
  id: "ecology",
  steps: [
    steps.pedology,
    steps.resourceBasins,
    steps.biomes,
    steps.biomeEdgeRefine,
    steps.featuresPlan,
    steps.featuresApply,
    steps.plotEffects,
  ],
});
