import type { ExtendedMapContext } from "@swooper/mapgen-core";
import {
  computeRiverAdjacencyMask,
  getPublishedBiomeClassification,
  getPublishedClimateField,
  getPublishedNarrativeMotifsHotspots,
  getPublishedNarrativeMotifsMargins,
} from "../../../../artifacts.js";
import type * as ecology from "@mapgen/domain/ecology";
import type { PlanWetFeaturePlacementsTypes } from "@mapgen/domain/ecology/contracts";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";
import { assertHeightfield, buildLatitudeField, maskFromCoordSet } from "../biomes/helpers/inputs.js";
import { deriveStepSeed } from "../helpers/seed.js";
import type { FeatureKeyLookups } from "./feature-keys.js";

const NO_FEATURE = -1;
const UNKNOWN_FEATURE = -2;

type ReefEmbellishmentsInput = Parameters<typeof ecology.ops.planReefEmbellishments.run>[0];
type VegetationEmbellishmentsInput = Parameters<typeof ecology.ops.planVegetationEmbellishments.run>[0];
type VegetatedPlacementInput =
  Parameters<typeof ecology.ops.planVegetatedFeaturePlacements.run>[0];
type WetPlacementInput = Parameters<typeof ecology.ops.planWetFeaturePlacements.run>[0];
type AquaticPlacementInput =
  Parameters<typeof ecology.ops.planAquaticFeaturePlacements.run>[0];
type IcePlacementInput = Parameters<typeof ecology.ops.planIceFeaturePlacements.run>[0];

type WetInnerConfig = PlanWetFeaturePlacementsTypes["config"]["default"];

type HeightfieldArtifact = {
  elevation: Int16Array;
  terrain: Uint8Array;
  landMask: Uint8Array;
};

const getHeightfieldArtifact = (
  context: ExtendedMapContext,
  expectedSize: number
): HeightfieldArtifact => {
  const heightfield = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.heightfield);
  assertHeightfield(heightfield, expectedSize);
  return heightfield;
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

export function buildIceFeaturePlacementsInput(
  context: ExtendedMapContext,
  lookups: FeatureKeyLookups
): IcePlacementInput {
  const { width, height } = context.dimensions;
  const size = width * height;

  const heightfield = getHeightfieldArtifact(context, size);
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

  const heightfield = getHeightfieldArtifact(context, size);
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
  if (!classification) {
    throw new Error("FeaturesStep: Missing artifact:ecology.biomeClassification@v1.");
  }

  const heightfield = getHeightfieldArtifact(context, size);
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
  if (!classification) {
    throw new Error("FeaturesStep: Missing artifact:ecology.biomeClassification@v1.");
  }

  const heightfield = getHeightfieldArtifact(context, size);
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

  const heightfield = getHeightfieldArtifact(context, size);
  const featureKeyField = buildFeatureKeyField(context, lookups);

  const hotspots = getPublishedNarrativeMotifsHotspots(context);
  if (!hotspots) {
    throw new Error("FeaturesStep: Missing artifact:narrative.motifs.hotspots@v1.");
  }
  const margins = getPublishedNarrativeMotifsMargins(context);
  if (!margins) {
    throw new Error("FeaturesStep: Missing artifact:narrative.motifs.margins@v1.");
  }

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
  if (!classification) {
    throw new Error("FeaturesStep: Missing artifact:ecology.biomeClassification@v1.");
  }

  const climateField = getPublishedClimateField(context);
  if (!climateField?.rainfall) {
    throw new Error("FeaturesStep: Missing artifact:climateField rainfall field.");
  }

  const heightfield = getHeightfieldArtifact(context, size);
  const latitude = buildLatitudeField(context.adapter, width, height);
  const featureKeyField = buildFeatureKeyField(context, lookups);

  const hotspots = getPublishedNarrativeMotifsHotspots(context);
  if (!hotspots) {
    throw new Error("FeaturesStep: Missing artifact:narrative.motifs.hotspots@v1.");
  }

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
