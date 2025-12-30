import { Type, type Static } from "typebox";
import { DEV, logBiomeSummary, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { BiomeThresholdsSchema, NarrativePolicySchema } from "@mapgen/config";
import { designateOwnedBiomes } from "@mapgen/domain/ecology/biomes/owned.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

/**
 * Biomes step configuration schema.
 *
 * Uses the owned biome classification model with:
 * - thresholds: Climate→biome scoring parameters
 * - narrative: Corridor/rift overlay strength
 */
const BiomesStepConfigSchema = Type.Object(
  {
    /** Biome classification thresholds (controls climate→biome mapping). */
    thresholds: Type.Optional(BiomeThresholdsSchema),
    /** Narrative overlay policy (corridor/rift strength). */
    narrative: Type.Optional(NarrativePolicySchema),
  },
  { additionalProperties: false, default: {} }
);

type BiomesStepConfig = Static<typeof BiomesStepConfigSchema>;

function reifyBiomeField(context: ExtendedMapContext): void {
  const biomeIdField = context.fields?.biomeId;
  if (!biomeIdField) {
    throw new Error("BiomesStep: Missing field:biomeId buffer for reification.");
  }

  const { width, height } = context.dimensions;
  const { adapter } = context;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      biomeIdField[rowOffset + x] = adapter.getBiomeType(x, y);
    }
  }
}

export default createStep({
  id: "biomes",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
    M3_DEPENDENCY_TAGS.artifact.riverAdjacency,
  ],
  provides: [
    M3_DEPENDENCY_TAGS.field.biomeId,
    M4_EFFECT_TAGS.engine.biomesApplied,
  ],
  schema: BiomesStepConfigSchema,
  run: (context: ExtendedMapContext, config: BiomesStepConfig) => {
    const { width, height } = context.dimensions;

    // Use owned biome classification
    designateOwnedBiomes(width, height, context, {
      thresholds: config.thresholds,
      narrative: config.narrative,
    });

    reifyBiomeField(context);

    if (DEV.ENABLED && context?.adapter) {
      logBiomeSummary(context.adapter, width, height);
    }
  },
} as const);
