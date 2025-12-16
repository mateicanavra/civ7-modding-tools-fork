import type { ExtendedMapContext } from "../../../core/types.js";
import { getStoryTags } from "../tags/index.js";

import { assignCorridorMetadata } from "./style-cache.js";
import type { CorridorKind } from "./types.js";
import { getDims, isAdjacentToShallowWater } from "./runtime.js";

export function backfillCorridorKinds(ctx: ExtendedMapContext, corridorsCfg: Record<string, unknown>): void {
  const { width, height } = getDims(ctx);
  const tags = getStoryTags();

  for (const key of tags.corridorSeaLane) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "sea";
    let style = tags.corridorStyle.get(key);
    if (!style) {
      const [sx, sy] = key.split(",").map(Number);
      style = isAdjacentToShallowWater(ctx, sx, sy, width, height) ? "coastal" : "ocean";
    }
    assignCorridorMetadata(corridorsCfg, key, kind, style);
  }

  for (const key of tags.corridorIslandHop) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "islandHop";
    const style = tags.corridorStyle.get(key) || "archipelago";
    assignCorridorMetadata(corridorsCfg, key, kind, style);
  }

  for (const key of tags.corridorLandOpen) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "land";
    const style = tags.corridorStyle.get(key) || "plainsBelt";
    assignCorridorMetadata(corridorsCfg, key, kind, style);
  }

  for (const key of tags.corridorRiverChain) {
    const kind = (tags.corridorKind.get(key) as CorridorKind) || "river";
    const style = tags.corridorStyle.get(key) || "riverChain";
    assignCorridorMetadata(corridorsCfg, key, kind, style);
  }
}
