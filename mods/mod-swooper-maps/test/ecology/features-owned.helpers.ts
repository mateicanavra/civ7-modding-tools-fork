import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import type { Static } from "@swooper/mapgen-core/authoring";
import { FoundationDirectionalityConfigSchema } from "@mapgen/domain/config";
import * as ecology from "@mapgen/domain/ecology/ops";

import { normalizeOpSelectionOrThrow, normalizeStrictOrThrow } from "../support/compiler-helpers.js";

import {
  buildNarrativeMotifsHotspotsV1,
  buildNarrativeMotifsMarginsV1,
  publishBiomeClassificationArtifact,
  publishClimateFieldArtifact,
  publishHeightfieldArtifact,
} from "../../src/recipes/standard/artifacts.js";
import { M3_DEPENDENCY_TAGS } from "../../src/recipes/standard/tags.js";

export const disabledEmbellishmentsConfig = {
  story: { features: {} },
  featuresDensity: {},
};

export const disabledReefEmbellishmentsConfig = {
  story: {
    features: {
      paradiseReefChance: 0,
      paradiseReefRadius: 0,
    },
  },
  featuresDensity: {
    shelfReefMultiplier: 0,
    shelfReefRadius: 0,
  },
};

export const disabledVegetationEmbellishmentsConfig = {
  story: {
    features: {
      volcanicForestChance: 0,
      volcanicForestBonus: 0,
      volcanicForestMinRainfall: 0,
      volcanicTaigaChance: 0,
      volcanicTaigaBonus: 0,
      volcanicRadius: 1,
      volcanicTaigaMinLatitude: 0,
      volcanicTaigaMaxElevation: 0,
      volcanicTaigaMinRainfall: 0,
    },
  },
  featuresDensity: {
    rainforestExtraChance: 0,
    forestExtraChance: 0,
    taigaExtraChance: 0,
    rainforestVegetationScale: 0,
    forestVegetationScale: 0,
    taigaVegetationScale: 0,
    rainforestMinRainfall: 0,
    forestMinRainfall: 0,
    taigaMaxElevation: 0,
    minVegetationForBonus: 1,
  },
};

export function buildDisabledReefEmbellishmentsSelection() {
  return normalizeOpSelectionOrThrow(ecology.ops.planReefEmbellishments, {
    strategy: "default",
    config: { ...disabledReefEmbellishmentsConfig },
  });
}

export function buildDisabledVegetationEmbellishmentsSelection() {
  return normalizeOpSelectionOrThrow(ecology.ops.planVegetationEmbellishments, {
    strategy: "default",
    config: { ...disabledVegetationEmbellishmentsConfig },
  });
}

type VegetatedPlacementConfig = Static<
  typeof ecology.ops.planVegetatedFeaturePlacements.strategies.default.config
>;
type WetPlacementConfig = Static<
  typeof ecology.ops.planWetFeaturePlacements.strategies.default.config
>;
type AquaticPlacementConfig = Static<
  typeof ecology.ops.planAquaticFeaturePlacements.strategies.default.config
>;
type IcePlacementConfig = Static<
  typeof ecology.ops.planIceFeaturePlacements.strategies.default.config
>;

type FeaturesPlacementOverrides = {
  vegetated?: Partial<VegetatedPlacementConfig>;
  wet?: Partial<WetPlacementConfig>;
  aquatic?: Partial<AquaticPlacementConfig>;
  ice?: Partial<IcePlacementConfig>;
};

export function buildFeaturesPlacementConfig(overrides: FeaturesPlacementOverrides = {}) {
  return {
    vegetated: normalizeOpSelectionOrThrow(ecology.ops.planVegetatedFeaturePlacements, {
      strategy: "default",
      config: overrides.vegetated ?? {},
    }),
    wet: normalizeOpSelectionOrThrow(ecology.ops.planWetFeaturePlacements, {
      strategy: "default",
      config: overrides.wet ?? {},
    }),
    aquatic: normalizeOpSelectionOrThrow(ecology.ops.planAquaticFeaturePlacements, {
      strategy: "default",
      config: overrides.aquatic ?? {},
    }),
    ice: normalizeOpSelectionOrThrow(ecology.ops.planIceFeaturePlacements, {
      strategy: "default",
      config: overrides.ice ?? {},
    }),
  };
}

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
  defaultFertility?: number;
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
    defaultFertility = 0.6,
  } = options;

  const adapter = createMockAdapter({ width, height, rng, canHaveFeature });
  adapter.fillWater(false);

  const directionality = normalizeStrictOrThrow(
    FoundationDirectionalityConfigSchema,
    {},
    "/env/directionality"
  );
  const env = {
    seed: 0,
    dimensions: { width, height },
    latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
    wrap: { wrapX: false, wrapY: false },
    directionality,
  };
  const ctx = createExtendedMapContext({ width, height }, adapter, env);

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
  const soilType = new Uint8Array(size).fill(2);
  const fertility = new Float32Array(size).fill(defaultFertility);

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
  ctx.artifacts.set(M3_DEPENDENCY_TAGS.artifact.pedologyV1, {
    width,
    height,
    soilType,
    fertility,
  });
  ctx.artifacts.set(
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsHotspotsV1,
    buildNarrativeMotifsHotspotsV1({ points: [], paradise: [], volcanic: [] })
  );
  ctx.artifacts.set(
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsMarginsV1,
    buildNarrativeMotifsMarginsV1({ activeMargin: [], passiveShelf: [] })
  );

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
