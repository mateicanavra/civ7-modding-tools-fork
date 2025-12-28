import { Type, type Static } from "typebox";
import { DEV, logBiomeSummary, type ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { BiomeConfigSchema, CorridorsConfigSchema } from "@mapgen/config";
import { designateEnhancedBiomes } from "@mapgen/domain/ecology/biomes/index.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";

const BiomesStepConfigSchema = Type.Object(
  {
    biomes: BiomeConfigSchema,
    corridors: CorridorsConfigSchema,
  },
  { additionalProperties: false, default: { biomes: {}, corridors: {} } }
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
    designateEnhancedBiomes(width, height, context, {
      biomes: config.biomes,
      corridors: config.corridors,
    });
    reifyBiomeField(context);

    if (DEV.ENABLED && context?.adapter) {
      logBiomeSummary(context.adapter, width, height);
    }
  },
} as const);
