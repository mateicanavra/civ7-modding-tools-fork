import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const MountainsStepConfigSchema = Type.Object(
  {
    mountains: MorphologyConfigSchema.properties.mountains,
  },
  { additionalProperties: false }
);

export const MountainsStepContract = defineStepContract({
  id: "mountains",
  phase: "morphology",
  requires: [M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1],
  provides: [],
  schema: MountainsStepConfigSchema,
});
