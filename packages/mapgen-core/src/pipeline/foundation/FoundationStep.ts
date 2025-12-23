import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { FoundationConfigSchema } from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";

export interface FoundationStepRuntime {
  runFoundation: (context: ExtendedMapContext) => void;
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

export function createFoundationStep(
  runtime: FoundationStepRuntime,
  options: FoundationStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "foundation",
    phase: M3_STANDARD_STAGE_PHASE.foundation,
    requires: options.requires,
    provides: options.provides,
    configSchema: FoundationStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        runtime.runFoundation(context);
      });
    },
  };
}
