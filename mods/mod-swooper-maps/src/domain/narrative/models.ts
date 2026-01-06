import type { CorridorKind, CorridorStyle } from "@mapgen/domain/narrative/corridors/types.js";

export type NarrativeCorridorAttributes = Readonly<Record<string, unknown>>;

export interface NarrativeCorridors {
  seaLanes: Set<string>;
  islandHops: Set<string>;
  landCorridors: Set<string>;
  riverCorridors: Set<string>;
  kindByTile: Map<string, CorridorKind>;
  styleByTile: Map<string, CorridorStyle>;
  attributesByTile: Map<string, NarrativeCorridorAttributes>;
}

export interface NarrativeMotifsMargins {
  activeMargin: Set<string>;
  passiveShelf: Set<string>;
}

export interface NarrativeMotifsHotspots {
  points: Set<string>;
  paradise: Set<string>;
  volcanic: Set<string>;
  trails?: Array<{ coords: Array<{ x: number; y: number }>; kind: string }>;
}

export interface NarrativeMotifsRifts {
  riftLine: Set<string>;
  riftShoulder: Set<string>;
}

export interface NarrativeMotifsOrogeny {
  belts: Set<string>;
  windward: Set<string>;
  lee: Set<string>;
}
