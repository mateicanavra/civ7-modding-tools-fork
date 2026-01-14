import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";
import hydrology from "@mapgen/domain/hydrology";

import { hydrologyPreArtifacts } from "../artifacts.js";

const ClimateBaselineStepContract = defineStep({
  id: "climate-baseline",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [hydrologyPreArtifacts.heightfield],
    provides: [hydrologyPreArtifacts.climateField, hydrologyPreArtifacts.windField],
  },
  ops: {
    computeWindFields: hydrology.ops.computeWindFields,
  },
  schema: Type.Object({
    climate: Type.Object({
      baseline: ClimateConfigSchema.properties.baseline,
    }),
  }),
});

export default ClimateBaselineStepContract;
