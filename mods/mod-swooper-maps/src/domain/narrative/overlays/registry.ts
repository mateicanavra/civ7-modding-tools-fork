import type { StoryOverlaySnapshot, StoryOverlayRegistry } from "@swooper/mapgen-core";
import { STORY_OVERLAY_KEYS, type StoryOverlayKey } from "./keys.js";
import { normalizeOverlay } from "@mapgen/domain/narrative/overlays/normalize.js";

interface OverlayContext {
  overlays?: StoryOverlayRegistry;
}

export function resetStoryOverlays(ctx: OverlayContext | null | undefined): void {
  if (!ctx?.overlays) return;
  ctx.overlays.corridors.length = 0;
  ctx.overlays.swatches.length = 0;
  ctx.overlays.motifs.length = 0;
}

const OVERLAY_COLLECTION_BY_KEY: Record<StoryOverlayKey, keyof StoryOverlayRegistry> = {
  [STORY_OVERLAY_KEYS.CORRIDORS]: "corridors",
  [STORY_OVERLAY_KEYS.MARGINS]: "motifs",
  [STORY_OVERLAY_KEYS.HOTSPOTS]: "motifs",
  [STORY_OVERLAY_KEYS.RIFTS]: "motifs",
  [STORY_OVERLAY_KEYS.OROGENY]: "motifs",
};

const emptyOverlays = (): StoryOverlayRegistry => ({
  corridors: [],
  swatches: [],
  motifs: [],
});

const resolveOverlayCollection = (key: StoryOverlayKey): keyof StoryOverlayRegistry =>
  OVERLAY_COLLECTION_BY_KEY[key];

const ensureOverlayRegistry = (
  ctx: OverlayContext | null | undefined
): StoryOverlayRegistry | null => {
  if (!ctx || typeof ctx !== "object") return null;
  if (!ctx.overlays || typeof ctx.overlays !== "object") {
    ctx.overlays = emptyOverlays();
    return ctx.overlays;
  }

  ctx.overlays.corridors = Array.isArray(ctx.overlays.corridors)
    ? ctx.overlays.corridors
    : [];
  ctx.overlays.swatches = Array.isArray(ctx.overlays.swatches)
    ? ctx.overlays.swatches
    : [];
  ctx.overlays.motifs = Array.isArray(ctx.overlays.motifs) ? ctx.overlays.motifs : [];
  return ctx.overlays;
}

export function publishStoryOverlay(
  ctx: OverlayContext | null | undefined,
  key: StoryOverlayKey,
  overlay: Partial<StoryOverlaySnapshot>
): StoryOverlaySnapshot {
  const snapshot = normalizeOverlay(key, overlay);

  const registry = ensureOverlayRegistry(ctx);
  if (registry) {
    const collection = resolveOverlayCollection(key);
    registry[collection].push(snapshot);
  }

  return snapshot;
}

export function finalizeStoryOverlay(
  key: StoryOverlayKey,
  overlay: Partial<StoryOverlaySnapshot>
): StoryOverlaySnapshot {
  return normalizeOverlay(key, overlay);
}

export function getStoryOverlay(
  ctx: OverlayContext | null | undefined,
  key: StoryOverlayKey
): StoryOverlaySnapshot | null {
  const registry = ctx?.overlays;
  if (!registry) return null;
  const collection = resolveOverlayCollection(key);
  const overlays = registry[collection];
  if (!Array.isArray(overlays)) return null;
  for (let i = overlays.length - 1; i >= 0; i -= 1) {
    const local = overlays[i];
    if (local?.key === key) return local;
  }
  return null;
}
