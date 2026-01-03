import { Type, type Static } from "typebox";
import { createOp } from "@swooper/mapgen-core/authoring";

import { FeaturesConfigSchema, FeaturesDensityConfigSchema } from "../../config.js";
import { FeaturesEmbellishmentsConfigSchema, type FeaturesEmbellishmentsConfig } from "./schema.js";
import { resolveEmbellishmentFeatureIndices } from "./rules/indices.js";
import { planParadiseReefs } from "./rules/paradise-reefs.js";
import { planShelfReefs } from "./rules/shelf-reefs.js";
import { planVolcanicVegetationAtTile } from "./rules/volcanic-vegetation.js";
import { planDensityTweaksAtTile } from "./rules/density-tweaks.js";

const FeaturesEmbellishmentsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    adapter: Type.Any({ description: "Engine adapter (read-only queries)." }),
    biomeId: Type.Any({ description: "Engine biome IDs per tile." }),
    rainfall: Type.Any({ description: "Rainfall per tile (0..255)." }),
    vegetationDensity: Type.Any({ description: "Vegetation density per tile (0..1)." }),
    hotspotParadise: Type.Any({ description: "Paradise hotspot coordinates (x,y)." }),
    hotspotVolcanic: Type.Any({ description: "Volcanic hotspot coordinates (x,y)." }),
    passiveShelf: Type.Any({ description: "Passive shelf coordinates (x,y)." }),
    rand: Type.Any({ description: "Deterministic RNG (ctxRandom wrapper)." }),
  },
  { additionalProperties: false }
);

const FeaturePlacementSchema = Type.Object(
  {
    x: Type.Integer({ minimum: 0 }),
    y: Type.Integer({ minimum: 0 }),
    feature: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false }
);

const FeaturesEmbellishmentsOutputSchema = Type.Object(
  {
    placements: Type.Array(FeaturePlacementSchema),
  },
  { additionalProperties: false }
);

const clampChance = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const featuresEmbellishments = createOp({
  kind: "compute",
  id: "ecology/features/embellishments",
  input: FeaturesEmbellishmentsInputSchema,
  output: FeaturesEmbellishmentsOutputSchema,
  config: FeaturesEmbellishmentsConfigSchema,
  run: (input: FeaturesEmbellishmentsInput, config: FeaturesEmbellishmentsConfig) => {
    const {
      width,
      height,
      adapter,
      biomeId,
      rainfall,
      vegetationDensity,
      hotspotParadise,
      hotspotVolcanic,
      passiveShelf,
      rand,
    } = input;

    const featuresCfg = config.story.features as Required<Static<typeof FeaturesConfigSchema>>;
    const densityCfg = config.featuresDensity as Required<Static<typeof FeaturesDensityConfigSchema>>;

    const { reefIndex, rainforestIdx, forestIdx, taigaIdx, NO_FEATURE } =
      resolveEmbellishmentFeatureIndices(adapter);

    const featureField = new Int32Array(width * height);
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        featureField[rowOffset + x] = adapter.getFeatureType(x, y) | 0;
      }
    }

    const placements: { x: number; y: number; feature: number }[] = [];

    const place = (x: number, y: number, featureIdx: number): void => {
      const idx = y * width + x;
      featureField[idx] = featureIdx;
      placements.push({ x, y, feature: featureIdx });
    };

    const canPlace = (x: number, y: number, featureIdx: number): boolean =>
      featureField[y * width + x] === NO_FEATURE && adapter.canHaveFeature(x, y, featureIdx);

    const inBounds = (x: number, y: number): boolean =>
      x >= 0 && x < width && y >= 0 && y < height;

    const paradiseReefChance = clampChance(featuresCfg.paradiseReefChance);
    const paradiseReefRadius = Math.max(0, Math.floor(featuresCfg.paradiseReefRadius));

    if (reefIndex !== -1 && hotspotParadise.size > 0 && paradiseReefChance > 0 && paradiseReefRadius > 0) {
      planParadiseReefs({
        adapter,
        reefIndex,
        inBounds,
        rand,
        paradiseReefChance,
        paradiseReefRadius,
        hotspotParadise,
        canPlace,
        place,
      });
    }

    const shelfReefMultiplier = Math.max(0, densityCfg.shelfReefMultiplier);
    const shelfReefRadius = Math.max(0, Math.floor(densityCfg.shelfReefRadius));
    const shelfReefChance = clampChance(paradiseReefChance * shelfReefMultiplier);

    if (reefIndex !== -1 && passiveShelf.size > 0 && shelfReefChance > 0 && shelfReefRadius > 0) {
      planShelfReefs({
        adapter,
        reefIndex,
        inBounds,
        rand,
        shelfReefChance,
        shelfReefRadius,
        passiveShelf,
        canPlace,
        place,
      });
    }

    const baseVolcanicForestChance = clampChance(featuresCfg.volcanicForestChance);
    const baseVolcanicTaigaChance = clampChance(featuresCfg.volcanicTaigaChance);
    const volcanicForestChance = clampChance(
      baseVolcanicForestChance + featuresCfg.volcanicForestBonus
    );
    const volcanicTaigaChance = clampChance(
      baseVolcanicTaigaChance + featuresCfg.volcanicTaigaBonus
    );
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

    const grasslandBiome = adapter.getBiomeGlobal("BIOME_GRASSLAND");
    const tropicalBiome = adapter.getBiomeGlobal("BIOME_TROPICAL");
    const tundraBiome = adapter.getBiomeGlobal("BIOME_TUNDRA");

    const navigableRiverTerrain = adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER");

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x;
        if (adapter.isWater(x, y)) continue;
        if (featureField[idx] !== NO_FEATURE) continue;
        if (navigableRiverTerrain >= 0 && adapter.getTerrainType(x, y) === navigableRiverTerrain) {
          continue;
        }

        const vegetation = vegetationDensity[idx] ?? 0;
        if (vegetation < minVegetationForBonus) continue;

        const elevation = adapter.getElevation(x, y);
        const rainfallValue = rainfall[idx] | 0;
        const biome = biomeId[idx] | 0;
        const latAbs = Math.abs(adapter.getLatitude(x, y));

        if (
          planVolcanicVegetationAtTile({
            adapter,
            x,
            y,
            inBounds,
            rand,
            hotspotVolcanic,
            forestIdx,
            taigaIdx,
            volcanicForestChance,
            volcanicTaigaChance,
            volcanicRadius,
            biome,
            elevation,
            rainfall: rainfallValue,
            latAbs,
            grasslandBiome,
            tropicalBiome,
            tundraBiome,
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

        const rainforestChance = clampChance(
          rainforestExtraChance + Math.round(vegetation * rainforestVegetationScale)
        );
        const forestChance = clampChance(
          forestExtraChance + Math.round(vegetation * forestVegetationScale)
        );
        const taigaChance = clampChance(taigaExtraChance + Math.round(vegetation * taigaVegetationScale));

        if (
          planDensityTweaksAtTile({
            adapter,
            x,
            y,
            rand,
            rainforestIdx,
            forestIdx,
            taigaIdx,
            rainfall: rainfallValue,
            elevation,
            biome,
            tropicalBiome,
            grasslandBiome,
            tundraBiome,
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

    return { placements };
  },
} as const);

export type FeaturesEmbellishmentsInput = Static<typeof FeaturesEmbellishmentsInputSchema>;
export type FeaturesEmbellishmentsOutput = Static<typeof FeaturesEmbellishmentsOutputSchema>;

export * from "./schema.js";
