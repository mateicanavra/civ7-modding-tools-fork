import type { MapInfo } from "@civ7/adapter";
import type {
  LandmassConfig,
  MountainsConfig,
  VolcanoesConfig,
  ContinentBounds,
  StartsConfig,
} from "../bootstrap/types.js";
import type { ExtendedMapContext } from "../core/types.js";
import type { MapGenConfig } from "../config/index.js";
import type { StepRegistry } from "./index.js";
import { registerFoundationLayer } from "./foundation/index.js";
import { registerMorphologyLayer } from "./morphology/index.js";
import { registerHydrologyLayer } from "./hydrology/index.js";
import { registerNarrativeLayer } from "./narrative/index.js";
import { registerEcologyLayer } from "./ecology/index.js";
import { registerPlacementLayer } from "./placement/index.js";

export interface StandardLibraryRuntime {
  getStageDescriptor: (stageId: string) => { requires: readonly string[]; provides: readonly string[] };
  stageFlags: Record<string, boolean>;
  logPrefix: string;
  runFoundation: (context: ExtendedMapContext) => void;
  landmassCfg: LandmassConfig;
  mountainOptions: MountainsConfig;
  volcanoOptions: VolcanoesConfig;
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

export function registerStandardLibrary(
  registry: StepRegistry<ExtendedMapContext>,
  _config: MapGenConfig,
  runtime: StandardLibraryRuntime
): void {
  registerFoundationLayer(registry, runtime);
  registerMorphologyLayer(registry, runtime);
  registerNarrativeLayer(registry, runtime);
  registerHydrologyLayer(registry, runtime);
  registerEcologyLayer(registry, runtime);
  registerPlacementLayer(registry, runtime);
}
