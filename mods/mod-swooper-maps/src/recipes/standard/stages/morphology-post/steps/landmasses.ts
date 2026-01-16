import { createStep, implementArtifacts } from "@swooper/mapgen-core/authoring";
import { forEachHexNeighborOddQ } from "@swooper/mapgen-core/lib/grid";

import LandmassesStepContract from "./landmasses.contract.js";

type ArtifactValidationIssue = Readonly<{ message: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateLandmassesSnapshot(value: unknown): ArtifactValidationIssue[] {
  const errors: ArtifactValidationIssue[] = [];
  if (!isRecord(value)) {
    errors.push({ message: "Missing landmasses snapshot." });
    return errors;
  }

  const candidate = value as { landmasses?: unknown };
  if (!Array.isArray(candidate.landmasses)) {
    errors.push({ message: "Expected landmasses.landmasses to be an array." });
  }
  if (!((candidate as { landmassIdByTile?: unknown }).landmassIdByTile instanceof Int32Array)) {
    errors.push({ message: "Expected landmasses.landmassIdByTile to be an Int32Array." });
  }

  return errors;
}

function computeCircularBounds(columnsUsed: Uint8Array): { west: number; east: number } {
  const width = columnsUsed.length;
  if (width === 0) return { west: 0, east: 0 };

  let usedCount = 0;
  for (let x = 0; x < width; x++) usedCount += (columnsUsed[x] | 0) === 1 ? 1 : 0;
  if (usedCount === 0) return { west: 0, east: 0 };
  if (usedCount === width) return { west: 0, east: width - 1 };

  // Find the longest run of unused columns on a circular ring.
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
    } else {
      if (currentStart !== -1) {
        const cappedLen = Math.min(currentLen, width);
        if (cappedLen > bestGapLen) {
          bestGapLen = cappedLen;
          bestGapStart = currentStart;
        }
        currentStart = -1;
        currentLen = 0;
      }
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

function computeLandmasses(width: number, height: number, landMask: Uint8Array): {
  landmasses: readonly {
    id: number;
    tileCount: number;
    bbox: { west: number; east: number; south: number; north: number };
  }[];
  landmassIdByTile: Int32Array;
} {
  const size = Math.max(0, (width | 0) * (height | 0));
  if (landMask.length !== size) {
    throw new Error(`Expected landMask length ${size} (received ${landMask.length}).`);
  }

  const visited = new Uint8Array(size);
  const landmassIdByTile = new Int32Array(size);
  landmassIdByTile.fill(-1);
  const components: Array<{
    id: number;
    tileCount: number;
    bbox: { west: number; east: number; south: number; north: number };
  }> = [];

  const queue: number[] = [];
  const columnsUsed = new Uint8Array(width);

  for (let i = 0; i < size; i++) {
    if ((landMask[i] | 0) !== 1) continue;
    if ((visited[i] | 0) === 1) continue;

    const componentId = components.length;
    visited[i] = 1;
    queue.length = 0;
    queue.push(i);
    landmassIdByTile[i] = componentId;
    columnsUsed.fill(0);

    let tileCount = 0;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      tileCount++;
      const y = (idx / width) | 0;
      const x = idx - y * width;

      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      columnsUsed[x] = 1;

      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        if ((visited[ni] | 0) === 1) return;
        if ((landMask[ni] | 0) !== 1) return;
        visited[ni] = 1;
        landmassIdByTile[ni] = componentId;
        queue.push(ni);
      });
    }

    const { west, east } = computeCircularBounds(columnsUsed);
    components.push({
      id: components.length,
      tileCount,
      bbox: {
        west,
        east,
        south: Number.isFinite(minY) ? minY : 0,
        north: Number.isFinite(maxY) ? maxY : 0,
      },
    });
  }

  const ordered = components
    .map((component, index) => ({ component, index }))
    .sort((a, b) => b.component.tileCount - a.component.tileCount);
  const remap = new Int32Array(components.length);
  const sortedComponents: typeof components = [];
  for (let i = 0; i < ordered.length; i++) {
    const { component, index } = ordered[i];
    remap[index] = i;
    sortedComponents.push({ ...component, id: i });
  }
  for (let i = 0; i < landmassIdByTile.length; i++) {
    const previous = landmassIdByTile[i];
    if (previous >= 0) landmassIdByTile[i] = remap[previous];
  }

  return { landmasses: sortedComponents, landmassIdByTile };
}

export default createStep(LandmassesStepContract, {
  artifacts: implementArtifacts(LandmassesStepContract.artifacts!.provides!, {
    landmasses: {
      validate: (value) => validateLandmassesSnapshot(value),
    },
  }),
  run: (context, _config, _ops, deps) => {
    const topography = deps.artifacts.topography.read(context);
    const { width, height } = context.dimensions;
    const snapshot = computeLandmasses(width, height, topography.landMask);
    deps.artifacts.landmasses.publish(context, snapshot);
  },
});
