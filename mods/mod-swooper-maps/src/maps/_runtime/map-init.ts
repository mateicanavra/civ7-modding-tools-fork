import type { EngineAdapter, MapInfo, MapInitParams, MapSizeId } from "@civ7/adapter";
import { createCiv7Adapter } from "@civ7/adapter/civ7";

import type { MapRuntimeOptions } from "./types.js";

export interface MapInitResolution {
  mapSizeId: MapSizeId;
  mapInfo: MapInfo;
  params: MapInitParams;
}

function resolveMapInfo(
  adapter: EngineAdapter,
  options: MapRuntimeOptions,
  prefix: string,
  initParams?: Partial<MapInitParams>
): { mapSizeId: MapSizeId; mapInfo: MapInfo } {
  const hasInitWidth = initParams?.width != null;
  const hasInitHeight = initParams?.height != null;
  const hasInitTopLat = initParams?.topLatitude != null;
  const hasInitBottomLat = initParams?.bottomLatitude != null;
  const hasCompleteInitParams =
    hasInitWidth && hasInitHeight && hasInitTopLat && hasInitBottomLat;
  const hasInitMapSize = initParams?.mapSize != null;

  if (options.mapSizeDefaults) {
    const mapSizeId = options.mapSizeDefaults.mapSizeId ?? 0;
    const mapInfo = options.mapSizeDefaults.mapInfo;
    if (!mapInfo) {
      throw new Error(
        `${prefix} Failed to resolve mapInfo for mapSizeId=${String(mapSizeId)}. ` +
          `In tests, provide options.mapSizeDefaults.mapInfo; in-engine, ensure adapter map-info lookup is available.`
      );
    }
    return { mapSizeId, mapInfo };
  }

  if (hasInitMapSize) {
    const mapSizeId = initParams.mapSize as MapSizeId;
    const mapInfo = adapter.lookupMapInfo(mapSizeId);
    if (mapInfo) {
      return { mapSizeId, mapInfo };
    }
    if (hasCompleteInitParams) {
      return {
        mapSizeId,
        mapInfo: {
          GridWidth: initParams.width,
          GridHeight: initParams.height,
          MinLatitude: initParams.bottomLatitude,
          MaxLatitude: initParams.topLatitude,
        },
      };
    }
    throw new Error(
      `${prefix} Failed to resolve mapInfo for mapSizeId=${String(mapSizeId)}. ` +
        `Provide initParams width/height/latitude to proceed without mapInfo.`
    );
  }

  if (hasCompleteInitParams) {
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
  options: MapRuntimeOptions,
  initParams?: Partial<MapInitParams>
): MapInitResolution {
  const prefix = options.logPrefix || "[SWOOPER_MOD]";

  const { mapSizeId, mapInfo } = resolveMapInfo(adapter, options, prefix, initParams);

  const resolvedWidth = initParams?.width ?? mapInfo.GridWidth;
  const resolvedHeight = initParams?.height ?? mapInfo.GridHeight;
  let resolvedTopLatitude = initParams?.topLatitude ?? mapInfo.MaxLatitude;
  let resolvedBottomLatitude = initParams?.bottomLatitude ?? mapInfo.MinLatitude;

  if (options.latitudeBounds) {
    const { topLatitude, bottomLatitude } = options.latitudeBounds;
    if (topLatitude == null || bottomLatitude == null) {
      throw new Error(
        `${prefix} Incomplete latitudeBounds override. Provide both topLatitude and bottomLatitude.`
      );
    }
    if (topLatitude <= bottomLatitude) {
      throw new Error(
        `${prefix} Invalid latitudeBounds override. topLatitude must be greater than bottomLatitude.`
      );
    }
    resolvedTopLatitude = topLatitude;
    resolvedBottomLatitude = bottomLatitude;
  }

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

  const baseParams = initParams ?? {};
  const params: MapInitParams = {
    ...baseParams,
    width: resolvedWidth,
    height: resolvedHeight,
    topLatitude: resolvedTopLatitude,
    bottomLatitude: resolvedBottomLatitude,
  };

  return { mapSizeId, mapInfo, params };
}

export function resolveMapInitData(
  options: MapRuntimeOptions = {},
  initParams?: Partial<MapInitParams>
): MapInitResolution {
  const adapter = options.adapter ?? createCiv7Adapter();
  return resolveMapInitDataWithAdapter(adapter, options, initParams);
}

export function applyMapInitData(
  options: MapRuntimeOptions = {},
  initParams?: Partial<MapInitParams>
): MapInitResolution {
  const adapter = options.adapter ?? createCiv7Adapter();
  const resolved = resolveMapInitDataWithAdapter(adapter, options, initParams);
  adapter.setMapInitData(resolved.params);
  return resolved;
}
