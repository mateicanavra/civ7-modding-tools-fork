import type { EngineAdapter } from "@civ7/adapter";
import type { StartsConfig } from "@mapgen/config";
import type { TraceScope } from "@swooper/mapgen-core";

export function applyStartPositions(
  adapter: EngineAdapter,
  starts: StartsConfig,
  trace?: TraceScope | null
): number[] {
  const {
    playersLandmass1,
    playersLandmass2,
    westContinent,
    eastContinent,
    startSectorRows,
    startSectorCols,
    startSectors,
  } = starts;

  const totalPlayers = playersLandmass1 + playersLandmass2;
  if (trace?.isVerbose) {
    trace.event(() => ({
      type: "placement.starts.begin",
      players: {
        total: totalPlayers,
        landmass1: playersLandmass1,
        landmass2: playersLandmass2,
      },
      continents: { west: westContinent, east: eastContinent },
      sectors: {
        rows: startSectorRows,
        cols: startSectorCols,
        chosen: startSectors.length,
      },
    }));
  }

  const pos = adapter.assignStartPositions(
    playersLandmass1,
    playersLandmass2,
    westContinent,
    eastContinent,
    startSectorRows,
    startSectorCols,
    startSectors as number[]
  );

  const successCount = pos ? pos.filter((p) => p !== undefined && p >= 0).length : 0;
  if (trace?.isVerbose) {
    trace.event(() => ({
      type: "placement.starts.finish",
      successCount,
      totalPlayers,
      failures: Math.max(0, totalPlayers - successCount),
    }));
  }

  if (Array.isArray(pos)) return pos.slice();
  return [];
}
