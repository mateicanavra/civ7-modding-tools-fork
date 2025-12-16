import type { StoryTagsInstance, TagSet } from "./instance.js";
import { createStoryTags } from "./instance.js";

let _cache: StoryTagsInstance | null = null;

export function getStoryTags(): StoryTagsInstance {
  if (_cache) return _cache;
  _cache = createStoryTags();
  return _cache;
}

export function resetStoryTags(): void {
  _cache = null;
}

export function clearStoryTags(): void {
  const tags = getStoryTags();

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

