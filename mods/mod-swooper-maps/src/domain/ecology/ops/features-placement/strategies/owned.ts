import type { FeaturePlacement } from "../types.js";
import type { FeaturesPlacementInput } from "../types.js";
import {
  resolveFeaturesPlacementOwnedConfig,
  type FeaturePlacementKey,
} from "../schema.js";
import { resolveFeatureIndices, resolveNaturalWonderIndices } from "../rules/indices.js";
import {
  hasAdjacentFeatureType,
  isAdjacentToLand,
  isAdjacentToShallowWater,
  isCoastalLand,
} from "../rules/adjacency.js";
import { pickVegetatedFeature } from "../rules/selection.js";
import { biomeSymbolFromIndex } from "../../classify-biomes.js";

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const rollPercent = (rand: (label: string, max: number) => number, label: string, chance: number): boolean =>
  chance > 0 && rand(label, 100) < chance;

export function planOwnedFeaturePlacements(
  input: FeaturesPlacementInput,
  config?: Parameters<typeof resolveFeaturesPlacementOwnedConfig>[0]
): FeaturePlacement[] {
  const { width, height, adapter, biomeIndex, vegetationDensity, effectiveMoisture, surfaceTemperature, rand } = input;
  const resolved = resolveFeaturesPlacementOwnedConfig(config);

  const indices = resolveFeatureIndices(adapter);
  const naturalWonderIndices = resolveNaturalWonderIndices(adapter);
  const NO_FEATURE = adapter.NO_FEATURE;

  const navigableRiverTerrain = adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER");
  const coastTerrain = adapter.getTerrainTypeIndex("TERRAIN_COAST");

  const isWater = (x: number, y: number): boolean => adapter.isWater(x, y);
  const getTerrainType = (x: number, y: number): number => adapter.getTerrainType(x, y);

  const isNavigableRiverPlot = (x: number, y: number): boolean =>
    navigableRiverTerrain >= 0 && adapter.getTerrainType(x, y) === navigableRiverTerrain;

  const featureField = new Int32Array(width * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      featureField[rowOffset + x] = adapter.getFeatureType(x, y) | 0;
    }
  }

  const placements: FeaturePlacement[] = [];

  const setPlanned = (x: number, y: number, featureIdx: number): void => {
    const idx = y * width + x;
    featureField[idx] = featureIdx;
    placements.push({ x, y, feature: featureIdx });
  };

  const canPlaceAt = (x: number, y: number, featureIdx: number): boolean =>
    featureField[y * width + x] === NO_FEATURE && adapter.canHaveFeature(x, y, featureIdx);

  const scaledChance = (base: number, multiplier: number): number => clampChance(base * multiplier);

  const hasAdjacentNaturalWonder = (x: number, y: number, radius: number): boolean => {
    if (naturalWonderIndices.size === 0) return false;
    for (let dy = -radius; dy <= radius; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (dx === 0 && dy === 0) continue;
        const feature = featureField[ny * width + nx];
        if (naturalWonderIndices.has(feature)) return true;
      }
    }
    return false;
  };

  const resolvedGroups = resolved.groups;

  // --- Ice ---
  if (resolvedGroups.ice.multiplier > 0 && indices.FEATURE_ICE >= 0) {
    const iceChance = scaledChance(resolved.chances.FEATURE_ICE, resolvedGroups.ice.multiplier);
    if (iceChance > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y, indices.FEATURE_ICE)) continue;

          const absLat = Math.abs(adapter.getLatitude(x, y));
          if (absLat < resolved.ice.minAbsLatitude) continue;
          if (
            resolved.ice.forbidAdjacentToLand &&
            isAdjacentToLand(isWater, width, height, x, y, resolved.ice.landAdjacencyRadius)
          ) {
            continue;
          }
          if (
            resolved.ice.forbidAdjacentToNaturalWonders &&
            hasAdjacentNaturalWonder(x, y, resolved.ice.naturalWonderAdjacencyRadius)
          ) {
            continue;
          }
          if (!rollPercent(rand, "features:owned:ice", iceChance)) continue;
          setPlanned(x, y, indices.FEATURE_ICE);
        }
      }
    }
  }

  // --- Aquatic reefs ---
  if (resolvedGroups.aquatic.multiplier > 0) {
    const reefChance = scaledChance(resolved.chances.FEATURE_REEF, resolvedGroups.aquatic.multiplier);
    const coldReefChance = scaledChance(
      resolved.chances.FEATURE_COLD_REEF,
      resolvedGroups.aquatic.multiplier
    );
    if ((reefChance > 0 && indices.FEATURE_REEF >= 0) || (coldReefChance > 0 && indices.FEATURE_COLD_REEF >= 0)) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          const absLat = Math.abs(adapter.getLatitude(x, y));
          const useCold = absLat >= resolved.aquatic.reefLatitudeSplit;
          const featureKey: FeaturePlacementKey = useCold ? "FEATURE_COLD_REEF" : "FEATURE_REEF";
          const featureIdx = indices[featureKey];
          const chance = useCold ? coldReefChance : reefChance;
          if (featureIdx < 0 || chance <= 0) continue;
          if (!canPlaceAt(x, y, featureIdx)) continue;
          if (!rollPercent(rand, `features:owned:reef:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureIdx);
        }
      }
    }
  }

  // --- Aquatic atolls ---
  if (resolvedGroups.aquatic.multiplier > 0 && indices.FEATURE_ATOLL >= 0) {
    const baseAtollChance = scaledChance(
      resolved.chances.FEATURE_ATOLL,
      resolvedGroups.aquatic.multiplier
    );
    if (baseAtollChance > 0) {
      const atollCfg = resolved.aquatic.atoll;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y, indices.FEATURE_ATOLL)) continue;

          let chance = baseAtollChance;
          if (atollCfg.enableClustering && atollCfg.clusterRadius > 0) {
            if (hasAdjacentFeatureType(featureField, width, height, x, y, indices.FEATURE_ATOLL, atollCfg.clusterRadius)) {
              const absLat = Math.abs(adapter.getLatitude(x, y));
              chance =
                absLat <= atollCfg.equatorialBandMaxAbsLatitude
                  ? atollCfg.growthChanceEquatorial
                  : atollCfg.growthChanceNonEquatorial;
            }
          }

          if (chance <= 0) continue;
          if (
            atollCfg.shallowWaterAdjacencyGateChance > 0 &&
            isAdjacentToShallowWater(
              getTerrainType,
              coastTerrain,
              width,
              height,
              x,
              y,
              atollCfg.shallowWaterAdjacencyRadius
            )
          ) {
            if (!rollPercent(rand, "features:owned:atoll:shallow-gate", atollCfg.shallowWaterAdjacencyGateChance)) {
              continue;
            }
          }
          if (!rollPercent(rand, "features:owned:atoll", clampChance(chance))) continue;
          setPlanned(x, y, indices.FEATURE_ATOLL);
        }
      }
    }
  }

  // --- Aquatic lotus ---
  if (resolvedGroups.aquatic.multiplier > 0 && indices.FEATURE_LOTUS >= 0) {
    const lotusChance = scaledChance(resolved.chances.FEATURE_LOTUS, resolvedGroups.aquatic.multiplier);
    if (lotusChance > 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y, indices.FEATURE_LOTUS)) continue;
          if (!rollPercent(rand, "features:owned:lotus", lotusChance)) continue;
          setPlanned(x, y, indices.FEATURE_LOTUS);
        }
      }
    }
  }

  // --- Wetlands near rivers ---
  if (resolvedGroups.wet.multiplier > 0) {
    const marshChance = scaledChance(resolved.chances.FEATURE_MARSH, resolvedGroups.wet.multiplier);
    const bogChance = scaledChance(resolved.chances.FEATURE_TUNDRA_BOG, resolvedGroups.wet.multiplier);
    if (marshChance > 0 || bogChance > 0) {
      const coldBiomeSet = new Set(resolved.wet.coldBiomeSymbols);
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (isWater(x, y)) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (!adapter.isAdjacentToRivers(x, y, resolved.wet.nearRiverRadius)) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const isCold = coldBiomeSet.has(symbol) || surfaceTemperature[idx] <= resolved.wet.coldTemperatureMax;
          const featureKey: FeaturePlacementKey = isCold ? "FEATURE_TUNDRA_BOG" : "FEATURE_MARSH";
          const featureIdx = indices[featureKey];
          const chance = isCold ? bogChance : marshChance;
          if (featureIdx < 0 || chance <= 0) continue;
          if (!canPlaceAt(x, y, featureIdx)) continue;
          if (!rollPercent(rand, `features:owned:wet:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureIdx);
        }
      }
    }
  }

  // --- Wetlands on coastal land (mangroves) ---
  if (resolvedGroups.wet.multiplier > 0 && indices.FEATURE_MANGROVE >= 0) {
    const mangroveChance = scaledChance(resolved.chances.FEATURE_MANGROVE, resolvedGroups.wet.multiplier);
    if (mangroveChance > 0) {
      const warmBiomeSet = new Set(resolved.wet.mangroveWarmBiomeSymbols);
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (isWater(x, y)) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (!isCoastalLand(isWater, width, height, x, y, resolved.wet.coastalAdjacencyRadius)) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const isWarm = warmBiomeSet.has(symbol) || surfaceTemperature[idx] >= resolved.wet.mangroveWarmTemperatureMin;
          if (!isWarm) continue;
          if (!canPlaceAt(x, y, indices.FEATURE_MANGROVE)) continue;
          if (!rollPercent(rand, "features:owned:wet:mangrove", mangroveChance)) continue;
          setPlanned(x, y, indices.FEATURE_MANGROVE);
        }
      }
    }
  }

  // --- Wetlands in isolated basins (oasis/watering holes) ---
  if (resolvedGroups.wet.multiplier > 0) {
    const oasisChance = scaledChance(resolved.chances.FEATURE_OASIS, resolvedGroups.wet.multiplier);
    const wateringChance = scaledChance(resolved.chances.FEATURE_WATERING_HOLE, resolvedGroups.wet.multiplier);

    if (oasisChance > 0 || wateringChance > 0) {
      const oasisBiomeSet = new Set(resolved.wet.oasisBiomeSymbols);
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (isWater(x, y)) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (isCoastalLand(isWater, width, height, x, y, resolved.wet.coastalAdjacencyRadius)) continue;
          if (adapter.isAdjacentToRivers(x, y, resolved.wet.isolatedRiverRadius)) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const featureKey: FeaturePlacementKey = oasisBiomeSet.has(symbol)
            ? "FEATURE_OASIS"
            : "FEATURE_WATERING_HOLE";
          const featureIdx = indices[featureKey];
          const chance = featureKey === "FEATURE_OASIS" ? oasisChance : wateringChance;
          if (featureIdx < 0 || chance <= 0) continue;
          if (!canPlaceAt(x, y, featureIdx)) continue;
          if (hasAdjacentFeatureType(featureField, width, height, x, y, featureIdx, resolved.wet.isolatedSpacingRadius)) {
            continue;
          }
          if (!rollPercent(rand, `features:owned:wet:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureIdx);
        }
      }
    }
  }

  // --- Vegetated scatter ---
  if (resolvedGroups.vegetated.multiplier > 0) {
    const vegMultiplier = resolvedGroups.vegetated.multiplier;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        if (isWater(x, y)) continue;
        if (isNavigableRiverPlot(x, y)) continue;

        const vegetationValue = vegetationDensity[idx] ?? 0;
        if (vegetationValue < resolved.vegetated.minVegetation) continue;

        const featureKey = pickVegetatedFeature({
          symbolIndex: biomeIndex[idx] | 0,
          moistureValue: effectiveMoisture[idx] ?? 0,
          temperatureValue: surfaceTemperature[idx] ?? 0,
          vegetationValue,
          rules: resolved.vegetated,
        });
        if (!featureKey) continue;
        const featureIdx = indices[featureKey];
        if (featureIdx < 0) continue;
        if (!canPlaceAt(x, y, featureIdx)) continue;

        const baseChance = scaledChance(resolved.chances[featureKey], vegMultiplier);
        const vegetationScalar = Math.min(1, Math.max(0, vegetationValue * resolved.vegetated.vegetationChanceScalar));
        const chance = clampChance(baseChance * vegetationScalar);
        if (!rollPercent(rand, `features:owned:vegetated:${featureKey}`, chance)) continue;
        setPlanned(x, y, featureIdx);
      }
    }
  }

  return placements;
}
