/**
 * Story Swatches — macro climate swatches.
 *
 * Operates on the canonical ClimateField buffer and publishes immutable overlay
 * snapshots describing what was applied.
 */

import type { ExtendedMapContext } from "@swooper/mapgen-core";
import { applyClimateSwatches } from "@mapgen/domain/hydrology/climate/index.js";
import type { OrogenyCache } from "@mapgen/domain/hydrology/climate/index.js";
import type { ClimateConfig, FoundationDirectionalityConfig } from "@mapgen/domain/config";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "@mapgen/domain/narrative/overlays/index.js";
import { storyTagPaleoHydrology } from "@mapgen/domain/narrative/paleo/index.js";


export interface ClimateSwatchesSummary {
  applied: boolean;
  kind: string;
  tiles?: number;
}

export function storyTagClimateSwatches(
  ctx: ExtendedMapContext,
  options: {
    orogenyCache?: OrogenyCache;
    climate?: ClimateConfig;
    directionality?: FoundationDirectionalityConfig;
  } = {}
): ClimateSwatchesSummary {
  const { width, height } = ctx.dimensions;

  if (!options.directionality) {
    throw new Error("storyTagClimateSwatches requires settings.directionality.");
  }

  const result = applyClimateSwatches(width, height, ctx, {
    orogenyCache: options.orogenyCache,
    climate: options.climate,
    directionality: options.directionality,
  });

  publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.SWATCHES, {
    kind: STORY_OVERLAY_KEYS.SWATCHES,
    version: 1,
    width,
    height,
    summary: {
      applied: result.applied,
      kind: result.kind,
      tiles: result.tiles,
    },
  });

  return result;
}

export function storyTagClimatePaleo(ctx: ExtendedMapContext, climate: ClimateConfig = {}): void {
  const { width, height } = ctx.dimensions;
  const summary = storyTagPaleoHydrology(ctx, climate);

  publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.PALEO, {
    kind: STORY_OVERLAY_KEYS.PALEO,
    version: 1,
    width,
    height,
    summary: {
      deltas: summary.deltas,
      oxbows: summary.oxbows,
      fossils: summary.fossils,
      kind: summary.kind,
    },
  });
}
