import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { createStep } from "@swooper/mapgen-core/authoring";
import { PlacementConfigSchema } from "@swooper/mapgen-core/config";
import { publishPlacementInputsArtifact } from "../../../artifacts.js";
import { getBaseStarts, getStandardRuntime } from "../../../runtime.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../tags.js";
import type { PlacementInputsV1 } from "../placement-inputs.js";

const DerivePlacementInputsConfigSchema = Type.Object(
  {
    placement: PlacementConfigSchema,
  },
  { additionalProperties: false, default: { placement: {} } }
);

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsConfigSchema>;

export default createStep({
  id: "derivePlacementInputs",
  phase: "placement",
  requires: [
    M4_EFFECT_TAGS.engine.coastlinesApplied,
    M4_EFFECT_TAGS.engine.riversModeled,
    M4_EFFECT_TAGS.engine.featuresApplied,
  ],
  provides: [M3_DEPENDENCY_TAGS.artifact.placementInputsV1],
  schema: DerivePlacementInputsConfigSchema,
  run: (context: ExtendedMapContext, config: DerivePlacementInputsConfig) => {
    const runtime = getStandardRuntime(context);
    const baseStarts = getBaseStarts(context);
    const placementConfig = config.placement ?? {};
    const starts =
      placementConfig.starts && typeof placementConfig.starts === "object"
        ? { ...baseStarts, ...placementConfig.starts }
        : baseStarts;
    const inputs: PlacementInputsV1 = {
      mapInfo: runtime.mapInfo,
      starts,
      placementConfig,
    };
    publishPlacementInputsArtifact(context, inputs);
  },
} as const);
