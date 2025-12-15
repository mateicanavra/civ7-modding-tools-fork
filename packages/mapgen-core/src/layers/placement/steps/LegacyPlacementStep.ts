import type { ExtendedMapContext } from "../../../core/types.js";
import { runPlacement, type PlacementOptions } from "../placement.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../../pipeline/index.js";

export interface LegacyPlacementStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  placementOptions: Omit<PlacementOptions, "placementConfig">;
  shouldRun?: () => boolean;
  beforeRun?: (context: ExtendedMapContext) => void;
  afterRun?: (context: ExtendedMapContext, startPositions: number[]) => void;
}

export function createLegacyPlacementStep(
  options: LegacyPlacementStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "placement",
    phase: M3_STANDARD_STAGE_PHASE.placement,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      options.beforeRun?.(context);
      const placementConfig = context.config.placement ?? {};
      const { width, height } = context.dimensions;

      const startPositions = runPlacement(context.adapter, width, height, {
        ...options.placementOptions,
        placementConfig,
      });

      options.afterRun?.(context, startPositions);
    },
  };
}
