import type { ExtendedMapContext, StoryOverlaySnapshot } from "../../../core/types.js";
import { storyKey } from "../../../core/index.js";
import { getStoryTags } from "../tags/index.js";
import {
  STORY_OVERLAY_KEYS,
  finalizeStoryOverlay,
  publishStoryOverlay,
  hydrateMarginsStoryTags,
} from "../overlays/index.js";
import { isCoastalLand } from "../utils/adjacency.js";
import { getDims } from "../utils/dims.js";
import { rand } from "../utils/rng.js";

import type { ContinentalMarginsOptions } from "./types.js";

export function storyTagContinentalMargins(
  ctx: ExtendedMapContext | null = null,
  options: ContinentalMarginsOptions = {}
): StoryOverlaySnapshot {
  const { width, height } = getDims(ctx);
  const marginsCfg = (ctx?.config as Record<string, unknown>)?.margins as
    | Record<string, number>
    | undefined;

  const area = Math.max(1, width * height);
  const sqrt = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

  const baseActiveFrac = Number.isFinite(marginsCfg?.activeFraction)
    ? (marginsCfg!.activeFraction as number)
    : 0.25;
  const basePassiveFrac = Number.isFinite(marginsCfg?.passiveFraction)
    ? (marginsCfg!.passiveFraction as number)
    : 0.25;

  const activeFrac = Math.min(0.35, baseActiveFrac + 0.05 * (sqrt - 1));
  const passiveFrac = Math.min(0.35, basePassiveFrac + 0.05 * (sqrt - 1));

  const baseMinSeg = Number.isFinite(marginsCfg?.minSegmentLength)
    ? (marginsCfg!.minSegmentLength as number)
    : 12;
  const minSegLen = Math.max(10, Math.round(baseMinSeg * (0.9 + 0.4 * sqrt)));

  // Count total coastal land to set quotas.
  let totalCoast = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isCoastalLand(ctx, x, y, width, height)) totalCoast++;
    }
  }

  const targetActive = Math.floor(totalCoast * activeFrac);
  const targetPassive = Math.floor(totalCoast * passiveFrac);

  let markedActive = 0;
  let markedPassive = 0;
  const activeSet = new Set<string>();
  const passiveSet = new Set<string>();

  function markSegment(y: number, x0: number, x1: number, active: boolean): void {
    for (let x = x0; x <= x1; x++) {
      if (!isCoastalLand(ctx, x, y, width, height)) continue;
      const k = storyKey(x, y);
      if (active) {
        if (markedActive >= targetActive) break;
        if (!activeSet.has(k)) {
          activeSet.add(k);
          markedActive++;
        }
      } else {
        if (markedPassive >= targetPassive) break;
        if (!passiveSet.has(k)) {
          passiveSet.add(k);
          markedPassive++;
        }
      }
    }
  }

  let preferActive = true;
  for (let y = 1; y < height - 1; y++) {
    let x = 1;
    while (x < width - 1) {
      while (x < width - 1 && !isCoastalLand(ctx, x, y, width, height)) x++;
      if (x >= width - 1) break;

      const start = x;
      while (x < width - 1 && isCoastalLand(ctx, x, y, width, height)) x++;
      const end = x - 1;
      const segLen = end - start + 1;

      if (segLen >= minSegLen) {
        const roll = rand(ctx, "MarginSelect", 100);
        const pickActive =
          (preferActive && roll < 60) || (!preferActive && roll < 40);

        if (pickActive && markedActive < targetActive) {
          markSegment(y, start, end, true);
        } else if (markedPassive < targetPassive) {
          markSegment(y, start, end, false);
        }
        preferActive = !preferActive;
      }
    }
  }

  const overlay = {
    kind: STORY_OVERLAY_KEYS.MARGINS,
    version: 1,
    width,
    height,
    active: Array.from(activeSet),
    passive: Array.from(passiveSet),
    summary: {
      active: markedActive,
      passive: markedPassive,
      targetActive,
      targetPassive,
      minSegmentLength: minSegLen,
    },
  };

  const shouldPublish = options.publish !== false;
  const snapshot = shouldPublish
    ? publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.MARGINS, overlay)
    : finalizeStoryOverlay(STORY_OVERLAY_KEYS.MARGINS, overlay);

  if (options.hydrateStoryTags !== false) {
    hydrateMarginsStoryTags(snapshot, getStoryTags(ctx));
  }

  return snapshot;
}
