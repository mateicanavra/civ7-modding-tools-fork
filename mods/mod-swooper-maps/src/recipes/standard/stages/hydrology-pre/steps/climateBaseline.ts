import { Type, type Static } from "typebox";
import {
  markLandmassId,
  logElevationSummary,
  resolveLandmassIds,
  syncHeightfield,
  type ExtendedMapContext,
} from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { ClimateConfigSchema } from "@mapgen/domain/config";
import {
  publishClimateFieldArtifact,
  publishHeightfieldArtifact,
} from "../../../artifacts.js";
import { getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { applyClimateBaseline } from "@mapgen/domain/hydrology/climate/index.js";

const ClimateBaselineStepConfigSchema = Type.Object(
  {
    climate: Type.Object(
      {
        baseline: ClimateConfigSchema.properties.baseline,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { climate: {} } }
);

type ClimateBaselineStepConfig = Static<typeof ClimateBaselineStepConfigSchema>;

export default createStep({
  id: "climateBaseline",
  phase: "hydrology",
  requires: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.climateField,
  ],
  schema: ClimateBaselineStepConfigSchema,
  run: (context: ExtendedMapContext, config: ClimateBaselineStepConfig) => {
    const runtime = getStandardRuntime(context);
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
    if (context.trace.isVerbose) {
      context.trace.event(() => ({
        type: "landmass.regionIds.refresh",
        westRestamped,
        eastRestamped,
        ids: { west: landmassIds.WEST, east: landmassIds.EAST },
      }));
    }

    syncHeightfield(context);
    logElevationSummary(context.trace, context.adapter, width, height, "post-buildElevation");
    publishHeightfieldArtifact(context);
    applyClimateBaseline(width, height, context, config.climate);
    publishClimateFieldArtifact(context);
  },
} as const);
