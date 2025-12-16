import type { ExtendedMapContext } from "../../core/types.js";
import type { ContinentBounds, StartsConfig } from "../../bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import type { StepRegistry } from "../../pipeline/index.js";
import { createPlacementStep } from "./steps/index.js";

export interface PlacementLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
  mapInfo: MapInfo;
  playersLandmass1: number;
  playersLandmass2: number;
  startSectorRows: number;
  startSectorCols: number;
  startSectors: unknown[];
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
  placementStartsOverrides?: Partial<StartsConfig>;
  startPositions: number[];
}

export function registerPlacementLayer(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: PlacementLayerRuntime
): void {
  const baseStarts: StartsConfig = {
    playersLandmass1: runtime.playersLandmass1,
    playersLandmass2: runtime.playersLandmass2,
    westContinent: runtime.westContinent,
    eastContinent: runtime.eastContinent,
    startSectorRows: runtime.startSectorRows,
    startSectorCols: runtime.startSectorCols,
    startSectors: runtime.startSectors,
  };
  const starts =
    runtime.placementStartsOverrides && typeof runtime.placementStartsOverrides === "object"
      ? { ...baseStarts, ...runtime.placementStartsOverrides }
      : baseStarts;

  registry.register(
    createPlacementStep(
      {
        mapInfo: runtime.mapInfo,
        starts,
        startPositions: runtime.startPositions,
      },
      {
        ...runtime.getStageDescriptor("placement"),
        shouldRun: () => runtime.stageFlags.placement,
      }
    )
  );
}
