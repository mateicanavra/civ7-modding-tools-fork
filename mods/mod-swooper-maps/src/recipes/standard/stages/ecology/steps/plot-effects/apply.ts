import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { PlotEffectPlacement } from "@mapgen/domain/ecology/ops/plot-effects/index.js";

export function applyPlotEffectPlacements(
  context: ExtendedMapContext,
  placements: PlotEffectPlacement[]
): void {
  for (const placement of placements) {
    context.adapter.addPlotEffect(placement.x, placement.y, placement.plotEffectType);
  }
}
