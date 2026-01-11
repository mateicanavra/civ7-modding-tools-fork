import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@mapgen/authoring/steps";
import type { Static } from "@swooper/mapgen-core/authoring";
import { storyTagOrogenyBelts } from "@mapgen/domain/narrative/orogeny/index.js";
import { narrativeMotifsOrogenyArtifact } from "../../../artifacts.js";
import StoryOrogenyStepContract from "./storyOrogeny.contract.js";
type StoryOrogenyStepConfig = Static<typeof StoryOrogenyStepContract.schema>;

export default createStep(StoryOrogenyStepContract, {
  run: (context: ExtendedMapContext, config: StoryOrogenyStepConfig) => {
    const result = storyTagOrogenyBelts(context, config.story);
    narrativeMotifsOrogenyArtifact.set(context, result.motifs);
  },
});
