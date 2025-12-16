import type { ExtendedMapContext } from "../../core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../index.js";
import { addRuggedCoasts } from "../../domain/morphology/coastlines/index.js";

export interface RuggedCoastsStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createRuggedCoastsStep(
  options: RuggedCoastsStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "ruggedCoasts",
    phase: M3_STANDARD_STAGE_PHASE.ruggedCoasts,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      const { width, height } = context.dimensions;
      addRuggedCoasts(width, height, context);
    },
  };
}
