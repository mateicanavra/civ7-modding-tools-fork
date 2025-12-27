import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import { FoundationConfigSchema } from "@mapgen/config/index.js";

export interface FoundationStepRuntime {
  runFoundation: (context: ExtendedMapContext, config: Static<typeof FoundationConfigSchema>) => void;
}

export interface FoundationStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const FoundationStepConfigSchema = Type.Object(
  {
    foundation: FoundationConfigSchema,
  },
  { additionalProperties: false, default: { foundation: {} } }
);

type FoundationStepConfig = Static<typeof FoundationStepConfigSchema>;

export function createFoundationStep(
  runtime: FoundationStepRuntime,
  options: FoundationStepOptions
): MapGenStep<ExtendedMapContext, FoundationStepConfig> {
  return {
    id: "foundation",
    phase: M3_STANDARD_STAGE_PHASE.foundation,
    requires: options.requires,
    provides: options.provides,
    configSchema: FoundationStepConfigSchema,
    run: (context, config) => {
      runtime.runFoundation(context, config.foundation);
    },
  };
}
