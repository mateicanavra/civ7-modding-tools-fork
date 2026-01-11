import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { addIslandChains } from "@mapgen/domain/morphology/islands/index.js";
import {
  getPublishedNarrativeCorridors,
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsMargins,
  narrativeMotifsHotspotsArtifact,
} from "../../../artifacts.js";
import IslandsStepContract from "./islands.contract.js";
type IslandsStepConfig = Static<typeof IslandsStepContract.schema>;

export default createStep(IslandsStepContract, {
  run: (context: ExtendedMapContext, config: IslandsStepConfig) => {
    const { width, height } = context.dimensions;
    const margins = getPublishedNarrativeMotifsMargins(context);
    const hotspots = getPublishedNarrativeMotifsHotspots(context);
    const corridors = getPublishedNarrativeCorridors(context);
    const result = addIslandChains(width, height, context, config, {
      margins,
      hotspots,
      corridors,
    });
    narrativeMotifsHotspotsArtifact.set(context, result.motifs);
  },
});
