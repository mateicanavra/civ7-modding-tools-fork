/** Tile coordinate set (keys are "x,y" strings) */
export type TagSet = Set<string>;

/** Corridor metadata map */
export type CorridorMetaMap = Map<string, string>;

/** Corridor attributes map */
export type CorridorAttributesMap = Map<string, Readonly<Record<string, unknown>>>;

/**
 * StoryTags interface — container for sparse tag sets.
 * Keys are tile-coordinate strings in the form "x,y".
 */
export interface StoryTagsInstance {
  // Hotspot tags
  hotspot: TagSet;
  hotspotParadise: TagSet;
  hotspotVolcanic: TagSet;

  // Rift tags
  riftLine: TagSet;
  riftShoulder: TagSet;

  // Margin tags
  activeMargin: TagSet;
  passiveShelf: TagSet;

  // Corridor tags
  corridorSeaLane: TagSet;
  corridorIslandHop: TagSet;
  corridorLandOpen: TagSet;
  corridorRiverChain: TagSet;

  // Corridor metadata
  corridorKind: CorridorMetaMap;
  corridorStyle: CorridorMetaMap;
  corridorAttributes: CorridorAttributesMap;
}

export function createStoryTags(): StoryTagsInstance {
  return {
    hotspot: new Set(),
    hotspotParadise: new Set(),
    hotspotVolcanic: new Set(),

    riftLine: new Set(),
    riftShoulder: new Set(),

    activeMargin: new Set(),
    passiveShelf: new Set(),

    corridorSeaLane: new Set(),
    corridorIslandHop: new Set(),
    corridorLandOpen: new Set(),
    corridorRiverChain: new Set(),

    corridorKind: new Map(),
    corridorStyle: new Map(),
    corridorAttributes: new Map(),
  };
}

