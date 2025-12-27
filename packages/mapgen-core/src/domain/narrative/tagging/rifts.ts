import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { clamp, inBounds, storyKey } from "@mapgen/core/index.js";
import { assertFoundationContext } from "@mapgen/core/assertions.js";
import { idx } from "@mapgen/lib/grid/index.js";
import { getStoryTags } from "@mapgen/domain/narrative/tags/index.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/index.js";
import { getDims } from "@mapgen/domain/narrative/utils/dims.js";
import { latitudeAbsDeg } from "@mapgen/domain/narrative/utils/latitude.js";
import { isWaterAt } from "@mapgen/domain/narrative/utils/water.js";

import type { RiftValleysSummary } from "@mapgen/domain/narrative/tagging/types.js";
import type { FoundationDirectionalityConfig, StoryConfig } from "@mapgen/config/index.js";

export function storyTagRiftValleys(
  ctx: ExtendedMapContext,
  config: { story?: StoryConfig; foundation?: { dynamics?: { directionality?: FoundationDirectionalityConfig } } } = {}
): RiftValleysSummary {
  assertFoundationContext(ctx, "storyRifts");
  const { width, height } = getDims(ctx);
  const storyCfg = (config.story || {}) as Record<string, unknown>;
  const riftCfg = (storyCfg.rift || {}) as Record<string, number>;
  const directionality = (config.foundation?.dynamics?.directionality || {}) as FoundationDirectionalityConfig;

  const areaRift = Math.max(1, width * height);
  const sqrtRift = Math.min(2.0, Math.max(0.6, Math.sqrt(areaRift / 10000)));

  const baseMaxRifts = riftCfg.maxRiftsPerMap ?? 3;
  const baseLineSteps = riftCfg.lineSteps ?? 18;
  const baseStepLen = riftCfg.stepLen ?? 2;
  const baseShoulderWidth = riftCfg.shoulderWidth ?? 1;

  const maxRiftsPerMap = Math.max(
    1,
    Math.round(baseMaxRifts * (0.8 + 0.6 * sqrtRift))
  );
  const lineSteps = Math.max(
    1,
    Math.round(baseLineSteps * (0.9 + 0.4 * sqrtRift))
  );
  const stepLen = Math.max(1, baseStepLen | 0);
  const shoulderWidth = (baseShoulderWidth | 0) + (sqrtRift > 1.5 ? 1 : 0);

  const StoryTags = getStoryTags(ctx);

  const plates = ctx.foundation.plates;
  const RP = plates.riftPotential;
  const BT = plates.boundaryType; // 2 = divergent
  const BC = plates.boundaryCloseness;

  const latDegAt = (y: number): number => latitudeAbsDeg(ctx, 0, y, height);

  // Find sparse local maxima on divergent boundaries over land.
  const seeds: Array<{ x: number; y: number; v: number }> = [];
  let thr = 192;
  let attempts = 0;

  while (attempts++ < 6) {
    seeds.length = 0;
    for (let y = 1; y < height - 1; y++) {
      if (latDegAt(y) > 70) continue;
      for (let x = 1; x < width - 1; x++) {
        if (isWaterAt(ctx, x, y)) continue;
        const i = idx(x, y, width);
        if (BT[i] !== 2 || BC[i] <= 32 || RP[i] < thr) continue;

        const v = RP[i];
        let isPeak = true;
        for (let dy = -1; dy <= 1 && isPeak; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (RP[idx(x + dx, y + dy, width)] > v) {
              isPeak = false;
              break;
            }
          }
        }
        if (isPeak) seeds.push({ x, y, v });
      }
    }
    if (seeds.length >= maxRiftsPerMap * 2 || thr <= 112) break;
    thr -= 16;
  }

  seeds.sort((a, b) => b.v - a.v);

  const chosen: Array<{ x: number; y: number; v: number }> = [];
  const minSeedSep = Math.round(sqrtRift > 1.5 ? 18 : 14);

  for (const s of seeds) {
    if (chosen.length >= maxRiftsPerMap) break;
    const farEnough = chosen.every(
      (c) => Math.abs(c.x - s.x) + Math.abs(c.y - s.y) >= minSeedSep
    );
    if (farEnough) chosen.push(s);
  }

  let riftsMade = 0;
  let lineCount = 0;
  let shoulderCount = 0;

  function tagShoulders(x: number, y: number, sdx: number, sdy: number): void {
    for (let off = 1; off <= shoulderWidth; off++) {
      const px = x + -sdy * off;
      const py = y + sdx * off;
      const qx = x + sdy * off;
      const qy = y + -sdx * off;

      if (inBounds(px, py, width, height) && !isWaterAt(ctx, px, py)) {
        const pk = storyKey(px, py);
        if (!StoryTags.riftShoulder.has(pk)) {
          StoryTags.riftShoulder.add(pk);
          shoulderCount++;
        }
      }
      if (inBounds(qx, qy, width, height) && !isWaterAt(ctx, qx, qy)) {
        const qk = storyKey(qx, qy);
        if (!StoryTags.riftShoulder.has(qk)) {
          StoryTags.riftShoulder.add(qk);
          shoulderCount++;
        }
      }
    }
  }

  for (const seed of chosen) {
    let x = seed.x;
    let y = seed.y;
    if (latDegAt(y) > 70) continue;

    let sdx = 1;
    let sdy = 0;
    {
      let best = -1;
      let bdx = 1;
      let bdy = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (!inBounds(nx, ny, width, height) || isWaterAt(ctx, nx, ny)) continue;
          const p = RP[idx(nx, ny, width)];
          if (p > best) {
            best = p;
            bdx = dx;
            bdy = dy;
          }
        }
      }
      sdx = bdx;
      sdy = bdy;
    }

    let placedAny = false;

    for (let s = 0; s < lineSteps; s++) {
      if (!inBounds(x, y, width, height) || isWaterAt(ctx, x, y) || latDegAt(y) > 70) break;

      const k = storyKey(x, y);
      if (!StoryTags.riftLine.has(k)) {
        StoryTags.riftLine.add(k);
        lineCount++;
      }
      placedAny = true;
      tagShoulders(x, y, sdx, sdy);

      function stepDirBias(tx: number, ty: number): number {
        const DIR = directionality as Record<string, unknown>;
        const coh = clamp(Number(DIR.cohesion ?? 0), 0, 1);
        const interplay = (DIR.interplay || {}) as Record<string, number>;
        const follow = clamp(Number(interplay.riftsFollowPlates ?? 0), 0, 1) * coh;
        if (follow <= 0) return 0;
        const primaryAxes = (DIR.primaryAxes || {}) as Record<string, number>;
        const deg = (primaryAxes.plateAxisDeg ?? 0) | 0;
        const rad = (deg * Math.PI) / 180;
        const ax = Math.cos(rad);
        const ay = Math.sin(rad);
        const vlen = Math.max(1, Math.hypot(tx, ty));
        const vx = tx / vlen;
        const vy = ty / vlen;
        const dot = ax * vx + ay * vy;
        return Math.round(10 * follow * dot);
      }

      let bestScore = -1;
      let ndx = sdx;
      let ndy = sdy;
      let nx = x;
      let ny = y;

      for (let ty = -1; ty <= 1; ty++) {
        for (let tx = -1; tx <= 1; tx++) {
          if (tx === 0 && ty === 0) continue;
          const cx = x + tx * stepLen;
          const cy = y + ty * stepLen;
          if (!inBounds(cx, cy, width, height) || isWaterAt(ctx, cx, cy)) continue;
          const p = RP[idx(cx, cy, width)];
          const align =
            tx === sdx && ty === sdy ? 16 : tx === -sdx && ty === -sdy ? -12 : 0;
          const score = p + align + stepDirBias(tx, ty);
          if (score > bestScore) {
            bestScore = score;
            ndx = tx;
            ndy = ty;
            nx = cx;
            ny = cy;
          }
        }
      }

      const ii = inBounds(nx, ny, width, height) ? idx(nx, ny, width) : -1;
      if (ii < 0 || BT[ii] !== 2 || BC[ii] <= 16 || RP[ii] < 64) break;

      x = nx;
      y = ny;
      sdx = ndx;
      sdy = ndy;
    }

    if (placedAny) riftsMade++;
    if (riftsMade >= maxRiftsPerMap) break;
  }

  const summary: RiftValleysSummary = {
    rifts: riftsMade,
    lineTiles: lineCount,
    shoulderTiles: shoulderCount,
    kind: "foundation",
  };

  publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.RIFTS, {
    kind: STORY_OVERLAY_KEYS.RIFTS,
    version: 1,
    width,
    height,
    active: Array.from(StoryTags.riftLine),
    passive: Array.from(StoryTags.riftShoulder),
    summary: {
      rifts: summary.rifts,
      lineTiles: summary.lineTiles,
      shoulderTiles: summary.shoulderTiles,
      kind: summary.kind,
    },
  });

  return summary;
}
