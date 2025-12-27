import type { MapInfo } from "@civ7/adapter";
import type { ContinentBounds } from "@mapgen/bootstrap/types.js";
import type { FoundationConfig, MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepRegistry } from "@mapgen/pipeline/index.js";
import { registerFoundationLayer } from "@mapgen/pipeline/foundation/index.js";
import { registerMorphologyLayer } from "@mapgen/pipeline/morphology/index.js";
import { registerHydrologyLayer } from "@mapgen/pipeline/hydrology/index.js";
import { registerNarrativeLayer } from "@mapgen/pipeline/narrative/index.js";
import { registerEcologyLayer } from "@mapgen/pipeline/ecology/index.js";
import { registerPlacementLayer } from "@mapgen/pipeline/placement/index.js";

export interface BaseLibraryRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  logPrefix: string;
  runFoundation: (context: ExtendedMapContext, config: FoundationConfig) => void;
  storyEnabled: boolean;
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

export function registerBaseLibrary(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: BaseLibraryRuntime
): void {
  registerFoundationLayer(registry, runtime);
  registerMorphologyLayer(registry, runtime);
  registerNarrativeLayer(registry, runtime);
  registerHydrologyLayer(registry, runtime);
  registerEcologyLayer(registry, runtime);
  registerPlacementLayer(registry, runtime);
}
