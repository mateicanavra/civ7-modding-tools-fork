import { createLabelRng } from "@swooper/mapgen-core";
import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";

import type { BiomeSymbol } from "@mapgen/domain/ecology/types.js";
import { FEATURE_PLACEMENT_KEYS, type FeatureKey } from "@mapgen/domain/ecology/types.js";

import { biomeSymbolFromIndex } from "../../classify-biomes/index.js";
import { EcologyConfigSchema } from "../../../config.js";
import { PlanVegetationEmbellishmentsContract } from "../contract.js";
import { planDensityTweaksAtTile } from "../rules/density-tweaks.js";
import { planVolcanicVegetationAtTile } from "../rules/volcanic-vegetation.js";

type Config = Static<(typeof PlanVegetationEmbellishmentsContract)["strategies"]["default"]>;
type Input = Static<(typeof PlanVegetationEmbellishmentsContract)["input"]>;
type Placement =
  Static<(typeof PlanVegetationEmbellishmentsContract)["output"]>["placements"][number];

type ResolvedConfig = {
  story: { features: Required<Static<(typeof EcologyConfigSchema)["properties"]["features"]>> };
  featuresDensity: Required<Static<(typeof EcologyConfigSchema)["properties"]["featuresDensity"]>>;
};

const FEATURE_KEY_INDEX = FEATURE_PLACEMENT_KEYS.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {} as Record<FeatureKey, number>);

const NO_FEATURE = -1;

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const WARM_BIOMES: ReadonlySet<BiomeSymbol> = new Set([
  "temperateHumid",
  "tropicalSeasonal",
  "tropicalRainforest",
]);

const GRASSLAND_BIOMES: ReadonlySet<BiomeSymbol> = new Set(["temperateHumid", "tropicalSeasonal"]);

const TUNDRA_BIOMES: ReadonlySet<BiomeSymbol> = new Set(["snow", "tundra", "boreal"]);

const resolveConfig = (config: Config): ResolvedConfig =>
  applySchemaDefaults(
    PlanVegetationEmbellishmentsContract.strategies.default,
    config
  ) as ResolvedConfig;

const planVegetationEmbellishments = (input: Input, config: ResolvedConfig): Placement[] => {
  const {
    width,
    height,
    landMask,
    terrainType,
    featureKeyField,
    biomeIndex,
    rainfall,
    vegetationDensity,
    elevation,
    latitude,
    volcanicMask,
    navigableRiverTerrain,
  } = input;

  const rng = createLabelRng(input.seed);
  const featureField = featureKeyField.slice();
  const placements: Placement[] = [];

  const forestKey: FeatureKey = "FEATURE_FOREST";
  const rainforestKey: FeatureKey = "FEATURE_RAINFOREST";
  const taigaKey: FeatureKey = "FEATURE_TAIGA";

  const canPlace = (x: number, y: number): boolean => featureField[y * width + x] === NO_FEATURE;
  const place = (x: number, y: number, key: FeatureKey): void => {
    const idx = y * width + x;
    featureField[idx] = FEATURE_KEY_INDEX[key];
    placements.push({ x, y, feature: key });
  };

  const isNavigableRiverPlot = (idx: number): boolean =>
    navigableRiverTerrain >= 0 && terrainType[idx] === navigableRiverTerrain;

  const featuresCfg = config.story.features;
  const densityCfg = config.featuresDensity;

  const baseVolcanicForestChance = clampChance(featuresCfg.volcanicForestChance);
  const baseVolcanicTaigaChance = clampChance(featuresCfg.volcanicTaigaChance);
  const volcanicForestChance = clampChance(
    baseVolcanicForestChance + featuresCfg.volcanicForestBonus
  );
  const volcanicTaigaChance = clampChance(baseVolcanicTaigaChance + featuresCfg.volcanicTaigaBonus);
  const volcanicRadius = Math.max(1, Math.floor(featuresCfg.volcanicRadius));

  const volcanicForestMinRainfall = featuresCfg.volcanicForestMinRainfall;
  const volcanicTaigaMinLatitude = featuresCfg.volcanicTaigaMinLatitude;
  const volcanicTaigaMaxElevation = featuresCfg.volcanicTaigaMaxElevation;
  const volcanicTaigaMinRainfall = featuresCfg.volcanicTaigaMinRainfall;

  const rainforestExtraChance = densityCfg.rainforestExtraChance;
  const forestExtraChance = densityCfg.forestExtraChance;
  const taigaExtraChance = densityCfg.taigaExtraChance;

  const rainforestVegetationScale = densityCfg.rainforestVegetationScale;
  const forestVegetationScale = densityCfg.forestVegetationScale;
  const taigaVegetationScale = densityCfg.taigaVegetationScale;

  const rainforestMinRainfall = densityCfg.rainforestMinRainfall;
  const forestMinRainfall = densityCfg.forestMinRainfall;
  const taigaMaxElevation = densityCfg.taigaMaxElevation;
  const minVegetationForBonus = densityCfg.minVegetationForBonus;

  const tropicalBiome: BiomeSymbol = "tropicalRainforest";

  const hasVolcanicHotspots = volcanicMask.some((value) => value === 1);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      if (landMask[idx] === 0) continue;
      if (featureField[idx] !== NO_FEATURE) continue;
      if (isNavigableRiverPlot(idx)) continue;

      const vegetation = vegetationDensity[idx] ?? 0;
      if (vegetation < minVegetationForBonus) continue;

      const biome = biomeSymbolFromIndex(biomeIndex[idx] | 0);
      const elevationValue = elevation[idx] ?? 0;
      const rainfallValue = rainfall[idx] | 0;
      const latAbs = Math.abs(latitude[idx] ?? 0);

      if (hasVolcanicHotspots) {
        if (
          planVolcanicVegetationAtTile({
            width,
            height,
            x,
            y,
            rng,
            volcanicMask,
            volcanicRadius,
            forestKey,
            taigaKey,
            forestChance: volcanicForestChance,
            taigaChance: volcanicTaigaChance,
            biome,
            elevation: elevationValue,
            rainfall: rainfallValue,
            latAbs,
            warmBiomes: WARM_BIOMES,
            tundraBiomes: TUNDRA_BIOMES,
            forestMinRainfall: volcanicForestMinRainfall,
            taigaMinLatitude: volcanicTaigaMinLatitude,
            taigaMaxElevation: volcanicTaigaMaxElevation,
            taigaMinRainfall: volcanicTaigaMinRainfall,
            canPlace,
            place,
          })
        ) {
          continue;
        }
      }

      const rainforestChance = clampChance(
        rainforestExtraChance + Math.round(vegetation * rainforestVegetationScale)
      );
      const forestChance = clampChance(forestExtraChance + Math.round(vegetation * forestVegetationScale));
      const taigaChance = clampChance(taigaExtraChance + Math.round(vegetation * taigaVegetationScale));

      if (
        planDensityTweaksAtTile({
          x,
          y,
          rng,
          rainforestKey,
          forestKey,
          taigaKey,
          rainfall: rainfallValue,
          elevation: elevationValue,
          biome,
          tropicalBiome,
          grasslandBiomes: GRASSLAND_BIOMES,
          tundraBiomes: TUNDRA_BIOMES,
          rainforestExtraChance: rainforestChance,
          forestExtraChance: forestChance,
          taigaExtraChance: taigaChance,
          rainforestMinRainfall,
          forestMinRainfall,
          taigaMaxElevation,
          canPlace,
          place,
        })
      ) {
        continue;
      }
    }
  }

  return placements;
};

export const defaultStrategy = createStrategy(PlanVegetationEmbellishmentsContract, "default", {
  resolveConfig,
  run: (input: Input, config: Config) => ({
    placements: planVegetationEmbellishments(input, resolveConfig(config)),
  }),
});
