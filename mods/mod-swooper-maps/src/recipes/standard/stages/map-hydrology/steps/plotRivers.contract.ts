import { Type, defineStep } from "@swooper/mapgen-core/authoring";

import { M4_EFFECT_TAGS, M10_EFFECT_TAGS } from "../../../tags.js";
import { hydrologyHydrographyArtifacts } from "../../hydrology-hydrography/artifacts.js";

const PlotRiversStepConfigSchema = Type.Object(
  {},
  {
    additionalProperties: false,
    description:
      "Config for river gameplay projection. Engine rivers are still modeled for visuals/naming; navigable river terrain is stamped from Hydrography truth.",
  }
);

const PlotRiversStepContract = defineStep({
  id: "plot-rivers",
  phase: "gameplay",
  requires: [M10_EFFECT_TAGS.map.elevationBuilt],
  provides: [M4_EFFECT_TAGS.engine.riversModeled],
  artifacts: {
    requires: [hydrologyHydrographyArtifacts.hydrography],
    provides: [],
  },
  schema: PlotRiversStepConfigSchema,
});

export default PlotRiversStepContract;
