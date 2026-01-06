import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const ClimateBaselineStepConfigSchema = Type.Object(
  {
    climate: Type.Object(
      {
        baseline: ClimateConfigSchema.properties.baseline,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { climate: {} } }
);

export const ClimateBaselineStepContract = defineStepContract({
  id: "climateBaseline",
  phase: "hydrology",
  requires: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.climateField,
  ],
  schema: ClimateBaselineStepConfigSchema,
});
