import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { LandmassConfigSchema, MorphologyConfigSchema } from "@mapgen/domain/config";

import { M4_EFFECT_TAGS } from "../../../tags.js";
import { foundationArtifacts } from "../../foundation/artifacts.js";

const LandmassPlatesStepContract = defineStep({
  id: "landmass-plates",
  phase: "morphology",
  requires: [],
  provides: [M4_EFFECT_TAGS.engine.landmassApplied],
  artifacts: {
    requires: [foundationArtifacts.plates],
  },
  schema: Type.Object({
    landmass: LandmassConfigSchema,
    oceanSeparation: MorphologyConfigSchema.properties.oceanSeparation,
  }),
});

export default LandmassPlatesStepContract;
