import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import hydrology from "@mapgen/domain/hydrology";

import { hydrologyClimateBaselineArtifacts } from "../artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

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
  {
    /**
     * Advanced seasonality controls (optional).
     *
     * Hydrology still exposes the broad `seasonality` knob, but these let authors override the exact internal
     * computation posture while keeping the public outputs stable (mean + amplitude only).
     */
    seasonality: Type.Optional(
      Type.Object(
        {
          /** Seasonal mode count sampled internally when computing annual mean + amplitude. */
          modeCount: Type.Optional(
            Type.Union([Type.Literal(2), Type.Literal(4)], {
              default: 2,
              description: "Seasonal mode count sampled internally (2=solstices, 4=quarter-year).",
            })
          ),
          /** Effective axial tilt (declination amplitude) in degrees for seasonal forcing. */
          axialTiltDeg: Type.Optional(
            Type.Number({
              default: 18,
              minimum: 0,
              maximum: 45,
              description:
                "Axial tilt (degrees) used to simulate seasonal declination forcing. Set to 0 to disable seasonal amplitudes.",
            })
          ),
        },
        {
          additionalProperties: false,
          description:
            "Advanced seasonality controls (optional). Explicit values override Hydrology knobs; missing values are derived from knobs.",
        }
      )
    ),
  },
  {
    additionalProperties: false,
    description:
      "Climate baseline step config (advanced). Prefer Hydrology knobs for broad tuning; use this for explicit seasonality posture overrides.",
  }
);

const ClimateBaselineStepContract = defineStep({
  id: "climate-baseline",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [morphologyArtifacts.topography],
    provides: [
      hydrologyClimateBaselineArtifacts.climateField,
      hydrologyClimateBaselineArtifacts.climateSeasonality,
      hydrologyClimateBaselineArtifacts.windField,
    ],
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
