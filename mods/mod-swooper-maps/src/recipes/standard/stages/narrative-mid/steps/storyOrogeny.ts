import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { storyTagOrogenyBelts } from "@mapgen/domain/narrative/orogeny/index.js";
import { narrativeMidArtifacts } from "../artifacts.js";
import StoryOrogenyStepContract from "./storyOrogeny.contract.js";

export default createStep(StoryOrogenyStepContract, {
  artifacts: implementArtifacts([narrativeMidArtifacts.motifsOrogeny], {
    motifsOrogeny: {},
  }),
  run: (context, config, _ops, deps) => {
    const plates = deps.artifacts.foundationPlates.read(context);
    const dynamics = deps.artifacts.foundationDynamics.read(context);
    void deps.artifacts.overlays.read(context);
    const result = storyTagOrogenyBelts(context, config.story, plates, dynamics);
    deps.artifacts.motifsOrogeny.publish(context, result.motifs);
  },
});
