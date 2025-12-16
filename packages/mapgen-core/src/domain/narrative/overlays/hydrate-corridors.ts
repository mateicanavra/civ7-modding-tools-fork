import type { StoryOverlaySnapshot } from "../../../core/types.js";
import { asRecord, asStringArray } from "../../../lib/collections/record.js";

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

