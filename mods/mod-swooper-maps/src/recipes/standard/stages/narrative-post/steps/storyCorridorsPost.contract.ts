import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { hydrologyCoreArtifacts } from "../../hydrology-core/artifacts.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";

const StoryCorridorsPostStepContract = defineStep({
  id: "story-corridors-post",
  phase: "hydrology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
  ],
  provides: [],
  artifacts: {
    requires: [
      narrativePreArtifacts.overlays,
      hydrologyCoreArtifacts.riverAdjacency,
    ],
  },
  schema: Type.Object({
    corridors: NarrativeConfigSchema.properties.corridors,
  }),
});

export default StoryCorridorsPostStepContract;
