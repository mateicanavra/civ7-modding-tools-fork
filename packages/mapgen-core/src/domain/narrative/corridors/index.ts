/**
 * Story Corridors — lightweight, gameplay-focused path tagging.
 *
 * Ports legacy JS story/corridors.js into MapContext-friendly logic:
 * - Uses EngineAdapter reads (water/elevation/rainfall/latitude) when ctx provided
 * - Publishes a canonical overlay snapshot for Task Graph contracts
 *
 * Corridors are stored in StoryTags for compatibility in M3:
 *   - corridorSeaLane / corridorIslandHop / corridorLandOpen / corridorRiverChain
 *   - corridorKind / corridorStyle / corridorAttributes metadata maps
 */

import type { ExtendedMapContext, StoryOverlaySnapshot } from "@mapgen/core/types.js";
import { getStoryTags } from "@mapgen/domain/narrative/tags/index.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/index.js";
import type { CorridorsConfig, FoundationDirectionalityConfig } from "@mapgen/config/index.js";

import type { CorridorStage } from "@mapgen/domain/narrative/corridors/types.js";
import { resetCorridorStyleCache } from "@mapgen/domain/narrative/corridors/style-cache.js";
import { tagSeaLanes } from "@mapgen/domain/narrative/corridors/sea-lanes.js";
import { tagIslandHopFromHotspots } from "@mapgen/domain/narrative/corridors/island-hop.js";
import { tagLandCorridorsFromRifts } from "@mapgen/domain/narrative/corridors/land-corridors.js";
import { tagRiverChainsPostRivers } from "@mapgen/domain/narrative/corridors/river-chains.js";
import { backfillCorridorKinds } from "@mapgen/domain/narrative/corridors/backfill.js";

export type { CorridorStage } from "@mapgen/domain/narrative/corridors/types.js";
export { resetCorridorStyleCache } from "@mapgen/domain/narrative/corridors/style-cache.js";

export function storyTagStrategicCorridors(
  ctx: ExtendedMapContext,
  stage: CorridorStage,
  config: { corridors?: CorridorsConfig; directionality?: FoundationDirectionalityConfig } = {}
): StoryOverlaySnapshot {
  const corridorsCfg = (config.corridors || {}) as Record<string, unknown>;
  const directionality = config.directionality;

  resetCorridorStyleCache(ctx);

  if (stage === "preIslands") {
    tagSeaLanes(ctx, corridorsCfg, directionality);
    tagIslandHopFromHotspots(ctx, corridorsCfg);
    tagLandCorridorsFromRifts(ctx, corridorsCfg, directionality);
    backfillCorridorKinds(ctx, corridorsCfg);
  } else if (stage === "postRivers") {
    tagRiverChainsPostRivers(ctx, corridorsCfg);
    backfillCorridorKinds(ctx, corridorsCfg);
  }

  const tags = getStoryTags(ctx);
  const seaLane = Array.from(tags.corridorSeaLane);
  const islandHop = Array.from(tags.corridorIslandHop);
  const landOpen = Array.from(tags.corridorLandOpen);
  const riverChain = Array.from(tags.corridorRiverChain);

  const all = new Set<string>();
  for (const k of seaLane) all.add(k);
  for (const k of islandHop) all.add(k);
  for (const k of landOpen) all.add(k);
  for (const k of riverChain) all.add(k);

  const { width, height } = ctx.dimensions;
  return publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.CORRIDORS, {
    kind: STORY_OVERLAY_KEYS.CORRIDORS,
    version: 1,
    width,
    height,
    active: Array.from(all),
    summary: {
      stage,
      seaLane,
      islandHop,
      landOpen,
      riverChain,
      kindByTile: Object.fromEntries(tags.corridorKind),
      styleByTile: Object.fromEntries(tags.corridorStyle),
      attributesByTile: Object.fromEntries(tags.corridorAttributes),
      seaLaneTiles: seaLane.length,
      islandHopTiles: islandHop.length,
      landOpenTiles: landOpen.length,
      riverChainTiles: riverChain.length,
      totalTiles: all.size,
    },
  });
}
