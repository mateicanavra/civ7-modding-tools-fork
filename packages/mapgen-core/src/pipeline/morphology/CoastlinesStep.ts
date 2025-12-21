import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";

export interface CoastlinesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

export function createCoastlinesStep(options: CoastlinesStepOptions): MapGenStep<ExtendedMapContext> {
  return {
    id: "coastlines",
    phase: M3_STANDARD_STAGE_PHASE.coastlines,
    requires: options.requires,
    provides: options.provides,
    run: (context) => {
      const { width, height } = context.dimensions;
      context.adapter.expandCoasts(width, height);
    },
  };
}
