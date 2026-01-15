import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { ctxRandom, inBounds, storyKey } from "@swooper/mapgen-core";
import type { NarrativeMotifsHotspots } from "@mapgen/domain/narrative/models.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/index.js";
import { isAdjacentToLand } from "@mapgen/domain/narrative/utils/adjacency.js";
import { getDims } from "@mapgen/domain/narrative/utils/dims.js";
import { rand } from "@mapgen/domain/narrative/utils/rng.js";
import { isWaterAt } from "@mapgen/domain/narrative/utils/water.js";

import type { HotspotTrailsSummary } from "@mapgen/domain/narrative/tagging/types.js";
import type { NarrativeHotspotTunables } from "@mapgen/domain/config";

export interface HotspotTrailsResult {
  summary: HotspotTrailsSummary;
  motifs: NarrativeMotifsHotspots;
}

export function storyTagHotspotTrails(
  ctx: ExtendedMapContext,
  config: NarrativeHotspotTunables | undefined
): HotspotTrailsResult {
  const { width, height } = getDims(ctx);
  const hotspotCfg = (config ?? {}) as Record<string, number>;

  const areaHot = Math.max(1, width * height);
  const sqrtHot = Math.min(2.0, Math.max(0.6, Math.sqrt(areaHot / 10000)));

  const baseMaxTrails = hotspotCfg.maxTrails ?? 12;
  const baseSteps = hotspotCfg.steps ?? 15;
  const stepLen = Math.max(1, (hotspotCfg.stepLen ?? 2) | 0);
  const minDistFromLand = Math.max(0, (hotspotCfg.minDistFromLand ?? 5) | 0);
  const minTrailSeparation = Math.max(1, (hotspotCfg.minTrailSeparation ?? 12) | 0);

  const maxTrails = Math.max(
    1,
    Math.round(baseMaxTrails * (0.9 + 0.6 * sqrtHot))
  );
  const steps = Math.max(
    1,
    Math.round(baseSteps * (0.9 + 0.4 * sqrtHot))
  );

  const hotspotPoints = new Set<string>();

  function farFromExisting(x: number, y: number): boolean {
    for (const key of hotspotPoints) {
      const [sx, sy] = key.split(",").map(Number);
      const d = Math.abs(sx - x) + Math.abs(sy - y);
      if (d < minTrailSeparation) return false;
    }
    return true;
  }

  let trailsMade = 0;
  let totalPoints = 0;
  let attempts = 0;

  while (trailsMade < maxTrails && attempts < 200) {
    attempts++;
    const sx = rand(ctx, "HotspotSeedX", width);
    const sy = rand(ctx, "HotspotSeedY", height);

    if (!inBounds(sx, sy, width, height)) continue;
    if (!isWaterAt(ctx, sx, sy)) continue;
    if (isAdjacentToLand(ctx, sx, sy, minDistFromLand, width, height)) continue;
    if (!farFromExisting(sx, sy)) continue;

    const dirs: Array<[number, number]> = [
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
    ];

    let dIndex = rand(ctx, "HotspotDir", dirs.length);
    let [dx, dy] = dirs[dIndex];
    let x = sx;
    let y = sy;
    let taggedThisTrail = 0;

    for (let s = 0; s < steps; s++) {
      x += dx * stepLen;
      y += dy * stepLen;

      if (!inBounds(x, y, width, height)) break;
      if (!isWaterAt(ctx, x, y)) continue;
      if (isAdjacentToLand(ctx, x, y, minDistFromLand, width, height)) continue;

      hotspotPoints.add(storyKey(x, y));
      taggedThisTrail++;
      totalPoints++;

      if (rand(ctx, "HotspotBend", 5) === 0) {
        dIndex = (dIndex + (rand(ctx, "HotspotTurn", 3) - 1) + dirs.length) % dirs.length;
        [dx, dy] = dirs[dIndex];
      }
    }

    if (taggedThisTrail > 0) trailsMade++;
  }

  const summary = { trails: trailsMade, points: totalPoints };

  const paradise = new Set<string>();
  const volcanic = new Set<string>();

  const paradiseWeight = Math.max(0, Math.round((hotspotCfg.paradiseBias ?? 2) * 100));
  const volcanicWeight = Math.max(0, Math.round((hotspotCfg.volcanicBias ?? 1) * 100));
  const bucket = paradiseWeight + volcanicWeight;
  if (bucket > 0) {
    for (const key of hotspotPoints) {
      const roll = ctxRandom(ctx, `HotspotKind:${key}`, bucket);
      if (roll < paradiseWeight) {
        paradise.add(key);
      } else {
        volcanic.add(key);
      }
    }
  }

  publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.HOTSPOTS, {
    kind: STORY_OVERLAY_KEYS.HOTSPOTS,
    version: 1,
    width,
    height,
    active: Array.from(hotspotPoints),
    summary: {
      trails: summary.trails,
      points: summary.points,
      paradise: Array.from(paradise),
      volcanic: Array.from(volcanic),
    },
  });

  const motifs: NarrativeMotifsHotspots = {
    points: new Set(hotspotPoints),
    paradise,
    volcanic,
  };

  return { summary, motifs };
}
