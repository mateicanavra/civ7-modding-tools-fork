import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema, NarrativeConfigSchema } from "@mapgen/domain/config";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { foundationArtifacts } from "../../foundation/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";

const RuggedCoastsStepContract = defineStep({
  id: "rugged-coasts",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
  ],
  provides: [M4_EFFECT_TAGS.engine.coastlinesApplied],
  artifacts: {
    requires: [
      foundationArtifacts.plates,
      narrativePreArtifacts.overlays,
    ],
    provides: [morphologyArtifacts.coastlineMetrics],
  },
  schema: Type.Object({
    coastlines: MorphologyConfigSchema.properties.coastlines,
    corridors: NarrativeConfigSchema.properties.corridors,
  }),
});

export default RuggedCoastsStepContract;
