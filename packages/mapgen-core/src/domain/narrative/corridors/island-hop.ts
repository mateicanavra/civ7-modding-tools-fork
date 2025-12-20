import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { inBounds, storyKey } from "@mapgen/core/index.js";
import { getStoryTags } from "@mapgen/domain/narrative/tags/index.js";

import { assignCorridorMetadata } from "@mapgen/domain/narrative/corridors/style-cache.js";
import { getDims, rand } from "@mapgen/domain/narrative/corridors/runtime.js";

export function tagIslandHopFromHotspots(ctx: ExtendedMapContext, corridorsCfg: Record<string, unknown>): void {
  const cfg = ((corridorsCfg.islandHop || {}) as Record<string, unknown>) || {};
  if (!cfg.useHotspots) return;

  const maxArcs = Math.max(0, Number((cfg.maxArcs as number) ?? 2) | 0);
  if (maxArcs === 0) return;

  const { width, height } = getDims(ctx);
  const tags = getStoryTags(ctx);
  const keys = Array.from(tags.hotspot);
  if (!keys.length) return;

  const picked = new Set<string>();
  let arcs = 0;
  let attempts = 0;

  while (arcs < maxArcs && attempts < 100 && attempts < keys.length * 2) {
    attempts++;
    const idx = rand(ctx, keys.length, "IslandHopPick");
    const key = keys[idx % keys.length];
    if (picked.has(key)) continue;
    picked.add(key);
    arcs++;

    const [sx, sy] = key.split(",").map(Number);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = sx + dx;
        const ny = sy + dy;
        if (!inBounds(nx, ny, width, height)) continue;
        if (!ctx.adapter.isWater(nx, ny)) continue;
        const kk = storyKey(nx, ny);
        tags.corridorIslandHop.add(kk);
        assignCorridorMetadata(ctx, corridorsCfg, kk, "islandHop", "archipelago");
      }
    }
  }
}
