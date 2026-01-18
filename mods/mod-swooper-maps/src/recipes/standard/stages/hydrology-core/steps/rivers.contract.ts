import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import hydrology from "@mapgen/domain/hydrology";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { hydrologyCoreArtifacts } from "../artifacts.js";
import { hydrologyPreArtifacts } from "../../hydrology-pre/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

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
  schema: Type.Object({
    minLength: Type.Integer({
      description:
        "Engine river modeling minimum length threshold (lower = denser). Engine rivers are projection-only; Hydrology truth is discharge-derived.",
      default: 5,
      minimum: 1,
      maximum: 40,
    }),
    maxLength: Type.Integer({
      description: "Engine river modeling maximum length threshold. Engine rivers are projection-only.",
      default: 15,
      minimum: 1,
      maximum: 80,
    }),
  }, { additionalProperties: false }),
});

export default RiversStepContract;
