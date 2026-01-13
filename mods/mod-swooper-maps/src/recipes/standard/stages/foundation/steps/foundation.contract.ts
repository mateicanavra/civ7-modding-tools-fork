import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { FoundationConfigSchema } from "@mapgen/domain/config";

import { foundationArtifacts } from "../artifacts.js";

const FoundationStepContract = defineStep({
  id: "foundation",
  phase: "foundation",
  requires: [],
  provides: [],
  artifacts: {
    provides: [
      foundationArtifacts.plates,
      foundationArtifacts.dynamics,
      foundationArtifacts.seed,
      foundationArtifacts.diagnostics,
      foundationArtifacts.config,
    ],
  },
  schema: Type.Object({
    foundation: FoundationConfigSchema,
  }),
});

export default FoundationStepContract;
