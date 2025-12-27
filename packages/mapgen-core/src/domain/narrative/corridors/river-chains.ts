import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { inBounds, storyKey } from "@mapgen/core/index.js";

import { assignCorridorMetadata } from "@mapgen/domain/narrative/corridors/style-cache.js";
import type { CorridorState } from "@mapgen/domain/narrative/corridors/state.js";
import { getDims, isAdjacentToShallowWater, isCoastalLand, rand } from "@mapgen/domain/narrative/corridors/runtime.js";

export function tagRiverChainsPostRivers(
  ctx: ExtendedMapContext,
  corridorsCfg: Record<string, unknown>,
  state: CorridorState
): void {
  const cfg = ((corridorsCfg.river || {}) as Record<string, unknown>) || {};
  const { width, height } = getDims(ctx);

  const maxChains = Math.max(0, Number((cfg.maxChains as number) ?? 2) | 0);
  const maxSteps = Math.max(20, Number((cfg.maxSteps as number) ?? 80) | 0);
  const lowlandThresh = Math.max(0, Number((cfg.preferLowlandBelow as number) ?? 300) | 0);
  const coastSeedR = Math.max(1, Number((cfg.coastSeedRadius as number) ?? 2) | 0);
  const minTiles = Math.max(0, Number((cfg.minTiles as number) ?? 0) | 0);
  const mustEndNearCoast = !!cfg.mustEndNearCoast;

  if (maxChains === 0) return;

  let chains = 0;
  let tries = 0;

  while (chains < maxChains && tries < 300) {
    tries++;
    const sx = rand(ctx, width, "RiverChainSX");
    const sy = rand(ctx, height, "RiverChainSY");
    if (!inBounds(sx, sy, width, height)) continue;
    if (!isCoastalLand(ctx, sx, sy, width, height)) continue;
    if (!ctx.adapter.isAdjacentToRivers(sx, sy, coastSeedR)) continue;

    let x = sx;
    let y = sy;
    let steps = 0;
    const pathKeys: string[] = [];

    while (steps < maxSteps) {
      if (!ctx.adapter.isWater(x, y) && ctx.adapter.isAdjacentToRivers(x, y, 1)) {
        pathKeys.push(storyKey(x, y));
      }

      let bx = x;
      let by = y;
      let be = ctx.adapter.getElevation(x, y);
      let improved = false;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (!inBounds(nx, ny, width, height) || ctx.adapter.isWater(nx, ny)) continue;
          if (!ctx.adapter.isAdjacentToRivers(nx, ny, 1)) continue;
          const e = ctx.adapter.getElevation(nx, ny);
          const prefer = e <= be || (e < lowlandThresh && be >= lowlandThresh);
          if (!prefer) continue;
          if (!improved || rand(ctx, 3, "RiverChainTie") === 0) {
            bx = nx;
            by = ny;
            be = e;
            improved = true;
          }
        }
      }

      if (!improved) break;
      x = bx;
      y = by;
      steps++;
    }

    let endOK = true;
    if (mustEndNearCoast) {
      endOK = isCoastalLand(ctx, x, y, width, height) || isAdjacentToShallowWater(ctx, x, y, width, height);
    }

    if (pathKeys.length >= minTiles && endOK) {
      for (const kk of pathKeys) {
        state.riverCorridors.add(kk);
        assignCorridorMetadata(state, ctx, corridorsCfg, kk, "river", "riverChain");
      }
      chains++;
    }
  }
}
