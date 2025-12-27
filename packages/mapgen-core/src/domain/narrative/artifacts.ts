import type { CorridorKind, CorridorStyle } from "@mapgen/domain/narrative/corridors/types.js";
import type { OrogenyCacheInstance } from "@mapgen/domain/narrative/orogeny/cache.js";
import type { StoryTagsInstance } from "@mapgen/domain/narrative/tags/instance.js";

export type NarrativeCorridorAttributes = Readonly<Record<string, unknown>>;

export interface NarrativeCorridorsV1 {
  seaLanes: Set<string>;
  islandHops: Set<string>;
  landCorridors: Set<string>;
  riverCorridors: Set<string>;
  kindByTile: Map<string, CorridorKind>;
  styleByTile: Map<string, CorridorStyle>;
  attributesByTile: Map<string, NarrativeCorridorAttributes>;
}

export interface NarrativeMotifsMarginsV1 {
  activeMargin: Set<string>;
  passiveShelf: Set<string>;
}

export interface NarrativeMotifsHotspotsV1 {
  points: Set<string>;
  paradise: Set<string>;
  volcanic: Set<string>;
  trails?: Array<{ coords: Array<{ x: number; y: number }>; kind: string }>;
}

export interface NarrativeMotifsRiftsV1 {
  riftLine: Set<string>;
  riftShoulder: Set<string>;
}

export interface NarrativeMotifsOrogenyV1 {
  belts: Set<string>;
  windward: Set<string>;
  lee: Set<string>;
}

export function buildNarrativeCorridorsV1(tags: StoryTagsInstance): NarrativeCorridorsV1 {
  return {
    seaLanes: cloneSet(tags.corridorSeaLane),
    islandHops: cloneSet(tags.corridorIslandHop),
    landCorridors: cloneSet(tags.corridorLandOpen),
    riverCorridors: cloneSet(tags.corridorRiverChain),
    kindByTile: cloneCorridorKinds(tags.corridorKind),
    styleByTile: cloneCorridorStyles(tags.corridorStyle),
    attributesByTile: cloneMap(tags.corridorAttributes),
  };
}

export function buildNarrativeMotifsMarginsV1(tags: StoryTagsInstance): NarrativeMotifsMarginsV1 {
  return {
    activeMargin: cloneSet(tags.activeMargin),
    passiveShelf: cloneSet(tags.passiveShelf),
  };
}

export function buildNarrativeMotifsHotspotsV1(tags: StoryTagsInstance): NarrativeMotifsHotspotsV1 {
  return {
    points: cloneSet(tags.hotspot),
    paradise: cloneSet(tags.hotspotParadise),
    volcanic: cloneSet(tags.hotspotVolcanic),
  };
}

export function buildNarrativeMotifsRiftsV1(tags: StoryTagsInstance): NarrativeMotifsRiftsV1 {
  return {
    riftLine: cloneSet(tags.riftLine),
    riftShoulder: cloneSet(tags.riftShoulder),
  };
}

export function buildNarrativeMotifsOrogenyV1(
  cache: OrogenyCacheInstance
): NarrativeMotifsOrogenyV1 {
  return {
    belts: cloneSet(cache.belts),
    windward: cloneSet(cache.windward),
    lee: cloneSet(cache.lee),
  };
}

export function isNarrativeCorridorsV1(value: unknown): value is NarrativeCorridorsV1 {
  if (!isRecord(value)) return false;
  return (
    value.seaLanes instanceof Set &&
    value.islandHops instanceof Set &&
    value.landCorridors instanceof Set &&
    value.riverCorridors instanceof Set &&
    value.kindByTile instanceof Map &&
    value.styleByTile instanceof Map &&
    value.attributesByTile instanceof Map
  );
}

export function isNarrativeMotifsMarginsV1(
  value: unknown
): value is NarrativeMotifsMarginsV1 {
  if (!isRecord(value)) return false;
  return value.activeMargin instanceof Set && value.passiveShelf instanceof Set;
}

export function isNarrativeMotifsHotspotsV1(
  value: unknown
): value is NarrativeMotifsHotspotsV1 {
  if (!isRecord(value)) return false;
  if (!(value.points instanceof Set)) return false;
  if (!(value.paradise instanceof Set)) return false;
  if (!(value.volcanic instanceof Set)) return false;
  if (value.trails !== undefined && !isTrailArray(value.trails)) return false;
  return true;
}

export function isNarrativeMotifsRiftsV1(value: unknown): value is NarrativeMotifsRiftsV1 {
  if (!isRecord(value)) return false;
  return value.riftLine instanceof Set && value.riftShoulder instanceof Set;
}

export function isNarrativeMotifsOrogenyV1(
  value: unknown
): value is NarrativeMotifsOrogenyV1 {
  if (!isRecord(value)) return false;
  return value.belts instanceof Set && value.windward instanceof Set && value.lee instanceof Set;
}

function cloneSet<T>(value: Iterable<T>): Set<T> {
  return new Set(value);
}

function cloneMap<K, V>(value: Map<K, V>): Map<K, V> {
  return new Map(value);
}

function cloneCorridorKinds(value: Map<string, string>): Map<string, CorridorKind> {
  const cloned = new Map<string, CorridorKind>();
  for (const [key, kind] of value.entries()) {
    cloned.set(key, kind as CorridorKind);
  }
  return cloned;
}

function cloneCorridorStyles(value: Map<string, string>): Map<string, CorridorStyle> {
  const cloned = new Map<string, CorridorStyle>();
  for (const [key, style] of value.entries()) {
    cloned.set(key, style as CorridorStyle);
  }
  return cloned;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTrailArray(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every(isTrail);
}

function isTrail(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.coords)) return false;
  if (typeof value.kind !== "string") return false;
  return value.coords.every(isCoord);
}

function isCoord(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.x === "number" && typeof value.y === "number";
}
