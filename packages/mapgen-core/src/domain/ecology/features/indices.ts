import type { EngineAdapter } from "@civ7/adapter";

export interface FeatureIndices {
  reefIndex: number;
  rainforestIdx: number;
  forestIdx: number;
  taigaIdx: number;
  NO_FEATURE: number;
}

export function resolveFeatureIndices(adapter: EngineAdapter): FeatureIndices {
  return {
    reefIndex: adapter.getFeatureTypeIndex("FEATURE_REEF"),
    rainforestIdx: adapter.getFeatureTypeIndex("FEATURE_RAINFOREST"),
    forestIdx: adapter.getFeatureTypeIndex("FEATURE_FOREST"),
    taigaIdx: adapter.getFeatureTypeIndex("FEATURE_TAIGA"),
    NO_FEATURE: adapter.NO_FEATURE,
  };
}

