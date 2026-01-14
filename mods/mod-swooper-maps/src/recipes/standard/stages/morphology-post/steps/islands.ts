import { createStep } from "@swooper/mapgen-core/authoring";
import { addIslandChains } from "@mapgen/domain/morphology/islands/index.js";
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
    addIslandChains(width, height, context, config, {
      margins,
      hotspots,
      corridors,
    });
  },
});
