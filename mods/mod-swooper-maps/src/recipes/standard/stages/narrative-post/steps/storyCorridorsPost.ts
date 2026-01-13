import { createStep } from "@swooper/mapgen-core/authoring";
import { type FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import StoryCorridorsPostStepContract from "./storyCorridorsPost.contract.js";

export default createStep(StoryCorridorsPostStepContract, {
  run: (context, config, _ops, deps) => {
    const directionality =
      context.env.directionality as FoundationDirectionalityConfig | undefined;
    if (!directionality) {
      throw new Error("[Narrative] Missing env.directionality.");
    }
    void deps.artifacts.overlays.read(context);
    void deps.artifacts.riverAdjacency.read(context);
    const corridors = deps.artifacts.corridors.read(context);
    const result = storyTagStrategicCorridors(
      context,
      "postRivers",
      {
        corridors: config.corridors,
        directionality,
      },
      { corridors }
    );
    // Corridor artifact is published once, then updated in place.
    Object.assign(corridors, result.corridors);
  },
});
