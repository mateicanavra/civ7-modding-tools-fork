import type { ExtendedMapContext, TraceScope } from "@swooper/mapgen-core";
import { HILL_TERRAIN, MOUNTAIN_TERRAIN, getTerrainSymbol } from "@swooper/mapgen-core";
import { wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";

import placement from "@mapgen/domain/placement";
import type { DeepReadonly, Static } from "@swooper/mapgen-core/authoring";
import type { PlacementOutputsV1 } from "../../placement-outputs.js";

type PlanFloodplainsOutput = Static<typeof placement.ops.planFloodplains["output"]>;
type PlanStartsOutput = Static<typeof placement.ops.planStarts["output"]>;
type PlanWondersOutput = Static<typeof placement.ops.planWonders["output"]>;

type MorphologyLandmassesSnapshot = Static<
  (typeof import("../../../morphology-pre/artifacts.js").morphologyArtifacts)["landmasses"]["schema"]
>;

type ApplyPlacementArgs = {
  context: ExtendedMapContext;
  starts: DeepReadonly<PlanStartsOutput>;
  wonders: DeepReadonly<PlanWondersOutput>;
  floodplains: DeepReadonly<PlanFloodplainsOutput>;
  landmasses: DeepReadonly<MorphologyLandmassesSnapshot>;
  publishOutputs: (outputs: PlacementOutputsV1) => DeepReadonly<PlacementOutputsV1>;
};

export function applyPlacementPlan({
  context,
  starts,
  wonders,
  floodplains,
  landmasses,
  publishOutputs,
}: ApplyPlacementArgs): DeepReadonly<PlacementOutputsV1> {
  const { adapter, trace } = context;
  const { width, height } = context.dimensions;
  const emit = (payload: Record<string, unknown>): void => {
    if (!trace?.isVerbose) return;
    trace.event(() => payload);
  };

  emit({ type: "placement.start", message: "[SWOOPER_MOD] === placement plan apply ===" });
  emit({ type: "placement.start", message: `[SWOOPER_MOD] Map size: ${width}x${height}` });

  logTerrainStats(trace, adapter, width, height, "Initial");

  try {
    adapter.addNaturalWonders(width, height, wonders.wondersCount);
  } catch (err) {
    emit({ type: "placement.wonders.error", error: err instanceof Error ? err.message : String(err) });
  }

  try {
    adapter.addFloodplains(floodplains.minLength, floodplains.maxLength);
  } catch (err) {
    emit({
      type: "placement.floodplains.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    adapter.validateAndFixTerrain();
    emit({ type: "placement.terrain.validated" });
    logTerrainStats(trace, adapter, width, height, "After validateAndFixTerrain");
  } catch (err) {
    emit({
      type: "placement.terrain.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    adapter.recalculateAreas();
    emit({ type: "placement.areas.recalculated" });
  } catch (err) {
    emit({
      type: "placement.areas.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    adapter.storeWaterData();
    emit({ type: "placement.water.stored" });
  } catch (err) {
    emit({
      type: "placement.water.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  let projection: RegionProjection | null = null;
  try {
    projection = projectLandmassRegions(context, landmasses);
    emit({ type: "placement.landmassRegion.projected" });
  } catch (err) {
    emit({
      type: "placement.landmassRegion.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    adapter.generateResources(width, height);
  } catch (err) {
    emit({
      type: "placement.resources.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const startPositions: number[] = [];
  try {
    const { positions, assigned } = assignStartPositions({
      context,
      starts,
      projection,
    });

    const totalPlayers = positions.length;
    const successCount = assigned;

    if (totalPlayers > 0 && successCount !== totalPlayers) {
      emit({
        type: "placement.starts.partial",
        successCount,
        totalPlayers,
        failures: Math.max(0, totalPlayers - successCount),
      });
      throw new Error(
        `[SWOOPER_MOD] Failed to assign start positions for all players (assigned ${successCount}/${totalPlayers}).`
      );
    }

    startPositions.push(...positions);
    emit({ type: "placement.starts.assigned", successCount, totalPlayers });
  } catch (err) {
    emit({
      type: "placement.starts.error",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  try {
    adapter.generateDiscoveries(width, height, startPositions);
    emit({ type: "placement.discoveries.applied" });
  } catch (err) {
    emit({
      type: "placement.discoveries.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    adapter.recalculateFertility();
    emit({ type: "placement.fertility.recalculated" });
  } catch (err) {
    emit({
      type: "placement.fertility.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    adapter.assignAdvancedStartRegions();
  } catch (err) {
    emit({
      type: "placement.advancedStart.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logTerrainStats(trace, adapter, width, height, "Final");
  logAsciiMap(trace, adapter, width, height);

  const startsAssigned = startPositions.filter((pos) => Number.isFinite(pos) && pos >= 0).length;
  const outputs: PlacementOutputsV1 = {
    naturalWondersCount: wonders.wondersCount,
    floodplainsCount: 0,
    snowTilesCount: 0,
    resourcesCount: 0,
    startsAssigned,
    discoveriesCount: 0,
  };

  return publishOutputs(outputs);
}

type RegionProjection = {
  landmassIdByTile: Int32Array;
  regionByLandmass: Int32Array;
  westRegionId: number;
  eastRegionId: number;
  noneRegionId: number;
};

/**
 * Gameplay-owned projection: stamp LandmassRegionId from Morphology landmasses.
 */
function projectLandmassRegions(
  context: ExtendedMapContext,
  landmasses: MorphologyLandmassesSnapshot
): RegionProjection {
  const { adapter } = context;
  const { width, height } = context.dimensions;
  const landmassIdByTile = landmasses.landmassIdByTile;
  const expected = width * height;

  if (!(landmassIdByTile instanceof Int32Array)) {
    throw new Error("Morphology landmasses snapshot is missing landmassIdByTile.");
  }
  if (landmassIdByTile.length !== expected) {
    throw new Error(
      `Expected landmassIdByTile length ${expected} (received ${landmassIdByTile.length}).`
    );
  }

  const westRegionId = adapter.getLandmassId("WEST");
  const eastRegionId = adapter.getLandmassId("EAST");
  const noneRegionId = adapter.getLandmassId("NONE");

  const regionByLandmass = new Int32Array(landmasses.landmasses.length);
  for (const mass of landmasses.landmasses) {
    const centerX = computeWrappedIntervalCenter(mass.bbox.west, mass.bbox.east, width);
    regionByLandmass[mass.id] = centerX < width / 2 ? westRegionId : eastRegionId;
  }

  for (let i = 0; i < landmassIdByTile.length; i++) {
    const landmassId = landmassIdByTile[i] ?? -1;
    const regionId =
      landmassId >= 0 && landmassId < regionByLandmass.length
        ? regionByLandmass[landmassId] ?? noneRegionId
        : noneRegionId;
    const y = (i / width) | 0;
    const x = i - y * width;
    adapter.setLandmassRegionId(x, y, regionId);
  }

  return { landmassIdByTile, regionByLandmass, westRegionId, eastRegionId, noneRegionId };
}

type AssignStartPositionsArgs = {
  context: ExtendedMapContext;
  starts: DeepReadonly<PlanStartsOutput>;
  projection: RegionProjection | null;
};

function assignStartPositions({
  context,
  starts,
  projection,
}: AssignStartPositionsArgs): { positions: number[]; assigned: number } {
  const { adapter } = context;
  const { width, height } = context.dimensions;
  const playersWest = Math.max(0, starts.playersLandmass1 | 0);
  const playersEast = Math.max(0, starts.playersLandmass2 | 0);
  const totalPlayers = playersWest + playersEast;

  if (!projection || totalPlayers <= 0) {
    return { positions: new Array<number>(Math.max(0, totalPlayers)).fill(-1), assigned: 0 };
  }

  const { landmassIdByTile, regionByLandmass, westRegionId, eastRegionId } = projection;
  const used = new Uint8Array(width * height);
  const positions = new Array<number>(totalPlayers).fill(-1);

  const westCandidates = collectCandidates(landmassIdByTile, regionByLandmass, westRegionId);
  const eastCandidates = collectCandidates(landmassIdByTile, regionByLandmass, eastRegionId);
  const allCandidates = collectCandidates(landmassIdByTile, regionByLandmass, null);

  const startSectors = Array.isArray(starts.startSectors) ? starts.startSectors : [];
  const sectorRows = Math.max(0, starts.startSectorRows | 0);
  const sectorCols = Math.max(0, starts.startSectorCols | 0);

  const selectForRegion = (
    region: "west" | "east",
    candidates: number[],
    count: number
  ): number[] => {
    if (count <= 0) return [];
    const filtered = filterCandidatesBySectors(
      candidates,
      width,
      height,
      sectorRows,
      sectorCols,
      startSectors,
      region
    );
    const pool = filtered.length ? filtered : candidates;
    return chooseStartTiles(pool, count, width, height, used);
  };

  const selectedWest = selectForRegion("west", westCandidates, playersWest);
  const selectedEast = selectForRegion("east", eastCandidates, playersEast);

  for (let i = 0; i < playersWest; i++) {
    positions[i] = selectedWest[i] ?? -1;
  }
  for (let i = 0; i < playersEast; i++) {
    positions[playersWest + i] = selectedEast[i] ?? -1;
  }

  let assigned = 0;
  for (let i = 0; i < positions.length; i++) {
    const plotIndex = positions[i] ?? -1;
    if (plotIndex >= 0) {
      adapter.setStartPosition(plotIndex, i);
      assigned++;
    }
  }

  if (assigned < totalPlayers && allCandidates.length) {
    const remaining = totalPlayers - assigned;
    const fallback = chooseStartTiles(allCandidates, remaining, width, height, used);
    let writeIndex = 0;
    for (let i = 0; i < positions.length && writeIndex < fallback.length; i++) {
      if (positions[i] >= 0) continue;
      const plotIndex = fallback[writeIndex] ?? -1;
      positions[i] = plotIndex;
      if (plotIndex >= 0) {
        adapter.setStartPosition(plotIndex, i);
        assigned++;
      }
      writeIndex++;
    }
  }

  return { positions, assigned };
}

function collectCandidates(
  landmassIdByTile: Int32Array,
  regionByLandmass: Int32Array,
  regionId: number | null
): number[] {
  const candidates: number[] = [];
  for (let i = 0; i < landmassIdByTile.length; i++) {
    const landmassId = landmassIdByTile[i] ?? -1;
    if (landmassId < 0) continue;
    if (regionId === null) {
      candidates.push(i);
      continue;
    }
    if (regionByLandmass[landmassId] === regionId) candidates.push(i);
  }
  return candidates;
}

function filterCandidatesBySectors(
  candidates: number[],
  width: number,
  height: number,
  rows: number,
  cols: number,
  sectors: unknown[],
  region: "west" | "east"
): number[] {
  if (rows <= 0 || cols <= 0) return candidates;
  const sectorsPerRegion = rows * cols;
  if (sectors.length !== sectorsPerRegion && sectors.length !== sectorsPerRegion * 2) {
    return candidates;
  }

  const offset = sectors.length === sectorsPerRegion * 2 && region === "east" ? sectorsPerRegion : 0;
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const maxCol = Math.max(1, cols);
  const maxRow = Math.max(1, rows);

  return candidates.filter((idx) => {
    const y = (idx / width) | 0;
    const x = idx - y * width;
    const col = Math.min(maxCol - 1, Math.max(0, Math.floor(x / cellWidth)));
    const row = Math.min(maxRow - 1, Math.max(0, Math.floor(y / cellHeight)));
    const sectorIndex = offset + row * cols + col;
    return Boolean(sectors[sectorIndex]);
  });
}

function chooseStartTiles(
  candidates: number[],
  count: number,
  width: number,
  height: number,
  used: Uint8Array
): number[] {
  if (count <= 0) return [];
  const available = candidates.filter((idx) => used[idx] !== 1);
  if (!available.length) return [];

  const seed = pickSeedTile(available, width, height);
  const selected: number[] = [];
  if (seed >= 0) {
    selected.push(seed);
    used[seed] = 1;
  }

  while (selected.length < count) {
    let bestIdx = -1;
    let bestDistance = -1;
    for (const idx of available) {
      if (used[idx] === 1) continue;
      const distance = minDistanceToSelection(idx, selected, width, height);
      if (distance > bestDistance) {
        bestDistance = distance;
        bestIdx = idx;
      }
    }
    if (bestIdx < 0) break;
    selected.push(bestIdx);
    used[bestIdx] = 1;
  }

  return selected;
}

function pickSeedTile(candidates: number[], width: number, height: number): number {
  if (!candidates.length) return -1;
  let sumX = 0;
  let sumY = 0;
  for (const idx of candidates) {
    const y = (idx / width) | 0;
    const x = idx - y * width;
    sumX += x;
    sumY += y;
  }
  const centerX = sumX / candidates.length;
  const centerY = sumY / candidates.length;

  let bestIdx = candidates[0] ?? -1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const idx of candidates) {
    const y = (idx / width) | 0;
    const x = idx - y * width;
    const dx = x - centerX;
    const dy = y - centerY;
    const score = dx * dx + dy * dy;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }
  return bestIdx;
}

function minDistanceToSelection(
  idx: number,
  selected: number[],
  width: number,
  height: number
): number {
  if (!selected.length) return Infinity;
  let best = Infinity;
  for (const other of selected) {
    const dist = hexDistanceOddQ(idx, other, width, height);
    if (dist < best) best = dist;
  }
  return best;
}

function hexDistanceOddQ(
  aIndex: number,
  bIndex: number,
  width: number,
  _height: number
): number {
  const ay = (aIndex / width) | 0;
  const ax = aIndex - ay * width;
  const by = (bIndex / width) | 0;
  const bx = bIndex - by * width;
  const wrappedBx = ax + wrapDeltaPeriodic(bx - ax, width);
  const aCube = oddqToCube(ax, ay);
  const bCube = oddqToCube(wrappedBx, by);
  const dx = Math.abs(aCube.x - bCube.x);
  const dy = Math.abs(aCube.y - bCube.y);
  const dz = Math.abs(aCube.z - bCube.z);
  return Math.max(dx, dy, dz);
}

function oddqToCube(x: number, y: number): { x: number; y: number; z: number } {
  const z = y - (x - (x & 1)) / 2;
  const xCube = x;
  const zCube = z;
  const yCube = -xCube - zCube;
  return { x: xCube, y: yCube, z: zCube };
}

function computeWrappedIntervalCenter(west: number, east: number, width: number): number {
  if (width <= 0) return 0;
  const w = ((west % width) + width) % width;
  const e = ((east % width) + width) % width;
  if (w <= e) return Math.floor((w + e) / 2);
  const length = width - w + (e + 1);
  return (w + Math.floor(length / 2)) % width;
}

function logTerrainStats(
  trace: TraceScope | null | undefined,
  adapter: ExtendedMapContext["adapter"],
  width: number,
  height: number,
  stage: string
): void {
  if (!trace?.isVerbose) return;
  let flat = 0;
  let hill = 0;
  let mtn = 0;
  let water = 0;
  const total = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) {
        water++;
        continue;
      }
      const t = adapter.getTerrainType(x, y);
      if (t === MOUNTAIN_TERRAIN) mtn++;
      else if (t === HILL_TERRAIN) hill++;
      else flat++;
    }
  }

  const land = Math.max(1, flat + hill + mtn);
  trace.event(() => ({
    type: "placement.terrainStats",
    stage,
    totals: {
      water: Number(((water / total) * 100).toFixed(1)),
      land: Number(((land / total) * 100).toFixed(1)),
      landTiles: land,
    },
    shares: {
      mountains: Number(((mtn / land) * 100).toFixed(1)),
      hills: Number(((hill / land) * 100).toFixed(1)),
      flat: Number(((flat / land) * 100).toFixed(1)),
    },
  }));
}

function logAsciiMap(
  trace: TraceScope | null | undefined,
  adapter: ExtendedMapContext["adapter"],
  width: number,
  height: number
): void {
  if (!trace?.isVerbose) return;
  const lines: string[] = ["[Placement] Final Map ASCII:"];

  for (let y = height - 1; y >= 0; y--) {
    let row = "";
    if (y % 2 !== 0) row += " ";
    for (let x = 0; x < width; x++) {
      const t = adapter.getTerrainType(x, y);
      row += getTerrainSymbol(t) + " ";
    }
    lines.push(row);
  }

  trace.event(() => ({ type: "placement.ascii", lines }));
}
