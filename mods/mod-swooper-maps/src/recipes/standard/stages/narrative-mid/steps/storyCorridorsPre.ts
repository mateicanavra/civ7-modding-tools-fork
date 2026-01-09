import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema, type FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import {
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsRifts,
} from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { StoryCorridorsPreStepContract } from "./storyCorridorsPre.contract.js";

type StoryCorridorsStepConfig = Static<typeof StoryCorridorsPreStepContract.schema>;

export default createStep(StoryCorridorsPreStepContract, {
  run: (context: ExtendedMapContext, config: StoryCorridorsStepConfig) => {
    const directionality =
      context.env.directionality as FoundationDirectionalityConfig | undefined;
    if (!directionality) {
      throw new Error("[Narrative] Missing env.directionality.");
    }
    const hotspots = getPublishedNarrativeMotifsHotspots(context);
    if (!hotspots) {
      throw new Error("[Narrative] Missing artifact:narrative.motifs.hotspots@v1.");
    }
    const rifts = getPublishedNarrativeMotifsRifts(context);
    if (!rifts) {
      throw new Error("[Narrative] Missing artifact:narrative.motifs.rifts@v1.");
    }
    const result = storyTagStrategicCorridors(
      context,
      "preIslands",
      {
        corridors: config.corridors,
        directionality,
      },
      { hotspots, rifts }
    );
    context.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
      result.corridors
    );
  },
});
