import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const StorySwatchesStepContract = defineStep({
  id: "story-swatches",
  phase: "hydrology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
  schema: Type.Object({
    climate: ClimateConfigSchema,
  }),
});

export default StorySwatchesStepContract;
