import { createStep } from "@swooper/mapgen-core/authoring";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import { readOverlayCorridors } from "../../../overlays.js";
import StoryCorridorsPostStepContract from "./storyCorridorsPost.contract.js";

export default createStep(StoryCorridorsPostStepContract, {
  run: (context, config, _ops, deps) => {
    void deps.artifacts.riverAdjacency.read(context);
    const overlays = deps.artifacts.overlays.read(context);
    const corridors = readOverlayCorridors(overlays);
    storyTagStrategicCorridors(
      context,
      "postRivers",
      {
        corridors: config.corridors,
      },
      { corridors }
    );
  },
});
