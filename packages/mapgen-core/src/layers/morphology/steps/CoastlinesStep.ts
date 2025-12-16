import type { ExtendedMapContext } from "../../../core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../../pipeline/index.js";

export interface CoastlinesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createCoastlinesStep(options: CoastlinesStepOptions): MapGenStep<ExtendedMapContext> {
  return {
    id: "coastlines",
    phase: M3_STANDARD_STAGE_PHASE.coastlines,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      const { width, height } = context.dimensions;
      context.adapter.expandCoasts(width, height);
    },
  };
}
