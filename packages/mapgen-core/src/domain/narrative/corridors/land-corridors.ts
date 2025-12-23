import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { inBounds, storyKey } from "@mapgen/core/index.js";
import { getStoryTags } from "@mapgen/domain/narrative/tags/index.js";

import { assignCorridorMetadata } from "@mapgen/domain/narrative/corridors/style-cache.js";
import { getDims, rand } from "@mapgen/domain/narrative/corridors/runtime.js";

export function tagLandCorridorsFromRifts(
  ctx: ExtendedMapContext,
  corridorsCfg: Record<string, unknown>,
  directionality: Record<string, unknown> | null | undefined
): void {
  const cfg = ((corridorsCfg.land || {}) as Record<string, unknown>) || {};
  if (!cfg.useRiftShoulders) return;

  const { width, height } = getDims(ctx);
  const tags = getStoryTags(ctx);

  const maxCorridors = Math.max(0, Number((cfg.maxCorridors as number) ?? 2) | 0);
  const minRun = Math.max(12, Number((cfg.minRunLength as number) ?? 24) | 0);
  const spacing = Math.max(0, Number((cfg.spacing as number) ?? 0) | 0);

  if (maxCorridors === 0 || tags.riftShoulder.size === 0) return;

  let corridors = 0;
  const usedRows: number[] = [];

  for (let y = 1; y < height - 1 && corridors < maxCorridors; y++) {
    let x = 1;
    while (x < width - 1 && corridors < maxCorridors) {
      while (x < width - 1 && !tags.riftShoulder.has(storyKey(x, y))) x++;
      if (x >= width - 1) break;
      const start = x;
      while (x < width - 1 && tags.riftShoulder.has(storyKey(x, y))) x++;
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

      const DIR = (directionality || {}) as Record<string, unknown>;
      const cohesion = Math.max(0, Math.min(1, Number((DIR.cohesion as number) ?? 0)));
      if (cohesion > 0) {
        const axes = (DIR.primaryAxes || {}) as Record<string, number>;
        const plateDeg = (axes.plateAxisDeg ?? 0) | 0;
        const windDeg = (axes.windBiasDeg ?? 0) | 0;
        const radP = (plateDeg * Math.PI) / 180;
        const radW = (windDeg * Math.PI) / 180;
        const PV = { x: Math.cos(radP), y: Math.sin(radP) };
        const WV = { x: Math.cos(radW), y: Math.sin(radW) };
        const L = { x: 1, y: 0 };
        const alignPlate = Math.abs(PV.x * L.x + PV.y * L.y);
        const alignWind = Math.abs(WV.x * L.x + WV.y * L.y);
        const hiAlign = 0.75 * cohesion + 0.1;
        const midAlign = 0.5 * cohesion + 0.1;

        if (alignPlate >= hiAlign) {
          if (avgElev > 650 && reliefFrac < 0.28) style = "plateau";
          else if (reliefFrac > 0.3 && avgRain < 100) style = "canyon";
          else if (avgElev > 560 && reliefFrac < 0.35) style = "flatMtn";
        } else if (alignPlate >= midAlign) {
          if (avgElev > 600 && reliefFrac < 0.25) style = "plateau";
        }

        if (alignWind >= hiAlign) {
          if (avgRain > 110 || (latDeg < 25 && avgRain > 100)) style = "grasslandBelt";
          else if (avgRain < 90 && latDeg < 35) style = "desertBelt";
        } else if (alignWind >= midAlign) {
          if (avgRain > 120) style = "grasslandBelt";
        }
      }

      for (let cx = start; cx <= end; cx++) {
        if (ctx.adapter.isWater(cx, y)) continue;
        const kk = storyKey(cx, y);
        tags.corridorLandOpen.add(kk);
        assignCorridorMetadata(ctx, corridorsCfg, kk, "land", style);
      }

      usedRows.push(y);
      corridors++;
    }
  }
}
