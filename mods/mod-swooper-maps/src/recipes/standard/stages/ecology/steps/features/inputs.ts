import type {
  ClimateFieldBuffer,
  ExtendedMapContext,
  HeightfieldBuffer,
} from "@swooper/mapgen-core";
import type { OpTypeBag, Static } from "@swooper/mapgen-core/authoring";
import type {
  NarrativeMotifsHotspots,
  NarrativeMotifsMargins,
} from "@mapgen/domain/narrative/models.js";
import { computeRiverAdjacencyMask } from "../../../hydrology-core/river-adjacency.js";
import ecology from "@mapgen/domain/ecology";
import { buildLatitudeField, maskFromCoordSet } from "../biomes/helpers/inputs.js";
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
  OpTypeBag<typeof ecology.ops.planWetFeaturePlacements>["config"]["default"];

export type FeatureArtifactInputs = {
  heightfield: HeightfieldBuffer;
  climateField: ClimateFieldBuffer;
  classification: BiomeClassificationArtifact;
  motifsHotspots: NarrativeMotifsHotspots | null;
  motifsMargins: NarrativeMotifsMargins | null;
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
  const size = width * height;

  const { heightfield, motifsHotspots, motifsMargins } = artifacts;
  const featureKeyField = buildFeatureKeyField(context, lookups);

  const hotspots = motifsHotspots;
  const margins = motifsMargins;

  return {
    width,
    height,
    seed: deriveStepSeed(context.env.seed, "ecology:planReefEmbellishments"),
    landMask: heightfield.landMask,
    featureKeyField,
    paradiseMask: maskFromCoordSet(hotspots?.paradise, width, height),
    passiveShelfMask: maskFromCoordSet(margins?.passiveShelf, width, height),
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

  const { classification, climateField, heightfield, motifsHotspots } = artifacts;
  const latitude = buildLatitudeField(context.adapter, width, height);
  const featureKeyField = buildFeatureKeyField(context, lookups);

  const hotspots = motifsHotspots;

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
    volcanicMask: maskFromCoordSet(hotspots?.volcanic, width, height),
    navigableRiverTerrain: context.adapter.getTerrainTypeIndex("TERRAIN_NAVIGABLE_RIVER"),
  };
}
