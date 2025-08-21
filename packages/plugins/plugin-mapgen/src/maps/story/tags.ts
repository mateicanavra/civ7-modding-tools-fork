// @ts-nocheck
/**
 * Climate Story — StoryTags
 *
 * A tiny singleton that holds sparse tag sets used to imprint narrative motifs
 * onto the map (e.g., hotspot trails, rift lines, shoulders, etc.). The object
 * itself is frozen to prevent reassignment, but the contained Sets are mutable.
 *
 * Usage:
 *   import { StoryTags, resetStoryTags } from './story/tags.js';
 *   StoryTags.hotspot.add(`${x},${y}`);
 *   resetStoryTags(); // clears all tag sets between generations
 */

/** @typedef {Set<string>} TagSet */

/**
 * StoryTags — singleton container for sparse tag sets.
 * Keys are tile-coordinate strings in the form "x,y".
 */
export const StoryTags = Object.freeze({
    /** @type {TagSet} Deep-ocean hotspot trail points */
    hotspot: new Set(),

    /** @type {TagSet} Centers of hotspot islands classified as "paradise" */
    hotspotParadise: new Set(),

    /** @type {TagSet} Centers of hotspot islands classified as "volcanic" */
    hotspotVolcanic: new Set(),

    /** @type {TagSet} Linear rift centerline tiles (inland) */
    riftLine: new Set(),

    /** @type {TagSet} Lateral shoulder tiles adjacent to rift lines */
    riftShoulder: new Set(),

    /** @type {TagSet} Active continental margin segments (trenchy/fjordy coast) */
    activeMargin: new Set(),

    /** @type {TagSet} Passive shelf segments (broad shallow shelf) */
    passiveShelf: new Set(),

    /** @type {TagSet} Naval open-water lanes (protected sea lanes) */
    corridorSeaLane: new Set(),

    /** @type {TagSet} Hotspot-based island-hop arcs (promoted trails) */
    corridorIslandHop: new Set(),

    /** @type {TagSet} Land open corridors (plains/grass bias zones) */
    corridorLandOpen: new Set(),

    /** @type {TagSet} River chain corridors (river-adjacent lowland paths) */
    corridorRiverChain: new Set(),

    /**
     * Corridor metadata — kind and style
     * - kind: high-level corridor family (e.g., "sea", "islandHop", "land", "river")
     * - style: sub-variant or motif (e.g., "ocean", "coastal", "canyon", "plateau", "flatMtn")
     * Keys match StoryTags tile keys ("x,y"). These maps are sparse like the tag sets.
     */
    /** @type {Map<string, string>} */
    corridorKind: new Map(),
    /** @type {Map<string, string>} */
    corridorStyle: new Map(),
});

/**
 * Clears all StoryTags sets. Call once per generation (or when rebuilding tags)
 * to ensure callers never operate on stale data.
 */
export function resetStoryTags() {
    StoryTags.hotspot.clear();
    StoryTags.hotspotParadise.clear();
    StoryTags.hotspotVolcanic.clear();
    StoryTags.riftLine.clear();
    StoryTags.riftShoulder.clear();
    StoryTags.activeMargin.clear();
    StoryTags.passiveShelf.clear();
    StoryTags.corridorSeaLane.clear();
    StoryTags.corridorIslandHop.clear();
    StoryTags.corridorLandOpen.clear();
    StoryTags.corridorRiverChain.clear();
    // Corridor metadata maps
    StoryTags.corridorKind.clear();
    StoryTags.corridorStyle.clear();
}

export default StoryTags;
