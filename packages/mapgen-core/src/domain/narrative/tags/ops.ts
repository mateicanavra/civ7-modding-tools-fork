import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { StoryTagsInstance, TagSet } from "@mapgen/domain/narrative/tags/instance.js";
import { createStoryTags } from "@mapgen/domain/narrative/tags/instance.js";

const STORY_TAGS_ARTIFACT_KEY = "story:tags";

export function getStoryTags(ctx: ExtendedMapContext | null | undefined): StoryTagsInstance {
  if (!ctx) return createStoryTags();
  const existing = ctx.artifacts?.get(STORY_TAGS_ARTIFACT_KEY) as StoryTagsInstance | undefined;
  if (existing) return existing;
  const created = createStoryTags();
  ctx.artifacts?.set(STORY_TAGS_ARTIFACT_KEY, created);
  return created;
}

export function resetStoryTags(ctx: ExtendedMapContext | null | undefined): void {
  if (!ctx) return;
  ctx.artifacts?.set(STORY_TAGS_ARTIFACT_KEY, createStoryTags());
}

export function clearStoryTags(ctx: ExtendedMapContext | null | undefined): void {
  const tags = getStoryTags(ctx);

  tags.hotspot.clear();
  tags.hotspotParadise.clear();
  tags.hotspotVolcanic.clear();
  tags.riftLine.clear();
  tags.riftShoulder.clear();
  tags.activeMargin.clear();
  tags.passiveShelf.clear();
  tags.corridorSeaLane.clear();
  tags.corridorIslandHop.clear();
  tags.corridorLandOpen.clear();
  tags.corridorRiverChain.clear();

  tags.corridorKind.clear();
  tags.corridorStyle.clear();
  tags.corridorAttributes.clear();
}

export function hasTag(tagSet: TagSet, x: number, y: number): boolean {
  return tagSet.has(`${x},${y}`);
}

export function addTag(tagSet: TagSet, x: number, y: number): void {
  tagSet.add(`${x},${y}`);
}

export function removeTag(tagSet: TagSet, x: number, y: number): boolean {
  return tagSet.delete(`${x},${y}`);
}

export function getTagCoordinates(tagSet: TagSet): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  for (const key of tagSet) {
    const [x, y] = key.split(",").map(Number);
    result.push({ x, y });
  }
  return result;
}

export default {
  getStoryTags,
  resetStoryTags,
  clearStoryTags,
  hasTag,
  addTag,
  removeTag,
  getTagCoordinates,
};
