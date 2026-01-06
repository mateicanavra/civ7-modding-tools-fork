import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema, NarrativeConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const IslandsStepConfigSchema = Type.Object(
  {
    islands: MorphologyConfigSchema.properties.islands,
    story: Type.Object(
      {
        hotspot: NarrativeConfigSchema.properties.story.properties.hotspot,
      },
      { additionalProperties: false, default: {} }
    ),
    corridors: Type.Object(
      {
        sea: NarrativeConfigSchema.properties.corridors.properties.sea,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { islands: {}, story: {}, corridors: {} } }
);

export const IslandsStepContract = defineStepContract({
  id: "islands",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
  ],
  provides: [
    M4_EFFECT_TAGS.engine.landmassApplied,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
  ],
  schema: IslandsStepConfigSchema,
});
