<<<<<<<< HEAD:packages/mapgen-core/src/base/library.ts
import type { MapInfo } from "@civ7/adapter";
import type { ContinentBounds } from "@mapgen/bootstrap/types.js";
import type { FoundationConfig, MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepRegistry } from "@mapgen/engine/index.js";
import { registerFoundationLayer } from "@mapgen/base/pipeline/foundation/index.js";
import { registerMorphologyLayer } from "@mapgen/base/pipeline/morphology/index.js";
import { registerHydrologyLayer } from "@mapgen/base/pipeline/hydrology/index.js";
import { registerNarrativeLayer } from "@mapgen/base/pipeline/narrative/index.js";
import { registerEcologyLayer } from "@mapgen/base/pipeline/ecology/index.js";
import { registerPlacementLayer } from "@mapgen/base/pipeline/placement/index.js";


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
========
import type { MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StepRegistry } from "@mapgen/engine/index.js";
import { registerBaseLibrary, type BaseLibraryRuntime } from "@mapgen/base/library.js";

export type StandardLibraryRuntime = BaseLibraryRuntime;
>>>>>>>> 6496976f (M5-U03: move base tags/recipes/registry wiring into base mod):packages/mapgen-core/src/pipeline/standard-library.ts

export function registerBaseLibrary(
  registry: StepRegistry<ExtendedMapContext>,
  runtime: BaseLibraryRuntime
): void {
  registerBaseLibrary(registry, runtime);
}
