import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { getStoryTags } from "@mapgen/domain/narrative/tags/index.js";

import { assignCorridorMetadata } from "@mapgen/domain/narrative/corridors/style-cache.js";
import type { CorridorKind } from "@mapgen/domain/narrative/corridors/types.js";
import { getDims, isAdjacentToShallowWater } from "@mapgen/domain/narrative/corridors/runtime.js";

export function backfillCorridorKinds(ctx: ExtendedMapContext, corridorsCfg: Record<string, unknown>): void {
  const { width, height } = getDims(ctx);
  const tags = getStoryTags(ctx);

  for (const key of tags.corridorSeaLane) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "sea";
    let style = tags.corridorStyle.get(key);
    if (!style) {
      const [sx, sy] = key.split(",").map(Number);
      style = isAdjacentToShallowWater(ctx, sx, sy, width, height) ? "coastal" : "ocean";
    }
    assignCorridorMetadata(ctx, corridorsCfg, key, kind, style);
  }

  for (const key of tags.corridorIslandHop) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "islandHop";
    const style = tags.corridorStyle.get(key) || "archipelago";
    assignCorridorMetadata(ctx, corridorsCfg, key, kind, style);
  }

  for (const key of tags.corridorLandOpen) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "land";
    const style = tags.corridorStyle.get(key) || "plainsBelt";
    assignCorridorMetadata(ctx, corridorsCfg, key, kind, style);
  }

  for (const key of tags.corridorRiverChain) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "river";
    const style = tags.corridorStyle.get(key) || "riverChain";
    assignCorridorMetadata(ctx, corridorsCfg, key, kind, style);
  }
}
