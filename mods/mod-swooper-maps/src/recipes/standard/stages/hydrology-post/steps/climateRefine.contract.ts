import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema, NarrativeConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const ClimateRefineStepConfigSchema = Type.Object(
  {
    climate: ClimateConfigSchema,
    story: Type.Object(
      {
        orogeny: NarrativeConfigSchema.properties.story.properties.orogeny,
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

const ClimateRefineStepContract = defineStepContract({
  id: "climate-refine",
  phase: "hydrology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
    M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
  schema: ClimateRefineStepConfigSchema,
});

export default ClimateRefineStepContract;
