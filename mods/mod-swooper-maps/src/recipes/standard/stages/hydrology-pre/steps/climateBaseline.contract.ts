import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const ClimateBaselineStepContract = defineStepContract({
  id: "climate-baseline",
  phase: "hydrology",
  requires: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  provides: [M3_DEPENDENCY_TAGS.artifact.heightfield, M3_DEPENDENCY_TAGS.artifact.climateField],
  schema: Type.Object({
    climate: Type.Object({
      baseline: ClimateConfigSchema.properties.baseline,
    }),
  }),
});

export default ClimateBaselineStepContract;
