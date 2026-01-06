import { type Static } from "@swooper/mapgen-core/authoring";
import { PlanFeaturePlacementsContract } from "./contract.js";
import type { ResolvedFeaturesPlacementConfig } from "./types.js";
import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";
import {
  hasAdjacentFeatureType,
  isAdjacentToLand,
  isAdjacentToShallowWater,
  isCoastalLand,
} from "./rules/adjacency.js";
import { pickVegetatedFeature } from "./rules/selection.js";
import { biomeSymbolFromIndex } from "../classify-biomes/index.js";
import { createLabelRng } from "../rng.js";

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const rollPercent = (rng: (label: string, max: number) => number, label: string, chance: number): boolean =>
  chance > 0 && rng(label, 100) < chance;

const NO_FEATURE = -1;

type FeaturesPlacementInput = Static<typeof PlanFeaturePlacementsContract["input"]>;
type FeaturePlacement = Static<
  typeof PlanFeaturePlacementsContract["output"]
>["placements"][number];

export function planFeaturePlacements(
  input: FeaturesPlacementInput,
  config: ResolvedFeaturesPlacementConfig
): FeaturePlacement[] {
  const {
    width,
    height,
    biomeIndex,
    vegetationDensity,
    effectiveMoisture,
    surfaceTemperature,
    aridityIndex,
    freezeIndex,
    landMask,
    terrainType,
    latitude,
    featureKeyField,
    naturalWonderMask,
    nearRiverMask,
    isolatedRiverMask,
    navigableRiverTerrain,
    coastTerrain,
  } = input;

  const rng = createLabelRng(input.seed);
  const resolved = config;
  const featureField = featureKeyField.slice();
  const placements: FeaturePlacement[] = [];

  const isWater = (x: number, y: number): boolean => landMask[y * width + x] === 0;
  const getTerrainType = (x: number, y: number): number => terrainType[y * width + x] ?? -1;

  const isNavigableRiverPlot = (x: number, y: number): boolean =>
    navigableRiverTerrain >= 0 && getTerrainType(x, y) === navigableRiverTerrain;

  const setPlanned = (x: number, y: number, featureIdx: number): void => {
    const idx = y * width + x;
    featureField[idx] = featureIdx;
    placements.push({ x, y, feature: FEATURE_PLACEMENT_KEYS[featureIdx]! });
  };

  const canPlaceAt = (x: number, y: number): boolean =>
    featureField[y * width + x] === NO_FEATURE;

  const scaledChance = (base: number, multiplier: number): number => clampChance(base * multiplier);

  const hasAdjacentNaturalWonder = (x: number, y: number, radius: number): boolean => {
    if (radius <= 0) return false;
    for (let dy = -radius; dy <= radius; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        if (dx === 0 && dy === 0) continue;
        if (naturalWonderMask[ny * width + nx] === 1) return true;
      }
    }
    return false;
  };

  const resolvedGroups = resolved.groups;

  // --- Ice ---
  if (resolvedGroups.ice.multiplier > 0) {
    const iceChance = scaledChance(resolved.chances.FEATURE_ICE, resolvedGroups.ice.multiplier);
    if (iceChance > 0) {
      const iceIdx = FEATURE_KEY_INDEX.FEATURE_ICE;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;

          const absLat = Math.abs(latitude[y * width + x] ?? 0);
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
          if (!rollPercent(rng, "features:plan:ice", iceChance)) continue;
          setPlanned(x, y, iceIdx);
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
    if (reefChance > 0 || coldReefChance > 0) {
      const warmReefIdx = FEATURE_KEY_INDEX.FEATURE_REEF;
      const coldReefIdx = FEATURE_KEY_INDEX.FEATURE_COLD_REEF;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;
          const absLat = Math.abs(latitude[y * width + x] ?? 0);
          const useCold = absLat >= resolved.aquatic.reefLatitudeSplit;
          const featureKey: FeatureKey = useCold ? "FEATURE_COLD_REEF" : "FEATURE_REEF";
          const featureIdx = useCold ? coldReefIdx : warmReefIdx;
          const chance = useCold ? coldReefChance : reefChance;
          if (chance <= 0) continue;
          if (!rollPercent(rng, `features:plan:reef:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureIdx);
        }
      }
    }
  }

  // --- Aquatic atolls ---
  if (resolvedGroups.aquatic.multiplier > 0) {
    const baseAtollChance = scaledChance(
      resolved.chances.FEATURE_ATOLL,
      resolvedGroups.aquatic.multiplier
    );
    if (baseAtollChance > 0) {
      const atollCfg = resolved.aquatic.atoll;
      const atollIdx = FEATURE_KEY_INDEX.FEATURE_ATOLL;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;

          let chance = baseAtollChance;
          if (atollCfg.enableClustering && atollCfg.clusterRadius > 0) {
            if (hasAdjacentFeatureType(featureField, width, height, x, y, atollIdx, atollCfg.clusterRadius)) {
              const absLat = Math.abs(latitude[y * width + x] ?? 0);
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
            if (!rollPercent(rng, "features:plan:atoll:shallow-gate", atollCfg.shallowWaterAdjacencyGateChance)) {
              continue;
            }
          }
          if (!rollPercent(rng, "features:plan:atoll", clampChance(chance))) continue;
          setPlanned(x, y, atollIdx);
        }
      }
    }
  }

  // --- Aquatic lotus ---
  if (resolvedGroups.aquatic.multiplier > 0) {
    const lotusChance = scaledChance(resolved.chances.FEATURE_LOTUS, resolvedGroups.aquatic.multiplier);
    if (lotusChance > 0) {
      const lotusIdx = FEATURE_KEY_INDEX.FEATURE_LOTUS;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!isWater(x, y)) continue;
          if (!canPlaceAt(x, y)) continue;
          if (!rollPercent(rng, "features:plan:lotus", lotusChance)) continue;
          setPlanned(x, y, lotusIdx);
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
      const marshIdx = FEATURE_KEY_INDEX.FEATURE_MARSH;
      const bogIdx = FEATURE_KEY_INDEX.FEATURE_TUNDRA_BOG;
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (landMask[idx] === 0) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (nearRiverMask[idx] !== 1) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const isCold = coldBiomeSet.has(symbol) || surfaceTemperature[idx] <= resolved.wet.coldTemperatureMax;
          const featureKey: FeatureKey = isCold ? "FEATURE_TUNDRA_BOG" : "FEATURE_MARSH";
          const featureIdx = isCold ? bogIdx : marshIdx;
          const chance = isCold ? bogChance : marshChance;
          if (chance <= 0) continue;
          if (!canPlaceAt(x, y)) continue;
          if (!rollPercent(rng, `features:plan:wet:${featureKey}`, chance)) continue;
          setPlanned(x, y, featureIdx);
        }
      }
    }
  }

  // --- Wetlands on coastal land (mangroves) ---
  if (resolvedGroups.wet.multiplier > 0) {
    const mangroveChance = scaledChance(resolved.chances.FEATURE_MANGROVE, resolvedGroups.wet.multiplier);
    if (mangroveChance > 0) {
      const warmBiomeSet = new Set(resolved.wet.mangroveWarmBiomeSymbols);
      const mangroveIdx = FEATURE_KEY_INDEX.FEATURE_MANGROVE;
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (landMask[idx] === 0) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (!isCoastalLand(isWater, width, height, x, y, resolved.wet.coastalAdjacencyRadius)) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const isWarm = warmBiomeSet.has(symbol) || surfaceTemperature[idx] >= resolved.wet.mangroveWarmTemperatureMin;
          if (!isWarm) continue;
          if (!canPlaceAt(x, y)) continue;
          if (!rollPercent(rng, "features:plan:wet:mangrove", mangroveChance)) continue;
          setPlanned(x, y, mangroveIdx);
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
      const oasisIdx = FEATURE_KEY_INDEX.FEATURE_OASIS;
      const wateringIdx = FEATURE_KEY_INDEX.FEATURE_WATERING_HOLE;
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x;
          if (landMask[idx] === 0) continue;
          if (isNavigableRiverPlot(x, y)) continue;
          if (isCoastalLand(isWater, width, height, x, y, resolved.wet.coastalAdjacencyRadius)) continue;
          if (isolatedRiverMask[idx] === 1) continue;

          const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
          const featureKey: FeatureKey = oasisBiomeSet.has(symbol)
            ? "FEATURE_OASIS"
            : "FEATURE_WATERING_HOLE";
          const featureIdx = featureKey === "FEATURE_OASIS" ? oasisIdx : wateringIdx;
          const chance = featureKey === "FEATURE_OASIS" ? oasisChance : wateringChance;
          if (chance <= 0) continue;
          if (!canPlaceAt(x, y)) continue;
          if (hasAdjacentFeatureType(featureField, width, height, x, y, featureIdx, resolved.wet.isolatedSpacingRadius)) {
            continue;
          }
          if (!rollPercent(rng, `features:plan:wet:${featureKey}`, chance)) continue;
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
        if (landMask[idx] === 0) continue;
        if (isNavigableRiverPlot(x, y)) continue;

        const vegetationValue = vegetationDensity[idx] ?? 0;
        const symbol = biomeSymbolFromIndex(biomeIndex[idx] | 0);
        const minVeg = resolved.vegetated.minVegetationByBiome[symbol];
        if (vegetationValue < minVeg) continue;

        const featureKey = pickVegetatedFeature({
          symbolIndex: biomeIndex[idx] | 0,
          moistureValue: effectiveMoisture[idx] ?? 0,
          temperatureValue: surfaceTemperature[idx] ?? 0,
          vegetationValue,
          aridityIndex: aridityIndex[idx] ?? 0,
          freezeIndex: freezeIndex[idx] ?? 0,
          rules: resolved.vegetated,
        });
        if (!featureKey) continue;
        const featureIdx = FEATURE_KEY_INDEX[featureKey];
        if (!canPlaceAt(x, y)) continue;

        const baseChance = scaledChance(resolved.chances[featureKey], vegMultiplier);
        const vegetationScalar = Math.min(1, Math.max(0, vegetationValue * resolved.vegetated.vegetationChanceScalar));
        const chance = clampChance(baseChance * vegetationScalar);
        if (!rollPercent(rng, `features:plan:vegetated:${featureKey}`, chance)) continue;
        setPlanned(x, y, featureIdx);
      }
    }
  }

  return placements;
}
