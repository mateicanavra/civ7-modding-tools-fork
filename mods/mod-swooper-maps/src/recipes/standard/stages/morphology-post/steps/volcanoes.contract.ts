import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const VolcanoesStepConfigSchema = Type.Object(
  {
    volcanoes: MorphologyConfigSchema.properties.volcanoes,
  },
  { additionalProperties: false, default: { volcanoes: {} } }
);

export const VolcanoesStepContract = defineStepContract({
  id: "volcanoes",
  phase: "morphology",
  requires: [M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1],
  provides: [],
  schema: VolcanoesStepConfigSchema,
});
