import { createStep } from "@swooper/mapgen-core/authoring";
import { type FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import { readOverlayMotifsHotspots, readOverlayMotifsRifts } from "../../../overlays.js";
import StoryCorridorsPreStepContract from "./storyCorridorsPre.contract.js";

export default createStep(StoryCorridorsPreStepContract, {
  run: (context, config, _ops, deps) => {
    const directionality =
      context.env.directionality as FoundationDirectionalityConfig | undefined;
    if (!directionality) {
      throw new Error("[Narrative] Missing env.directionality.");
    }
    const overlays = deps.artifacts.overlays.read(context);
    const hotspots = readOverlayMotifsHotspots(overlays);
    const rifts = readOverlayMotifsRifts(overlays);
    storyTagStrategicCorridors(
      context,
      "preIslands",
      {
        corridors: config.corridors,
        directionality,
      },
      { hotspots, rifts }
    );
  },
});
