/**
 * Story Corridors — lightweight, gameplay-focused path tagging.
 *
 * Ports legacy JS story/corridors.js into MapContext-friendly logic:
 * - Uses EngineAdapter reads (water/elevation/rainfall/latitude) when ctx provided
 * - Publishes a canonical overlay snapshot for Task Graph contracts
 *
 * Corridors are published as narrative artifacts and overlays.
 */

import type { ExtendedMapContext, StoryOverlaySnapshot } from "@mapgen/core/types.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/index.js";
import type { CorridorsConfig, FoundationDirectionalityConfig } from "@mapgen/config/index.js";
import { M3_DEPENDENCY_TAGS } from "@mapgen/pipeline/tags.js";
import { buildNarrativeCorridorsV1 } from "@mapgen/domain/narrative/artifacts.js";
import {
  getNarrativeCorridors,
  getNarrativeMotifsHotspots,
  getNarrativeMotifsRifts,
} from "@mapgen/domain/narrative/queries.js";

import type { CorridorStage } from "@mapgen/domain/narrative/corridors/types.js";
import { resetCorridorStyleCache } from "@mapgen/domain/narrative/corridors/style-cache.js";
import { createCorridorState } from "@mapgen/domain/narrative/corridors/state.js";
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
  const emptySet = new Set<string>();
  const existingCorridors = stage === "postRivers" ? getNarrativeCorridors(ctx) : null;
  const hotspots = getNarrativeMotifsHotspots(ctx);
  const rifts = getNarrativeMotifsRifts(ctx);

  resetCorridorStyleCache(ctx);
  const state = createCorridorState(existingCorridors);

  if (stage === "preIslands") {
    tagSeaLanes(ctx, corridorsCfg, directionality, state);
    tagIslandHopFromHotspots(ctx, corridorsCfg, hotspots?.points ?? emptySet, state);
    tagLandCorridorsFromRifts(
      ctx,
      corridorsCfg,
      directionality,
      rifts?.riftShoulder ?? emptySet,
      state
    );
    backfillCorridorKinds(ctx, corridorsCfg, state);
  } else if (stage === "postRivers") {
    tagRiverChainsPostRivers(ctx, corridorsCfg, state);
    backfillCorridorKinds(ctx, corridorsCfg, state);
  }

  const seaLane = Array.from(state.seaLanes);
  const islandHop = Array.from(state.islandHops);
  const landOpen = Array.from(state.landCorridors);
  const riverChain = Array.from(state.riverCorridors);

  const all = new Set<string>();
  for (const k of seaLane) all.add(k);
  for (const k of islandHop) all.add(k);
  for (const k of landOpen) all.add(k);
  for (const k of riverChain) all.add(k);

  const { width, height } = ctx.dimensions;
  const overlay = publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.CORRIDORS, {
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
        kindByTile: Object.fromEntries(state.kindByTile),
        styleByTile: Object.fromEntries(state.styleByTile),
        attributesByTile: Object.fromEntries(state.attributesByTile),
        seaLaneTiles: seaLane.length,
        islandHopTiles: islandHop.length,
        landOpenTiles: landOpen.length,
        riverChainTiles: riverChain.length,
        totalTiles: all.size,
      },
    });

  ctx.artifacts.set(
    M3_DEPENDENCY_TAGS.artifact.narrativeCorridorsV1,
    buildNarrativeCorridorsV1(state)
  );

  return overlay;
}
