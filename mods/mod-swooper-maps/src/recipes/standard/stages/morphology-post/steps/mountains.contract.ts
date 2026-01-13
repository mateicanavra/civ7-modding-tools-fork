import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { MorphologyConfigSchema } from "@mapgen/domain/config";

import { foundationArtifacts } from "../../foundation/artifacts.js";

const MountainsStepContract = defineStep({
  id: "mountains",
  phase: "morphology",
  requires: [],
  artifacts: {
    requires: [foundationArtifacts.plates],
  },
  provides: [],
  schema: Type.Object({
    mountains: MorphologyConfigSchema.properties.mountains,
  }),
});

export default MountainsStepContract;
