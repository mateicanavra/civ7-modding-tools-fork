import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const RiversStepConfigSchema = Type.Object(
  {
    climate: Type.Object(
      {
        story: Type.Object(
          {
            paleo: Type.Optional(ClimateConfigSchema.properties.story.properties.paleo),
          },
          { additionalProperties: false }
        ),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

const RiversStepContract = defineStepContract({
  id: "rivers",
  phase: "hydrology",
  requires: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  provides: [
    M4_EFFECT_TAGS.engine.riversModeled,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
  ],
  schema: RiversStepConfigSchema,
});

export default RiversStepContract;
