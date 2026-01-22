import { createOp } from "@swooper/mapgen-core/authoring";
import { wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import { requireEnvDimensions } from "../../lib/normalize.js";
import { requireCrust, requireMesh } from "../../lib/require.js";
import ComputePlateGraphContract from "./contract.js";
import type { FoundationPlate } from "./contract.js";

type MinHeapItem = Readonly<{ cost: number; plateId: number; cellId: number; seq: number }>;

class MinHeap {
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

function distanceSqWrapped(ax: number, ay: number, bx: number, by: number, wrapWidth: number): number {
  const dx = wrapDeltaPeriodic(ax - bx, wrapWidth);
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function crustAgeNorm(age: number): number {
  if (!Number.isFinite(age)) return 0;
  return Math.max(0, Math.min(1, age / 255));
}

function computeCellResistance(type: number, age: number): number {
  const a = crustAgeNorm(age);
  const agePenalty = a * a;
  if ((type | 0) === 1) {
    // Continental / cratonic crust: high resistance discourages bisecting cores.
    return 2.2 + 2.8 * agePenalty;
  }
  // Oceanic crust: lower resistance encourages boundaries offshore.
  return 1.0 + 0.8 * agePenalty;
}

function chooseSeedCells({
  mesh,
  crust,
  plateCount,
  majorCount,
  rng,
}: {
  mesh: { cellCount: number; wrapWidth: number; siteX: Float32Array; siteY: Float32Array; bbox: { yt: number; yb: number } };
  crust: { type: Uint8Array; age: Uint8Array };
  plateCount: number;
  majorCount: number;
  rng: (max: number, label?: string) => number;
}): number[] {
  const cellCount = mesh.cellCount | 0;
  const wrapWidth = mesh.wrapWidth;
  const ySpan = Math.max(1e-6, (mesh.bbox.yb ?? 0) - (mesh.bbox.yt ?? 0));
  const characteristic = Math.max(1e-6, Math.min(wrapWidth, ySpan));
  const minSep = (characteristic / Math.sqrt(Math.max(1, plateCount))) * 0.55;
  const minSepSq = minSep * minSep;

  const used = new Uint8Array(cellCount);
  const seeds: number[] = [];

  const attemptsPerSeed = 64;
  for (let plateId = 0; plateId < plateCount; plateId++) {
    const kind: FoundationPlate["kind"] = plateId < majorCount ? "major" : "minor";
    let bestCandidate = -1;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < attemptsPerSeed; attempt++) {
      const candidate = rng(cellCount, "PlateGraphSeedPick") | 0;
      if (used[candidate]) continue;

      const cx = mesh.siteX[candidate] ?? 0;
      const cy = mesh.siteY[candidate] ?? 0;

      let minDistSq = Infinity;
      for (let s = 0; s < seeds.length; s++) {
        const seed = seeds[s]!;
        const sx = mesh.siteX[seed] ?? 0;
        const sy = mesh.siteY[seed] ?? 0;
        const d = distanceSqWrapped(cx, cy, sx, sy, wrapWidth);
        if (d < minDistSq) minDistSq = d;
      }

      const type = crust.type[candidate] ?? 0;
      const age = crust.age[candidate] ?? 0;
      const a = crustAgeNorm(age);
      const quality =
        kind === "major"
          ? (type === 1 ? 1.0 + 1.5 * a : 0.25)
          : (type === 0 ? 1.0 + 1.0 * (1 - a) : 0.1);

      const score = minDistSq * (0.5 + quality);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }

      if (minDistSq >= minSepSq) break;
    }

    if (bestCandidate < 0) {
      // Deterministic fallback: first unused index starting at a deterministic offset.
      const start = rng(cellCount, "PlateGraphSeedFallbackStart") | 0;
      for (let i = 0; i < cellCount; i++) {
        const idx = (start + i) % cellCount;
        if (used[idx]) continue;
        bestCandidate = idx;
        break;
      }
    }

    if (bestCandidate < 0) {
      throw new Error("[Foundation] PlateGraph failed to select seed cells.");
    }

    used[bestCandidate] = 1;
    seeds.push(bestCandidate);
  }

  return seeds;
}

const computePlateGraph = createOp(ComputePlateGraphContract, {
  strategies: {
    default: {
      normalize: (config, ctx) => {
        const { width, height } = requireEnvDimensions(ctx, "foundation/compute-plate-graph.normalize");
        const area = Math.max(1, width * height);

        const referenceArea = Math.max(1, config.referenceArea | 0);
        const power = config.plateScalePower;

        const scale = Math.pow(area / referenceArea, power);
        const scaledPlateCount = Math.max(2, Math.round((config.plateCount | 0) * scale));

        return {
          ...config,
          plateCount: scaledPlateCount,
        };
      },
      run: (input, config) => {
        const mesh = requireMesh(input.mesh, "foundation/compute-plate-graph");
        const crust = requireCrust(input.crust, mesh.cellCount | 0, "foundation/compute-plate-graph");

        const rngSeed = input.rngSeed | 0;
        const rng = createLabelRng(rngSeed);

        const cellCount = mesh.cellCount | 0;

        const platesCount = config.plateCount;
        if (platesCount > cellCount) {
          throw new Error("[Foundation] PlateGraph plateCount exceeds mesh cellCount.");
        }

        const majorCount = Math.max(1, Math.floor(platesCount * 0.6));
        const seedCells = chooseSeedCells({
          mesh,
          crust,
          plateCount: platesCount,
          majorCount,
          rng,
        });

        const plates: FoundationPlate[] = seedCells.map((seedCell, id) => {
          const seedX = mesh.siteX[seedCell] ?? 0;
          const seedY = mesh.siteY[seedCell] ?? 0;

          const baseAngleDeg = rng(360, "PlateGraphAngle");
          const speed = 0.5 + rng(100, "PlateGraphSpeed") / 200;
          const rad = (baseAngleDeg * Math.PI) / 180;
          const velocityX = Math.cos(rad) * speed;
          const velocityY = Math.sin(rad) * speed;

          const rotation = (rng(60, "PlateGraphRotation") - 30) * 0.1;
          const kind: FoundationPlate["kind"] = id < majorCount ? "major" : "minor";

          return {
            id,
            kind,
            seedX,
            seedY,
            velocityX,
            velocityY,
            rotation,
          };
        });

        const plateWeights = new Float32Array(platesCount);
        for (let id = 0; id < platesCount; id++) {
          const kind = plates[id]?.kind ?? "minor";
          if (kind === "major") {
            plateWeights[id] = 1.7 + rng(100, "PlateGraphMajorWeight") / 80;
          } else {
            plateWeights[id] = 0.45 + rng(100, "PlateGraphMinorWeight") / 160;
          }
        }

        const cellResistance = new Float32Array(cellCount);
        for (let i = 0; i < cellCount; i++) {
          cellResistance[i] = computeCellResistance(crust.type[i] ?? 0, crust.age[i] ?? 0);
        }

        const cellToPlate = new Int16Array(cellCount);
        cellToPlate.fill(-1);

        const bestCost = new Float64Array(cellCount);
        bestCost.fill(Number.POSITIVE_INFINITY);

        const heap = new MinHeap();

        for (let plateId = 0; plateId < platesCount; plateId++) {
          const seed = seedCells[plateId]!;
          bestCost[seed] = 0;
          cellToPlate[seed] = plateId;
          heap.push({ cost: 0, plateId, cellId: seed });
        }

        const eps = 1e-9;

        while (heap.size > 0) {
          const item = heap.pop();
          if (!item) break;
          const { cost, plateId, cellId } = item;

          if (cost > bestCost[cellId]! + eps) continue;
          if ((cellToPlate[cellId] | 0) !== (plateId | 0)) continue;

          const start = mesh.neighborsOffsets[cellId] | 0;
          const end = mesh.neighborsOffsets[cellId + 1] | 0;
          for (let j = start; j < end; j++) {
            const n = mesh.neighbors[j] | 0;
            if (n < 0 || n >= cellCount) continue;

            const edgeResistance = (cellResistance[cellId]! + cellResistance[n]!) * 0.5;
            const weight = plateWeights[plateId]!;
            const delta = edgeResistance / weight;
            const nextCost = cost + delta;

            const prevCost = bestCost[n]!;
            const prevPlate = cellToPlate[n] | 0;

            if (
              nextCost + eps < prevCost ||
              (Math.abs(nextCost - prevCost) <= eps && (prevPlate < 0 || plateId < prevPlate))
            ) {
              bestCost[n] = nextCost;
              cellToPlate[n] = plateId;
              heap.push({ cost: nextCost, plateId, cellId: n });
            }
          }
        }

        for (let i = 0; i < cellCount; i++) {
          if ((cellToPlate[i] | 0) < 0) {
            throw new Error("[Foundation] PlateGraph produced unassigned cells.");
          }
        }

        return {
          plateGraph: { cellToPlate, plates },
        };
      },
    },
  },
});

export default computePlateGraph;
