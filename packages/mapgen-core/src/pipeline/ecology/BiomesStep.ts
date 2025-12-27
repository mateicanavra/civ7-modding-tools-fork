import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { designateEnhancedBiomes } from "@mapgen/domain/ecology/biomes/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { BiomeConfigSchema, CorridorsConfigSchema } from "@mapgen/config/index.js";

export interface BiomesStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  afterRun?: (context: ExtendedMapContext) => void;
}

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

export function createBiomesStep(options: BiomesStepOptions): MapGenStep<ExtendedMapContext, BiomesStepConfig> {
  return {
    id: "biomes",
    phase: M3_STANDARD_STAGE_PHASE.biomes,
    requires: options.requires,
    provides: options.provides,
    configSchema: BiomesStepConfigSchema,
    run: (context, config) => {
      const { width, height } = context.dimensions;
      designateEnhancedBiomes(width, height, context, {
        biomes: config.biomes,
        corridors: config.corridors,
      });
      reifyBiomeField(context);
      options.afterRun?.(context);
    },
  };
}
