/**
 * Story Overlay Registry — Immutable narrative data products.
 *
 * Overlays capture sparse storytelling metadata (margins, corridors, etc.) so
 * downstream stages can consume consistent snapshots without rerunning the
 * tagging passes that produced them.
 *
 * Uses lazy provider pattern for test isolation.
 */

import type { StoryOverlaySnapshot, StoryOverlayRegistry } from "../core/types.js";
import type { StoryTagsInstance } from "./tags.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Known overlay keys
 */
export const STORY_OVERLAY_KEYS = {
  MARGINS: "margins",
  HOTSPOTS: "hotspots",
  RIFTS: "rifts",
  OROGENY: "orogeny",
  CORRIDORS: "corridors",
  SWATCHES: "swatches",
  PALEO: "paleo",
} as const;

export type StoryOverlayKey = (typeof STORY_OVERLAY_KEYS)[keyof typeof STORY_OVERLAY_KEYS];

// ============================================================================
// Internal State (lazy cache)
// ============================================================================

let _registry: StoryOverlayRegistry | null = null;

function getRegistry(): StoryOverlayRegistry {
  if (_registry) return _registry;
  _registry = new Map();
  return _registry;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Reset the global overlay registry.
 * Call this at the start of each generation or in test beforeEach().
 */
export function resetStoryOverlays(): void {
  _registry = null;
}

/**
 * Get an overlay registry for diagnostics (read-only access).
 */
export function getStoryOverlayRegistry(): ReadonlyMap<string, StoryOverlaySnapshot> {
  return getRegistry();
}

// ============================================================================
// Context Interface (minimal for decoupling)
// ============================================================================

interface OverlayContext {
  overlays?: StoryOverlayRegistry;
}

// ============================================================================
// Overlay Operations
// ============================================================================

/**
 * Publish an overlay snapshot into the registry and attach it to the provided
 * context when available.
 */
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

/**
 * Finalize an overlay snapshot without publishing it to the registry.
 */
export function finalizeStoryOverlay(
  key: string,
  overlay: Partial<StoryOverlaySnapshot>
): StoryOverlaySnapshot {
  return normalizeOverlay(key, overlay);
}

/**
 * Retrieve an overlay snapshot. Prefers the context registry when available
 * and falls back to the global module registry.
 */
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

// ============================================================================
// Margin Hydration
// ============================================================================

export interface MarginStoryTags {
  activeMargin?: Set<string>;
  passiveShelf?: Set<string>;
}

export interface HydrateMarginsOptions {
  clear?: boolean;
}

/**
 * Populate StoryTags margin sets from a margin overlay snapshot.
 */
export function hydrateMarginsStoryTags(
  overlay: StoryOverlaySnapshot | null | undefined,
  storyTags: MarginStoryTags | null | undefined,
  options: HydrateMarginsOptions = {}
): MarginStoryTags | null | undefined {
  if (!overlay || !storyTags || typeof storyTags !== "object") {
    return storyTags;
  }

  const active = Array.isArray(overlay.active) ? overlay.active : [];
  const passive = Array.isArray(overlay.passive) ? overlay.passive : [];
  const clear = options.clear !== false;

  const activeSet = storyTags.activeMargin;
  const passiveSet = storyTags.passiveShelf;

  if (clear) {
    activeSet?.clear?.();
    passiveSet?.clear?.();
  }

  if (activeSet && typeof activeSet.add === "function") {
    for (const key of active) {
      activeSet.add(key);
    }
  }

  if (passiveSet && typeof passiveSet.add === "function") {
    for (const key of passive) {
      passiveSet.add(key);
    }
  }

  return storyTags;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Normalize and freeze an overlay snapshot to guarantee immutability.
 */
function normalizeOverlay(
  key: string,
  overlay: Partial<StoryOverlaySnapshot>
): StoryOverlaySnapshot {
  const base = overlay && typeof overlay === "object" ? overlay : {};
  const width = Number.isFinite(base.width) ? (base.width as number) : 0;
  const height = Number.isFinite(base.height) ? (base.height as number) : 0;
  const version = Number.isFinite(base.version) ? (base.version as number) : 1;
  const kind =
    typeof base.kind === "string" && base.kind.length > 0 ? base.kind : key;
  const active = freezeKeyArray(base.active);
  const passive = freezeKeyArray(base.passive);
  const summary = freezeSummary(base.summary);

  return Object.freeze({
    key,
    kind,
    version,
    width,
    height,
    active,
    passive,
    summary,
  });
}

function freezeKeyArray(
  values: readonly string[] | undefined
): readonly string[] {
  if (!Array.isArray(values)) return Object.freeze([]);

  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") continue;
    if (seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }

  return Object.freeze(deduped);
}

function freezeSummary(
  summary: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, unknown>> {
  if (!summary || typeof summary !== "object") {
    return Object.freeze({});
  }
  return Object.freeze({ ...summary });
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  STORY_OVERLAY_KEYS,
  resetStoryOverlays,
  getStoryOverlayRegistry,
  publishStoryOverlay,
  finalizeStoryOverlay,
  getStoryOverlay,
  hydrateMarginsStoryTags,
};
