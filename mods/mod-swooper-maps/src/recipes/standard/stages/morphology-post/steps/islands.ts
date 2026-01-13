import { createStep } from "@swooper/mapgen-core/authoring";
import { addIslandChains } from "@mapgen/domain/morphology/islands/index.js";
import IslandsStepContract from "./islands.contract.js";

export default createStep(IslandsStepContract, {
  run: (context, config, _ops, deps) => {
    const { width, height } = context.dimensions;
    const margins = deps.artifacts.motifsMargins.read(context);
    const hotspots = deps.artifacts.motifsHotspots.read(context);
    const corridors = deps.artifacts.corridors.read(context);
    const result = addIslandChains(width, height, context, config, {
      margins,
      hotspots,
      corridors,
    });
    // Hotspot motifs are published once, then refined in place.
    Object.assign(hotspots, result.motifs);
  },
});
