import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { hydrologyCoreArtifacts } from "../../hydrology-core/artifacts.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const StoryCorridorsPostStepContract = defineStep({
  id: "story-corridors-post",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      morphologyArtifacts.topography,
      narrativePreArtifacts.overlays,
      hydrologyCoreArtifacts.riverAdjacency,
    ],
  },
  schema: Type.Object({
    corridors: NarrativeConfigSchema.properties.corridors,
  }),
});

export default StoryCorridorsPostStepContract;
