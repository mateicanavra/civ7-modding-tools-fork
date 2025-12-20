import type { EngineAdapter } from "@civ7/adapter";
import type { StartsConfig } from "@mapgen/bootstrap/types.js";
import { DEV } from "@mapgen/dev/index.js";

export function applyStartPositions(adapter: EngineAdapter, starts: StartsConfig): number[] {
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
  if (DEV.ENABLED) {
    console.log(`[START_DEBUG] === Beginning Start Placement ===`);
    console.log(
      `[START_DEBUG] Players: ${totalPlayers} total (${playersLandmass1} landmass1, ${playersLandmass2} landmass2)`
    );
    console.log(
      `[START_DEBUG] Continents: west=${JSON.stringify(westContinent)}, east=${JSON.stringify(eastContinent)}`
    );
    console.log(
      `[START_DEBUG] Sectors: ${startSectorRows}x${startSectorCols} grid, ${startSectors.length} sectors chosen`
    );
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
  if (DEV.ENABLED) {
    console.log(
      `[START_DEBUG] Result: ${successCount}/${totalPlayers} civilizations placed successfully`
    );
    if (successCount < totalPlayers) {
      console.log(
        `[START_DEBUG] WARNING: ${totalPlayers - successCount} civilizations failed to find valid start locations!`
      );
    }
    console.log(`[START_DEBUG] === End Start Placement ===`);
  }

  if (Array.isArray(pos)) return pos.slice();
  return [];
}

