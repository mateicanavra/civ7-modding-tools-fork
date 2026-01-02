import type { EngineAdapter, MapInfo, MapSizeId } from "@civ7/adapter";
import type { TraceConfig, TraceSession, TraceSink } from "@swooper/mapgen-core";

export interface MapSizeDefaults {
  mapSizeId?: MapSizeId;
  mapInfo: MapInfo;
}

export interface MapRuntimeOptions {
  adapter?: EngineAdapter;
  createAdapter?: (width: number, height: number) => EngineAdapter;
  logPrefix?: string;
  mapSizeDefaults?: MapSizeDefaults;
  trace?: TraceConfig;
  traceSink?: TraceSink | null;
  traceSession?: TraceSession | null;
}

export type { MapInfo, MapInitParams } from "@civ7/adapter";
