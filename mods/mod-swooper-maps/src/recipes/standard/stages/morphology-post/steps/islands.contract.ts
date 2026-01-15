import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import morphology from "@mapgen/domain/morphology";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { narrativePreArtifacts } from "../../narrative-pre/artifacts.js";

const IslandsStepContract = defineStep({
  id: "islands",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
  ],
  provides: [M4_EFFECT_TAGS.engine.landmassApplied],
  artifacts: {
    requires: [narrativePreArtifacts.overlays],
  },
  ops: {
    islands: morphology.ops.planIslandChains,
  },
  schema: Type.Object({}),
});

export default IslandsStepContract;
