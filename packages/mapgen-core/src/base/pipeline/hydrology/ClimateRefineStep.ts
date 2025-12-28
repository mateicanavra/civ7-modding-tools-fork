<<<<<<<< HEAD:packages/mapgen-core/src/base/pipeline/hydrology/ClimateRefineStep.ts
import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { DEV, logRainfallStats } from "@mapgen/dev/index.js";
import { publishClimateFieldArtifact } from "@mapgen/base/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/engine/index.js";
import { ClimateConfigSchema, OrogenyTunablesSchema } from "@mapgen/config/index.js";
import { refineClimateEarthlike } from "@mapgen-content/hydrology/climate/index.js";

export interface ClimateRefineStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const ClimateRefineStepConfigSchema = Type.Object(
  {
    climate: ClimateConfigSchema,
    story: Type.Object(
      {
        orogeny: OrogenyTunablesSchema,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { climate: {}, story: {} } }
);

type ClimateRefineStepConfig = Static<typeof ClimateRefineStepConfigSchema>;

export function createClimateRefineStep(
  options: ClimateRefineStepOptions
): MapGenStep<ExtendedMapContext, ClimateRefineStepConfig> {
  return {
    id: "climateRefine",
    phase: M3_STANDARD_STAGE_PHASE.climateRefine,
    requires: options.requires,
    provides: options.provides,
    configSchema: ClimateRefineStepConfigSchema,
    run: (context, config) => {
      const { width, height } = context.dimensions;
      refineClimateEarthlike(width, height, context, {
        climate: config.climate,
        story: config.story,
        directionality: context.config.foundation?.dynamics?.directionality,
      });
      publishClimateFieldArtifact(context);

      if (DEV.ENABLED && context?.adapter) {
        logRainfallStats(context.adapter, width, height, "post-climate");
      }
    },
  };
}
========
export { createClimateRefineStep } from "@mapgen/base/pipeline/hydrology/ClimateRefineStep.js";
export type { ClimateRefineStepOptions } from "@mapgen/base/pipeline/hydrology/ClimateRefineStep.js";

>>>>>>>> 1fab536d (M5-U05: extract morphology/hydrology pipeline into base mod):packages/mapgen-core/src/pipeline/hydrology/ClimateRefineStep.ts
