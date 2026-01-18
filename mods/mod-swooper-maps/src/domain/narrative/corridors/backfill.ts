import type { ExtendedMapContext } from "@swooper/mapgen-core";
import type { CorridorState } from "@mapgen/domain/narrative/corridors/state.js";

import { assignCorridorMetadata } from "@mapgen/domain/narrative/corridors/style-cache.js";
import type { CorridorKind } from "@mapgen/domain/narrative/corridors/types.js";
import { getDims, isAdjacentToShallowWater } from "@mapgen/domain/narrative/corridors/runtime.js";

export function backfillCorridorKinds(
  ctx: ExtendedMapContext,
  corridorsCfg: Record<string, unknown>,
  state: CorridorState
): void {
  const { width, height } = getDims(ctx);

  for (const key of state.seaLanes) {
    const kind = (state.kindByTile.get(key) as CorridorKind) || "sea";
    let style = state.styleByTile.get(key);
    if (!style) {
      const [sx, sy] = key.split(",").map(Number);
      style = isAdjacentToShallowWater(ctx, sx, sy, width, height) ? "coastal" : "ocean";
    }
    assignCorridorMetadata(state, ctx, corridorsCfg, key, kind, style);
  }

  for (const key of state.islandHops) {
    const kind = (state.kindByTile.get(key) as CorridorKind) || "islandHop";
    const style = state.styleByTile.get(key) || "archipelago";
    assignCorridorMetadata(state, ctx, corridorsCfg, key, kind, style);
  }

  for (const key of state.landCorridors) {
    const kind = (state.kindByTile.get(key) as CorridorKind) || "land";
    const style = state.styleByTile.get(key) || "plainsBelt";
    assignCorridorMetadata(state, ctx, corridorsCfg, key, kind, style);
  }
}
