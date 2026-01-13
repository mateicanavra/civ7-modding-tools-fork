import { createStep } from "@swooper/mapgen-core/authoring";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import { readOverlayMotifsHotspots, readOverlayMotifsRifts } from "../../../overlays.js";
import StoryCorridorsPreStepContract from "./storyCorridorsPre.contract.js";

export default createStep(StoryCorridorsPreStepContract, {
  run: (context, config, _ops, deps) => {
    const overlays = deps.artifacts.overlays.read(context);
    const hotspots = readOverlayMotifsHotspots(overlays);
    const rifts = readOverlayMotifsRifts(overlays);
    storyTagStrategicCorridors(
      context,
      "preIslands",
      {
        corridors: config.corridors,
      },
      { hotspots, rifts }
    );
  },
});
