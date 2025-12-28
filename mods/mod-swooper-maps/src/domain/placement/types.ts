import type { ContinentBounds } from "@civ7/adapter";
import type { PlacementConfig, FloodplainsConfig, StartsConfig } from "@mapgen/config";

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
