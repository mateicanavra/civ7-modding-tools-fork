import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { steps } from "./steps/index.js";

const publicSchema = Type.Object(
  {
    biomes: Type.Optional(steps.plotBiomes.contract.schema),
    featuresApply: Type.Optional(steps.featuresApply.contract.schema),
    plotEffects: Type.Optional(steps.plotEffects.contract.schema),
  },
  { additionalProperties: false }
);

type MapEcologyStageConfig = Static<typeof publicSchema>;

export default createStage({
  id: "map-ecology",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  public: publicSchema,
  compile: ({ config }: { config: MapEcologyStageConfig }) => {
    return {
      "plot-biomes": config.biomes,
      "features-apply": config.featuresApply,
      "plot-effects": config.plotEffects,
    };
  },
  steps: [steps.plotBiomes, steps.featuresApply, steps.plotEffects],
} as const);
