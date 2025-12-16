import type { ExtendedMapContext } from "../../core/types.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../index.js";

export interface FoundationStepRuntime {
  runFoundation: (context: ExtendedMapContext) => void;
}

export interface FoundationStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
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
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      runtime.runFoundation(context);
    },
  };
}
