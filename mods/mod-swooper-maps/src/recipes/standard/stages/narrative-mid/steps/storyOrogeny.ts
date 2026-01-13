import { createStep } from "@swooper/mapgen-core/authoring";
import { storyTagOrogenyBelts } from "@mapgen/domain/narrative/orogeny/index.js";
import StoryOrogenyStepContract from "./storyOrogeny.contract.js";

export default createStep(StoryOrogenyStepContract, {
  run: (context, config, _ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    void deps.artifacts.overlays.read(context);
    storyTagOrogenyBelts(context, config.story, plates);
  },
});
