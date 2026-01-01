import type { EngineAdapter } from "@civ7/adapter";

import { FEATURE_PLACEMENT_KEYS, type FeaturePlacementKey } from "../schema.js";

export type FeatureIndexMap = Record<FeaturePlacementKey, number>;

const NATURAL_WONDER_FEATURES = [
  "FEATURE_VALLEY_OF_FLOWERS",
  "FEATURE_BARRIER_REEF",
  "FEATURE_REDWOOD_FOREST",
  "FEATURE_GRAND_CANYON",
  "FEATURE_GULLFOSS",
  "FEATURE_HOERIKWAGGO",
  "FEATURE_IGUAZU_FALLS",
  "FEATURE_KILIMANJARO",
  "FEATURE_ZHANGJIAJIE",
  "FEATURE_THERA",
  "FEATURE_TORRES_DEL_PAINE",
  "FEATURE_ULURU",
  "FEATURE_BERMUDA_TRIANGLE",
  "FEATURE_MOUNT_EVEREST",
] as const;

export function resolveFeatureIndices(adapter: EngineAdapter): FeatureIndexMap {
  return FEATURE_PLACEMENT_KEYS.reduce((acc, key) => {
    acc[key] = adapter.getFeatureTypeIndex(key);
    return acc;
  }, {} as FeatureIndexMap);
}

export function resolveNaturalWonderIndices(adapter: EngineAdapter): Set<number> {
  const indices = new Set<number>();
  for (const name of NATURAL_WONDER_FEATURES) {
    const idx = adapter.getFeatureTypeIndex(name);
    if (idx >= 0) indices.add(idx);
  }
  return indices;
}
