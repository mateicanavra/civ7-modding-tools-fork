import type { EngineAdapter, MapInfo, MapInitParams, MapSizeId } from "@civ7/adapter";
import { createCiv7Adapter } from "@civ7/adapter/civ7";

import type { OrchestratorConfig } from "@mapgen/orchestrator/types.js";

export interface MapInitResolution {
  mapSizeId: MapSizeId;
  mapInfo: MapInfo;
  params: MapInitParams;
}

function resolveMapInfo(
  adapter: EngineAdapter,
  options: OrchestratorConfig,
  prefix: string,
  initParams?: Partial<MapInitParams>
): { mapSizeId: MapSizeId; mapInfo: MapInfo } {
  const hasInitWidth = initParams?.width != null;
  const hasInitHeight = initParams?.height != null;
  const hasInitTopLat = initParams?.topLatitude != null;
  const hasInitBottomLat = initParams?.bottomLatitude != null;
  const hasCompleteInitParams =
    hasInitWidth && hasInitHeight && hasInitTopLat && hasInitBottomLat;

  if (options.mapSizeDefaults) {
    const mapSizeId = options.mapSizeDefaults.mapSizeId ?? 0;
    const mapInfo = options.mapSizeDefaults.mapInfo;
    console.log(`${prefix} Using test mapSizeDefaults`);
    if (!mapInfo) {
      throw new Error(
        `${prefix} Failed to resolve mapInfo for mapSizeId=${String(mapSizeId)}. ` +
          `In tests, provide options.mapSizeDefaults.mapInfo; in-engine, ensure adapter map-info lookup is available.`
      );
    }
    return { mapSizeId, mapInfo };
  }

  if (hasCompleteInitParams) {
    console.log(`${prefix} Using initParams for map initialization`);
    return {
      mapSizeId: "initParams",
      mapInfo: {
        GridWidth: initParams.width,
        GridHeight: initParams.height,
        MinLatitude: initParams.bottomLatitude,
        MaxLatitude: initParams.topLatitude,
      },
    };
  }

  const mapSizeId = adapter.getMapSizeId();
  const mapInfo = adapter.lookupMapInfo(mapSizeId);
  if (!mapInfo) {
    throw new Error(
      `${prefix} Failed to resolve mapInfo for mapSizeId=${String(mapSizeId)}. ` +
        `In tests, provide options.mapSizeDefaults.mapInfo; in-engine, ensure adapter map-info lookup is available.`
    );
  }

  return { mapSizeId, mapInfo };
}

function resolveMapInitDataWithAdapter(
  adapter: EngineAdapter,
  options: OrchestratorConfig,
  initParams?: Partial<MapInitParams>
): MapInitResolution {
  const prefix = options.logPrefix || "[SWOOPER_MOD]";
  console.log(`${prefix} === RequestMapInitData ===`);

  const { mapSizeId, mapInfo } = resolveMapInfo(adapter, options, prefix, initParams);

  const resolvedWidth = initParams?.width ?? mapInfo.GridWidth;
  const resolvedHeight = initParams?.height ?? mapInfo.GridHeight;
  const resolvedTopLatitude = initParams?.topLatitude ?? mapInfo.MaxLatitude;
  const resolvedBottomLatitude = initParams?.bottomLatitude ?? mapInfo.MinLatitude;

  if (resolvedWidth == null || resolvedHeight == null) {
    throw new Error(
      `${prefix} Missing map dimensions. Provide initParams.width/height or include GridWidth/GridHeight in mapInfo.`
    );
  }
  if (resolvedTopLatitude == null || resolvedBottomLatitude == null) {
    throw new Error(
      `${prefix} Missing map latitude bounds. Provide initParams.topLatitude/bottomLatitude or include MaxLatitude/MinLatitude in mapInfo.`
    );
  }

  console.log(`${prefix} Map size ID: ${mapSizeId}`);
  console.log(
    `${prefix} MapInfo: GridWidth=${resolvedWidth}, GridHeight=${resolvedHeight}, ` +
      `Lat=[${resolvedBottomLatitude}, ${resolvedTopLatitude}]`
  );

  const params: MapInitParams = {
    width: resolvedWidth,
    height: resolvedHeight,
    topLatitude: resolvedTopLatitude,
    bottomLatitude: resolvedBottomLatitude,
    wrapX: initParams?.wrapX ?? true,
    wrapY: initParams?.wrapY ?? false,
  };

  console.log(`${prefix} Final dimensions: ${params.width} x ${params.height}`);
  console.log(
    `${prefix} Final latitude range: ${params.bottomLatitude} to ${params.topLatitude}`
  );

  return { mapSizeId, mapInfo, params };
}

export function resolveMapInitData(
  options: OrchestratorConfig = {},
  initParams?: Partial<MapInitParams>
): MapInitResolution {
  const adapter = options.adapter ?? createCiv7Adapter();
  return resolveMapInitDataWithAdapter(adapter, options, initParams);
}

export function applyMapInitData(
  options: OrchestratorConfig = {},
  initParams?: Partial<MapInitParams>
): MapInitResolution {
  const adapter = options.adapter ?? createCiv7Adapter();
  const resolved = resolveMapInitDataWithAdapter(adapter, options, initParams);
  adapter.setMapInitData(resolved.params);
  return resolved;
}
