import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { DEV, logRainfallStats } from "@mapgen/dev/index.js";
import { publishClimateFieldArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/index.js";

export interface ClimateRefineStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

export function createClimateRefineStep(
  options: ClimateRefineStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "climateRefine",
    phase: M3_STANDARD_STAGE_PHASE.climateRefine,
    requires: options.requires,
    provides: options.provides,
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
