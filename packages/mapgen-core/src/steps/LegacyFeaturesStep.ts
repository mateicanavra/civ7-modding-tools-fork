import type { ExtendedMapContext } from "../core/types.js";
import { addDiverseFeatures } from "../layers/features.js";
import type { MapGenStep } from "../pipeline/types.js";

export interface LegacyFeaturesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
  afterRun?: (context: ExtendedMapContext) => void;
}

export function createLegacyFeaturesStep(
  options: LegacyFeaturesStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "features",
    phase: "ecology",
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      const { width, height } = context.dimensions;
      addDiverseFeatures(width, height, context);
      options.afterRun?.(context);
    },
  };
}

