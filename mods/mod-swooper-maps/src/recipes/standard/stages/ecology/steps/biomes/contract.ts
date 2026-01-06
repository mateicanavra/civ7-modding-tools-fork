import { Type, defineStepContract } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const BiomesStepConfigSchema = Type.Object(
  {
    classify: ecology.ops.classifyBiomes.config,
    bindings: ecology.BiomeEngineBindingsSchema,
  },
  {
    additionalProperties: false,
    default: {
      classify: ecology.ops.classifyBiomes.defaultConfig,
      bindings: {},
    },
  }
);

export const BiomesStepContract = defineStepContract({
  id: "biomes",
  phase: "ecology",
  requires: [
    M3_DEPENDENCY_TAGS.artifact.climateField,
    M3_DEPENDENCY_TAGS.artifact.heightfield,
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
    M3_DEPENDENCY_TAGS.artifact.narrativeMotifsRiftsV1,
  ],
  provides: [
    M3_DEPENDENCY_TAGS.artifact.biomeClassificationV1,
    M3_DEPENDENCY_TAGS.field.biomeId,
    M4_EFFECT_TAGS.engine.biomesApplied,
  ],
  schema: BiomesStepConfigSchema,
} as const);
