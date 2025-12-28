import type {
  PlacementConfig,
  FloodplainsConfig,
  ContinentBounds,
  StartsConfig,
} from "@swooper/mapgen-core/bootstrap";

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

