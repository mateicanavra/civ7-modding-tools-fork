/**
 * Story Module — Narrative tagging and overlay system
 *
 * This module provides:
 * - StoryTags: Sparse registry for narrative motifs (hotspots, rifts, corridors)
 * - Overlays: Immutable snapshots of tagging results
 *
 * All functions use lazy provider pattern for test isolation.
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
  type MarginStoryTags,
  type HydrateMarginsOptions,
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
