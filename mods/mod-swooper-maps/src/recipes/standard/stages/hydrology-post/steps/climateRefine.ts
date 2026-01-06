import { Type, type Static } from "typebox";
import { logRainfallStats, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  ClimateConfigSchema,
  NarrativeConfigSchema,
  type FoundationDirectionalityConfig,
} from "@mapgen/domain/config";
import {
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsRifts,
  getPublishedRiverAdjacency,
  publishClimateFieldArtifact,
} from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { refineClimateEarthlike } from "@mapgen/domain/hydrology/climate/index.js";

const ClimateRefineStepConfigSchema = Type.Object(
  {
    climate: ClimateConfigSchema,
    story: Type.Object(
      {
        orogeny: NarrativeConfigSchema.properties.story.properties.orogeny,
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
    const directionality = context.settings.directionality as FoundationDirectionalityConfig;
    if (!directionality) {
      throw new Error("climateRefine requires settings.directionality.");
    }
    const rifts = getPublishedNarrativeMotifsRifts(context);
    if (!rifts) {
      throw new Error("[Hydrology] Missing artifact:narrative.motifs.rifts@v1.");
    }
    const hotspots = getPublishedNarrativeMotifsHotspots(context);
    if (!hotspots) {
      throw new Error("[Hydrology] Missing artifact:narrative.motifs.hotspots@v1.");
    }
    const riverAdjacency = getPublishedRiverAdjacency(context);
    if (!riverAdjacency) {
      throw new Error("[Hydrology] Missing artifact:riverAdjacency.");
    }
    refineClimateEarthlike(width, height, context, {
      climate: config.climate,
      story: config.story,
      directionality,
      rifts,
      hotspots,
      riverAdjacency,
    });
    publishClimateFieldArtifact(context);

    logRainfallStats(context.trace, context.adapter, width, height, "post-climate");
  },
} as const);
