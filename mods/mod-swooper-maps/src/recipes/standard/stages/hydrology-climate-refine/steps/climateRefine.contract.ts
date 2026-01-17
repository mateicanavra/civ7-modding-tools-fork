import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import hydrology from "@mapgen/domain/hydrology";

import { hydrologyHydrographyArtifacts } from "../../hydrology-hydrography/artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../hydrology-climate-baseline/artifacts.js";
import { hydrologyClimateRefineArtifacts } from "../artifacts.js";

/**
 * Hydrology refinement + diagnostics step (bounded, deterministic).
 *
 * This step refines rainfall/temperature locally (still mechanism-driven), computes land water budget indices,
 * runs bounded cryosphere feedback when enabled, and publishes diagnostic and derived index artifacts.
 *
 * Configuration posture:
 * - No step-local config. All author-facing control flows through Hydrology knobs compiled at stage compile time.
 */
const ClimateRefineStepConfigSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description:
      "Climate refine step config (empty). Use Hydrology knobs (dryness/temperature/cryosphere) to influence behavior deterministically.",
  }
);

const ClimateRefineStepContract = defineStep({
  id: "climate-refine",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      hydrologyClimateBaselineArtifacts.heightfield,
      hydrologyClimateBaselineArtifacts.climateField,
      hydrologyClimateBaselineArtifacts.windField,
      hydrologyHydrographyArtifacts.hydrography,
    ],
    provides: [
      hydrologyClimateRefineArtifacts.climateIndices,
      hydrologyClimateRefineArtifacts.cryosphere,
      hydrologyClimateRefineArtifacts.climateDiagnostics,
    ],
  },
  ops: {
    computePrecipitation: hydrology.ops.computePrecipitation,
    computeRadiativeForcing: hydrology.ops.computeRadiativeForcing,
    computeThermalState: hydrology.ops.computeThermalState,
    applyAlbedoFeedback: hydrology.ops.applyAlbedoFeedback,
    computeCryosphereState: hydrology.ops.computeCryosphereState,
    computeLandWaterBudget: hydrology.ops.computeLandWaterBudget,
    computeClimateDiagnostics: hydrology.ops.computeClimateDiagnostics,
  },
  schema: ClimateRefineStepConfigSchema,
});

export default ClimateRefineStepContract;
