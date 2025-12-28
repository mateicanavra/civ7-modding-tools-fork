import type { EngineAdapter, FeatureData } from "@civ7/adapter";

export function tryPlaceFeature(
  adapter: EngineAdapter,
  x: number,
  y: number,
  featureIndex: number
): boolean {
  const canPlace = adapter.canHaveFeature(x, y, featureIndex);
  if (!canPlace) return false;
  const featureData: FeatureData = { Feature: featureIndex, Direction: -1, Elevation: 0 };
  adapter.setFeatureType(x, y, featureData);
  return true;
}

