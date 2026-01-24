import { clamp01, wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";

import type { FoundationPlate } from "./contract.js";

type MinHeapItem = Readonly<{ cost: number; plateId: number; cellId: number; seq: number }>;

export class MinHeap {
  private readonly items: MinHeapItem[] = [];
  private seq = 0;

  get size(): number {
    return this.items.length;
  }

  push(value: Omit<MinHeapItem, "seq">): void {
    const item: MinHeapItem = { ...value, seq: this.seq++ };
    const heap = this.items;
    heap.push(item);
    this.bubbleUp(heap.length - 1);
  }

  pop(): MinHeapItem | null {
    const heap = this.items;
    if (heap.length === 0) return null;
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    const heap = this.items;
    while (index > 0) {
      const parent = (index - 1) >>> 1;
      if (this.less(heap[index]!, heap[parent]!)) {
        const tmp = heap[index]!;
        heap[index] = heap[parent]!;
        heap[parent] = tmp;
        index = parent;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    const heap = this.items;
    const len = heap.length;
    while (true) {
      const left = index * 2 + 1;
      if (left >= len) return;
      const right = left + 1;
      let smallest = left;
      if (right < len && this.less(heap[right]!, heap[left]!)) smallest = right;
      if (this.less(heap[smallest]!, heap[index]!)) {
        const tmp = heap[index]!;
        heap[index] = heap[smallest]!;
        heap[smallest] = tmp;
        index = smallest;
      } else {
        return;
      }
    }
  }

  private less(a: MinHeapItem, b: MinHeapItem): boolean {
    if (a.cost !== b.cost) return a.cost < b.cost;
    if (a.plateId !== b.plateId) return a.plateId < b.plateId;
    if (a.cellId !== b.cellId) return a.cellId < b.cellId;
    return a.seq < b.seq;
  }
}

export function distanceSqWrapped(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  wrapWidth: number
): number {
  const dx = wrapDeltaPeriodic(ax - bx, wrapWidth);
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function crustAgeNorm(age: number): number {
  return clamp01(age / 255);
}

export function computeCellResistance(type: number, age: number): number {
  const a = crustAgeNorm(age);
  const agePenalty = a * a;
  if ((type | 0) === 1) {
    // Continental / cratonic crust: high resistance discourages bisecting cores.
    return 2.2 + 2.8 * agePenalty;
  }
  // Oceanic crust: lower resistance encourages boundaries offshore.
  return 1.0 + 0.8 * agePenalty;
}

export function pickExtremeYCell(params: {
  mesh: { cellCount: number; siteY: Float32Array };
  eligible: Uint8Array;
  mode: "min" | "max";
}): number {
  const cellCount = params.mesh.cellCount | 0;
  let best = -1;
  let bestY = params.mode === "min" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  for (let i = 0; i < cellCount; i++) {
    if (!params.eligible[i]) continue;
    const y = params.mesh.siteY[i] ?? 0;
    if (params.mode === "min") {
      if (y < bestY) {
        bestY = y;
        best = i;
      }
    } else {
      if (y > bestY) {
        bestY = y;
        best = i;
      }
    }
  }
  return best;
}

export function pickSeedCell(params: {
  mesh: { cellCount: number; wrapWidth: number; siteX: Float32Array; siteY: Float32Array; bbox: { yt: number; yb: number } };
  crust: { type: Uint8Array; age: Uint8Array };
  rng: (max: number, label?: string) => number;
  used: Uint8Array;
  existingSeeds: number[];
  kind: FoundationPlate["kind"];
  allowed: Uint8Array;
  minSepSq: number;
}): number {
  const cellCount = params.mesh.cellCount | 0;
  const wrapWidth = params.mesh.wrapWidth;

  let bestCandidate = -1;
  let bestScore = -Infinity;

  const attemptsPerSeed = 64;
  for (let attempt = 0; attempt < attemptsPerSeed; attempt++) {
    const candidate = params.rng(cellCount, "PlateGraphSeedPick") | 0;
    if (!params.allowed[candidate]) continue;
    if (params.used[candidate]) continue;

    const cx = params.mesh.siteX[candidate] ?? 0;
    const cy = params.mesh.siteY[candidate] ?? 0;

    let minDistSq = Infinity;
    for (let s = 0; s < params.existingSeeds.length; s++) {
      const seed = params.existingSeeds[s]!;
      const sx = params.mesh.siteX[seed] ?? 0;
      const sy = params.mesh.siteY[seed] ?? 0;
      const d = distanceSqWrapped(cx, cy, sx, sy, wrapWidth);
      if (d < minDistSq) minDistSq = d;
    }

    const type = params.crust.type[candidate] ?? 0;
    const age = params.crust.age[candidate] ?? 0;
    const a = crustAgeNorm(age);
    const quality =
      params.kind === "major"
        ? (type === 1 ? 1.0 + 1.5 * a : 0.25)
        : (type === 0 ? 1.0 + 1.0 * (1 - a) : 0.1);

    const score = minDistSq * (0.5 + quality);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }

    if (minDistSq >= params.minSepSq) break;
  }

  if (bestCandidate < 0) {
    // Deterministic fallback: first allowed unused index starting at a deterministic offset.
    const start = params.rng(cellCount, "PlateGraphSeedFallbackStart") | 0;
    for (let i = 0; i < cellCount; i++) {
      const idx = (start + i) % cellCount;
      if (!params.allowed[idx]) continue;
      if (params.used[idx]) continue;
      bestCandidate = idx;
      break;
    }
  }

  if (bestCandidate < 0) {
    throw new Error("[Foundation] PlateGraph failed to select seed cells.");
  }

  params.used[bestCandidate] = 1;
  params.existingSeeds.push(bestCandidate);
  return bestCandidate;
}

export function lockContiguousRegion(params: {
  mesh: { cellCount: number; neighborsOffsets: Int32Array; neighbors: Int32Array };
  lockedPlateId: Int16Array;
  allowed: Uint8Array;
  plateId: number;
  seedCell: number;
  targetCells: number;
}): number {
  const cellCount = params.mesh.cellCount | 0;
  const plateId = params.plateId | 0;
  const seedCell = params.seedCell | 0;
  const targetCells = Math.max(0, params.targetCells | 0);

  if (seedCell < 0 || seedCell >= cellCount) return 0;
  if (!params.allowed[seedCell]) return 0;

  const visited = new Uint8Array(cellCount);
  const queue = new Int32Array(cellCount);
  let head = 0;
  let tail = 0;
  queue[tail++] = seedCell;
  visited[seedCell] = 1;

  let locked = 0;
  while (head < tail && locked < targetCells) {
    const cellId = queue[head++] | 0;
    if (!params.allowed[cellId]) continue;

    const current = params.lockedPlateId[cellId] | 0;
    if (current >= 0 && current !== plateId) continue;
    if (current === plateId) {
      locked++;
    } else {
      params.lockedPlateId[cellId] = plateId;
      locked++;
    }

    const start = params.mesh.neighborsOffsets[cellId] | 0;
    const end = params.mesh.neighborsOffsets[cellId + 1] | 0;
    for (let j = start; j < end; j++) {
      const n = params.mesh.neighbors[j] | 0;
      if (n < 0 || n >= cellCount) continue;
      if (visited[n]) continue;
      visited[n] = 1;
      queue[tail++] = n;
      if (tail >= cellCount) break;
    }
  }

  return locked;
}

export function filterByMinComponentSize(params: {
  mesh: { cellCount: number; neighborsOffsets: Int32Array; neighbors: Int32Array };
  allowed: Uint8Array;
  minSize: number;
}): Uint8Array {
  const cellCount = params.mesh.cellCount | 0;
  const minSize = Math.max(1, params.minSize | 0);

  const out = new Uint8Array(cellCount);
  const visited = new Uint8Array(cellCount);
  const queue = new Int32Array(cellCount);
  const component = new Int32Array(cellCount);

  for (let i = 0; i < cellCount; i++) {
    if (!params.allowed[i]) continue;
    if (visited[i]) continue;

    let head = 0;
    let tail = 0;
    let compLen = 0;

    queue[tail++] = i;
    visited[i] = 1;

    while (head < tail) {
      const cellId = queue[head++] | 0;
      component[compLen++] = cellId;

      const start = params.mesh.neighborsOffsets[cellId] | 0;
      const end = params.mesh.neighborsOffsets[cellId + 1] | 0;
      for (let j = start; j < end; j++) {
        const n = params.mesh.neighbors[j] | 0;
        if (n < 0 || n >= cellCount) continue;
        if (visited[n]) continue;
        if (!params.allowed[n]) continue;
        visited[n] = 1;
        queue[tail++] = n;
      }
    }

    if (compLen >= minSize) {
      for (let k = 0; k < compLen; k++) {
        out[component[k]!] = 1;
      }
    }
  }

  return out;
}
