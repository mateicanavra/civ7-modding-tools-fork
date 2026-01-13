import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema, NarrativeConfigSchema } from "@mapgen/domain/config";

import { foundationArtifacts } from "../../foundation/artifacts.js";
import { hydrologyCoreArtifacts } from "../../hydrology-core/artifacts.js";
import { hydrologyPreArtifacts } from "../../hydrology-pre/artifacts.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";

const ClimateRefineStepContract = defineStep({
  id: "climate-refine",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      hydrologyPreArtifacts.heightfield,
      hydrologyPreArtifacts.climateField,
      narrativePreArtifacts.motifsHotspots,
      narrativePreArtifacts.motifsRifts,
      hydrologyCoreArtifacts.riverAdjacency,
      foundationArtifacts.dynamics,
    ],
  },
  schema: Type.Object({
    climate: ClimateConfigSchema,
    story: Type.Object({
      orogeny: NarrativeConfigSchema.properties.story.properties.orogeny,
    }),
  }),
});

export default ClimateRefineStepContract;
