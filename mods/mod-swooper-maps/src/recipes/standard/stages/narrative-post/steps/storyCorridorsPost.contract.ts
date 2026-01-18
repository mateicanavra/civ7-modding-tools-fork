import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema } from "@mapgen/domain/config";

import { hydrologyHydrographyArtifacts } from "../../hydrology-hydrography/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";

const StoryCorridorsPostStepContract = defineStep({
  id: "story-corridors-post",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      morphologyArtifacts.topography,
      narrativePreArtifacts.overlays,
      hydrologyHydrographyArtifacts.hydrography,
    ],
  },
  schema: Type.Object({
    corridors: NarrativeConfigSchema.properties.corridors,
  }),
});

export default StoryCorridorsPostStepContract;
