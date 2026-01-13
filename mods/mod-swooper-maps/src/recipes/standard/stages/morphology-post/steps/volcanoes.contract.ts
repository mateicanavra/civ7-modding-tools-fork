import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema } from "@mapgen/domain/config";

import { foundationArtifacts } from "../../foundation/artifacts.js";

const VolcanoesStepContract = defineStep({
  id: "volcanoes",
  phase: "morphology",
  requires: [],
  artifacts: {
    requires: [foundationArtifacts.plates],
  },
  provides: [],
  schema: Type.Object({
    volcanoes: MorphologyConfigSchema.properties.volcanoes,
  }),
});

export default VolcanoesStepContract;
