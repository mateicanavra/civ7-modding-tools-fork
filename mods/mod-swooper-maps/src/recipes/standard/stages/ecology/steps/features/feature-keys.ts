import type { EngineAdapter } from "@civ7/adapter";
import {
  FEATURE_PLACEMENT_KEYS,
  type FeatureKey,
} from "@mapgen/domain/ecology";

export type FeatureKeyLookups = {
  byKey: Record<FeatureKey, number>;
  byEngineId: Map<number, number>;
};

/**
 * Builds lookup tables for feature keys to engine ids and reverse.
 */
export function resolveFeatureKeyLookups(adapter: EngineAdapter): FeatureKeyLookups {
  const byKey = {} as Record<FeatureKey, number>;
  const byEngineId = new Map<number, number>();

  FEATURE_PLACEMENT_KEYS.forEach((key, index) => {
    const engineId = adapter.getFeatureTypeIndex(key);
    if (typeof engineId !== "number" || Number.isNaN(engineId) || engineId < 0) {
      throw new Error(`FeaturesStep: Missing engine feature for key "${key}".`);
    }
    byKey[key] = engineId;
    byEngineId.set(engineId, index);
  });

  return { byKey, byEngineId };
}
