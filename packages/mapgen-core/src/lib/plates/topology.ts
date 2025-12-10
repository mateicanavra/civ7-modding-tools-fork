/**
 * Plate Topology Analysis
 *
 * Builds an adjacency graph from the rasterized plate ID map so that
 * higher-level crust logic can reason about whole plates instead of
 * tile-level boundary noise.
 */

export interface PlateNode {
  id: number;
  /** Number of tiles belonging to the plate */
  area: number;
  /** Average tile position for diagnostics and clustering */
  centroid: { x: number; y: number };
  /** Sorted, unique list of adjacent plate IDs */
  neighbors: number[];
}

export type PlateGraph = PlateNode[];

type PlateIdArray = Int16Array | Int8Array | Uint8Array | Uint16Array | number[];

function assertValidDimensions(plateIds: PlateIdArray, width: number, height: number): void {
  const expected = width * height;
  if (plateIds.length < expected) {
    throw new Error(
      `[plates/topology] plateIds length (${plateIds.length}) below expected size (${expected})`
    );
  }
}

function getHexNeighborIndices(x: number, y: number, width: number, height: number): number[] {
  const isOddCol = (x & 1) === 1;
  const offsets = isOddCol
    ? [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, 1],
        [1, 1],
      ]
    : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
      ];

  const indices: number[] = [];

  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;

    if (ny < 0 || ny >= height) continue;

    // Cylindrical wrap on X; clamp on Y
    const wrappedX = ((nx % width) + width) % width;
    indices.push(ny * width + wrappedX);
  }

  return indices;
}

/**
 * Build an adjacency graph from the raster plate ID map.
 *
 * @param plateIds - Typed array of plate IDs per tile
 * @param width - Map width
 * @param height - Map height
 * @param plateCount - Total number of plates (to size the graph array)
 * @returns Array of PlateNodes indexed by plate ID
 */
export function buildPlateTopology(
  plateIds: PlateIdArray,
  width: number,
  height: number,
  plateCount: number
): PlateGraph {
  assertValidDimensions(plateIds, width, height);

  const nodes: PlateNode[] = Array.from({ length: plateCount }, (_, id) => ({
    id,
    area: 0,
    centroid: { x: 0, y: 0 },
    neighbors: [],
  }));

  // Temporary neighbor sets to avoid duplicates during scan
  const neighborSets: Set<number>[] = Array.from({ length: plateCount }, () => new Set());

  // Single pass scan
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const currentId = plateIds[i];

      if (typeof currentId !== "number" || !Number.isFinite(currentId)) continue;
      if (currentId < 0 || currentId >= plateCount) continue;

      const node = nodes[currentId];
      node.area++;
      node.centroid.x += x;
      node.centroid.y += y;

      const neighbors = getHexNeighborIndices(x, y, width, height);
      for (const ni of neighbors) {
        const neighborId = plateIds[ni];
        if (typeof neighborId !== "number" || !Number.isFinite(neighborId)) continue;
        if (neighborId === currentId) continue;
        if (neighborId < 0 || neighborId >= plateCount) continue;
        neighborSets[currentId].add(neighborId);
      }
    }
  }

  // Finalize nodes
  for (let id = 0; id < plateCount; id++) {
    const node = nodes[id];
    if (node.area > 0) {
      node.centroid.x /= node.area;
      node.centroid.y /= node.area;
    }
    node.neighbors = Array.from(neighborSets[id]).sort((a, b) => a - b);
  }

  return nodes;
}
