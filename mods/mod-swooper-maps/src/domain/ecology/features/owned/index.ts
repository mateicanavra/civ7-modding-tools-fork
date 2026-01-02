import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { ctxRandom } from "@swooper/mapgen-core";
import { biomeSymbolFromIndex } from "@mapgen/domain/ecology/ops/classify-biomes.js";
import { getPublishedBiomeClassification } from "@mapgen/domain/artifacts.js";
import { tryPlaceFeature } from "@mapgen/domain/ecology/features/place-feature.js";
import type { EngineAdapter } from "@civ7/adapter";

import {
  FEATURE_PLACEMENT_KEYS,
  resolveFeaturesPlacementConfig,
  type FeaturePlacementKey,
  type FeaturesPlacementConfig,
} from "./types.js";

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

const EQUATORIAL_BAND_DEG = 23;

type FeatureIndexMap = Record<FeaturePlacementKey, number>;

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const rollPercent = (ctx: ExtendedMapContext, label: string, chance: number): boolean =>
  chance > 0 && ctxRandom(ctx, label, 100) < chance;

const resolveFeatureIndices = (adapter: EngineAdapter): FeatureIndexMap =>
  FEATURE_PLACEMENT_KEYS.reduce((acc, key) => {
    acc[key] = adapter.getFeatureTypeIndex(key);
    return acc;
  }, {} as FeatureIndexMap);

const resolveNaturalWonderIndices = (adapter: EngineAdapter): Set<number> => {
  const indices = new Set<number>();
  for (const name of NATURAL_WONDER_FEATURES) {
    const idx = adapter.getFeatureTypeIndex(name);
    if (idx >= 0) indices.add(idx);
  }
  return indices;
};

export function placeOwnedFeatures(
  width: number,
  height: number,
  ctx: ExtendedMapContext,
  config?: FeaturesPlacementConfig
): void {
  if (!ctx || !ctx.adapter) {
    throw new Error("placeOwnedFeatures: MapContext adapter is required.");
  }

  const resolved = resolveFeaturesPlacementConfig(config);
  const adapter = ctx.adapter;
  const indices = resolveFeatureIndices(adapter);
  const naturalWonderIndices = resolveNaturalWonderIndices(adapter);

  const classification = getPublishedBiomeClassification(ctx);
  if (!classification) {
    throw new Error("placeOwnedFeatures: Missing artifact:ecology.biomeClassification@v1.");
  }

  const biomeIndex = classification.biomeIndex;
  const vegetationDensity = classification.vegetationDensity;
  const effectiveMoisture = classification.effectiveMoisture;
  const surfaceTemperature = classification.surfaceTemperature;

  const NO_FEATURE = adapter.NO_FEATURE;
  const navigableRiverTerrain = adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER");
  const coastTerrain = adapter.getTerrainTypeIndex("TERRAIN_COAST");

  const isNavigableRiverPlot = (x: number, y: number): boolean =>
    navigableRiverTerrain >= 0 && adapter.getTerrainType(x, y) === navigableRiverTerrain;

  const isAdjacentToLand = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (!adapter.isWater(nx, ny)) return true;
      }
    }
    return false;
  };

  const isCoastalLand = (x: number, y: number): boolean => {
    if (adapter.isWater(x, y)) return false;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (adapter.isWater(nx, ny)) return true;
      }
    }
    return false;
  };

  const isAdjacentToShallowWater = (x: number, y: number): boolean => {
    if (coastTerrain < 0) return false;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (adapter.getTerrainType(nx, ny) === coastTerrain) return true;
      }
    }
    return false;
  };

  const hasAdjacentFeatureType = (x: number, y: number, featureIdx: number, radius = 1): boolean => {
    for (let dy = -radius; dy <= radius; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (dx === 0 && dy === 0) continue;
        if (adapter.getFeatureType(nx, ny) === featureIdx) return true;
      }
    }
    return false;
  };

  const hasAdjacentNaturalWonder = (x: number, y: number): boolean => {
    if (naturalWonderIndices.size === 0) return false;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (dx === 0 && dy === 0) continue;
        const feature = adapter.getFeatureType(nx, ny);
        if (naturalWonderIndices.has(feature)) return true;
      }
    }
    return false;
  };

  const scaledChance = (base: number, multiplier: number): number =>
    clampChance(base * multiplier);

  const pickVegetatedFeature = (
    symbolIndex: number,
    moistureValue: number,
    temperatureValue: number,
    vegetationValue: number
  ): FeaturePlacementKey | null => {
    const symbol = biomeSymbolFromIndex(symbolIndex);

    if (symbol === "snow") return null;
    if (symbol === "desert") {
      return vegetationValue > 0.2 ? "FEATURE_SAGEBRUSH_STEPPE" : null;
    }
    if (symbol === "tundra") {
      return vegetationValue > 0.25 && temperatureValue > -2 ? "FEATURE_TAIGA" : null;
    }
    if (symbol === "boreal") return "FEATURE_TAIGA";
    if (symbol === "temperateDry") {
      return moistureValue > 120 || vegetationValue > 0.45
        ? "FEATURE_FOREST"
        : "FEATURE_SAGEBRUSH_STEPPE";
    }
    if (symbol === "temperateHumid") return "FEATURE_FOREST";
    if (symbol === "tropicalSeasonal") {
      return moistureValue > 140 ? "FEATURE_RAINFOREST" : "FEATURE_SAVANNA_WOODLAND";
    }
    if (symbol === "tropicalRainforest") return "FEATURE_RAINFOREST";
    return null;
  };

  // --- Ice ---
  if (resolved.groups.ice.enabled) {
    const iceChance = scaledChance(resolved.chances.FEATURE_ICE, resolved.groups.ice.multiplier);
    if (iceChance > 0 && indices.FEATURE_ICE >= 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!adapter.isWater(x, y)) continue;
          if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;

          const absLat = Math.abs(adapter.getLatitude(x, y));
          if (absLat < resolved.ice.minAbsLatitude) continue;
          if (resolved.ice.forbidAdjacentToLand && isAdjacentToLand(x, y)) continue;
          if (resolved.ice.forbidAdjacentToNaturalWonders && hasAdjacentNaturalWonder(x, y)) {
            continue;
          }
          if (!rollPercent(ctx, "features:owned:ice", iceChance)) continue;
          tryPlaceFeature(adapter, x, y, indices.FEATURE_ICE);
        }
      }
    }
  }

  // --- Aquatic reefs ---
  if (resolved.groups.aquatic.enabled) {
    const reefChance = scaledChance(resolved.chances.FEATURE_REEF, resolved.groups.aquatic.multiplier);
    const coldReefChance = scaledChance(
      resolved.chances.FEATURE_COLD_REEF,
      resolved.groups.aquatic.multiplier
    );
    if ((reefChance > 0 && indices.FEATURE_REEF >= 0) || (coldReefChance > 0 && indices.FEATURE_COLD_REEF >= 0)) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!adapter.isWater(x, y)) continue;
          if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;

          const absLat = Math.abs(adapter.getLatitude(x, y));
          const useCold = absLat >= resolved.aquatic.reefLatitudeSplit;
          const featureKey = useCold ? "FEATURE_COLD_REEF" : "FEATURE_REEF";
          const featureIdx = indices[featureKey];
          const chance = useCold ? coldReefChance : reefChance;
          if (featureIdx < 0 || chance <= 0) continue;
          if (!rollPercent(ctx, `features:owned:reef:${featureKey}`, chance)) continue;
          tryPlaceFeature(adapter, x, y, featureIdx);
        }
      }
    }
  }

  // --- Aquatic atolls ---
  if (resolved.groups.aquatic.enabled && indices.FEATURE_ATOLL >= 0) {
    const baseAtollChance = scaledChance(
      resolved.chances.FEATURE_ATOLL,
      resolved.groups.aquatic.multiplier
    );
    if (baseAtollChance > 0) {
      const atollCfg = resolved.aquatic.atoll;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!adapter.isWater(x, y)) continue;
          if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;

          let chance = baseAtollChance;
          if (atollCfg.enableClustering && atollCfg.clusterRadius > 0) {
            if (hasAdjacentFeatureType(x, y, indices.FEATURE_ATOLL, atollCfg.clusterRadius)) {
              const absLat = Math.abs(adapter.getLatitude(x, y));
              chance =
                absLat <= EQUATORIAL_BAND_DEG
                  ? atollCfg.growthChanceEquatorial
                  : atollCfg.growthChanceNonEquatorial;
            }
          }

          if (chance <= 0) continue;
          if (atollCfg.shallowWaterAdjacencyGateChance > 0 && isAdjacentToShallowWater(x, y)) {
            if (
              !rollPercent(
                ctx,
                "features:owned:atoll:shallow-gate",
                atollCfg.shallowWaterAdjacencyGateChance
              )
            ) {
              continue;
            }
          }
          if (!rollPercent(ctx, "features:owned:atoll", clampChance(chance))) continue;
          tryPlaceFeature(adapter, x, y, indices.FEATURE_ATOLL);
        }
      }
    }
  }

  // --- Aquatic lotus ---
  if (resolved.groups.aquatic.enabled && indices.FEATURE_LOTUS >= 0) {
    const lotusChance = scaledChance(resolved.chances.FEATURE_LOTUS, resolved.groups.aquatic.multiplier);
    if (lotusChance > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!adapter.isWater(x, y)) continue;
          if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;
          if (!rollPercent(ctx, "features:owned:lotus", lotusChance)) continue;
          tryPlaceFeature(adapter, x, y, indices.FEATURE_LOTUS);
        }
      }
    }
  }

  // --- Wetlands near rivers ---
  if (resolved.groups.wet.enabled) {
    const marshChance = scaledChance(resolved.chances.FEATURE_MARSH, resolved.groups.wet.multiplier);
    const bogChance = scaledChance(resolved.chances.FEATURE_TUNDRA_BOG, resolved.groups.wet.multiplier);

    if (marshChance > 0 || bogChance > 0) {
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (adapter.isWater(x, y)) continue;
          if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (!adapter.isAdjacentToRivers(x, y, 2)) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const isCold =
            symbol === "snow" ||
            symbol === "tundra" ||
            symbol === "boreal" ||
            surfaceTemperature[idx] <= 2;
          const featureKey = isCold ? "FEATURE_TUNDRA_BOG" : "FEATURE_MARSH";
          const featureIdx = indices[featureKey];
          const chance = isCold ? bogChance : marshChance;
          if (featureIdx < 0 || chance <= 0) continue;
          if (!rollPercent(ctx, `features:owned:wet:${featureKey}`, chance)) continue;
          tryPlaceFeature(adapter, x, y, featureIdx);
        }
      }
    }
  }

  // --- Wetlands on coastal land (mangroves) ---
  if (resolved.groups.wet.enabled && indices.FEATURE_MANGROVE >= 0) {
    const mangroveChance = scaledChance(resolved.chances.FEATURE_MANGROVE, resolved.groups.wet.multiplier);
    if (mangroveChance > 0) {
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (adapter.isWater(x, y)) continue;
          if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (!isCoastalLand(x, y)) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const isWarm =
            symbol === "tropicalRainforest" ||
            symbol === "tropicalSeasonal" ||
            surfaceTemperature[idx] >= 18;
          if (!isWarm) continue;
          if (!rollPercent(ctx, "features:owned:wet:mangrove", mangroveChance)) continue;
          tryPlaceFeature(adapter, x, y, indices.FEATURE_MANGROVE);
        }
      }
    }
  }

  // --- Wetlands in isolated basins (oasis/watering holes) ---
  if (resolved.groups.wet.enabled) {
    const oasisChance = scaledChance(resolved.chances.FEATURE_OASIS, resolved.groups.wet.multiplier);
    const wateringChance = scaledChance(
      resolved.chances.FEATURE_WATERING_HOLE,
      resolved.groups.wet.multiplier
    );

    if (oasisChance > 0 || wateringChance > 0) {
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (adapter.isWater(x, y)) continue;
          if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (isCoastalLand(x, y)) continue;
          if (adapter.isAdjacentToRivers(x, y, 1)) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const featureKey =
            symbol === "desert" || symbol === "temperateDry"
              ? "FEATURE_OASIS"
              : "FEATURE_WATERING_HOLE";
          const featureIdx = indices[featureKey];
          const chance = featureKey === "FEATURE_OASIS" ? oasisChance : wateringChance;
          if (featureIdx < 0 || chance <= 0) continue;
          if (hasAdjacentFeatureType(x, y, featureIdx, 1)) continue;
          if (!rollPercent(ctx, `features:owned:wet:${featureKey}`, chance)) continue;
          tryPlaceFeature(adapter, x, y, featureIdx);
        }
      }
    }
  }

  // --- Vegetated scatter ---
  if (resolved.groups.vegetated.enabled) {
    const vegMultiplier = resolved.groups.vegetated.multiplier;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        if (adapter.isWater(x, y)) continue;
        if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;
        if (isNavigableRiverPlot(x, y)) continue;

        const vegetationValue = vegetationDensity[idx] ?? 0;
        if (vegetationValue < 0.05) continue;

        const featureKey = pickVegetatedFeature(
          biomeIndex[idx] | 0,
          effectiveMoisture[idx] ?? 0,
          surfaceTemperature[idx] ?? 0,
          vegetationValue
        );
        if (!featureKey) continue;
        const featureIdx = indices[featureKey];
        if (featureIdx < 0) continue;

        const baseChance = scaledChance(resolved.chances[featureKey], vegMultiplier);
        const chance = clampChance(baseChance * Math.min(1, Math.max(0, vegetationValue)));
        if (!rollPercent(ctx, `features:owned:vegetated:${featureKey}`, chance)) continue;
        tryPlaceFeature(adapter, x, y, featureIdx);
      }
    }
  }
}
