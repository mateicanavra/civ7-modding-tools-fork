import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { LANDMASS_REGION, markLandmassRegionId } from "@mapgen/core/plot-tags.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import type { ContinentBounds } from "@mapgen/bootstrap/types.js";
import { publishClimateFieldArtifact, publishHeightfieldArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { applyClimateBaseline } from "@mapgen/domain/hydrology/climate/index.js";

export interface ClimateBaselineStepRuntime {
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
}

export interface ClimateBaselineStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createClimateBaselineStep(
  runtime: ClimateBaselineStepRuntime,
  options: ClimateBaselineStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "climateBaseline",
    phase: M3_STANDARD_STAGE_PHASE.climateBaseline,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
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
    },
  };
}
