import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema, type FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import {
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsRifts,
  narrativeCorridorsArtifact,
} from "../../../artifacts.js";
import StoryCorridorsPreStepContract from "./storyCorridorsPre.contract.js";
type StoryCorridorsStepConfig = Static<typeof StoryCorridorsPreStepContract.schema>;

export default createStep(StoryCorridorsPreStepContract, {
  run: (context: ExtendedMapContext, config: StoryCorridorsStepConfig) => {
    const directionality =
      context.env.directionality as FoundationDirectionalityConfig | undefined;
    if (!directionality) {
      throw new Error("[Narrative] Missing env.directionality.");
    }
    const hotspots = getPublishedNarrativeMotifsHotspots(context);
    const rifts = getPublishedNarrativeMotifsRifts(context);
    const result = storyTagStrategicCorridors(
      context,
      "preIslands",
      {
        corridors: config.corridors,
        directionality,
      },
      { hotspots, rifts }
    );
    narrativeCorridorsArtifact.set(context, result.corridors);
  },
});
