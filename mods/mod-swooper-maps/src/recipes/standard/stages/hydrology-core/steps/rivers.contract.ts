import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import hydrology from "@mapgen/domain/hydrology";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { hydrologyCoreArtifacts } from "../artifacts.js";
import { hydrologyPreArtifacts } from "../../hydrology-pre/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

/**
 * River projection + hydrography publication step.
 *
 * This step is where Hydrology’s discharge-derived hydrography becomes the canonical pipeline read-path.
 * Engine “modeled rivers” are still produced for interop, but they are projection-only and must not be treated as truth.
 */
const RiversStepConfigSchema = Type.Object(
  {
    /**
     * Engine river modeling minimum length threshold (lower = denser).
     *
     * Practical guidance:
     * - If you want denser engine-projected rivers: decrease this threshold.
     * - If you want sparser engine-projected rivers: increase this threshold.
     *
     * Note: Hydrology truth remains discharge-derived hydrography; this is a projection knob only.
     */
    minLength: Type.Integer({
      description:
        "Engine river modeling minimum length threshold (lower = denser). Engine rivers are projection-only; Hydrology truth is discharge-derived.",
      default: 5,
      minimum: 1,
      maximum: 40,
    }),
    /**
     * Engine river modeling maximum length threshold.
     *
     * Practical guidance:
     * - Increase to allow longer continuous river chains.
     * - Decrease to break up long rivers (more segments/shorter chains).
     */
    maxLength: Type.Integer({
      description: "Engine river modeling maximum length threshold. Engine rivers are projection-only.",
      default: 15,
      minimum: 1,
      maximum: 80,
    }),
  },
  {
    additionalProperties: false,
    description:
      "Rivers step config. Controls engine projection thresholds; Hydrology truth is published via hydrography artifact.",
  }
);

const RiversStepContract = defineStep({
  id: "rivers",
  phase: "hydrology",
  requires: [],
  provides: [
    M4_EFFECT_TAGS.engine.riversModeled,
  ],
  artifacts: {
    requires: [
      hydrologyPreArtifacts.heightfield,
      hydrologyPreArtifacts.climateField,
      morphologyArtifacts.routing,
    ],
    provides: [hydrologyCoreArtifacts.riverAdjacency, hydrologyCoreArtifacts.hydrography],
  },
  ops: {
    accumulateDischarge: hydrology.ops.accumulateDischarge,
    projectRiverNetwork: hydrology.ops.projectRiverNetwork,
  },
  schema: RiversStepConfigSchema,
});

export default RiversStepContract;
