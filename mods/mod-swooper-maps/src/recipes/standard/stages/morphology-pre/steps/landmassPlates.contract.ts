import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { LandmassConfigSchema, MorphologyConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const LandmassPlatesStepContract = defineStep({
  id: "landmass-plates",
  phase: "morphology",
  requires: [M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1],
  provides: [M4_EFFECT_TAGS.engine.landmassApplied],
  schema: Type.Object({
    landmass: LandmassConfigSchema,
    oceanSeparation: MorphologyConfigSchema.properties.oceanSeparation,
  }),
});

export default LandmassPlatesStepContract;
