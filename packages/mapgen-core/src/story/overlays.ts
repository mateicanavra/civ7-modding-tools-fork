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
// Rifts Hydration
// ============================================================================

export interface RiftStoryTags {
  riftLine?: Set<string>;
  riftShoulder?: Set<string>;
}

export interface HydrateRiftsOptions {
  clear?: boolean;
}

export function hydrateRiftsStoryTags(
  overlay: StoryOverlaySnapshot | null | undefined,
  storyTags: RiftStoryTags | null | undefined,
  options: HydrateRiftsOptions = {}
): RiftStoryTags | null | undefined {
  if (!overlay || !storyTags || typeof storyTags !== "object") {
    return storyTags;
  }

  const line = Array.isArray(overlay.active) ? overlay.active : [];
  const shoulder = Array.isArray(overlay.passive) ? overlay.passive : [];
  const clear = options.clear !== false;

  const lineSet = storyTags.riftLine;
  const shoulderSet = storyTags.riftShoulder;

  if (clear) {
    lineSet?.clear?.();
    shoulderSet?.clear?.();
  }

  if (lineSet && typeof lineSet.add === "function") {
    for (const key of line) {
      lineSet.add(key);
    }
  }

  if (shoulderSet && typeof shoulderSet.add === "function") {
    for (const key of shoulder) {
      shoulderSet.add(key);
    }
  }

  return storyTags;
}

// ============================================================================
// Corridors Hydration
// ============================================================================

export interface CorridorStoryTags {
  corridorSeaLane?: Set<string>;
  corridorIslandHop?: Set<string>;
  corridorLandOpen?: Set<string>;
  corridorRiverChain?: Set<string>;
  corridorKind?: Map<string, string>;
  corridorStyle?: Map<string, string>;
  corridorAttributes?: Map<string, Readonly<Record<string, unknown>>>;
}

export interface HydrateCorridorsOptions {
  clear?: boolean;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const v of value) {
    if (typeof v === "string") out.push(v);
  }
  return out;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function hydrateCorridorsStoryTags(
  overlay: StoryOverlaySnapshot | null | undefined,
  storyTags: CorridorStoryTags | null | undefined,
  options: HydrateCorridorsOptions = {}
): CorridorStoryTags | null | undefined {
  if (!overlay || !storyTags || typeof storyTags !== "object") {
    return storyTags;
  }

  const summary = overlay.summary as Record<string, unknown>;
  const seaLane = asStringArray(summary.seaLane) ?? [];
  const islandHop = asStringArray(summary.islandHop) ?? [];
  const landOpen = asStringArray(summary.landOpen) ?? [];
  const riverChain = asStringArray(summary.riverChain) ?? [];

  const kindByTile = asRecord(summary.kindByTile) ?? {};
  const styleByTile = asRecord(summary.styleByTile) ?? {};
  const attributesByTile = asRecord(summary.attributesByTile) ?? {};

  const clear = options.clear !== false;

  const seaLaneSet = storyTags.corridorSeaLane;
  const islandHopSet = storyTags.corridorIslandHop;
  const landOpenSet = storyTags.corridorLandOpen;
  const riverChainSet = storyTags.corridorRiverChain;
  const kindMap = storyTags.corridorKind;
  const styleMap = storyTags.corridorStyle;
  const attributesMap = storyTags.corridorAttributes;

  if (clear) {
    seaLaneSet?.clear?.();
    islandHopSet?.clear?.();
    landOpenSet?.clear?.();
    riverChainSet?.clear?.();
    kindMap?.clear?.();
    styleMap?.clear?.();
    attributesMap?.clear?.();
  }

  if (seaLaneSet && typeof seaLaneSet.add === "function") {
    for (const key of seaLane) seaLaneSet.add(key);
  }
  if (islandHopSet && typeof islandHopSet.add === "function") {
    for (const key of islandHop) islandHopSet.add(key);
  }
  if (landOpenSet && typeof landOpenSet.add === "function") {
    for (const key of landOpen) landOpenSet.add(key);
  }
  if (riverChainSet && typeof riverChainSet.add === "function") {
    for (const key of riverChain) riverChainSet.add(key);
  }

  if (kindMap && typeof kindMap.set === "function") {
    for (const [tileKey, kind] of Object.entries(kindByTile)) {
      if (typeof kind === "string") kindMap.set(tileKey, kind);
    }
  }

  if (styleMap && typeof styleMap.set === "function") {
    for (const [tileKey, style] of Object.entries(styleByTile)) {
      if (typeof style === "string") styleMap.set(tileKey, style);
    }
  }

  if (attributesMap && typeof attributesMap.set === "function") {
    for (const [tileKey, attrs] of Object.entries(attributesByTile)) {
      if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) continue;
      attributesMap.set(tileKey, attrs as Readonly<Record<string, unknown>>);
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
  hydrateRiftsStoryTags,
  hydrateCorridorsStoryTags,
};
