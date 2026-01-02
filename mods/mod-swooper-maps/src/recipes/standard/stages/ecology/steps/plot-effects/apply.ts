import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type * as ecology from "@mapgen/domain/ecology";

type PlotEffectPlacement = ReturnType<typeof ecology.ops.plotEffects.run>["placements"][number];

export function applyPlotEffectPlacements(
  context: ExtendedMapContext,
  placements: PlotEffectPlacement[]
): void {
  for (const placement of placements) {
    context.adapter.addPlotEffect(placement.x, placement.y, placement.plotEffectType);
  }
}
