import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../hydrology-climate-baseline/artifacts.js";
import { hydrologyClimateRefineArtifacts } from "../../hydrology-climate-refine/artifacts.js";
import { hydrologyHydrographyArtifacts } from "../../hydrology-hydrography/artifacts.js";

/**
 * Lake projection step (engine-facing).
 *
 * Lakes are stamped deterministically from physics-derived lake persistence (no quota-style lake targeting).
 */
const LakesStepConfigSchema = Type.Object(
  {
    /**
     * Minimum filled depth (meters) for a depression tile to be considered lake-capable.
     */
    minFillDepthM: Type.Number({
      description: "Minimum filled depth (meters) for depression tiles to be considered lake-capable.",
      default: 1,
      minimum: 0,
      maximum: 200,
    }),
    /**
     * Lake evaporation scale applied to PET when computing surface losses.
     */
    evapScale: Type.Number({
      description: "Lake evaporation scale applied to PET when computing surface losses.",
      default: 1.0,
      minimum: 0,
      maximum: 5,
    }),
    /**
     * Seepage loss per lake tile (rainfall units; advisory physics proxy).
     */
    seepageLoss: Type.Number({
      description: "Seepage loss per lake tile (rainfall units; advisory physics proxy).",
      default: 1.0,
      minimum: 0,
      maximum: 50,
    }),
    /**
     * Seasonality strength (0..1) mapping annual amplitude into wet/dry multipliers.
     */
    seasonalityStrength01: Type.Number({
      description: "Seasonality strength (0..1) mapping annual amplitude into wet/dry multipliers.",
      default: 0.75,
      minimum: 0,
      maximum: 1,
    }),
    /**
     * Threshold for stamping permanent lakes from floodedFraction01 (0..1).
     */
    permanenceThreshold01: Type.Number({
      description: "Threshold for stamping permanent lakes from floodedFraction01 (0..1).",
      default: 0.75,
      minimum: 0,
      maximum: 1,
    }),
  },
  {
    additionalProperties: false,
    description:
      "Lakes step config. Controls lake persistence physics and stamping behavior (no lake-count targets).",
  }
);

const LakesStepContract = defineStep({
  id: "lakes",
  phase: "gameplay",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      morphologyArtifacts.topography,
      morphologyArtifacts.routing,
      hydrologyClimateBaselineArtifacts.climateSeasonality,
      hydrologyClimateRefineArtifacts.climateIndices,
      hydrologyHydrographyArtifacts.hydrography,
    ],
  },
  schema: LakesStepConfigSchema,
});

export default LakesStepContract;
