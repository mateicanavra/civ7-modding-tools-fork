import { Type, defineStep } from "@swooper/mapgen-core/authoring";
import { BiomeEngineBindingsSchema } from "@mapgen/domain/ecology";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";
import { ecologyArtifacts } from "../../ecology/artifacts.js";
import { morphologyArtifacts } from "../../morphology-pre/artifacts.js";

const PlotBiomesStepContract = defineStep({
  id: "plot-biomes",
  phase: "gameplay",
  requires: [],
  provides: [M3_DEPENDENCY_TAGS.field.biomeId, M4_EFFECT_TAGS.engine.biomesApplied],
  artifacts: {
    requires: [ecologyArtifacts.biomeClassification, morphologyArtifacts.topography],
    provides: [],
  },
  schema: Type.Object(
    {
      bindings: Type.Optional(BiomeEngineBindingsSchema),
    },
    {
      description: "Optional overrides for binding biome symbols to engine biome globals.",
    }
  ),
});

export default PlotBiomesStepContract;
