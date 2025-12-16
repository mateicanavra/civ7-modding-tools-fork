/**
 * Story Module — Compatibility facade for the Narrative domain
 *
 * This module provides:
 * - StoryTags: Sparse registry for narrative motifs (hotspots, rifts, corridors)
 * - Overlays: Immutable snapshots of tagging results
 *
 * Canonical implementation lives under `src/narrative/**`; this module preserves legacy import paths.
 */

// Re-export tags module
export {
  type TagSet,
  type CorridorMetaMap,
  type CorridorAttributesMap,
  type StoryTagsInstance,
  getStoryTags,
  resetStoryTags,
  clearStoryTags,
  hasTag,
  addTag,
  removeTag,
  getTagCoordinates,
} from "./tags.js";

// Re-export overlays module
export {
  STORY_OVERLAY_KEYS,
  type StoryOverlayKey,
  resetStoryOverlays,
  getStoryOverlayRegistry,
  publishStoryOverlay,
  finalizeStoryOverlay,
  getStoryOverlay,
  hydrateMarginsStoryTags,
  hydrateRiftsStoryTags,
  hydrateCorridorsStoryTags,
  type MarginStoryTags,
  type HydrateMarginsOptions,
  type RiftStoryTags,
  type HydrateRiftsOptions,
  type CorridorStoryTags,
  type HydrateCorridorsOptions,
} from "./overlays.js";

// Re-export minimal tagging subset
export {
  storyTagContinentalMargins,
  storyTagHotspotTrails,
  storyTagRiftValleys,
  type ContinentalMarginsOptions,
  type HotspotTrailsSummary,
  type RiftValleysSummary,
} from "./tagging.js";

export {
  getOrogenyCache,
  resetOrogenyCache,
  clearOrogenyCache,
  storyTagOrogenyBelts,
  type OrogenyCacheInstance,
  type OrogenySummary,
} from "./orogeny.js";

export {
  resetCorridorStyleCache,
  storyTagStrategicCorridors,
  type CorridorStage,
} from "./corridors.js";

export { storyTagClimateSwatches, storyTagClimatePaleo } from "./swatches.js";

export { storyTagPaleoHydrology, type PaleoSummary } from "./paleo.js";
