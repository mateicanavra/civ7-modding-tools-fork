import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import hydrology from "@mapgen/domain/hydrology";

import { hydrologyPreArtifacts } from "../artifacts.js";

/**
 * Hydrology baseline climate step (mechanism-driven).
 *
 * This step is an orchestration boundary: it binds deterministic seeds, invokes Hydrology ops, and publishes the
 * canonical baseline climate + wind artifacts for downstream consumption.
 *
 * Configuration posture:
 * - No step-local config. All author-facing control flows through Hydrology knobs compiled at stage compile time.
 */
const ClimateBaselineStepConfigSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description:
      "Climate baseline step config (empty). Use Hydrology knobs (dryness/temperature/seasonality/oceanCoupling) to influence behavior.",
  }
);

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
    computeRadiativeForcing: hydrology.ops.computeRadiativeForcing,
    computeThermalState: hydrology.ops.computeThermalState,
    computeAtmosphericCirculation: hydrology.ops.computeAtmosphericCirculation,
    computeOceanSurfaceCurrents: hydrology.ops.computeOceanSurfaceCurrents,
    computeEvaporationSources: hydrology.ops.computeEvaporationSources,
    transportMoisture: hydrology.ops.transportMoisture,
    computePrecipitation: hydrology.ops.computePrecipitation,
  },
  schema: ClimateBaselineStepConfigSchema,
});

export default ClimateBaselineStepContract;
