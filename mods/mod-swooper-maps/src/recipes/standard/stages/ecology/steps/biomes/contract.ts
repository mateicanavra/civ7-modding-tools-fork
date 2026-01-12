import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecologyContracts from "@mapgen/domain/ecology/contracts";
import { BiomeEngineBindingsSchema } from "@mapgen/domain/ecology/biome-bindings.js";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const BiomesStepContract = defineStep({
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
  ops: {
    classify: ecologyContracts.classifyBiomes,
  },
  schema: Type.Object({
    bindings: Type.Optional(BiomeEngineBindingsSchema),
  }),
});

export default BiomesStepContract;
