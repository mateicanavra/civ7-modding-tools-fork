import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";

import { foundationArtifacts } from "../../foundation/artifacts.js";
import { hydrologyPreArtifacts } from "../../hydrology-pre/artifacts.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";

const StorySwatchesStepContract = defineStep({
  id: "story-swatches",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      hydrologyPreArtifacts.heightfield,
      hydrologyPreArtifacts.climateField,
      foundationArtifacts.dynamics,
      narrativePreArtifacts.overlays,
    ],
  },
  schema: Type.Object({
    climate: ClimateConfigSchema,
  }),
});

export default StorySwatchesStepContract;
