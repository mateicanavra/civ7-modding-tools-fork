import type {
  NarrativeCorridorAttributes,
  NarrativeCorridors,
} from "@mapgen/domain/narrative/models.js";
import type { CorridorKind, CorridorStyle } from "@mapgen/domain/narrative/corridors/types.js";

export type CorridorState = NarrativeCorridors;

export function createCorridorState(source?: NarrativeCorridors | null): CorridorState {
  if (!source) {
    return {
      seaLanes: new Set<string>(),
      islandHops: new Set<string>(),
      landCorridors: new Set<string>(),
      riverCorridors: new Set<string>(),
      kindByTile: new Map<string, CorridorKind>(),
      styleByTile: new Map<string, CorridorStyle>(),
      attributesByTile: new Map<string, NarrativeCorridorAttributes>(),
    };
  }

  return {
    seaLanes: new Set(source.seaLanes),
    islandHops: new Set(source.islandHops),
    landCorridors: new Set(source.landCorridors),
    riverCorridors: new Set(source.riverCorridors),
    kindByTile: new Map(source.kindByTile),
    styleByTile: new Map(source.styleByTile),
    attributesByTile: new Map(source.attributesByTile),
  };
}
