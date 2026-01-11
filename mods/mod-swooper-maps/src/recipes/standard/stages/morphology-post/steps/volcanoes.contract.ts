import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const VolcanoesStepContract = defineStepContract({
  id: "volcanoes",
  phase: "morphology",
  requires: [M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1],
  provides: [],
  schema: Type.Object({
    volcanoes: MorphologyConfigSchema.properties.volcanoes,
  }),
});

export default VolcanoesStepContract;
