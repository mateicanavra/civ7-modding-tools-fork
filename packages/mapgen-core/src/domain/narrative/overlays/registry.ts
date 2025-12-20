import type { StoryOverlaySnapshot, StoryOverlayRegistry } from "@mapgen/core/types.js";
import { normalizeOverlay } from "@mapgen/domain/narrative/overlays/normalize.js";

interface OverlayContext {
  overlays?: StoryOverlayRegistry;
}

export function resetStoryOverlays(ctx: OverlayContext | null | undefined): void {
  ctx?.overlays?.clear?.();
}

export function publishStoryOverlay(
  ctx: OverlayContext | null | undefined,
  key: string,
  overlay: Partial<StoryOverlaySnapshot>
): StoryOverlaySnapshot {
  const snapshot = normalizeOverlay(key, overlay);

  if (ctx && typeof ctx === "object") {
    if (!ctx.overlays || typeof ctx.overlays.set !== "function") {
      ctx.overlays = new Map();
    }
    ctx.overlays.set(key, snapshot);
  }

  return snapshot;
}

export function finalizeStoryOverlay(key: string, overlay: Partial<StoryOverlaySnapshot>): StoryOverlaySnapshot {
  return normalizeOverlay(key, overlay);
}

export function getStoryOverlay(
  ctx: OverlayContext | null | undefined,
  key: string
): StoryOverlaySnapshot | null {
  if (ctx?.overlays && typeof ctx.overlays.get === "function") {
    const local = ctx.overlays.get(key);
    if (local) return local;
  }
  return null;
}
