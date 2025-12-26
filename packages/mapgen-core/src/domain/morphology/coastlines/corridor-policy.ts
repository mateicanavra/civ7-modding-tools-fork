import type { CorridorPolicy } from "@mapgen/domain/morphology/coastlines/types.js";
import type { NarrativeCorridorsV1 } from "@mapgen/domain/narrative/artifacts.js";
import { forEachNeighbor3x3 } from "@mapgen/lib/grid/neighborhood/square-3x3.js";

export function resolveSeaCorridorPolicy(
  corridors: CorridorPolicy | null | undefined
): { protection: string; softChanceMultiplier: number } {
  const corridorPolicy = corridors || {};
  const seaPolicy = corridorPolicy.sea || {};
  const protection = seaPolicy.protection || "hard";
  const softChanceMultiplier = Math.max(0, Math.min(1, seaPolicy.softChanceMultiplier ?? 0.5));
  return { protection, softChanceMultiplier };
}

export function findNeighborSeaLaneAttributes(
  x: number,
  y: number,
  width: number,
  height: number,
  corridors: NarrativeCorridorsV1 | null | undefined
): Record<string, unknown> | null {
  let laneAttr: Record<string, unknown> | null = null;
  forEachNeighbor3x3(x, y, width, height, (nx, ny) => {
    if (laneAttr) return;
    const k = `${nx},${ny}`;
    if (corridors?.seaLanes?.has(k)) {
      laneAttr = (corridors?.attributesByTile?.get(k) as Record<string, unknown>) || null;
    }
  });
  return laneAttr;
}

export function findNeighborSeaLaneEdgeConfig(
  x: number,
  y: number,
  width: number,
  height: number,
  corridors: NarrativeCorridorsV1 | null | undefined
): Record<string, unknown> | null {
  const laneAttr = findNeighborSeaLaneAttributes(x, y, width, height, corridors);
  return laneAttr?.edge ? (laneAttr.edge as Record<string, unknown>) : null;
}
