import type { EngineAdapter, MapInfo } from "@civ7/adapter";
import type { ExtendedMapContext } from "@swooper/mapgen-core";

export type StandardRuntime = {
  logPrefix: string;
  mapInfo: MapInfo;
  playersLandmass1: number;
  playersLandmass2: number;
  startSectorRows: number;
  startSectorCols: number;
  startSectors: unknown[];
  startPositions: number[];
  storyEnabled: boolean;
};

export type StandardRuntimeInit = {
  logPrefix?: string;
  mapInfo?: MapInfo;
  storyEnabled?: boolean;
};

const runtimeByContext = new WeakMap<ExtendedMapContext, StandardRuntime>();

function resolveMapInfo(adapter: EngineAdapter): MapInfo {
  const mapInfo = adapter.lookupMapInfo(adapter.getMapSizeId());
  if (!mapInfo) {
    throw new Error("[Standard] MapInfo missing for map size id.");
  }
  return mapInfo;
}

function createRuntime(context: ExtendedMapContext): StandardRuntime {
  const { adapter } = context;
  const mapInfo = resolveMapInfo(adapter);
  const playersLandmass1 = mapInfo.PlayersLandmass1 ?? 4;
  const playersLandmass2 = mapInfo.PlayersLandmass2 ?? 4;
  const startSectorRows = mapInfo.StartSectorRows ?? 4;
  const startSectorCols = mapInfo.StartSectorCols ?? 4;
  const humanNearEquator = adapter.needHumanNearEquator();
  const startSectors = adapter.chooseStartSectors(
    playersLandmass1,
    playersLandmass2,
    startSectorRows,
    startSectorCols,
    humanNearEquator
  );

  return {
    logPrefix: "[standard]",
    mapInfo,
    playersLandmass1,
    playersLandmass2,
    startSectorRows,
    startSectorCols,
    startSectors,
    startPositions: [],
    storyEnabled: true,
  };
}

export function getStandardRuntime(context: ExtendedMapContext): StandardRuntime {
  const existing = runtimeByContext.get(context);
  if (existing) return existing;
  const runtime = createRuntime(context);
  runtimeByContext.set(context, runtime);
  return runtime;
}

export function initializeStandardRuntime(
  context: ExtendedMapContext,
  init: StandardRuntimeInit = {}
): StandardRuntime {
  const runtime = getStandardRuntime(context);
  if (init.logPrefix) runtime.logPrefix = init.logPrefix;
  if (init.storyEnabled !== undefined) runtime.storyEnabled = init.storyEnabled;
  if (init.mapInfo) {
    runtime.mapInfo = init.mapInfo;
    runtime.playersLandmass1 = init.mapInfo.PlayersLandmass1 ?? runtime.playersLandmass1;
    runtime.playersLandmass2 = init.mapInfo.PlayersLandmass2 ?? runtime.playersLandmass2;
    runtime.startSectorRows = init.mapInfo.StartSectorRows ?? runtime.startSectorRows;
    runtime.startSectorCols = init.mapInfo.StartSectorCols ?? runtime.startSectorCols;
    const humanNearEquator = context.adapter.needHumanNearEquator();
    runtime.startSectors = context.adapter.chooseStartSectors(
      runtime.playersLandmass1,
      runtime.playersLandmass2,
      runtime.startSectorRows,
      runtime.startSectorCols,
      humanNearEquator
    );
  }
  return runtime;
}
