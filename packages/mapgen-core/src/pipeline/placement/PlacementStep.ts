import { Type, type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StartsConfig } from "@mapgen/bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import { runPlacement } from "@mapgen/domain/placement/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { PlacementConfigSchema } from "@mapgen/config/index.js";
import { getPublishedPlacementInputs } from "@mapgen/pipeline/artifacts.js";

export interface PlacementStepRuntime {
  mapInfo: MapInfo;
  baseStarts: StartsConfig;
  startPositions: number[];
}

export interface PlacementStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

const PlacementStepConfigSchema = Type.Object(
  {
    placement: PlacementConfigSchema,
  },
  { additionalProperties: false, default: { placement: {} } }
);

type PlacementStepConfig = Static<typeof PlacementStepConfigSchema>;

export function createPlacementStep(
  runtime: PlacementStepRuntime,
  options: PlacementStepOptions
): MapGenStep<ExtendedMapContext, PlacementStepConfig> {
  return {
    id: "placement",
    phase: M3_STANDARD_STAGE_PHASE.placement,
    requires: options.requires,
    provides: options.provides,
    configSchema: PlacementStepConfigSchema,
    run: (context, config) => {
      const derivedInputs = getPublishedPlacementInputs(context);
      const placementConfig = derivedInputs?.placementConfig ?? config.placement ?? {};
      const starts =
        derivedInputs?.starts ??
        (placementConfig.starts && typeof placementConfig.starts === "object"
          ? { ...runtime.baseStarts, ...placementConfig.starts }
          : runtime.baseStarts);
      const { width, height } = context.dimensions;

      const startPositions = runPlacement(context.adapter, width, height, {
        mapInfo: (derivedInputs?.mapInfo ?? runtime.mapInfo) as { NumNaturalWonders?: number },
        starts,
        placementConfig,
      });

      runtime.startPositions.push(...startPositions);
    },
  };
}
