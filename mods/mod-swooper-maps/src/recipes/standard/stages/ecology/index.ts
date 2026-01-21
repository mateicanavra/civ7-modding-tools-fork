import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { steps } from "./steps/index.js";

const publicSchema = Type.Object(
  {
    pedology: Type.Optional(steps.pedology.contract.schema),
    resourceBasins: Type.Optional(steps.resourceBasins.contract.schema),
    biomes: Type.Optional(steps.biomes.contract.schema),
    biomeEdgeRefine: Type.Optional(steps.biomeEdgeRefine.contract.schema),
    featuresPlan: Type.Optional(steps.featuresPlan.contract.schema),
  },
  { additionalProperties: false }
);

export default createStage({
  id: "ecology",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  public: publicSchema,
  compile: ({ env, knobs, config }) => {
    void env;
    void knobs;
    return {
      pedology: config.pedology,
      "resource-basins": config.resourceBasins,
      biomes: config.biomes,
      "biome-edge-refine": config.biomeEdgeRefine,
      "features-plan": config.featuresPlan,
    };
  },
  steps: [
    steps.pedology,
    steps.resourceBasins,
    steps.biomes,
    steps.biomeEdgeRefine,
    steps.featuresPlan,
  ],
});
