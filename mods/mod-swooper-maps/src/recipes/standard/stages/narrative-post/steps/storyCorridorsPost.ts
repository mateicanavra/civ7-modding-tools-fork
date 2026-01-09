import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { NarrativeConfigSchema, type FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import { getPublishedNarrativeCorridors } from "../../../artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { StoryCorridorsPostStepContract } from "./storyCorridorsPost.contract.js";

type StoryCorridorsStepConfig = Static<typeof StoryCorridorsPostStepContract.schema>;

export default createStep(StoryCorridorsPostStepContract, {
  run: (context: ExtendedMapContext, config: StoryCorridorsStepConfig) => {
    const directionality =
      context.env.directionality as FoundationDirectionalityConfig | undefined;
    if (!directionality) {
      throw new Error("[Narrative] Missing env.directionality.");
    }
    const corridors = getPublishedNarrativeCorridors(context);
    if (!corridors) {
      throw new Error("[Narrative] Missing artifact:narrative.corridors@v1.");
    }
    const result = storyTagStrategicCorridors(
      context,
      "postRivers",
      {
        corridors: config.corridors,
        directionality,
      },
      { corridors }
    );
    context.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
      result.corridors
    );
  },
});
