import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep, type Static } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema, type FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import { getPublishedNarrativeCorridors, narrativeCorridorsArtifact } from "../../../artifacts.js";
import StoryCorridorsPostStepContract from "./storyCorridorsPost.contract.js";
type StoryCorridorsStepConfig = Static<typeof StoryCorridorsPostStepContract.schema>;

export default createStep(StoryCorridorsPostStepContract, {
  run: (context: ExtendedMapContext, config: StoryCorridorsStepConfig) => {
    const directionality =
      context.env.directionality as FoundationDirectionalityConfig | undefined;
    if (!directionality) {
      throw new Error("[Narrative] Missing env.directionality.");
    }
    const corridors = getPublishedNarrativeCorridors(context);
    const result = storyTagStrategicCorridors(
      context,
      "postRivers",
      {
        corridors: config.corridors,
        directionality,
      },
      { corridors }
    );
    narrativeCorridorsArtifact.set(context, result.corridors);
  },
});
