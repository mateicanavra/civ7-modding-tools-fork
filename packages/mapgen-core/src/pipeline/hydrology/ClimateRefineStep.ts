import type { ExtendedMapContext } from "../../core/types.js";
import { assertFoundationContext } from "../../core/assertions.js";
import { DEV, logRainfallStats } from "../../dev/index.js";
import { publishClimateFieldArtifact } from "../artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../index.js";
import { refineClimateEarthlike } from "../../domain/hydrology/climate/index.js";

export interface ClimateRefineStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createClimateRefineStep(
  options: ClimateRefineStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "climateRefine",
    phase: M3_STANDARD_STAGE_PHASE.climateRefine,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      assertFoundationContext(context, "climateRefine");
      const { width, height } = context.dimensions;
      refineClimateEarthlike(width, height, context);
      publishClimateFieldArtifact(context);

      if (DEV.ENABLED && context?.adapter) {
        logRainfallStats(context.adapter, width, height, "post-climate");
      }
    },
  };
}
