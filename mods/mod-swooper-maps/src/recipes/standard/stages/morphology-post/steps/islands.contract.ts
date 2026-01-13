import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema, NarrativeConfigSchema } from "@mapgen/domain/config";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";

const IslandsStepContract = defineStep({
  id: "islands",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
  ],
  provides: [M4_EFFECT_TAGS.engine.landmassApplied],
  artifacts: {
    requires: [
      narrativePreArtifacts.motifsMargins,
      narrativePreArtifacts.motifsHotspots,
      narrativePreArtifacts.corridors,
    ],
  },
  schema: Type.Object({
    islands: MorphologyConfigSchema.properties.islands,
    story: Type.Object({
      hotspot: NarrativeConfigSchema.properties.story.properties.hotspot,
    }),
    corridors: Type.Object({
      sea: NarrativeConfigSchema.properties.corridors.properties.sea,
    }),
  }),
});

export default IslandsStepContract;
