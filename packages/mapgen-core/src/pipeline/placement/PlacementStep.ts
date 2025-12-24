import { type Static } from "typebox";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { runPlacement } from "@mapgen/domain/placement/index.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "@mapgen/pipeline/index.js";
import { EmptyStepConfigSchema } from "@mapgen/pipeline/step-config.js";
import { getPublishedPlacementInputs } from "@mapgen/pipeline/artifacts.js";

export interface PlacementStepRuntime {
  startPositions: number[];
}

export interface PlacementStepOptions {
  requires: readonly string[];
  provides: readonly string[];
}

type PlacementStepConfig = Static<typeof EmptyStepConfigSchema>;

export function createPlacementStep(
  runtime: PlacementStepRuntime,
  options: PlacementStepOptions
): MapGenStep<ExtendedMapContext, PlacementStepConfig> {
  return {
    id: "placement",
    phase: M3_STANDARD_STAGE_PHASE.placement,
    requires: options.requires,
    provides: options.provides,
    configSchema: EmptyStepConfigSchema,
    run: (context, _config) => {
      const derivedInputs = getPublishedPlacementInputs(context);
      if (!derivedInputs) {
        throw new Error("Missing required artifact: placementInputs@v1");
      }
      const placementConfig = derivedInputs.placementConfig ?? {};
      const starts = derivedInputs.starts;
      const { width, height } = context.dimensions;

      const startPositions = runPlacement(context.adapter, width, height, {
        mapInfo: derivedInputs.mapInfo as { NumNaturalWonders?: number },
        starts,
        placementConfig,
      });

      runtime.startPositions.push(...startPositions);
    },
  };
}
