import type { CorridorPolicy } from "@mapgen/domain/morphology/coastlines/types.js";
import type { NarrativeCorridors } from "@mapgen/domain/narrative/models.js";
import { forEachNeighbor3x3 } from "@swooper/mapgen-core/lib/grid";

export function resolveSeaCorridorPolicy(
  corridors: CorridorPolicy
): { protection: string; softChanceMultiplier: number } {
  const seaPolicy = corridors.sea;
  if (!seaPolicy) {
    throw new Error("[Coastlines] Missing sea corridor policy.");
  }
  const protection = seaPolicy.protection;
  if (!protection) {
    throw new Error("[Coastlines] Missing sea corridor protection.");
  }
  const rawSoftChance = seaPolicy.softChanceMultiplier;
  if (typeof rawSoftChance !== "number" || !Number.isFinite(rawSoftChance)) {
    throw new Error("[Coastlines] Invalid sea corridor softChanceMultiplier.");
  }
  const softChanceMultiplier = Math.max(0, Math.min(1, rawSoftChance));
  return { protection, softChanceMultiplier };
}

export function findNeighborSeaLaneAttributes(
  x: number,
  y: number,
  width: number,
  height: number,
  corridors: NarrativeCorridors | null | undefined
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
  corridors: NarrativeCorridors | null | undefined
): Record<string, unknown> | null {
  const laneAttr = findNeighborSeaLaneAttributes(x, y, width, height, corridors);
  return laneAttr?.edge ? (laneAttr.edge as Record<string, unknown>) : null;
}
