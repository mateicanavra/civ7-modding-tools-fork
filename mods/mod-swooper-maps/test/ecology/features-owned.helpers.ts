import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { applySchemaDefaults } from "@swooper/mapgen-core/authoring";
import { FoundationDirectionalityConfigSchema } from "@mapgen/config";

import {
  publishBiomeClassificationArtifact,
  publishClimateFieldArtifact,
  publishHeightfieldArtifact,
} from "../../src/recipes/standard/artifacts.js";

export const disabledEmbellishmentsConfig = {
  story: {
    features: {
      paradiseReefChance: 0,
      paradiseReefRadius: 0,
      volcanicForestChance: 0,
      volcanicForestBonus: 0,
      volcanicTaigaChance: 0,
      volcanicTaigaBonus: 0,
    },
  },
  featuresDensity: {
    shelfReefMultiplier: 0,
    shelfReefRadius: 0,
    rainforestExtraChance: 0,
    forestExtraChance: 0,
    taigaExtraChance: 0,
    rainforestVegetationScale: 0,
    forestVegetationScale: 0,
    taigaVegetationScale: 0,
    minVegetationForBonus: 1,
  },
};

type WaterMask = (x: number, y: number) => boolean;

type FeaturesTestContextOptions = {
  width: number;
  height: number;
  rng?: (max: number, label: string) => number;
  canHaveFeature?: (x: number, y: number, featureType: number) => boolean;
  isWater?: WaterMask;
  defaultBiomeIndex?: number;
  defaultVegetation?: number;
  defaultMoisture?: number;
  defaultTemperature?: number;
  defaultRainfall?: number;
  defaultHumidity?: number;
  defaultAridity?: number;
  defaultFreeze?: number;
};

export function createFeaturesTestContext(options: FeaturesTestContextOptions) {
  const {
    width,
    height,
    rng,
    canHaveFeature,
    isWater = () => false,
    defaultBiomeIndex = 4,
    defaultVegetation = 0.5,
    defaultMoisture = 120,
    defaultTemperature = 15,
    defaultRainfall = 120,
    defaultHumidity = 80,
    defaultAridity = 0.3,
    defaultFreeze = 0.1,
  } = options;

  const adapter = createMockAdapter({ width, height, rng, canHaveFeature });
  adapter.fillWater(false);

  const directionality = applySchemaDefaults(FoundationDirectionalityConfigSchema, {});
  const settings = {
    seed: 0,
    dimensions: { width, height },
    latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
    wrap: { wrapX: false, wrapY: false },
    directionality,
  };
  const ctx = createExtendedMapContext(
    { width, height },
    adapter,
    settings
  );

  const size = width * height;
  ctx.buffers.heightfield.elevation.fill(0);
  ctx.buffers.heightfield.landMask.fill(1);
  ctx.buffers.climate.rainfall.fill(defaultRainfall);
  ctx.buffers.climate.humidity.fill(defaultHumidity);

  const marineId = adapter.getBiomeGlobal("BIOME_MARINE");
  const landId = adapter.getBiomeGlobal("BIOME_GRASSLAND");

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      if (isWater(x, y)) {
        adapter.setWater(x, y, true);
        ctx.buffers.heightfield.landMask[idx] = 0;
        ctx.fields.biomeId[idx] = marineId;
      } else {
        ctx.fields.biomeId[idx] = landId;
      }
    }
  }

  const biomeIndex = new Uint8Array(size).fill(defaultBiomeIndex);
  const vegetationDensity = new Float32Array(size).fill(defaultVegetation);
  const effectiveMoisture = new Float32Array(size).fill(defaultMoisture);
  const surfaceTemperature = new Float32Array(size).fill(defaultTemperature);
  const aridityIndex = new Float32Array(size).fill(defaultAridity);
  const freezeIndex = new Float32Array(size).fill(defaultFreeze);

  publishHeightfieldArtifact(ctx);
  publishClimateFieldArtifact(ctx);
  publishBiomeClassificationArtifact(ctx, {
    width,
    height,
    biomeIndex,
    vegetationDensity,
    effectiveMoisture,
    surfaceTemperature,
    aridityIndex,
    freezeIndex,
  });

  return {
    ctx,
    adapter,
    classification: {
      biomeIndex,
      vegetationDensity,
      effectiveMoisture,
      surfaceTemperature,
      aridityIndex,
      freezeIndex,
    },
  };
}
