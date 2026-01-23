import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";

function computeCircularBounds(columnsUsed: Uint8Array): { west: number; east: number } {
  const width = columnsUsed.length | 0;
  if (width <= 0) return { west: 0, east: 0 };

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

  if (bestGapStart === -1) return { west: 0, east: width - 1 };

  const gapEnd = bestGapStart + bestGapLen - 1;
  const west = (gapEnd + 1) % width;
  const east = (bestGapStart - 1 + width) % width;
  return { west, east };
}

function circularSpan(width: number, west: number, east: number): number {
  const w = width | 0;
  if (w <= 0) return 0;
  const wi = west | 0;
  const ei = east | 0;
  if (wi <= ei) return ei - wi + 1;
  return (w - wi) + (ei + 1);
}

export type MountainWallinessMetrics = Readonly<{
  componentCount: number;
  largestComponentTiles: number;
  walliness: number;
  minComponentTiles: number;
}>;

export function computeMountainWallinessOddQ(params: {
  width: number;
  height: number;
  mountainMask: Uint8Array;
  landMask?: Uint8Array;
  minComponentTiles?: number;
}): MountainWallinessMetrics {
  const { width, height, mountainMask, landMask } = params;
  const minComponentTiles = params.minComponentTiles ?? 20;

  const size = Math.max(0, (width | 0) * (height | 0));
  if (mountainMask.length !== size) {
    throw new Error(`Expected mountainMask length ${size} (received ${mountainMask.length}).`);
  }
  if (landMask && landMask.length !== size) {
    throw new Error(`Expected landMask length ${size} (received ${landMask.length}).`);
  }

  const visited = new Uint8Array(size);
  const queue: number[] = [];
  const columnsUsed = new Uint8Array(width);

  let componentCount = 0;
  let largestComponentTiles = 0;
  let walliness = 0;

  for (let i = 0; i < size; i++) {
    if ((mountainMask[i] | 0) !== 1) continue;
    if (landMask && (landMask[i] | 0) !== 1) continue;
    if ((visited[i] | 0) === 1) continue;

    componentCount += 1;
    visited[i] = 1;
    queue.length = 0;
    queue.push(i);
    columnsUsed.fill(0);

    let tileCount = 0;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      tileCount += 1;
      const y = (idx / width) | 0;
      const x = idx - y * width;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      columnsUsed[x] = 1;

      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        if ((visited[ni] | 0) === 1) return;
        if ((mountainMask[ni] | 0) !== 1) return;
        if (landMask && (landMask[ni] | 0) !== 1) return;
        visited[ni] = 1;
        queue.push(ni);
      });
    }

    if (tileCount > largestComponentTiles) largestComponentTiles = tileCount;

    if (tileCount >= minComponentTiles) {
      const { west, east } = computeCircularBounds(columnsUsed);
      const spanX = circularSpan(width, west, east);
      const spanY = Number.isFinite(minY) && Number.isFinite(maxY) ? (maxY - minY + 1) : 0;
      const majorSpan = Math.max(1, spanX, spanY);
      const compactness = majorSpan / Math.max(1, Math.sqrt(tileCount));
      if (compactness > walliness) walliness = compactness;
    }
  }

  return { componentCount, largestComponentTiles, walliness, minComponentTiles };
}

export type BeltToMountainCorrelationMetrics = Readonly<{
  nearConvergentLandTiles: number;
  nearConvergentMountainTiles: number;
  interiorLandTiles: number;
  interiorMountainTiles: number;
  nearMountainRate: number;
  interiorMountainRate: number;
  ratio: number;
}>;

export function computeBeltToMountainCorrelation(params: {
  width: number;
  height: number;
  landMask: Uint8Array;
  mountainMask: Uint8Array;
  boundaryType: Uint8Array;
  boundaryCloseness: Uint8Array;
  nearClosenessMin?: number;
}): BeltToMountainCorrelationMetrics {
  const { width, height, landMask, mountainMask, boundaryType, boundaryCloseness } = params;
  const nearClosenessMin = params.nearClosenessMin ?? 64;
  const size = Math.max(0, (width | 0) * (height | 0));
  if (landMask.length !== size) throw new Error(`Expected landMask length ${size} (received ${landMask.length}).`);
  if (mountainMask.length !== size) {
    throw new Error(`Expected mountainMask length ${size} (received ${mountainMask.length}).`);
  }

  let nearConvergentLandTiles = 0;
  let nearConvergentMountainTiles = 0;
  let interiorLandTiles = 0;
  let interiorMountainTiles = 0;

  for (let i = 0; i < size; i++) {
    if ((landMask[i] | 0) !== 1) continue;

    const isMountain = (mountainMask[i] | 0) === 1;
    const t = boundaryType[i] ?? 0;
    const c = boundaryCloseness[i] ?? 0;

    const isNearConvergent = t === 1 && c >= nearClosenessMin;
    const isInterior = c === 0;

    if (isNearConvergent) {
      nearConvergentLandTiles += 1;
      if (isMountain) nearConvergentMountainTiles += 1;
    }
    if (isInterior) {
      interiorLandTiles += 1;
      if (isMountain) interiorMountainTiles += 1;
    }
  }

  const nearMountainRate =
    nearConvergentLandTiles > 0 ? nearConvergentMountainTiles / nearConvergentLandTiles : 0;
  const interiorMountainRate = interiorLandTiles > 0 ? interiorMountainTiles / interiorLandTiles : 0;
  const ratio = interiorMountainRate > 0 ? nearMountainRate / interiorMountainRate : Infinity;

  return {
    nearConvergentLandTiles,
    nearConvergentMountainTiles,
    interiorLandTiles,
    interiorMountainTiles,
    nearMountainRate,
    interiorMountainRate,
    ratio,
  };
}
