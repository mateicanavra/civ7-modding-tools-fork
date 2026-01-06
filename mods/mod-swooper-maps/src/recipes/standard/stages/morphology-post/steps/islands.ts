import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { addIslandChains } from "@mapgen/domain/morphology/islands/index.js";
import {
  getPublishedNarrativeCorridors,
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsMargins,
} from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { IslandsStepContract } from "./islands.contract.js";

type IslandsStepConfig = Static<typeof IslandsStepContract.schema>;

export default createStep(IslandsStepContract, {
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
});
