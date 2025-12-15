import type { StoryOverlaySnapshot } from "../../../core/types.js";

export interface RiftStoryTags {
  riftLine?: Set<string>;
  riftShoulder?: Set<string>;
}

export interface HydrateRiftsOptions {
  clear?: boolean;
}

export function hydrateRiftsStoryTags(
  overlay: StoryOverlaySnapshot | null | undefined,
  storyTags: RiftStoryTags | null | undefined,
  options: HydrateRiftsOptions = {}
): RiftStoryTags | null | undefined {
  if (!overlay || !storyTags || typeof storyTags !== "object") {
    return storyTags;
  }

  const line = Array.isArray(overlay.active) ? overlay.active : [];
  const shoulder = Array.isArray(overlay.passive) ? overlay.passive : [];
  const clear = options.clear !== false;

  const lineSet = storyTags.riftLine;
  const shoulderSet = storyTags.riftShoulder;

  if (clear) {
    lineSet?.clear?.();
    shoulderSet?.clear?.();
  }

  if (lineSet && typeof lineSet.add === "function") {
    for (const key of line) {
      lineSet.add(key);
    }
  }

  if (shoulderSet && typeof shoulderSet.add === "function") {
    for (const key of shoulder) {
      shoulderSet.add(key);
    }
  }

  return storyTags;
}

