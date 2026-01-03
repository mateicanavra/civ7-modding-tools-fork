import { Type, type Static } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";
import * as placement from "@mapgen/domain/placement";

import { publishPlacementInputs } from "./apply.js";
import { buildPlacementInputs } from "./inputs.js";
import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../../../tags.js";

const DerivePlacementInputsConfigSchema = Type.Object(
  {
    wonders: placement.ops.planWonders.config,
    floodplains: placement.ops.planFloodplains.config,
    starts: placement.ops.planStarts.config,
  },
  {
    additionalProperties: false,
    default: {
      wonders: placement.ops.planWonders.defaultConfig,
      floodplains: placement.ops.planFloodplains.defaultConfig,
      starts: placement.ops.planStarts.defaultConfig,
    },
  }
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
  resolveConfig: (config, settings) => ({
    wonders: placement.ops.planWonders.resolveConfig
      ? placement.ops.planWonders.resolveConfig(config.wonders, settings)
      : config.wonders,
    floodplains: placement.ops.planFloodplains.resolveConfig
      ? placement.ops.planFloodplains.resolveConfig(config.floodplains, settings)
      : config.floodplains,
    starts: placement.ops.planStarts.resolveConfig
      ? placement.ops.planStarts.resolveConfig(config.starts, settings)
      : config.starts,
  }),
  run: (context, config: DerivePlacementInputsConfig) => {
    const inputs = buildPlacementInputs(context, config);
    publishPlacementInputs(context, inputs);
  },
} as const);
