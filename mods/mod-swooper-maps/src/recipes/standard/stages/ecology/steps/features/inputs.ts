import type {
  ClimateFieldBuffer,
  ExtendedMapContext,
  HeightfieldBuffer,
} from "@swooper/mapgen-core";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";
import type { OpTypeBagOf, Static } from "@swooper/mapgen-core/authoring";
import { computeRiverAdjacencyMask } from "../../../hydrology-hydrography/river-adjacency.js";
import ecology from "@mapgen/domain/ecology";
import { buildLatitudeField } from "../biomes/helpers/inputs.js";
import { deriveStepSeed } from "../helpers/seed.js";
import type { FeatureKeyLookups } from "./feature-keys.js";
import type { BiomeClassificationArtifact } from "../../artifacts.js";

const NO_FEATURE = -1;
const UNKNOWN_FEATURE = -2;

type ReefEmbellishmentsInput = Static<typeof ecology.ops.planReefEmbellishments.input>;
type VegetationEmbellishmentsInput =
  Static<typeof ecology.ops.planVegetationEmbellishments.input>;
type VegetatedPlacementInput =
  Static<typeof ecology.ops.planVegetatedFeaturePlacements.input>;
type WetPlacementInput = Static<typeof ecology.ops.planWetFeaturePlacements.input>;
type AquaticPlacementInput =
  Static<typeof ecology.ops.planAquaticFeaturePlacements.input>;
type IcePlacementInput = Static<typeof ecology.ops.planIceFeaturePlacements.input>;

type WetInnerConfig =
  OpTypeBagOf<typeof ecology.ops.planWetFeaturePlacements>["config"]["default"];

const BOUNDARY_NONE = 0;
const VOLCANISM_THRESHOLD = 160;
const PARADISE_VOLCANISM_MAX = 40;
const PARADISE_CLOSENESS_MAX = 40;
const PASSIVE_SHELF_CLOSENESS_MAX = 60;

type PlateSignals = {
  boundaryCloseness: Uint8Array;
  boundaryType: Uint8Array;
  volcanism: Uint8Array;
};

export type FeatureArtifactInputs = {
  heightfield: HeightfieldBuffer;
  climateField: ClimateFieldBuffer;
  plates: PlateSignals;
  classification: BiomeClassificationArtifact;
};

const buildFeatureKeyField = (
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups
): Int16Array => {
  const { width, height } = context.dimensions;
  const size = width * height;
  const field = new Int16Array(size);

  const noFeature = context.adapter.NO_FEATURE;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const feature = context.adapter.getFeatureType(x, y) | 0;
      if (feature === noFeature) {
        field[idx] = NO_FEATURE;
        continue;
      }
      const mapped = lookups.byEngineId.get(feature);
      field[idx] = mapped ?? UNKNOWN_FEATURE;
    }
  }

  return field;
};

const buildCoastalWaterMask = (
  width: number,
  height: number,
  landMask: Uint8Array
): Uint8Array => {
  const size = Math.max(0, width * height);
  const mask = new Uint8Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (landMask[i] === 1) continue;
      let touchesLand = false;
      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        if (touchesLand) return;
        const ni = ny * width + nx;
        if (landMask[ni] === 1) touchesLand = true;
      });
      if (touchesLand) mask[i] = 1;
    }
  }
  return mask;
};

const buildVolcanismMask = (width: number, height: number, volcanism: Uint8Array): Uint8Array => {
  const size = Math.max(0, width * height);
  const mask = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if (volcanism[i] >= VOLCANISM_THRESHOLD) mask[i] = 1;
  }
  return mask;
};

const buildParadiseMask = (
  width: number,
  height: number,
  coastalWater: Uint8Array,
  plates: PlateSignals
): Uint8Array => {
  const size = Math.max(0, width * height);
  const mask = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if (coastalWater[i] !== 1) continue;
    if (plates.boundaryCloseness[i] > PARADISE_CLOSENESS_MAX) continue;
    if (plates.volcanism[i] > PARADISE_VOLCANISM_MAX) continue;
    mask[i] = 1;
  }
  return mask;
};

const buildPassiveShelfMask = (
  width: number,
  height: number,
  coastalWater: Uint8Array,
  plates: PlateSignals
): Uint8Array => {
  const size = Math.max(0, width * height);
  const mask = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if (coastalWater[i] !== 1) continue;
    if (plates.boundaryType[i] !== BOUNDARY_NONE) continue;
    if (plates.boundaryCloseness[i] > PASSIVE_SHELF_CLOSENESS_MAX) continue;
    mask[i] = 1;
  }
  return mask;
};

/**
 * Builds the input payload for ice feature placement planning.
 */
export function buildIceFeaturePlacementsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups,
  artifacts: FeatureArtifactInputs
): IcePlacementInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const { heightfield } = artifacts;
  const latitude = buildLatitudeField(context.adapter, width, height);
  const featureKeyField = buildFeatureKeyField(context, lookups);

  return {
    width,
    height,
    seed: deriveStepSeed(context.env.seed, "ecology:planFeaturePlacements"),
    landMask: heightfield.landMask,
    latitude,
    featureKeyField,
    naturalWonderMask: new Uint8Array(size),
  };
}

/**
 * Builds the input payload for aquatic feature placement planning.
 */
export function buildAquaticFeaturePlacementsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups,
  artifacts: FeatureArtifactInputs
): AquaticPlacementInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const { heightfield } = artifacts;
  const latitude = buildLatitudeField(context.adapter, width, height);
  const featureKeyField = buildFeatureKeyField(context, lookups);

  return {
    width,
    height,
    seed: deriveStepSeed(context.env.seed, "ecology:planFeaturePlacements"),
    landMask: heightfield.landMask,
    terrainType: heightfield.terrain,
    latitude,
    featureKeyField,
    coastTerrain: context.adapter.getTerrainTypeIndex("TERRAIN_COAST"),
  };
}

/**
 * Builds the input payload for wet feature placement planning.
 */
export function buildWetFeaturePlacementsInput(
  context: ExtendedMapContext,
  config: WetInnerConfig,
  lookups: FeatureKeyLookups,
  artifacts: FeatureArtifactInputs
): WetPlacementInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const { classification, heightfield } = artifacts;
  const featureKeyField = buildFeatureKeyField(context, lookups);

  return {
    width,
    height,
    seed: deriveStepSeed(context.env.seed, "ecology:planFeaturePlacements"),
    biomeIndex: classification.biomeIndex,
    surfaceTemperature: classification.surfaceTemperature,
    landMask: heightfield.landMask,
    terrainType: heightfield.terrain,
    featureKeyField,
    nearRiverMask: computeRiverAdjacencyMask(
      context,
      Math.max(1, Math.floor(config.rules!.nearRiverRadius!))
    ),
    isolatedRiverMask: computeRiverAdjacencyMask(
      context,
      Math.max(1, Math.floor(config.rules!.isolatedRiverRadius!))
    ),
    navigableRiverTerrain: context.adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER"),
  };
}

/**
 * Builds the input payload for vegetated feature placement planning.
 */
export function buildVegetatedFeaturePlacementsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups,
  artifacts: FeatureArtifactInputs
): VegetatedPlacementInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const { classification, heightfield } = artifacts;
  const featureKeyField = buildFeatureKeyField(context, lookups);

  return {
    width,
    height,
    seed: deriveStepSeed(context.env.seed, "ecology:planFeaturePlacements"),
    biomeIndex: classification.biomeIndex,
    vegetationDensity: classification.vegetationDensity,
    effectiveMoisture: classification.effectiveMoisture,
    surfaceTemperature: classification.surfaceTemperature,
    aridityIndex: classification.aridityIndex,
    freezeIndex: classification.freezeIndex,
    landMask: heightfield.landMask,
    terrainType: heightfield.terrain,
    featureKeyField,
    navigableRiverTerrain: context.adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER"),
  };
}

/**
 * Builds the input payload for reef embellishment planning.
 */
export function buildReefEmbellishmentsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups,
  artifacts: FeatureArtifactInputs
): ReefEmbellishmentsInput {
  const { width, height } = context.dimensions;

  const { heightfield, plates } = artifacts;
  const featureKeyField = buildFeatureKeyField(context, lookups);

  const coastalWater = buildCoastalWaterMask(width, height, heightfield.landMask);
  const paradiseMask = buildParadiseMask(width, height, coastalWater, plates);
  const passiveShelfMask = buildPassiveShelfMask(width, height, coastalWater, plates);

  return {
    width,
    height,
    seed: deriveStepSeed(context.env.seed, "ecology:planReefEmbellishments"),
    landMask: heightfield.landMask,
    featureKeyField,
    paradiseMask,
    passiveShelfMask,
  };
}

/**
 * Builds the input payload for vegetation embellishment planning.
 */
export function buildVegetationEmbellishmentsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups,
  artifacts: FeatureArtifactInputs
): VegetationEmbellishmentsInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const { classification, climateField, heightfield, plates } = artifacts;
  const latitude = buildLatitudeField(context.adapter, width, height);
  const featureKeyField = buildFeatureKeyField(context, lookups);

  const volcanicMask = buildVolcanismMask(width, height, plates.volcanism);

  return {
    width,
    height,
    seed: deriveStepSeed(context.env.seed, "ecology:planVegetationEmbellishments"),
    landMask: heightfield.landMask,
    terrainType: heightfield.terrain,
    featureKeyField,
    biomeIndex: classification.biomeIndex,
    rainfall: climateField.rainfall,
    vegetationDensity: classification.vegetationDensity,
    elevation: heightfield.elevation,
    latitude,
    volcanicMask,
    navigableRiverTerrain: context.adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER"),
  };
}
