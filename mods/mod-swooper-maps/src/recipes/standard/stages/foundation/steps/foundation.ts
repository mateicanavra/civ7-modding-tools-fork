import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { FoundationConfigSchema } from "@swooper/mapgen-core/config";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { runFoundationStage } from "../producer.js";

const FoundationStepConfigSchema = Type.Object(
  {
    foundation: FoundationConfigSchema,
  },
  { additionalProperties: false, default: { foundation: {} } }
);

type FoundationStepConfig = Static<typeof FoundationStepConfigSchema>;

export default createStep({
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
  schema: FoundationStepConfigSchema,
  run: (context: ExtendedMapContext, config: FoundationStepConfig) => {
    runFoundationStage(context, config.foundation);
  },
} as const);
