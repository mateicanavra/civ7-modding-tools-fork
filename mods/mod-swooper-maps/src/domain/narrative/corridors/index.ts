/**
 * Story Corridors — lightweight, gameplay-focused path tagging.
 *
 * Ports legacy JS story/corridors.js into MapContext-friendly logic:
 * - Uses EngineAdapter reads (water/elevation/rainfall/latitude) when ctx provided
 * - Publishes a canonical overlay snapshot for Task Graph contracts
 *
 * Corridors are published as overlay snapshots; pipeline consumers reconstruct corridor state
 * from the latest overlays entry (no standalone corridor artifact).
 */

import type { ExtendedMapContext, StoryOverlaySnapshot } from "@swooper/mapgen-core";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/index.js";
import type { CorridorsConfig } from "@mapgen/domain/config";
import {
  type NarrativeCorridors,
  type NarrativeMotifsHotspots,
  type NarrativeMotifsRifts,
} from "@mapgen/domain/narrative/models.js";

import type { CorridorStage } from "@mapgen/domain/narrative/corridors/types.js";
import { createCorridorState } from "@mapgen/domain/narrative/corridors/state.js";
import { tagSeaLanes } from "@mapgen/domain/narrative/corridors/sea-lanes.js";
import { tagIslandHopFromHotspots } from "@mapgen/domain/narrative/corridors/island-hop.js";
import { tagLandCorridorsFromRifts } from "@mapgen/domain/narrative/corridors/land-corridors.js";
import { backfillCorridorKinds } from "@mapgen/domain/narrative/corridors/backfill.js";

export type { CorridorStage } from "@mapgen/domain/narrative/corridors/types.js";

export interface StoryCorridorsInputs {
  hotspots?: NarrativeMotifsHotspots | null;
  rifts?: NarrativeMotifsRifts | null;
}

export interface StoryCorridorsResult {
  snapshot: StoryOverlaySnapshot;
  corridors: NarrativeCorridors;
}

export function storyTagStrategicCorridors(
  ctx: ExtendedMapContext,
  stage: CorridorStage,
  config: { corridors?: CorridorsConfig },
  artifacts: StoryCorridorsInputs = {}
): StoryCorridorsResult {
  const corridorsCfg = config.corridors as Record<string, unknown> | undefined;
  if (!corridorsCfg) {
    throw new Error("[Narrative] Missing corridors config.");
  }
  const emptySet = new Set<string>();
  const hotspots = artifacts.hotspots ?? null;
  const rifts = artifacts.rifts ?? null;

  const state = createCorridorState();

  tagSeaLanes(ctx, corridorsCfg, state);
  tagIslandHopFromHotspots(ctx, corridorsCfg, hotspots?.points ?? emptySet, state);
  tagLandCorridorsFromRifts(ctx, corridorsCfg, rifts?.riftShoulder ?? emptySet, state);
  backfillCorridorKinds(ctx, corridorsCfg, state);

  const seaLane = Array.from(state.seaLanes);
  const islandHop = Array.from(state.islandHops);
  const landOpen = Array.from(state.landCorridors);

  const all = new Set<string>();
  for (const k of seaLane) all.add(k);
  for (const k of islandHop) all.add(k);
  for (const k of landOpen) all.add(k);

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
      kindByTile: Object.fromEntries(state.kindByTile),
      styleByTile: Object.fromEntries(state.styleByTile),
      attributesByTile: Object.fromEntries(state.attributesByTile),
      seaLaneTiles: seaLane.length,
      islandHopTiles: islandHop.length,
      landOpenTiles: landOpen.length,
      totalTiles: all.size,
    },
  });

  return { snapshot: overlay, corridors: state };
}
