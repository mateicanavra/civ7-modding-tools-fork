import { Type, type Static } from "typebox";
import type { MapInfo } from "@civ7/adapter";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StartsConfig } from "@mapgen/bootstrap/types.js";
import { PlacementConfigSchema } from "@mapgen/config/index.js";
import { publishPlacementInputsArtifact } from "@mapgen/pipeline/artifacts.js";
import { M3_STANDARD_STAGE_PHASE } from "@mapgen/base/phases.js";
import type { MapGenStep } from "@mapgen/pipeline/index.js";
import type { PlacementInputsV1 } from "@mapgen/pipeline/placement/placement-inputs.js";

export interface DerivePlacementInputsRuntime {
  mapInfo: MapInfo;
  baseStarts: StartsConfig;
}

export interface DerivePlacementInputsOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const DerivePlacementInputsConfigSchema = Type.Object(
  {
    placement: PlacementConfigSchema,
  },
  { additionalProperties: false, default: { placement: {} } }
);

type DerivePlacementInputsConfig = Static<typeof DerivePlacementInputsConfigSchema>;

export function createDerivePlacementInputsStep(
  runtime: DerivePlacementInputsRuntime,
  options: DerivePlacementInputsOptions
): MapGenStep<ExtendedMapContext, DerivePlacementInputsConfig> {
  return {
    id: "derivePlacementInputs",
    phase: M3_STANDARD_STAGE_PHASE.placement,
    requires: options.requires,
    provides: options.provides,
    configSchema: DerivePlacementInputsConfigSchema,
    run: (context, config) => {
      const placementConfig = config.placement ?? {};
      const starts =
        placementConfig.starts && typeof placementConfig.starts === "object"
          ? { ...runtime.baseStarts, ...placementConfig.starts }
          : runtime.baseStarts;
      const inputs: PlacementInputsV1 = {
        mapInfo: runtime.mapInfo,
        starts,
        placementConfig,
      };
      publishPlacementInputsArtifact(context, inputs);
    },
  };
}
