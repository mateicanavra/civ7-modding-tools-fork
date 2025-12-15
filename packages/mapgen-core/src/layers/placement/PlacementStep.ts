import type { ExtendedMapContext } from "../../core/types.js";
import type { StartsConfig } from "../../bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import { runPlacement } from "./placement.js";
import { M3_STANDARD_STAGE_PHASE, type MapGenStep } from "../../pipeline/index.js";

export interface PlacementStepRuntime {
  mapInfo: MapInfo;
  starts: StartsConfig;
  startPositions: number[];
}

export interface PlacementStepOptions {
  requires: readonly string[];
  provides: readonly string[];
  shouldRun?: () => boolean;
}

export function createPlacementStep(
  runtime: PlacementStepRuntime,
  options: PlacementStepOptions
): MapGenStep<ExtendedMapContext> {
  return {
    id: "placement",
    phase: M3_STANDARD_STAGE_PHASE.placement,
    requires: options.requires,
    provides: options.provides,
    shouldRun: options.shouldRun ? () => options.shouldRun?.() === true : undefined,
    run: (context) => {
      const placementConfig = context.config.placement ?? {};
      const { width, height } = context.dimensions;

      const startPositions = runPlacement(context.adapter, width, height, {
        mapInfo: runtime.mapInfo as { NumNaturalWonders?: number },
        starts: runtime.starts,
        placementConfig,
      });

      runtime.startPositions.push(...startPositions);
    },
  };
}

