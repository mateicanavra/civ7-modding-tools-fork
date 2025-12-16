import type { ExtendedMapContext } from "../../../core/types.js";
import { inBounds, storyKey } from "../../../core/index.js";
import { getStoryTags } from "../tags/index.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "../overlays/index.js";
import { isAdjacentToLand } from "../utils/adjacency.js";
import { getDims } from "../utils/dims.js";
import { rand } from "../utils/rng.js";
import { isWaterAt } from "../utils/water.js";

import type { HotspotTrailsSummary } from "./types.js";

export function storyTagHotspotTrails(
  ctx: ExtendedMapContext | null = null
): HotspotTrailsSummary {
  const { width, height } = getDims(ctx);
  const storyCfg = (ctx?.config?.story || {}) as Record<string, unknown>;
  const hotspotCfg = (storyCfg.hotspot || {}) as Record<string, number>;

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

  const StoryTags = getStoryTags(ctx);

  function farFromExisting(x: number, y: number): boolean {
    for (const key of StoryTags.hotspot) {
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

      StoryTags.hotspot.add(storyKey(x, y));
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

  publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.HOTSPOTS, {
    kind: STORY_OVERLAY_KEYS.HOTSPOTS,
    version: 1,
    width,
    height,
    active: Array.from(StoryTags.hotspot),
    summary: { trails: summary.trails, points: summary.points },
  });

  return summary;
}
