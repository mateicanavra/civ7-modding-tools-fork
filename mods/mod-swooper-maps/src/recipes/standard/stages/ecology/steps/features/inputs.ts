import { ctxRandom, type ExtendedMapContext } from "@swooper/mapgen-core";
import { getPublishedBiomeClassification, getPublishedClimateField } from "@mapgen/domain/artifacts.js";
import { getNarrativeMotifsHotspots, getNarrativeMotifsMargins } from "@mapgen/domain/narrative/queries.js";
import type * as ecology from "@mapgen/domain/ecology";

type FeaturesPlacementInput = Parameters<typeof ecology.ops.featuresPlacement.run>[0];
type FeaturesEmbellishmentsInput = Parameters<typeof ecology.ops.featuresEmbellishments.run>[0];

export function buildFeaturesPlacementInput(context: ExtendedMapContext): FeaturesPlacementInput {
  const { width, height } = context.dimensions;
  const classification = getPublishedBiomeClassification(context);
  if (!classification) {
    throw new Error("FeaturesStep: Missing artifact:ecology.biomeClassification@v1.");
  }

  const rand = (label: string, max: number): number => ctxRandom(context, label, max);

  return {
    width,
    height,
    adapter: context.adapter,
    biomeIndex: classification.biomeIndex,
    vegetationDensity: classification.vegetationDensity,
    effectiveMoisture: classification.effectiveMoisture,
    surfaceTemperature: classification.surfaceTemperature,
    aridityIndex: classification.aridityIndex,
    freezeIndex: classification.freezeIndex,
    rand,
  };
}

export function buildFeaturesEmbellishmentsInput(
  context: ExtendedMapContext
): FeaturesEmbellishmentsInput {
  const { width, height } = context.dimensions;
  const classification = getPublishedBiomeClassification(context);
  if (!classification) {
    throw new Error("FeaturesStep: Missing artifact:ecology.biomeClassification@v1.");
  }

  const climateField = getPublishedClimateField(context);
  if (!climateField?.rainfall) {
    throw new Error("FeaturesStep: Missing artifact:climateField rainfall field.");
  }

  const biomeField = context.fields?.biomeId;
  if (!biomeField) {
    throw new Error("FeaturesStep: Missing field:biomeId (expected biomes reification).");
  }

  const hotspots = getNarrativeMotifsHotspots(context);
  const margins = getNarrativeMotifsMargins(context);

  const rand = (label: string, max: number): number => ctxRandom(context, label, max);

  return {
    width,
    height,
    adapter: context.adapter,
    biomeId: biomeField,
    rainfall: climateField.rainfall,
    vegetationDensity: classification.vegetationDensity,
    hotspotParadise: hotspots?.paradise ?? new Set<string>(),
    hotspotVolcanic: hotspots?.volcanic ?? new Set<string>(),
    passiveShelf: margins?.passiveShelf ?? new Set<string>(),
    rand,
  };
}
