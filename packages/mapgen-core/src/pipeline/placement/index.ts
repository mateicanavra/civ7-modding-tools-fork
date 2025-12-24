import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { ContinentBounds, StartsConfig } from "@mapgen/bootstrap/types.js";
import type { MapInfo } from "@civ7/adapter";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import { createDerivePlacementInputsStep, createPlacementStep } from "@mapgen/pipeline/placement/steps.js";

export interface PlacementLayerRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  mapInfo: MapInfo;
  playersLandmass1: number;
  playersLandmass2: number;
  startSectorRows: number;
  startSectorCols: number;
  startSectors: unknown[];
  westContinent: ContinentBounds;
  eastContinent: ContinentBounds;
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
  registry.register(
    createDerivePlacementInputsStep(
      {
        mapInfo: runtime.mapInfo,
        baseStarts,
      },
      {
        ...runtime.getStageDescriptor("derivePlacementInputs"),
      }
    )
  );
  registry.register(
    createPlacementStep(
      {
        mapInfo: runtime.mapInfo,
        baseStarts,
        startPositions: runtime.startPositions,
      },
      {
        ...runtime.getStageDescriptor("placement"),
      }
    )
  );
}
