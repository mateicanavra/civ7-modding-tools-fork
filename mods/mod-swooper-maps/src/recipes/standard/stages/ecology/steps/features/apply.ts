import type { EngineAdapter } from "@civ7/adapter";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { FeatureKey } from "@mapgen/domain/ecology";
import type { FeatureKeyLookups } from "./feature-keys.js";

type FeaturePlacement = {
  x: number;
  y: number;
  feature: FeatureKey;
};

const resolveFeatureIndex = (lookups: FeatureKeyLookups, key: FeatureKey): number => {
  const index = lookups.byKey[key];
  if (index == null || index < 0) {
    throw new Error(`FeaturesStep: Unknown feature key "${key}".`);
  }
  return index;
};

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
  placements: FeaturePlacement[],
  lookups: FeatureKeyLookups
): number {
  const { adapter } = context;
  let applied = 0;
  for (const placement of placements) {
    const featureIndex = resolveFeatureIndex(lookups, placement.feature);
    if (tryPlaceFeature(adapter, placement.x, placement.y, featureIndex)) {
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
