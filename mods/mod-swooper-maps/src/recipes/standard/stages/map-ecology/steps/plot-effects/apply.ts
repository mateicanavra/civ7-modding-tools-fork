import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { PlotEffectKey } from "@mapgen/domain/ecology";

type PlotEffectPlacement = {
  x: number;
  y: number;
  plotEffect: PlotEffectKey;
};

const resolvePlotEffectIndex = (
  context: ExtendedMapContext,
  key: PlotEffectKey
): number => {
  const index = context.adapter.getPlotEffectTypeIndex(key);
  if (typeof index !== "number" || Number.isNaN(index) || index < 0) {
    throw new Error(`PlotEffectsStep: Unknown plot-effect key "${key}".`);
  }
  return index;
};

/**
 * Applies plot effect placements to the engine adapter.
 */
export function applyPlotEffectPlacements(
  context: ExtendedMapContext,
  placements: PlotEffectPlacement[]
): void {
  const resolved = new Map<PlotEffectKey, number>();

  for (const placement of placements) {
    let plotEffectType = resolved.get(placement.plotEffect);
    if (plotEffectType == null) {
      plotEffectType = resolvePlotEffectIndex(context, placement.plotEffect);
      resolved.set(placement.plotEffect, plotEffectType);
    }
    context.adapter.addPlotEffect(placement.x, placement.y, plotEffectType);
  }
}
