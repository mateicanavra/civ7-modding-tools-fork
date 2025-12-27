import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { DEV, logRainfallStats } from "@mapgen/dev/index.js";
import { publishClimateFieldArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import { ClimateConfigSchema, FoundationDirectionalityConfigSchema, OrogenyTunablesSchema } from "@mapgen/config/index.js";
import { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/index.js";

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
    foundation: Type.Object(
      {
        dynamics: Type.Object(
          {
            directionality: FoundationDirectionalityConfigSchema,
          },
          { additionalProperties: false, default: {} }
        ),
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { climate: {}, story: {}, foundation: {} } }
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
      assertFoundationContext(context, "climateRefine");
      const { width, height } = context.dimensions;
      refineClimateEarthlike(width, height, context, {
        climate: config.climate,
        story: config.story,
        directionality: config.foundation?.dynamics?.directionality,
      });
      publishClimateFieldArtifact(context);

      if (DEV.ENABLED && context?.adapter) {
        logRainfallStats(context.adapter, width, height, "post-climate");
      }
    },
  };
}
