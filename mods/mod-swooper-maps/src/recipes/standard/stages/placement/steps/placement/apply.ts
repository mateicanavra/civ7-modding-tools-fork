import type { ExtendedMapContext, TraceScope } from "@swooper/mapgen-core";
import { HILL_TERRAIN, MOUNTAIN_TERRAIN, getTerrainSymbol } from "@swooper/mapgen-core";

import {
  PlanFloodplainsContract,
  PlanStartsContract,
  PlanWondersContract,
} from "@mapgen/domain/placement";
import type { Static } from "@swooper/mapgen-core/authoring";
import { publishPlacementOutputsArtifact } from "../../../../artifacts.js";
import { getStandardRuntime } from "../../../../runtime.js";
import type { PlacementOutputsV1 } from "../../placement-outputs.js";

type PlanFloodplainsOutput = Static<typeof PlanFloodplainsContract["output"]>;
type PlanStartsOutput = Static<typeof PlanStartsContract["output"]>;
type PlanWondersOutput = Static<typeof PlanWondersContract["output"]>;

type ApplyPlacementArgs = {
  context: ExtendedMapContext;
  starts: PlanStartsOutput;
  wonders: PlanWondersOutput;
  floodplains: PlanFloodplainsOutput;
};

export function applyPlacementPlan({
  context,
  starts,
  wonders,
  floodplains,
}: ApplyPlacementArgs): PlacementOutputsV1 {
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
    const pos = adapter.assignStartPositions(
      starts.playersLandmass1,
      starts.playersLandmass2,
      starts.westContinent,
      starts.eastContinent,
      starts.startSectorRows,
      starts.startSectorCols,
      starts.startSectors as number[]
    );
    if (Array.isArray(pos)) startPositions.push(...pos);

    const totalPlayers = starts.playersLandmass1 + starts.playersLandmass2;
    const successCount = startPositions.filter((p) => p !== undefined && p >= 0).length;

    if (successCount === totalPlayers) {
      emit({ type: "placement.starts.assigned", successCount, totalPlayers });
    } else {
      emit({
        type: "placement.starts.partial",
        successCount,
        totalPlayers,
        failures: Math.max(0, totalPlayers - successCount),
      });
    }
  } catch (err) {
    emit({
      type: "placement.starts.error",
      error: err instanceof Error ? err.message : String(err),
    });
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

  const runtime = getStandardRuntime(context);
  runtime.startPositions.push(...startPositions);

  const startsAssigned = startPositions.filter((pos) => Number.isFinite(pos) && pos >= 0).length;
  const outputs: PlacementOutputsV1 = {
    naturalWondersCount: wonders.wondersCount,
    floodplainsCount: 0,
    snowTilesCount: 0,
    resourcesCount: 0,
    startsAssigned,
    discoveriesCount: 0,
  };

  return publishPlacementOutputsArtifact(context, outputs);
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
