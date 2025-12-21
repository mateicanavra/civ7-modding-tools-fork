import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";

export interface FoundationStepRuntime {
  runFoundation: (context: ExtendedMapContext) => void;
}

export interface FoundationStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

export function createFoundationStep(
  runtime: FoundationStepRuntime,
  options: FoundationStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "foundation",
    phase: M3_STANDARD_STAGE_PHASE.foundation,
    requires: options.requires,
    provides: options.provides,
    run: (context) => {
      runtime.runFoundation(context);
    },
  };
}
