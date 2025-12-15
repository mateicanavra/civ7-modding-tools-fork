export { STORY_OVERLAY_KEYS, type StoryOverlayKey } from "./keys.js";
export { resetStoryOverlays, getStoryOverlayRegistry, publishStoryOverlay, finalizeStoryOverlay, getStoryOverlay } from "./registry.js";

export { hydrateMarginsStoryTags } from "./hydrate-margins.js";
export type { MarginStoryTags, HydrateMarginsOptions } from "./hydrate-margins.js";

export { hydrateRiftsStoryTags } from "./hydrate-rifts.js";
export type { RiftStoryTags, HydrateRiftsOptions } from "./hydrate-rifts.js";

export { hydrateCorridorsStoryTags } from "./hydrate-corridors.js";
export type { CorridorStoryTags, HydrateCorridorsOptions } from "./hydrate-corridors.js";

import { STORY_OVERLAY_KEYS } from "./keys.js";
import {
  resetStoryOverlays,
  getStoryOverlayRegistry,
  publishStoryOverlay,
  finalizeStoryOverlay,
  getStoryOverlay,
} from "./registry.js";
import { hydrateMarginsStoryTags } from "./hydrate-margins.js";
import { hydrateRiftsStoryTags } from "./hydrate-rifts.js";
import { hydrateCorridorsStoryTags } from "./hydrate-corridors.js";

export default {
  STORY_OVERLAY_KEYS,
  resetStoryOverlays,
  getStoryOverlayRegistry,
  publishStoryOverlay,
  finalizeStoryOverlay,
  getStoryOverlay,
  hydrateMarginsStoryTags,
  hydrateRiftsStoryTags,
  hydrateCorridorsStoryTags,
};

