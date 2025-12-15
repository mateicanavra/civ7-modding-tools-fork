/**
 * Story Swatches — macro climate swatches.
 *
 * Operates on the canonical ClimateField buffer and publishes immutable overlay
 * snapshots describing what was applied.
 */

import type { ExtendedMapContext } from "../core/types.js";
import { applyClimateSwatches } from "../layers/hydrology/climate.js";
import type { OrogenyCache } from "../layers/hydrology/climate.js";
import { publishStoryOverlay, STORY_OVERLAY_KEYS } from "./overlays.js";
import { storyTagPaleoHydrology } from "./paleo.js";


export interface ClimateSwatchesSummary {
  applied: boolean;
  kind: string;
  tiles?: number;
}

export function storyTagClimateSwatches(
  ctx: ExtendedMapContext,
  options: { orogenyCache?: OrogenyCache } = {}
): ClimateSwatchesSummary {
  const { width, height } = ctx.dimensions;

  const result = applyClimateSwatches(width, height, ctx, {
    orogenyCache: options.orogenyCache,
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

export function storyTagClimatePaleo(ctx: ExtendedMapContext): void {
  const { width, height } = ctx.dimensions;
  const summary = storyTagPaleoHydrology(ctx);

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
