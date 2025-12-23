import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { DEV, logRainfallStats } from "@mapgen/dev/index.js";
import { publishClimateFieldArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { ClimateConfigSchema } from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/index.js";

export interface ClimateRefineStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const ClimateRefineStepConfigSchema = Type.Object(
  {
    climate: ClimateConfigSchema,
  },
  { additionalProperties: false, default: { climate: {} } }
);

export function createClimateRefineStep(
  options: ClimateRefineStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "climateRefine",
    phase: M3_STANDARD_STAGE_PHASE.climateRefine,
    requires: options.requires,
    provides: options.provides,
    configSchema: ClimateRefineStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        assertFoundationContext(context, "climateRefine");
        const { width, height } = context.dimensions;
        refineClimateEarthlike(width, height, context);
        publishClimateFieldArtifact(context);

        if (DEV.ENABLED && context?.adapter) {
          logRainfallStats(context.adapter, width, height, "post-climate");
        }
      });
    },
  };
}
