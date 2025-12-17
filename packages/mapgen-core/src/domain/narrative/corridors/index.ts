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

import type { ExtendedMapContext, StoryOverlaySnapshot } from "../../../core/types.js";
import { getStoryTags } from "../tags/index.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "../overlays/index.js";

import type { CorridorStage } from "./types.js";
import { resetCorridorStyleCache } from "./style-cache.js";
import { tagSeaLanes } from "./sea-lanes.js";
import { tagIslandHopChains } from "./IslandHopStrategy.js";
import { tagLandCorridorsFromRifts } from "./land-corridors.js";
import { tagRiverChainsPostRivers } from "./river-chains.js";
import { tagMountainPasses } from "./MountainPassStrategy.js";
import { backfillCorridorKinds } from "./backfill.js";

export type { CorridorStage } from "./types.js";
export { resetCorridorStyleCache } from "./style-cache.js";

export function storyTagStrategicCorridors(ctx: ExtendedMapContext, stage: CorridorStage): StoryOverlaySnapshot {
  const corridorsCfg = (ctx.config.corridors || {}) as Record<string, unknown>;

  resetCorridorStyleCache(ctx);

  if (stage === "preIslands") {
    tagSeaLanes(ctx, corridorsCfg);
    tagIslandHopChains(ctx, corridorsCfg);
    tagLandCorridorsFromRifts(ctx, corridorsCfg);
    backfillCorridorKinds(ctx, corridorsCfg);
  } else if (stage === "postRivers") {
    tagRiverChainsPostRivers(ctx, corridorsCfg);
    tagMountainPasses(ctx, corridorsCfg);
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
