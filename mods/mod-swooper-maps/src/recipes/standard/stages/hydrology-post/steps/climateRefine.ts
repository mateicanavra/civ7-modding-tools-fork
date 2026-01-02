import { Type, type Static } from "typebox";
import { DEV, logRainfallStats, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  ClimateConfigSchema,
  OrogenyTunablesSchema,
  type FoundationDirectionalityConfig,
} from "@mapgen/config";
import { publishClimateFieldArtifact } from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/index.js";

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

export default createStep({
  id: "climateRefine",
  phase: "hydrology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
    M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
    M3_DEPENDENCY_TAGS.artifact.foundationDynamicsV1,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.climateField],
  schema: ClimateRefineStepConfigSchema,
  run: (context: ExtendedMapContext, config: ClimateRefineStepConfig) => {
    const { width, height } = context.dimensions;
    const directionality =
      context.settings.directionality as FoundationDirectionalityConfig | undefined;
    refineClimateEarthlike(width, height, context, {
      climate: config.climate,
      story: config.story,
      directionality,
    });
    publishClimateFieldArtifact(context);

    if (DEV.ENABLED && context?.adapter) {
      logRainfallStats(context.adapter, width, height, "post-climate");
    }
  },
} as const);
