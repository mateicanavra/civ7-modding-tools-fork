/**
 * Story Tags — Sparse Registry for Narrative Motifs
 *
 * A lazy-loaded singleton that holds sparse tag sets used to imprint narrative
 * motifs onto the map (e.g., hotspot trails, rift lines, corridors, etc.).
 *
 * Uses the lazy provider pattern for test isolation:
 *   - getStoryTags() returns the memoized instance
 *   - resetStoryTags() clears the cache for test isolation
 *
 * Usage:
 *   import { getStoryTags, resetStoryTags } from "./story/tags.js";
 *
 *   // In tests
 *   beforeEach(() => { resetStoryTags(); });
 *
 *   // In generator
 *   const tags = getStoryTags();
 *   tags.hotspot.add(`${x},${y}`);
 */

// ============================================================================
// Types
// ============================================================================

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
  /** Deep-ocean hotspot trail points */
  hotspot: TagSet;
  /** Centers of hotspot islands classified as "paradise" */
  hotspotParadise: TagSet;
  /** Centers of hotspot islands classified as "volcanic" */
  hotspotVolcanic: TagSet;

  // Rift tags
  /** Linear rift centerline tiles (inland) */
  riftLine: TagSet;
  /** Lateral shoulder tiles adjacent to rift lines */
  riftShoulder: TagSet;

  // Margin tags
  /** Active continental margin segments (trenchy/fjordy coast) */
  activeMargin: TagSet;
  /** Passive shelf segments (broad shallow shelf) */
  passiveShelf: TagSet;

  // Corridor tags
  /** Naval open-water lanes (protected sea lanes) */
  corridorSeaLane: TagSet;
  /** Hotspot-based island-hop arcs (promoted trails) */
  corridorIslandHop: TagSet;
  /** Land open corridors (plains/grass bias zones) */
  corridorLandOpen: TagSet;
  /** River chain corridors (river-adjacent lowland paths) */
  corridorRiverChain: TagSet;

  // Corridor metadata
  /** Corridor kind by tile key (e.g., "sea", "islandHop", "land", "river") */
  corridorKind: CorridorMetaMap;
  /** Corridor style by tile key (e.g., "ocean", "coastal", "canyon", "plateau") */
  corridorStyle: CorridorMetaMap;
  /** Corridor frozen attribute primitives by tile key */
  corridorAttributes: CorridorAttributesMap;
}

// ============================================================================
// Internal State (lazy cache)
// ============================================================================

let _cache: StoryTagsInstance | null = null;

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a fresh StoryTags instance with empty sets/maps.
 */
function createStoryTags(): StoryTagsInstance {
  return {
    // Hotspot tags
    hotspot: new Set(),
    hotspotParadise: new Set(),
    hotspotVolcanic: new Set(),

    // Rift tags
    riftLine: new Set(),
    riftShoulder: new Set(),

    // Margin tags
    activeMargin: new Set(),
    passiveShelf: new Set(),

    // Corridor tags
    corridorSeaLane: new Set(),
    corridorIslandHop: new Set(),
    corridorLandOpen: new Set(),
    corridorRiverChain: new Set(),

    // Corridor metadata
    corridorKind: new Map(),
    corridorStyle: new Map(),
    corridorAttributes: new Map(),
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the current StoryTags instance.
 * Creates a new instance on first call or after reset.
 */
export function getStoryTags(): StoryTagsInstance {
  if (_cache) return _cache;
  _cache = createStoryTags();
  return _cache;
}

/**
 * Reset the StoryTags cache.
 * Call this at the start of each generation or in test beforeEach().
 */
export function resetStoryTags(): void {
  _cache = null;
}

/**
 * Clear all tag sets in the current StoryTags instance.
 * Unlike reset, this preserves the instance reference but clears all data.
 */
export function clearStoryTags(): void {
  const tags = getStoryTags();

  // Clear all tag sets
  tags.hotspot.clear();
  tags.hotspotParadise.clear();
  tags.hotspotVolcanic.clear();
  tags.riftLine.clear();
  tags.riftShoulder.clear();
  tags.activeMargin.clear();
  tags.passiveShelf.clear();
  tags.corridorSeaLane.clear();
  tags.corridorIslandHop.clear();
  tags.corridorLandOpen.clear();
  tags.corridorRiverChain.clear();

  // Clear corridor metadata maps
  tags.corridorKind.clear();
  tags.corridorStyle.clear();
  tags.corridorAttributes.clear();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a tag set contains a coordinate
 */
export function hasTag(tagSet: TagSet, x: number, y: number): boolean {
  return tagSet.has(`${x},${y}`);
}

/**
 * Add a coordinate to a tag set
 */
export function addTag(tagSet: TagSet, x: number, y: number): void {
  tagSet.add(`${x},${y}`);
}

/**
 * Remove a coordinate from a tag set
 */
export function removeTag(tagSet: TagSet, x: number, y: number): boolean {
  return tagSet.delete(`${x},${y}`);
}

/**
 * Get all coordinates from a tag set
 */
export function getTagCoordinates(
  tagSet: TagSet
): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  for (const key of tagSet) {
    const [x, y] = key.split(",").map(Number);
    result.push({ x, y });
  }
  return result;
}

// ============================================================================
// Default Export (for backwards compatibility)
// ============================================================================

export default {
  getStoryTags,
  resetStoryTags,
  clearStoryTags,
  hasTag,
  addTag,
  removeTag,
  getTagCoordinates,
};
