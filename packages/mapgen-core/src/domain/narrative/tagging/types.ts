export interface ContinentalMarginsOptions {
  publish?: boolean;
  hydrateStoryTags?: boolean;
}

export interface HotspotTrailsSummary {
  trails: number;
  points: number;
}

export interface RiftValleysSummary {
  rifts: number;
  lineTiles: number;
  shoulderTiles: number;
  kind: "foundation" | "legacy";
}
