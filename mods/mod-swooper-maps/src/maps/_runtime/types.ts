import type { EngineAdapter, MapInfo, MapSizeId } from "@civ7/adapter";

export interface MapSizeDefaults {
  mapSizeId?: MapSizeId;
  mapInfo: MapInfo;
}

export interface MapRuntimeOptions {
  adapter?: EngineAdapter;
  createAdapter?: (width: number, height: number) => EngineAdapter;
  logPrefix?: string;
  mapSizeDefaults?: MapSizeDefaults;
}

export type { MapInfo, MapInitParams } from "@civ7/adapter";
