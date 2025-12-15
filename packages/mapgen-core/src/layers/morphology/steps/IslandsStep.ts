import type { ExtendedMapContext } from "../../../core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../../pipeline/index.js";
import { addIslandChains } from "../islands.js";

export interface IslandsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createIslandsStep(options: IslandsStepOptions): MapGenStep<ExtendedMapContext> {
  return {
    id: "islands",
    phase: M3_STANDARD_STAGE_PHASE.islands,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      const { width, height } = context.dimensions;
      addIslandChains(width, height, context);
    },
  };
}
