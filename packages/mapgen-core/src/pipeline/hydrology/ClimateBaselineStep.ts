import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { LANDMASS_REGION, markLandmassRegionId } from "@mapgen/core/plot-tags.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import type { ContinentBounds } from "@mapgen/bootstrap/types.js";
import { ClimateBaselineSchema } from "@mapgen/config/index.js";
import { publishClimateFieldArtifact, publishHeightfieldArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";
import { applyClimateBaseline } from "@mapgen/domain/hydrology/climate/index.js";

export interface ClimateBaselineStepRuntime {
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
}

export interface ClimateBaselineStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const ClimateBaselineStepConfigSchema = Type.Object(
  {
    climate: Type.Object(
      {
        baseline: ClimateBaselineSchema,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { climate: {} } }
);

export function createClimateBaselineStep(
  runtime: ClimateBaselineStepRuntime,
  options: ClimateBaselineStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "climateBaseline",
    phase: M3_STANDARD_STAGE_PHASE.climateBaseline,
    requires: options.requires,
    provides: options.provides,
    configSchema: ClimateBaselineStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        const { width, height } = context.dimensions;

        context.adapter.recalculateAreas();
        context.adapter.buildElevation();

        const westRestamped = markLandmassRegionId(runtime.westContinent, LANDMASS_REGION.WEST, context.adapter);
        const eastRestamped = markLandmassRegionId(runtime.eastContinent, LANDMASS_REGION.EAST, context.adapter);
        context.adapter.recalculateAreas();
        context.adapter.stampContinents();
        console.log(
          `[landmass-plate] LandmassRegionId refreshed post-terrain: ${westRestamped} west (ID=${LANDMASS_REGION.WEST}), ${eastRestamped} east (ID=${LANDMASS_REGION.EAST})`
        );

        assertFoundationContext(context, "climateBaseline");
        syncHeightfield(context);
        publishHeightfieldArtifact(context);
        applyClimateBaseline(width, height, context);
        publishClimateFieldArtifact(context);
      });
    },
  };
}
