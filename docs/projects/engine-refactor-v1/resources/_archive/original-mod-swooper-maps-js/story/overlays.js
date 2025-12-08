// @ts-nocheck
/**
 * Story Overlay Registry — immutable narrative data products.
 *
 * Overlays capture sparse storytelling metadata (margins, corridors, etc.) so
 * downstream stages can consume consistent snapshots without rerunning the
 * tagging passes that produced them.
 */

const overlayRegistry = new Map();

/** @typedef {import("../core/types.js").StoryOverlaySnapshot} StoryOverlaySnapshot */
/** @typedef {import("../core/types.js").StoryOverlayRegistry} StoryOverlayRegistry */

/**
 * Known overlay keys.
 */
export const StoryOverlayKeys = Object.freeze({
  MARGINS: "margins",
});

/**
 * Clear the global overlay registry. Primarily used by tests.
 */
export function resetStoryOverlays() {
  overlayRegistry.clear();
}

/**
 * Publish an overlay snapshot into the registry and attach it to the provided
 * MapContext when available.
 *
 * @param {import("../core/types.js").MapContext|null} ctx
 * @param {string} key
 * @param {Partial<StoryOverlaySnapshot>} overlay
 * @returns {StoryOverlaySnapshot}
 */
export function publishStoryOverlay(ctx, key, overlay) {
  const snapshot = normalizeOverlay(key, overlay);
  overlayRegistry.set(key, snapshot);
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
 *
 * @param {string} key
 * @param {Partial<StoryOverlaySnapshot>} overlay
 * @returns {StoryOverlaySnapshot}
 */
export function finalizeStoryOverlay(key, overlay) {
  return normalizeOverlay(key, overlay);
}

/**
 * Retrieve an overlay snapshot. Prefers the MapContext registry when available
 * and falls back to the global module registry.
 *
 * @param {import("../core/types.js").MapContext|null} ctx
 * @param {string} key
 * @returns {StoryOverlaySnapshot|null}
 */
export function getStoryOverlay(ctx, key) {
  if (ctx && ctx.overlays && typeof ctx.overlays.get === "function") {
    const local = ctx.overlays.get(key);
    if (local)
      return local;
  }
  return overlayRegistry.get(key) || null;
}

/**
 * Populate StoryTags margin sets from a margin overlay snapshot.
 *
 * @param {StoryOverlaySnapshot|null|undefined} overlay
 * @param {{ activeMargin?: Set<string>, passiveShelf?: Set<string> }} storyTags
 * @param {{ clear?: boolean }} [options]
 * @returns {typeof storyTags}
 */
export function hydrateMarginsStoryTags(overlay, storyTags, options = {}) {
  if (!overlay || !storyTags || typeof storyTags !== "object")
    return storyTags;
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
    for (const key of active)
      activeSet.add(key);
  }
  if (passiveSet && typeof passiveSet.add === "function") {
    for (const key of passive)
      passiveSet.add(key);
  }
  return storyTags;
}

/**
 * Internal: normalize and freeze an overlay snapshot to guarantee immutability.
 *
 * @param {string} key
 * @param {Partial<StoryOverlaySnapshot>} overlay
 * @returns {StoryOverlaySnapshot}
 */
function normalizeOverlay(key, overlay) {
  const base = overlay && typeof overlay === "object" ? overlay : {};
  const width = Number.isFinite(base.width) ? base.width : 0;
  const height = Number.isFinite(base.height) ? base.height : 0;
  const version = Number.isFinite(base.version) ? base.version : 1;
  const kind = typeof base.kind === "string" && base.kind.length > 0 ? base.kind : key;
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

function freezeKeyArray(values) {
  if (!Array.isArray(values))
    return Object.freeze([]);
  const deduped = [];
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string")
      continue;
    if (seen.has(value))
      continue;
    seen.add(value);
    deduped.push(value);
  }
  return Object.freeze(deduped);
}

function freezeSummary(summary) {
  if (!summary || typeof summary !== "object")
    return Object.freeze({});
  return Object.freeze({ ...summary });
}

/**
 * Expose the registry for diagnostics without allowing mutation.
 */
export const StoryOverlays = Object.freeze({
  get registry() {
    return overlayRegistry;
  },
});
