import { Type } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StartsConfig } from "@mapgen/bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import { runPlacement } from "@mapgen/domain/placement/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { PlacementConfigSchema } from "@mapgen/config/index.js";
import { type StepConfigView, withStepConfig } from "@mapgen/pipeline/step-config.js";

export interface PlacementStepRuntime {
  mapInfo: MapInfo;
  starts: StartsConfig;
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

export function createPlacementStep(
  runtime: PlacementStepRuntime,
  options: PlacementStepOptions
): MapGenStep<ExtendedMapContext, StepConfigView> {
  return {
    id: "placement",
    phase: M3_STANDARD_STAGE_PHASE.placement,
    requires: options.requires,
    provides: options.provides,
    configSchema: PlacementStepConfigSchema,
    run: (context, config) => {
      withStepConfig(context, config as StepConfigView, () => {
        const placementConfig = context.config.placement ?? {};
        const { width, height } = context.dimensions;

        const startPositions = runPlacement(context.adapter, width, height, {
          mapInfo: runtime.mapInfo as { NumNaturalWonders?: number },
          starts: runtime.starts,
          placementConfig,
        });

        runtime.startPositions.push(...startPositions);
      });
    },
  };
}
