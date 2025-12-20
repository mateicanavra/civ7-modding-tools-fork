export { STORY_OVERLAY_KEYS, type StoryOverlayKey } from "@mapgen/domain/narrative/overlays/keys.js";
export { resetStoryOverlays, publishStoryOverlay, finalizeStoryOverlay, getStoryOverlay } from "@mapgen/domain/narrative/overlays/registry.js";

export { hydrateMarginsStoryTags } from "@mapgen/domain/narrative/overlays/hydrate-margins.js";
export type { MarginStoryTags, HydrateMarginsOptions } from "@mapgen/domain/narrative/overlays/hydrate-margins.js";

export { hydrateRiftsStoryTags } from "@mapgen/domain/narrative/overlays/hydrate-rifts.js";
export type { RiftStoryTags, HydrateRiftsOptions } from "@mapgen/domain/narrative/overlays/hydrate-rifts.js";

export { hydrateCorridorsStoryTags } from "@mapgen/domain/narrative/overlays/hydrate-corridors.js";
export type { CorridorStoryTags, HydrateCorridorsOptions } from "@mapgen/domain/narrative/overlays/hydrate-corridors.js";

import { STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/keys.js";
import {
  resetStoryOverlays,
  publishStoryOverlay,
  finalizeStoryOverlay,
  getStoryOverlay,
} from "@mapgen/domain/narrative/overlays/registry.js";
import { hydrateMarginsStoryTags } from "@mapgen/domain/narrative/overlays/hydrate-margins.js";
import { hydrateRiftsStoryTags } from "@mapgen/domain/narrative/overlays/hydrate-rifts.js";
import { hydrateCorridorsStoryTags } from "@mapgen/domain/narrative/overlays/hydrate-corridors.js";

export default {
  STORY_OVERLAY_KEYS,
  resetStoryOverlays,
  publishStoryOverlay,
  finalizeStoryOverlay,
  getStoryOverlay,
  hydrateMarginsStoryTags,
  hydrateRiftsStoryTags,
  hydrateCorridorsStoryTags,
};
