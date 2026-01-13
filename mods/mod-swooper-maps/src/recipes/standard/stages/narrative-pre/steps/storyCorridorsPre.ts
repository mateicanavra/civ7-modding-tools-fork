import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { type FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import { narrativePreArtifacts } from "../artifacts.js";
import StoryCorridorsPreStepContract from "./storyCorridorsPre.contract.js";

export default createStep(StoryCorridorsPreStepContract, {
  artifacts: implementArtifacts([narrativePreArtifacts.corridors], {
    corridors: {},
  }),
  run: (context, config, _ops, deps) => {
    const directionality =
      context.env.directionality as FoundationDirectionalityConfig | undefined;
    if (!directionality) {
      throw new Error("[Narrative] Missing env.directionality.");
    }
    const hotspots = deps.artifacts.motifsHotspots.read(context);
    const rifts = deps.artifacts.motifsRifts.read(context);
    void deps.artifacts.overlays.read(context);
    const result = storyTagStrategicCorridors(
      context,
      "preIslands",
      {
        corridors: config.corridors,
        directionality,
      },
      { hotspots, rifts }
    );
    deps.artifacts.corridors.publish(context, result.corridors);
  },
});
