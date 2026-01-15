import type { ComputeLandmassesTypes } from "../types.js";

/**
 * Ensures landmass inputs match the expected map size.
 */
export function validateLandmassInputs(
  input: ComputeLandmassesTypes["input"]
): { size: number; landMask: Uint8Array } {
  const { width, height } = input;
  const size = Math.max(0, (width | 0) * (height | 0));
  const landMask = input.landMask as Uint8Array;
  if (landMask.length !== size) {
    throw new Error(`Expected landMask length ${size} (received ${landMask.length}).`);
  }
  return { size, landMask };
}

/**
 * Computes seam-aware bounds for columns marked as used.
 */
export function computeCircularBounds(columnsUsed: Uint8Array): { west: number; east: number } {
  const width = columnsUsed.length;
  if (width === 0) return { west: 0, east: 0 };

  let usedCount = 0;
  for (let x = 0; x < width; x++) usedCount += (columnsUsed[x] | 0) === 1 ? 1 : 0;
  if (usedCount === 0) return { west: 0, east: 0 };
  if (usedCount === width) return { west: 0, east: width - 1 };

  let bestGapStart = -1;
  let bestGapLen = -1;
  let currentStart = -1;
  let currentLen = 0;

  for (let i = 0; i < width * 2; i++) {
    const x = i % width;
    const used = (columnsUsed[x] | 0) === 1;

    if (!used) {
      if (currentStart === -1) currentStart = i;
      currentLen++;
    } else if (currentStart !== -1) {
      const cappedLen = Math.min(currentLen, width);
      if (cappedLen > bestGapLen) {
        bestGapLen = cappedLen;
        bestGapStart = currentStart;
      }
      currentStart = -1;
      currentLen = 0;
    }
  }

  if (currentStart !== -1) {
    const cappedLen = Math.min(currentLen, width);
    if (cappedLen > bestGapLen) {
      bestGapLen = cappedLen;
      bestGapStart = currentStart;
    }
  }

  if (bestGapStart === -1) {
    return { west: 0, east: width - 1 };
  }

  const gapEnd = bestGapStart + bestGapLen - 1;
  const west = (gapEnd + 1) % width;
  const east = (bestGapStart - 1 + width) % width;
  return { west, east };
}

/**
 * Reindexes landmasses by descending tile count.
 */
export function remapLandmassesBySize<T extends { id: number; tileCount: number }>(
  components: T[],
  landmassIdByTile: Int32Array
): { components: T[]; landmassIdByTile: Int32Array } {
  const ordered = components
    .map((component, index) => ({ component, index }))
    .sort((a, b) => b.component.tileCount - a.component.tileCount);
  const remap = new Int32Array(components.length);
  const sortedComponents: T[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const { component, index } = ordered[i];
    remap[index] = i;
    sortedComponents.push({ ...component, id: i });
  }
  for (let i = 0; i < landmassIdByTile.length; i++) {
    const previous = landmassIdByTile[i];
    if (previous >= 0) landmassIdByTile[i] = remap[previous];
  }

  return { components: sortedComponents, landmassIdByTile };
}
