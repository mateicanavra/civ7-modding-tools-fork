import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { OpTypeBag, Static } from "@swooper/mapgen-core/authoring";
import {
  computeRiverAdjacencyMask,
  heightfieldArtifact,
  getPublishedBiomeClassification,
  getPublishedClimateField,
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsMargins,
} from "../../../../artifacts.js";
import ecology from "@mapgen/domain/ecology";
import { buildLatitudeField, maskFromCoordSet } from "../biomes/helpers/inputs.js";
import { deriveStepSeed } from "../helpers/seed.js";
import type { FeatureKeyLookups } from "./feature-keys.js";

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

const getHeightfieldArtifact = (context: ExtendedMapContext) => heightfieldArtifact.get(context);

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

export function buildIceFeaturePlacementsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups
): IcePlacementInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const heightfield = getHeightfieldArtifact(context);
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

export function buildAquaticFeaturePlacementsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups
): AquaticPlacementInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const heightfield = getHeightfieldArtifact(context);
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

export function buildWetFeaturePlacementsInput(
  context: ExtendedMapContext,
  config: WetInnerConfig,
  lookups: FeatureKeyLookups
): WetPlacementInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const classification = getPublishedBiomeClassification(context);

  const heightfield = getHeightfieldArtifact(context);
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

export function buildVegetatedFeaturePlacementsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups
): VegetatedPlacementInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const classification = getPublishedBiomeClassification(context);

  const heightfield = getHeightfieldArtifact(context);
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

export function buildReefEmbellishmentsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups
): ReefEmbellishmentsInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const heightfield = getHeightfieldArtifact(context);
  const featureKeyField = buildFeatureKeyField(context, lookups);

  const hotspots = getPublishedNarrativeMotifsHotspots(context);
  const margins = getPublishedNarrativeMotifsMargins(context);

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

export function buildVegetationEmbellishmentsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups
): VegetationEmbellishmentsInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const classification = getPublishedBiomeClassification(context);

  const climateField = getPublishedClimateField(context);

  const heightfield = getHeightfieldArtifact(context);
  const latitude = buildLatitudeField(context.adapter, width, height);
  const featureKeyField = buildFeatureKeyField(context, lookups);

  const hotspots = getPublishedNarrativeMotifsHotspots(context);

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
