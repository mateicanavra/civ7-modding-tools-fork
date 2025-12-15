import type { StoryOverlaySnapshot, StoryOverlayRegistry } from "../../../core/types.js";
import { normalizeOverlay } from "./normalize.js";

let _registry: StoryOverlayRegistry | null = null;

function getRegistry(): StoryOverlayRegistry {
  if (_registry) return _registry;
  _registry = new Map();
  return _registry;
}

export function resetStoryOverlays(): void {
  _registry = null;
}

export function getStoryOverlayRegistry(): ReadonlyMap<string, StoryOverlaySnapshot> {
  return getRegistry();
}

interface OverlayContext {
  overlays?: StoryOverlayRegistry;
}

export function publishStoryOverlay(
  ctx: OverlayContext | null | undefined,
  key: string,
  overlay: Partial<StoryOverlaySnapshot>
): StoryOverlaySnapshot {
  const snapshot = normalizeOverlay(key, overlay);
  getRegistry().set(key, snapshot);

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
  return getRegistry().get(key) || null;
}

