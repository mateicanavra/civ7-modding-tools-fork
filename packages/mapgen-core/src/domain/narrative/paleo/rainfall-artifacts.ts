/**
 * Story Paleo Hydrology — subtle rainfall artifacts (deltas, oxbows, fossils).
 *
 * Ported from legacy storyTagPaleoHydrology, adapted to prefer:
 * - ctx.buffers.climate.rainfall via writeClimateField (climate buffers are canonical)
 * - EngineAdapter reads/writes (no direct engine calls when ctx provided)
 */

import type { ExtendedMapContext } from "../../../core/types.js";
import { inBounds } from "../../../core/index.js";
import { writeClimateField } from "../../../core/types.js";
import { idx } from "../../../lib/grid/index.js";
import { clamp } from "../../../lib/math/index.js";

import { isCoastalLand } from "../utils/adjacency.js";
import { getDims } from "../utils/dims.js";
import { rand } from "../utils/rng.js";
import { isWaterAt } from "../utils/water.js";

export interface PaleoSummary {
  deltas: number;
  oxbows: number;
  fossils: number;
  kind: "applied" | "missing-config";
}

export function storyTagPaleoHydrology(ctx: ExtendedMapContext): PaleoSummary {
  if (!ctx || !ctx.adapter) {
    throw new Error("[Story] Paleo hydrology requires MapContext adapter.");
  }

  const climateCfg = (ctx.config?.climate || {}) as Record<string, unknown>;
  const story = (climateCfg.story || {}) as Record<string, unknown>;
  const cfg = story.paleo as Record<string, unknown> | undefined;

  if (!cfg) {
    return { deltas: 0, oxbows: 0, fossils: 0, kind: "missing-config" };
  }

  const { width, height } = getDims(ctx);
  const area = Math.max(1, width * height);
  const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

  if (!ctx.buffers?.climate?.rainfall) {
    throw new Error(
      "[Story] Paleo hydrology requires canonical climate buffers. Ensure climate stages run before storySwatches (and avoid engine rainfall reads)."
    );
  }

  const adapter = ctx.adapter;
  const rainfallBuf = ctx.buffers.climate.rainfall;

  if (!adapter.isAdjacentToRivers) {
    throw new Error("[Story] Paleo hydrology requires adapter.isAdjacentToRivers.");
  }

  const readRainfall = (x: number, y: number): number => {
    return rainfallBuf[idx(x, y, width)] | 0;
  };

  const writeRainfall = (x: number, y: number, rainfall: number): void => {
    const clamped = clamp(rainfall, 0, 200);
    writeClimateField(ctx, x, y, { rainfall: clamped });
  };

  const maxDeltas = Math.max(0, Number((cfg.maxDeltas as number) ?? 0) | 0);
  const deltaFanRadius = Math.max(0, Number((cfg.deltaFanRadius as number) ?? 0) | 0);
  const deltaMarshChance = Math.max(0, Math.min(1, Number((cfg.deltaMarshChance as number) ?? 0.35)));
  const maxOxbows = Math.max(0, Number((cfg.maxOxbows as number) ?? 0) | 0);
  const oxbowElevationMax = Number((cfg.oxbowElevationMax as number) ?? 280);
  const maxFossilChannels = Math.max(0, Number((cfg.maxFossilChannels as number) ?? 0) | 0);

  let deltas = 0;
  let oxbows = 0;
  let fossils = 0;

  if (maxDeltas > 0) {
    for (let y = 1; y < height - 1 && deltas < maxDeltas; y++) {
      for (let x = 1; x < width - 1 && deltas < maxDeltas; x++) {
        if (!isCoastalLand(ctx, x, y, width, height)) continue;
        if (!adapter.isAdjacentToRivers(x, y, 1)) continue;
        const elev = adapter.getElevation(x, y);
        if (elev > 300) continue;

        for (let dy = -deltaFanRadius; dy <= deltaFanRadius; dy++) {
          for (let dx = -deltaFanRadius; dx <= deltaFanRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny, width, height)) continue;
            if (isWaterAt(ctx, nx, ny)) continue;
            let rf = readRainfall(nx, ny);
            rf += rand(ctx, "DeltaMarsh", 100) < Math.round(deltaMarshChance * 100) ? 6 : 3;
            writeRainfall(nx, ny, rf);
          }
        }

        deltas++;
      }
    }
  }

  if (maxOxbows > 0) {
    let attempts = 0;
    while (oxbows < maxOxbows && attempts < 300) {
      attempts++;
      const x = rand(ctx, "OxbowX", width);
      const y = rand(ctx, "OxbowY", height);
      if (!inBounds(x, y, width, height)) continue;
      if (isWaterAt(ctx, x, y)) continue;

      const elev = adapter.getElevation(x, y);
      if (elev > oxbowElevationMax) continue;
      if (!adapter.isAdjacentToRivers(x, y, 1)) continue;

      const rf = readRainfall(x, y);
      writeRainfall(x, y, rf + 8);
      oxbows++;
    }
  }

  if (maxFossilChannels > 0) {
    const baseLen = Math.max(6, Number((cfg.fossilChannelLengthTiles as number) ?? 6) | 0);
    const step = Math.max(1, Number((cfg.fossilChannelStep as number) ?? 1) | 0);
    const sizeScaling = (cfg.sizeScaling || {}) as Record<string, number>;
    const len = Math.round(baseLen * (1 + (sizeScaling?.lengthMulSqrt || 0) * (sqrtScale - 1)));
    const hum = Number((cfg.fossilChannelHumidity as number) ?? 0) | 0;
    const minDistFromRivers = Math.max(
      0,
      Number((cfg.fossilChannelMinDistanceFromCurrentRivers as number) ?? 0) | 0
    );
    const canyonCfg = (cfg.elevationCarving || {}) as Record<string, unknown>;
    const rimW = Math.max(0, Number((canyonCfg.rimWidth as number) ?? 0) | 0);
    const canyonDryBonus = Math.max(0, Number((canyonCfg.canyonDryBonus as number) ?? 0) | 0);
    const bluffWetReduction = Math.max(0, Number((cfg.bluffWetReduction as number) ?? 0) | 0);

    let tries = 0;
    while (fossils < maxFossilChannels && tries < 120) {
      tries++;
      const sx = rand(ctx, "FossilX", width);
      const sy = rand(ctx, "FossilY", height);
      if (!inBounds(sx, sy, width, height)) continue;
      if (isWaterAt(ctx, sx, sy)) continue;
      const startElev = adapter.getElevation(sx, sy);
      if (startElev > 320) continue;
      if (adapter.isAdjacentToRivers(sx, sy, minDistFromRivers)) continue;

      let x = sx;
      let y = sy;
      let used = 0;

      while (used < len) {
        if (inBounds(x, y, width, height) && !isWaterAt(ctx, x, y)) {
          let rf = readRainfall(x, y);
          rf = clamp(rf + hum, 0, 200);
          const enableCanyonRim = (canyonCfg.enableCanyonRim as boolean | undefined) ?? true;
          if (enableCanyonRim && canyonDryBonus > 0) {
            rf = clamp(rf - canyonDryBonus, 0, 200);
          }
          writeRainfall(x, y, rf);

          if (enableCanyonRim && rimW > 0) {
            for (let ry = -rimW; ry <= rimW; ry++) {
              for (let rx = -rimW; rx <= rimW; rx++) {
                if (rx === 0 && ry === 0) continue;
                const nx = x + rx;
                const ny = y + ry;
                if (!inBounds(nx, ny, width, height) || isWaterAt(ctx, nx, ny)) continue;
                const e0 = adapter.getElevation(x, y);
                const e1 = adapter.getElevation(nx, ny);
                if (e1 > e0 + 15) {
                  const rfn = clamp(readRainfall(nx, ny) - bluffWetReduction, 0, 200);
                  writeRainfall(nx, ny, rfn);
                }
              }
            }
          }
        }

        let bestNX = x;
        let bestNY = y;
        let bestElev = adapter.getElevation(x, y);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if ((Math.abs(dx) + Math.abs(dy)) * step > 2) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (!inBounds(nx, ny, width, height)) continue;
            const elev = adapter.getElevation(nx, ny);
            if (elev < bestElev) {
              bestElev = elev;
              bestNX = nx;
              bestNY = ny;
            }
          }
        }

        if (bestNX === x && bestNY === y) break;
        x = bestNX;
        y = bestNY;
        used += step;
      }

      if (used >= len) fossils++;
    }
  }

  return { deltas, oxbows, fossils, kind: "applied" };
}
