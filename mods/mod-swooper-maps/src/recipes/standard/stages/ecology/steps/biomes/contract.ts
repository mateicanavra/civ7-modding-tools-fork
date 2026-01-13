import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import ecology, { BiomeEngineBindingsSchema } from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";
import { ecologyArtifacts } from "../../artifacts.js";
import { hydrologyPreArtifacts } from "../../../hydrology-pre/artifacts.js";
import { narrativePreArtifacts } from "../../../narrative-pre/artifacts.js";

const BiomesStepContract = defineStep({
  id: "biomes",
  phase: "ecology",
  requires: [],
  provides: [
    M3_DEPENDENCY_TAGS.field.biomeId,
    M4_EFFECT_TAGS.engine.biomesApplied,
  ],
  artifacts: {
    requires: [
      hydrologyPreArtifacts.climateField,
      hydrologyPreArtifacts.heightfield,
      narrativePreArtifacts.corridors,
      narrativePreArtifacts.motifsRifts,
    ],
    provides: [ecologyArtifacts.biomeClassification],
  },
  ops: {
    classify: ecology.ops.classifyBiomes,
  },
  schema: Type.Object(
    {
      bindings: Type.Optional(BiomeEngineBindingsSchema),
    },
    {
      description:
        "Optional overrides for binding biome symbols to engine biome globals during classification.",
    }
  ),
});

export default BiomesStepContract;
