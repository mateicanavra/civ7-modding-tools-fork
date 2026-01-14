import { createStep } from "@swooper/mapgen-core/authoring";
import { addRuggedCoasts } from "@mapgen/domain/morphology/coastlines/index.js";
import { readOverlayCorridors, readOverlayMotifsMargins } from "../../../overlays.js";
import RuggedCoastsStepContract from "./ruggedCoasts.contract.js";

export default createStep(RuggedCoastsStepContract, {
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const plates = deps.artifacts.foundationPlates.read(context);
    const overlays = deps.artifacts.overlays.read(context);
    const margins = readOverlayMotifsMargins(overlays);
    const corridors = readOverlayCorridors(overlays);
    addRuggedCoasts(width, height, context, config, plates, { margins, corridors });
  },
});
