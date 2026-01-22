import { Type, createStage, type Static } from "@swooper/mapgen-core/authoring";
import { buildElevation, plotCoasts, plotContinents, plotMountains, plotVolcanoes } from "./steps/index.js";
import { MorphologyOrogenyKnobSchema } from "@mapgen/domain/morphology/shared/knobs.js";

const publicSchema = Type.Object(
  {
    plotCoasts: Type.Optional(plotCoasts.contract.schema),
    plotContinents: Type.Optional(plotContinents.contract.schema),
    mountains: Type.Optional(plotMountains.contract.schema),
    plotVolcanoes: Type.Optional(plotVolcanoes.contract.schema),
    buildElevation: Type.Optional(buildElevation.contract.schema),
  },
  { additionalProperties: false }
);

type MapMorphologyStageConfig = Static<typeof publicSchema>;

export default createStage({
  id: "map-morphology",
  knobsSchema: Type.Object(
    {
      orogeny: Type.Optional(MorphologyOrogenyKnobSchema),
    },
    {
      description:
        "Map-morphology knobs (orogeny). Knobs apply after defaulted step config as deterministic transforms.",
    }
  ),
  public: publicSchema,
  compile: ({ config }: { config: MapMorphologyStageConfig }) => {
    return {
      "plot-coasts": config.plotCoasts,
      "plot-continents": config.plotContinents,
      "plot-mountains": config.mountains,
      "plot-volcanoes": config.plotVolcanoes,
      "build-elevation": config.buildElevation,
    };
  },
  steps: [plotCoasts, plotContinents, plotMountains, plotVolcanoes, buildElevation],
} as const);
