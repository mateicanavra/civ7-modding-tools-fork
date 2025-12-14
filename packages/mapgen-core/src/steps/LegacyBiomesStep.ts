import type { ExtendedMapContext } from "../core/types.js";
import { designateEnhancedBiomes } from "../layers/biomes.js";
import type { MapGenStep } from "../pipeline/types.js";

export interface LegacyBiomesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
  afterRun?: (context: ExtendedMapContext) => void;
}

export function createLegacyBiomesStep(
  options: LegacyBiomesStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "biomes",
    phase: "ecology",
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      const { width, height } = context.dimensions;
      designateEnhancedBiomes(width, height, context);
      options.afterRun?.(context);
    },
  };
}

