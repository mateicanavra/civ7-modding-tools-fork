import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { addRuggedCoasts } from "@mapgen/domain/morphology/coastlines/index.js";

export interface RuggedCoastsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

export function createRuggedCoastsStep(
  options: RuggedCoastsStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "ruggedCoasts",
    phase: M3_STANDARD_STAGE_PHASE.ruggedCoasts,
    requires: options.requires,
    provides: options.provides,
    run: (context) => {
      const { width, height } = context.dimensions;
      addRuggedCoasts(width, height, context);
    },
  };
}
