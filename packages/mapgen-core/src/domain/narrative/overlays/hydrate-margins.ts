import type { StoryOverlaySnapshot } from "../../../core/types.js";

export interface MarginStoryTags {
  activeMargin?: Set<string>;
  passiveShelf?: Set<string>;
}

export interface HydrateMarginsOptions {
  clear?: boolean;
}

export function hydrateMarginsStoryTags(
  overlay: StoryOverlaySnapshot | null | undefined,
  storyTags: MarginStoryTags | null | undefined,
  options: HydrateMarginsOptions = {}
): MarginStoryTags | null | undefined {
  if (!overlay || !storyTags || typeof storyTags !== "object") {
    return storyTags;
  }

  const active = Array.isArray(overlay.active) ? overlay.active : [];
  const passive = Array.isArray(overlay.passive) ? overlay.passive : [];
  const clear = options.clear !== false;

  const activeSet = storyTags.activeMargin;
  const passiveSet = storyTags.passiveShelf;

  if (clear) {
    activeSet?.clear?.();
    passiveSet?.clear?.();
  }

  if (activeSet && typeof activeSet.add === "function") {
    for (const key of active) {
      activeSet.add(key);
    }
  }

  if (passiveSet && typeof passiveSet.add === "function") {
    for (const key of passive) {
      passiveSet.add(key);
    }
  }

  return storyTags;
}

