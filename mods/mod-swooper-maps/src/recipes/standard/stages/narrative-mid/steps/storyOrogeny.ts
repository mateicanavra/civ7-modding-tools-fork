import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { storyTagOrogenyBelts } from "@mapgen/domain/narrative/orogeny/index.js";
import { M3_DEPENDENCY_TAGS } from "../../../tags.js";
import { StoryOrogenyStepContract } from "./storyOrogeny.contract.js";

type StoryOrogenyStepConfig = Static<typeof StoryOrogenyStepContract.schema>;

export default createStep(StoryOrogenyStepContract, {
  run: (context: ExtendedMapContext, config: StoryOrogenyStepConfig) => {
    const result = storyTagOrogenyBelts(context, config.story);
    context.artifacts.set(
      M3_DEPENDENCY_TAGS.artifact.narrativeMotifsOrogenyV1,
      result.motifs
    );
  },
});
