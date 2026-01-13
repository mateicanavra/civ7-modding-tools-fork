import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { inBounds, storyKey } from "@swooper/mapgen-core";

import { assignCorridorMetadata } from "@mapgen/domain/narrative/corridors/style-cache.js";
import type { CorridorState } from "@mapgen/domain/narrative/corridors/state.js";
import { getDims } from "@mapgen/domain/narrative/corridors/runtime.js";

export function tagLandCorridorsFromRifts(
  ctx: ExtendedMapContext,
  corridorsCfg: Record<string, unknown>,
  riftShoulder: ReadonlySet<string>,
  state: CorridorState
): void {
  const cfg = corridorsCfg.land as Record<string, unknown>;
  if (!cfg) {
    throw new Error("[Narrative] Missing corridors.land config.");
  }
  if (!cfg.useRiftShoulders) return;

  const { width, height } = getDims(ctx);

  const maxCorridors = Math.max(0, Number((cfg.maxCorridors as number) ?? 2) | 0);
  const minRun = Math.max(12, Number((cfg.minRunLength as number) ?? 24) | 0);
  const spacing = Math.max(0, Number((cfg.spacing as number) ?? 0) | 0);

  if (maxCorridors === 0 || riftShoulder.size === 0) return;

  let corridors = 0;
  const usedRows: number[] = [];

  for (let y = 1; y < height - 1 && corridors < maxCorridors; y++) {
    let x = 1;
    while (x < width - 1 && corridors < maxCorridors) {
      while (x < width - 1 && !riftShoulder.has(storyKey(x, y))) x++;
      if (x >= width - 1) break;
      const start = x;
      while (x < width - 1 && riftShoulder.has(storyKey(x, y))) x++;
      const end = x - 1;
      const len = end - start + 1;
      if (len < minRun) continue;

      let tooClose = false;
      for (const row of usedRows) {
        if (Math.abs(row - y) < spacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      let totalElev = 0;
      let totalRain = 0;
      let samples = 0;
      let reliefHits = 0;

      for (let cx = start; cx <= end; cx++) {
        if (ctx.adapter.isWater(cx, y)) continue;
        const e = ctx.adapter.getElevation(cx, y);
        const r = ctx.adapter.getRainfall(cx, y);
        totalElev += e;
        totalRain += r;
        samples++;

        const eN = ctx.adapter.getElevation(cx, Math.max(0, y - 1));
        const eS = ctx.adapter.getElevation(cx, Math.min(height - 1, y + 1));
        const eW = ctx.adapter.getElevation(Math.max(0, cx - 1), y);
        const eE = ctx.adapter.getElevation(Math.min(width - 1, cx + 1), y);
        const dMax = Math.max(Math.abs(e - eN), Math.abs(e - eS), Math.abs(e - eW), Math.abs(e - eE));
        if (dMax >= 60) reliefHits++;
      }

      const avgElev = samples > 0 ? Math.round(totalElev / samples) : 0;
      const avgRain = samples > 0 ? Math.round(totalRain / samples) : 0;
      const reliefFrac = samples > 0 ? reliefHits / samples : 0;
      const latDeg = Math.abs(ctx.adapter.getLatitude(0, y));

      let style = "plainsBelt";
      if (reliefFrac > 0.35 && avgRain < 95) style = "canyon";
      else if (avgElev > 650 && reliefFrac < 0.2) style = "plateau";
      else if (avgElev > 550 && reliefFrac < 0.35) style = "flatMtn";
      else if (avgRain < 85 && latDeg < 35) style = "desertBelt";
      else if (avgRain > 115) style = "grasslandBelt";

      for (let cx = start; cx <= end; cx++) {
        if (ctx.adapter.isWater(cx, y)) continue;
        const kk = storyKey(cx, y);
        state.landCorridors.add(kk);
        assignCorridorMetadata(state, ctx, corridorsCfg, kk, "land", style);
      }

      usedRows.push(y);
      corridors++;
    }
  }
}
