import type {
  PlacementConfig,
  FloodplainsConfig,
  ContinentBounds,
  StartsConfig,
} from "../../bootstrap/types.js";

export type { PlacementConfig, FloodplainsConfig, ContinentBounds, StartsConfig };

export interface MapInfo {
  NumNaturalWonders?: number;
  [key: string]: unknown;
}

export interface PlacementOptions {
  mapInfo?: MapInfo;
  wondersPlusOne?: boolean;
  floodplains?: FloodplainsConfig;
  starts?: StartsConfig;
  placementConfig?: PlacementConfig;
}

