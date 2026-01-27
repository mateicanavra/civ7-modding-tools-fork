import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import hydrology from "@mapgen/domain/hydrology";

import { hydrologyHydrographyArtifacts } from "../artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../hydrology-climate-baseline/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

/**
 * River projection + hydrography publication step.
 *
 * This step is where Hydrology’s discharge-derived hydrography becomes the canonical pipeline read-path.
 * Engine “modeled rivers” are projection-only and must not be treated as truth.
 */
const RiversStepConfigSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description:
      "Rivers step config. Controls hydrography projection thresholds; engine projection is handled in map-hydrology.",
  }
);

const RiversStepContract = defineStep({
  id: "rivers",
  phase: "hydrology",
  requires: [],
  provides: [],
  artifacts: {
    requires: [
      hydrologyClimateBaselineArtifacts.climateField,
      morphologyArtifacts.topography,
      morphologyArtifacts.routing,
    ],
    provides: [hydrologyHydrographyArtifacts.hydrography],
  },
  ops: {
    accumulateDischarge: hydrology.ops.accumulateDischarge,
    projectRiverNetwork: hydrology.ops.projectRiverNetwork,
  },
  schema: RiversStepConfigSchema,
});

export default RiversStepContract;
