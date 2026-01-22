import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { deriveStepSeed } from "@swooper/mapgen-core/lib/rng";
import { implementArtifacts, type Static } from "@swooper/mapgen-core/authoring";
import ecology from "@mapgen/domain/ecology/ops";

import { normalizeOpSelectionOrThrow } from "../support/compiler-helpers.js";
import { buildTestDeps } from "../support/step-deps.js";

import { ecologyArtifacts } from "../../src/recipes/standard/stages/ecology/artifacts.js";
import { foundationArtifacts } from "../../src/recipes/standard/stages/foundation/artifacts.js";
import { hydrologyClimateBaselineArtifacts } from "../../src/recipes/standard/stages/hydrology-climate-baseline/artifacts.js";
import { morphologyArtifacts } from "../../src/recipes/standard/stages/morphology-pre/artifacts.js";
import featuresApplyStep from "../../src/recipes/standard/stages/map-ecology/steps/features-apply/index.js";
import { resolveFeatureKeyLookups } from "../../src/recipes/standard/stages/map-ecology/steps/features/feature-keys.js";

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

type FeaturesPlacementConfig = ReturnType<typeof buildFeaturesPlacementConfig>;

function clampLatitudeDeg(latitudeDeg: number): number {
  if (!Number.isFinite(latitudeDeg)) return 0;
  return Math.max(-89.999, Math.min(89.999, latitudeDeg));
}

function buildLatitudeField(
  bounds: { topLatitude: number; bottomLatitude: number },
  width: number,
  height: number
): Float32Array {
  const latitude = new Float32Array(height * Math.max(1, width));
  if (height <= 1) {
    const mid = (bounds.topLatitude + bounds.bottomLatitude) / 2;
    const clamped = clampLatitudeDeg(mid);
    for (let i = 0; i < latitude.length; i++) latitude[i] = clamped;
    return latitude;
  }
  const step = (bounds.bottomLatitude - bounds.topLatitude) / (height - 1);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    const lat = clampLatitudeDeg(bounds.topLatitude + step * y);
    for (let x = 0; x < width; x++) {
      latitude[row + x] = lat;
    }
  }
  return latitude;
}

const NO_FEATURE = -1;
const UNKNOWN_FEATURE = -2;

function buildFeatureKeyField(
  ctx: ReturnType<typeof createFeaturesTestContext>["ctx"],
  lookups: ReturnType<typeof resolveFeatureKeyLookups>
): Int16Array {
  const { width, height } = ctx.dimensions;
  const size = width * height;
  const field = new Int16Array(size);
  const noFeature = ctx.adapter.NO_FEATURE;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const feature = ctx.adapter.getFeatureType(x, y) | 0;
      if (feature === noFeature) {
        field[idx] = NO_FEATURE;
        continue;
      }
      const mapped = lookups.byEngineId.get(feature);
      field[idx] = mapped ?? UNKNOWN_FEATURE;
    }
  }

  return field;
}

function buildRiverAdjacencyMask(options: {
  width: number;
  height: number;
  navigableRiverMask: Uint8Array;
  radius: number;
}): Uint8Array {
  const width = options.width | 0;
  const height = options.height | 0;
  const size = Math.max(0, width * height);
  const radius = Math.max(0, options.radius | 0);

  const mask = new Uint8Array(size);
  if (radius <= 0) {
    for (let i = 0; i < size; i++) {
      mask[i] = options.navigableRiverMask[i] === 1 ? 1 : 0;
    }
    return mask;
  }

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      let adjacent = 0;
      for (let ny = y0; ny <= y1 && !adjacent; ny++) {
        const row = ny * width;
        for (let nx = x0; nx <= x1; nx++) {
          if (options.navigableRiverMask[row + nx] === 1) {
            adjacent = 1;
            break;
          }
        }
      }
      mask[y * width + x] = adjacent;
    }
  }

  return mask;
}

export function runOwnedFeaturePlacements(options: {
  ctx: ReturnType<typeof createFeaturesTestContext>["ctx"];
  placements: FeaturesPlacementConfig;
}): void {
  const { ctx, placements } = options;
  const { width, height } = ctx.dimensions;
  const size = width * height;

  const classification = ctx.artifacts.get(ecologyArtifacts.biomeClassification.id) as {
    biomeIndex: Uint8Array;
    vegetationDensity: Float32Array;
    effectiveMoisture: Float32Array;
    surfaceTemperature: Float32Array;
    aridityIndex: Float32Array;
    freezeIndex: Float32Array;
  };

  const landMask = ctx.buffers.heightfield.landMask;
  const terrainType = ctx.buffers.heightfield.terrain;
  const navigableRiverMask = new Uint8Array(size);
  const lookups = resolveFeatureKeyLookups(ctx.adapter);
  const featureKeyField = buildFeatureKeyField(ctx, lookups);
  const latitude = buildLatitudeField(ctx.env.latitudeBounds, width, height);
  const navigableRiverTerrain = ctx.adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER");
  const coastTerrain = ctx.adapter.getTerrainTypeIndex("TERRAIN_COAST");
  const seed = deriveStepSeed(ctx.env.seed, "ecology:planFeaturePlacements");

  for (let i = 0; i < size; i++) {
    navigableRiverMask[i] = terrainType[i] === navigableRiverTerrain ? 1 : 0;
  }

  const wetRules = placements.wet.config?.rules ?? {};
  const nearRadius = Math.max(1, Math.floor(wetRules.nearRiverRadius ?? 2));
  const isolatedRadius = Math.max(1, Math.floor(wetRules.isolatedRiverRadius ?? 1));

  const vegetation = ecology.ops.planVegetatedFeaturePlacements.run(
    {
      width,
      height,
      seed,
      biomeIndex: classification.biomeIndex,
      vegetationDensity: classification.vegetationDensity,
      effectiveMoisture: classification.effectiveMoisture,
      surfaceTemperature: classification.surfaceTemperature,
      aridityIndex: classification.aridityIndex,
      freezeIndex: classification.freezeIndex,
      landMask,
      navigableRiverMask,
      featureKeyField: featureKeyField.slice(),
    },
    placements.vegetated
  );

  const wetlands = ecology.ops.planWetFeaturePlacements.run(
    {
      width,
      height,
      seed,
      biomeIndex: classification.biomeIndex,
      surfaceTemperature: classification.surfaceTemperature,
      landMask,
      navigableRiverMask,
      featureKeyField: featureKeyField.slice(),
      nearRiverMask: buildRiverAdjacencyMask({
        width,
        height,
        navigableRiverMask,
        radius: nearRadius,
      }),
      isolatedRiverMask: buildRiverAdjacencyMask({
        width,
        height,
        navigableRiverMask,
        radius: isolatedRadius,
      }),
    },
    placements.wet
  );

  const reefs = ecology.ops.planAquaticFeaturePlacements.run(
    {
      width,
      height,
      seed,
      landMask,
      terrainType,
      latitude,
      featureKeyField: featureKeyField.slice(),
      coastTerrain,
    },
    placements.aquatic
  );

  const ice = ecology.ops.planIceFeaturePlacements.run(
    {
      width,
      height,
      seed,
      landMask,
      latitude,
      featureKeyField: featureKeyField.slice(),
      naturalWonderMask: new Uint8Array(size),
    },
    placements.ice
  );

  const intentsRuntime = implementArtifacts([ecologyArtifacts.featureIntents], {
    featureIntents: {},
  });
  intentsRuntime.featureIntents.publish(ctx, {
    vegetation: vegetation.placements,
    wetlands: wetlands.placements,
    reefs: reefs.placements,
    ice: ice.placements,
  });

  const applyConfig = {
    apply: normalizeOpSelectionOrThrow(ecology.ops.applyFeatures, {
      strategy: "default",
      config: {},
    }),
  };
  const applyOps = ecology.ops.bind(featuresApplyStep.contract.ops!).runtime;
  featuresApplyStep.run(ctx, applyConfig, applyOps, buildTestDeps(featuresApplyStep));
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
  ctx.buffers.heightfield.elevation.fill(1);
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
        ctx.buffers.heightfield.elevation[idx] = 0;
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
    [morphologyArtifacts.topography, hydrologyClimateBaselineArtifacts.climateField],
    { topography: {}, climateField: {} }
  );
  const seaLevel = 0;
  const bathymetry = new Int16Array(size);
  hydrologyArtifacts.topography.publish(ctx, {
    elevation: ctx.buffers.heightfield.elevation,
    seaLevel,
    landMask: ctx.buffers.heightfield.landMask,
    bathymetry,
  });
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
