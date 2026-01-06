import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const StorySwatchesStepConfigSchema = Type.Object(
  {
    climate: ClimateConfigSchema,
  },
  { additionalProperties: false, default: { climate: {} } }
);

export const StorySwatchesStepContract = defineStepContract({
  id: "storySwatches",
  phase: "hydrology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
  schema: StorySwatchesStepConfigSchema,
});
