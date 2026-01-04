import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import {
  MorphologyConfigSchema,
  NarrativeConfigSchema,
} from "@mapgen/domain/config";
import { addIslandChains } from "@mapgen/domain/morphology/islands/index.js";
import {
  getPublishedNarrativeCorridors,
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsMargins,
} from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const IslandsStepConfigSchema = Type.Object(
  {
    islands: MorphologyConfigSchema.properties.islands,
    story: Type.Object(
      {
        hotspot: NarrativeConfigSchema.properties.story.properties.hotspot,
      },
      { additionalProperties: false, default: {} }
    ),
    corridors: Type.Object(
      {
        sea: NarrativeConfigSchema.properties.corridors.properties.sea,
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: { islands: {}, story: {}, corridors: {} } }
);

type IslandsStepConfig = Static<typeof IslandsStepConfigSchema>;

export default createStep({
  id: "islands",
  phase: "morphology",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
  ],
  provides: [
    M4_EFFECT_TAGS.engine.landmassApplied,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
  ],
  schema: IslandsStepConfigSchema,
  run: (context: ExtendedMapContext, config: IslandsStepConfig) => {
    const { width, height } = context.dimensions;
    const margins = getPublishedNarrativeMotifsMargins(context);
    if (!margins) {
      throw new Error("[Morphology] Missing artifact:narrative.motifs.margins@v1.");
    }
    const hotspots = getPublishedNarrativeMotifsHotspots(context);
    if (!hotspots) {
      throw new Error("[Morphology] Missing artifact:narrative.motifs.hotspots@v1.");
    }
    const corridors = getPublishedNarrativeCorridors(context);
    const result = addIslandChains(width, height, context, config, {
      margins,
      hotspots,
      corridors,
    });
    context.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
      result.motifs
    );
  },
} as const);
