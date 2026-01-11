import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const MountainsStepContract = defineStep({
  id: "mountains",
  phase: "morphology",
  requires: [M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1],
  provides: [],
  schema: Type.Object({
    mountains: MorphologyConfigSchema.properties.mountains,
  }),
});

export default MountainsStepContract;
