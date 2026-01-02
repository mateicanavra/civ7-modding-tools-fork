import type { EngineAdapter } from "@civ7/adapter";
import type { ExtendedMapContext } from "@swooper/mapgen-core";

import type { FeaturePlacement } from "@mapgen/domain/ecology/ops/features-placement/index.js";

export function tryPlaceFeature(
  adapter: EngineAdapter,
  x: number,
  y: number,
  featureIndex: number
): boolean {
  const canPlace = adapter.canHaveFeature(x, y, featureIndex);
  if (!canPlace) return false;
  adapter.setFeatureType(x, y, { Feature: featureIndex, Direction: -1, Elevation: 0 });
  return true;
}

export function applyFeaturePlacements(
  context: ExtendedMapContext,
  placements: FeaturePlacement[]
): number {
  const { adapter } = context;
  let applied = 0;
  for (const placement of placements) {
    if (tryPlaceFeature(adapter, placement.x, placement.y, placement.feature)) {
      applied += 1;
    }
  }
  return applied;
}

export function reifyFeatureField(context: ExtendedMapContext): void {
  const featureTypeField = context.fields?.featureType;
  if (!featureTypeField) {
    throw new Error("FeaturesStep: Missing field:featureType buffer for reification.");
  }

  const { width, height } = context.dimensions;
  const { adapter } = context;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      featureTypeField[rowOffset + x] = adapter.getFeatureType(x, y) | 0;
    }
  }
}
