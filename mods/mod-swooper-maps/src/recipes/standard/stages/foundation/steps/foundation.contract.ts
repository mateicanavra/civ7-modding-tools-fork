import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { FoundationConfigSchema } from "@mapgen/domain/config";

import { M3_DEPENDENCY_TAGS } from "../../../tags.js";

const FoundationStepContract = defineStep({
  id: "foundation",
  phase: "foundation",
  requires: [],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1,
    M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
    M3_DEPENDENCY_TAGS.artifact.foundationSeedV1,
    M3_DEPENDENCY_TAGS.artifact.foundationDiagnosticsV1,
    M3_DEPENDENCY_TAGS.artifact.foundationConfigV1,
  ],
  schema: Type.Object({
    foundation: FoundationConfigSchema,
  }),
});

export default FoundationStepContract;
