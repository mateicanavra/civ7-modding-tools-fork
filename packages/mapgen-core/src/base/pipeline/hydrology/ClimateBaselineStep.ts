import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { markLandmassId, resolveLandmassIds } from "@mapgen/core/plot-tags.js";
import { syncHeightfield } from "@mapgen/core/types.js";
import type { ContinentBounds } from "@mapgen/bootstrap/types.js";
import { ClimateBaselineSchema } from "@mapgen/config/index.js";
import { publishClimateFieldArtifact, publishHeightfieldArtifact } from "@mapgen/base/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
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

type ClimateBaselineStepConfig = Static<typeof ClimateBaselineStepConfigSchema>;

export function createClimateBaselineStep(
  runtime: ClimateBaselineStepRuntime,
  options: ClimateBaselineStepOptions
): MapGenStep<ExtendedMapContext, ClimateBaselineStepConfig> {
  return {
    id: "climateBaseline",
    phase: M3_STANDARD_STAGE_PHASE.climateBaseline,
    requires: options.requires,
    provides: options.provides,
    configSchema: ClimateBaselineStepConfigSchema,
    run: (context, config) => {
      const { width, height } = context.dimensions;
      const landmassIds = resolveLandmassIds(context.adapter);

      context.adapter.recalculateAreas();
      context.adapter.buildElevation();

      const westRestamped = markLandmassId(
        runtime.westContinent,
        landmassIds.WEST,
        context.adapter
      );
      const eastRestamped = markLandmassId(
        runtime.eastContinent,
        landmassIds.EAST,
        context.adapter
      );
      context.adapter.recalculateAreas();
      context.adapter.stampContinents();
      console.log(
        `[landmass-plate] Region IDs refreshed post-terrain: ${westRestamped} west (ID=${landmassIds.WEST}), ${eastRestamped} east (ID=${landmassIds.EAST})`
      );

      assertFoundationContext(context, "climateBaseline");
      syncHeightfield(context);
      publishHeightfieldArtifact(context);
      applyClimateBaseline(width, height, context, config.climate);
      publishClimateFieldArtifact(context);
    },
  };
}
