import { createStep } from "@swooper/mapgen-core/authoring";
import { addIslandChains } from "@mapgen/domain/morphology/islands/index.js";
import { STORY_OVERLAY_KEYS, publishStoryOverlay } from "@mapgen/domain/narrative/overlays/index.js";
import {
  readOverlayCorridors,
  readOverlayMotifsHotspots,
  readOverlayMotifsMargins,
} from "../../../overlays.js";
import IslandsStepContract from "./islands.contract.js";

export default createStep(IslandsStepContract, {
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const overlays = deps.artifacts.overlays.read(context);
    const margins = readOverlayMotifsMargins(overlays);
    const hotspots = readOverlayMotifsHotspots(overlays);
    const corridors = readOverlayCorridors(overlays);
    const result = addIslandChains(width, height, context, config, {
      margins,
      hotspots,
      corridors,
    });
    publishStoryOverlay(context, STORY_OVERLAY_KEYS.HOTSPOTS, {
      kind: STORY_OVERLAY_KEYS.HOTSPOTS,
      version: 1,
      width,
      height,
      active: Array.from(result.motifs.points),
      summary: {
        points: result.motifs.points.size,
        paradise: Array.from(result.motifs.paradise),
        volcanic: Array.from(result.motifs.volcanic),
        trails: result.motifs.trails ?? [],
      },
    });
  },
});
