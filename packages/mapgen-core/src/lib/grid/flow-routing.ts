import { forEachHexNeighborOddQ } from "@mapgen/lib/grid/neighborhood/hex-oddq.js";

/**
 * Select the steepest-descent neighbor index for a tile in odd-q hex space.
 */
export function selectFlowReceiver(
  x: number,
  y: number,
  width: number,
  height: number,
  elevation: Int16Array
): number {
  const i = y * width + x;
  let bestIdx = -1;
  let bestElev = elevation[i] ?? 0;
  forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
    const ni = ny * width + nx;
    const elev = elevation[ni] ?? bestElev;
    if (elev < bestElev) {
      bestElev = elev;
      bestIdx = ni;
    }
  });
  return bestIdx;
}

type HeapEntry = { idx: number; priority: number };

class MinHeap {
  private heap: HeapEntry[] = [];

  get size(): number {
    return this.heap.length;
  }

  push(entry: HeapEntry): void {
    const heap = this.heap;
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent]!.priority <= heap[i]!.priority) break;
      const tmp = heap[parent]!;
      heap[parent] = heap[i]!;
      heap[i] = tmp;
      i = parent;
    }
  }

  pop(): HeapEntry | undefined {
    const heap = this.heap;
    const root = heap[0];
    if (!root) return undefined;
    const last = heap.pop()!;
    if (heap.length === 0) return root;
    heap[0] = last;
    let i = 0;
    while (true) {
      const left = i * 2 + 1;
      const right = left + 1;
      let smallest = i;
      if (left < heap.length && heap[left]!.priority < heap[smallest]!.priority) smallest = left;
      if (right < heap.length && heap[right]!.priority < heap[smallest]!.priority) smallest = right;
      if (smallest === i) break;
      const tmp = heap[i]!;
      heap[i] = heap[smallest]!;
      heap[smallest] = tmp;
      i = smallest;
    }
    return root;
  }
}

export type PriorityFloodOutletMode = "water" | "water-or-edges";

export type ComputeFlowRoutingPriorityFloodOptions = Readonly<{
  /** Small positive value used to force strict descent out of filled flats/depressions. */
  epsilon?: number;
  /**
   * What counts as an outlet/boundary cell for depression handling.
   * - "water": land drains to landMask==0 cells (default; compatible with current flowDir semantics).
   * - "water-or-edges": also treats y==0 and y==height-1 as boundary outlets.
   */
  outlets?: PriorityFloodOutletMode;
}>;

export type ComputeFlowRoutingPriorityFloodResult = Readonly<{
  /** Steepest-descent receiver index per tile (or -1 for water/sinks/outlets). */
  flowDir: Int32Array;
  /** Hydrologically-conditioned routing surface (Float32; elevation with depression/flat handling). */
  routingElevation: Float32Array;
}>;

/**
 * Compute steepest-descent flow routing using Priority-Flood depression handling (Barnes et al.),
 * producing a conditioned routing surface and a flowDir that avoids sinks on quantized / flat DEMs.
 *
 * Notes:
 * - Uses odd-q hex neighbors with wrapX=true (via forEachHexNeighborOddQ).
 * - Does not mutate the input elevation buffer.
 * - Keeps the legacy `flowDir` contract: water tiles remain `-1`; outlets are represented as `-1`.
 */
export function computeFlowRoutingPriorityFlood(options: {
  width: number;
  height: number;
  elevation: Int16Array;
  landMask: Uint8Array;
  config?: ComputeFlowRoutingPriorityFloodOptions;
}): ComputeFlowRoutingPriorityFloodResult {
  const width = options.width | 0;
  const height = options.height | 0;
  const size = Math.max(0, width * height);

  if (!(options.elevation instanceof Int16Array) || options.elevation.length !== size) {
    throw new Error("[FlowRouting] elevation must be Int16Array of length width*height.");
  }
  if (!(options.landMask instanceof Uint8Array) || options.landMask.length !== size) {
    throw new Error("[FlowRouting] landMask must be Uint8Array of length width*height.");
  }

  const epsilon = options.config?.epsilon ?? 1e-3;
  const outletMode: PriorityFloodOutletMode = options.config?.outlets ?? "water";

  const routingElevation = new Float32Array(size);
  for (let i = 0; i < size; i++) routingElevation[i] = options.elevation[i] ?? 0;

  const visited = new Uint8Array(size);
  const heap = new MinHeap();

  let outletCount = 0;
  for (let i = 0; i < size; i++) {
    const isWater = options.landMask[i] !== 1;
    if (isWater) {
      visited[i] = 1;
      heap.push({ idx: i, priority: routingElevation[i]! });
      outletCount++;
      continue;
    }

    if (outletMode === "water-or-edges") {
      const y = (i / width) | 0;
      if (y === 0 || y === height - 1) {
        visited[i] = 1;
        heap.push({ idx: i, priority: routingElevation[i]! });
        outletCount++;
      }
    }
  }

  // If we have no outlets (all-land maps), fall back to legacy steepest-descent.
  const flowDir = new Int32Array(size);
  for (let i = 0; i < size; i++) flowDir[i] = -1;
  if (outletCount === 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (options.landMask[i] !== 1) continue;
        flowDir[i] = selectFlowReceiver(x, y, width, height, options.elevation);
      }
    }
    return { flowDir, routingElevation };
  }

  while (heap.size > 0) {
    const current = heap.pop()!;
    const i = current.idx;
    const x = i % width;
    const y = (i / width) | 0;
    const curElev = routingElevation[i] ?? current.priority;

    forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
      const ni = ny * width + nx;
      if (visited[ni] === 1) return;
      visited[ni] = 1;

      let nextElev = routingElevation[ni] ?? 0;
      if (nextElev <= curElev) {
        nextElev = curElev + epsilon;
        routingElevation[ni] = nextElev;
      }

      heap.push({ idx: ni, priority: nextElev });
    });
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (options.landMask[i] !== 1) continue;

      const cur = routingElevation[i] ?? 0;
      let bestIdx = -1;
      let bestElev = cur;

      forEachHexNeighborOddQ(x, y, width, height, (nx, ny) => {
        const ni = ny * width + nx;
        const elev = routingElevation[ni] ?? bestElev;
        if (elev < bestElev) {
          bestElev = elev;
          bestIdx = ni;
        }
      });

      flowDir[i] = bestIdx;
    }
  }

  return { flowDir, routingElevation };
}
