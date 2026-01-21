import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { implementArtifacts, type Static } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology/ops";

import { normalizeOpSelectionOrThrow } from "../support/compiler-helpers.js";

import { ecologyArtifacts } from "../../src/recipes/standard/stages/ecology/artifacts.js";
import { foundationArtifacts } from "../../src/recipes/standard/stages/foundation/artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../src/recipes/standard/stages/hydrology-climate-baseline/artifacts.js";

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

  const env = {
    seed: 0,
    dimensions: { width, height },
    latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
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

  const hydrologyArtifacts = implementArtifacts(
    [hydrologyClimateBaselineArtifacts.heightfield, hydrologyClimateBaselineArtifacts.climateField],
    { heightfield: {}, climateField: {} }
  );
  hydrologyArtifacts.heightfield.publish(ctx, ctx.buffers.heightfield);
  hydrologyArtifacts.climateField.publish(ctx, ctx.buffers.climate);

  const ecologyArtifactsRuntime = implementArtifacts(
    [ecologyArtifacts.biomeClassification, ecologyArtifacts.pedology],
    { biomeClassification: {}, pedology: {} }
  );
  ecologyArtifactsRuntime.biomeClassification.publish(ctx, {
    width,
    height,
    biomeIndex,
    vegetationDensity,
    effectiveMoisture,
    surfaceTemperature,
    aridityIndex,
    freezeIndex,
  });
  ecologyArtifactsRuntime.pedology.publish(ctx, {
    width,
    height,
    soilType,
    fertility,
  });

  const foundationRuntime = implementArtifacts([foundationArtifacts.plates], {
    foundationPlates: {},
  });
  foundationRuntime.foundationPlates.publish(ctx, {
    id: new Int16Array(size),
    boundaryCloseness: new Uint8Array(size),
    boundaryType: new Uint8Array(size),
    tectonicStress: new Uint8Array(size),
    upliftPotential: new Uint8Array(size),
    riftPotential: new Uint8Array(size),
    shieldStability: new Uint8Array(size),
    volcanism: new Uint8Array(size),
    movementU: new Int8Array(size),
    movementV: new Int8Array(size),
    rotation: new Int8Array(size),
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
