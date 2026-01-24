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

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function pickExtremeYCell(params: {
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

function pickSeedCell(params: {
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

function lockContiguousRegion(params: {
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

function filterByMinComponentSize(params: {
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
        const polarPolicy = config.polarCaps;
        const capFraction = clamp01(polarPolicy?.capFraction ?? 0.1);
        const microBandFraction = clamp01(polarPolicy?.microplateBandFraction ?? 0.2);
        const requestedMicroPerPole = Math.max(0, polarPolicy?.microplatesPerPole ?? 0);
        const microplatesMinPlateCount = Math.max(0, polarPolicy?.microplatesMinPlateCount ?? 14);
        const microplateMinAreaCells = Math.max(1, polarPolicy?.microplateMinAreaCells ?? 8);
        const tangentialSpeed = Math.max(0, polarPolicy?.tangentialSpeed ?? 0.9);
        const tangentialJitterDeg = Math.max(0, polarPolicy?.tangentialJitterDeg ?? 12);

        let minSiteY = Number.POSITIVE_INFINITY;
        let maxSiteY = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < cellCount; i++) {
          const y = mesh.siteY[i];
          if (!Number.isFinite(y)) continue;
          if (y < minSiteY) minSiteY = y;
          if (y > maxSiteY) maxSiteY = y;
        }
        if (!Number.isFinite(minSiteY) || !Number.isFinite(maxSiteY)) {
          throw new Error("[Foundation] PlateGraph mesh.siteY must be finite.");
        }

        const spanY = Math.max(1e-6, maxSiteY - minSiteY);
        const northCapMaxY = minSiteY + spanY * capFraction;
        const southCapMinY = maxSiteY - spanY * capFraction;

        const lockedPlateId = new Int16Array(cellCount);
        lockedPlateId.fill(-1);

        const northCapEligible = new Uint8Array(cellCount);
        const southCapEligible = new Uint8Array(cellCount);
        const northMicroEligible = new Uint8Array(cellCount);
        const southMicroEligible = new Uint8Array(cellCount);
        const tectonicEligible = new Uint8Array(cellCount);
        const allCellsEligible = new Uint8Array(cellCount);
        allCellsEligible.fill(1);

        for (let i = 0; i < cellCount; i++) {
          const y = mesh.siteY[i] ?? 0;
          const inNorthCap = y <= northCapMaxY;
          const inSouthCap = y >= southCapMinY;
          if (inNorthCap) {
            lockedPlateId[i] = 0;
            northCapEligible[i] = 1;
            continue;
          }
          if (inSouthCap) {
            lockedPlateId[i] = 1;
            southCapEligible[i] = 1;
            continue;
          }

          tectonicEligible[i] = 1;

          const inNorthMicroBand = y <= minSiteY + spanY * microBandFraction;
          const inSouthMicroBand = y >= maxSiteY - spanY * microBandFraction;
          if (inNorthMicroBand) northMicroEligible[i] = 1;
          if (inSouthMicroBand) southMicroEligible[i] = 1;
        }

        const capNorthSeed = pickExtremeYCell({ mesh, eligible: northCapEligible, mode: "min" });
        const capSouthSeed = pickExtremeYCell({ mesh, eligible: southCapEligible, mode: "max" });
        if (capNorthSeed < 0 || capSouthSeed < 0) {
          throw new Error("[Foundation] PlateGraph failed to locate polar cap seed cells.");
        }

        let microPerPole = 0;
        let northMicroEligibleSized: Uint8Array | null = null;
        let southMicroEligibleSized: Uint8Array | null = null;
        if (platesCount >= microplatesMinPlateCount && requestedMicroPerPole > 0) {
          const maxPerPoleByBudget = Math.max(0, Math.floor((platesCount - 4) / 2));
          const requested = Math.min(requestedMicroPerPole, maxPerPoleByBudget);

          northMicroEligibleSized = filterByMinComponentSize({ mesh, allowed: northMicroEligible, minSize: microplateMinAreaCells });
          southMicroEligibleSized = filterByMinComponentSize({ mesh, allowed: southMicroEligible, minSize: microplateMinAreaCells });

          let northCount = 0;
          let southCount = 0;
          for (let i = 0; i < cellCount; i++) {
            if (northMicroEligibleSized[i]) northCount++;
            if (southMicroEligibleSized[i]) southCount++;
          }

          // Area guard: per-hemisphere, each microplate must have at least microplateMinAreaCells.
          const maxByArea = Math.floor(Math.min(northCount, southCount) / microplateMinAreaCells);
          microPerPole = Math.min(requested, Math.max(0, maxByArea));
        }

        const roleById: FoundationPlate["role"][] = Array.from({ length: platesCount }, () => "tectonic");
        roleById[0] = "polarCap";
        roleById[1] = "polarCap";
        for (let i = 0; i < microPerPole; i++) {
          roleById[2 + i] = "polarMicroplate";
          roleById[2 + microPerPole + i] = "polarMicroplate";
        }

        const allowedById: Uint8Array[] = Array.from({ length: platesCount }, () => tectonicEligible);
        allowedById[0] = northCapEligible;
        allowedById[1] = southCapEligible;
        for (let i = 0; i < microPerPole; i++) {
          allowedById[2 + i] = northMicroEligibleSized ?? northMicroEligible;
          allowedById[2 + microPerPole + i] = southMicroEligibleSized ?? southMicroEligible;
        }
        if (platesCount <= 2) {
          // When scaled plateCount collapses to two plates (small maps), the caps must still cover the whole mesh.
          allowedById[0] = allCellsEligible;
          allowedById[1] = allCellsEligible;
        }

        const tectonicSeedEligible = new Uint8Array(cellCount);
        if (microPerPole <= 0) {
          tectonicSeedEligible.set(tectonicEligible);
        } else {
          for (let i = 0; i < cellCount; i++) {
            if (!tectonicEligible[i]) continue;
            if (northMicroEligible[i] || southMicroEligible[i]) continue;
            tectonicSeedEligible[i] = 1;
          }
        }

        const kindById: FoundationPlate["kind"][] = Array.from({ length: platesCount }, (_, id) =>
          id < majorCount ? "major" : "minor"
        );
        kindById[0] = "major";
        kindById[1] = "major";
        for (let id = 0; id < platesCount; id++) {
          if (roleById[id] === "polarMicroplate") kindById[id] = "minor";
        }

        const characteristic = Math.max(1e-6, Math.min(mesh.wrapWidth, spanY));
        const minSep = (characteristic / Math.sqrt(Math.max(1, platesCount))) * 0.55;
        const minSepSq = minSep * minSep;

        const seedCells = new Int32Array(platesCount);
        seedCells.fill(-1);
        seedCells[0] = capNorthSeed;
        seedCells[1] = capSouthSeed;

        const usedSeedCell = new Uint8Array(cellCount);
        usedSeedCell[capNorthSeed] = 1;
        usedSeedCell[capSouthSeed] = 1;
        const chosenSeeds = [capNorthSeed, capSouthSeed];

        for (let id = 2; id < platesCount; id++) {
          const role = roleById[id]!;
          const allowed = role === "tectonic" ? tectonicSeedEligible : allowedById[id]!;
          seedCells[id] = pickSeedCell({
            mesh,
            crust,
            rng,
            used: usedSeedCell,
            existingSeeds: chosenSeeds,
            kind: kindById[id]!,
            allowed,
            minSepSq,
          });
        }

        for (let id = 2; id < platesCount; id++) {
          if (roleById[id] !== "polarMicroplate") continue;
          const seedCell = seedCells[id] | 0;
          if (seedCell >= 0 && seedCell < cellCount && (lockedPlateId[seedCell] | 0) < 0) {
            lockedPlateId[seedCell] = id;
          }
        }

        for (let id = 2; id < platesCount; id++) {
          if (roleById[id] !== "polarMicroplate") continue;
          const seedCell = seedCells[id] | 0;
          lockContiguousRegion({
            mesh,
            lockedPlateId,
            allowed: allowedById[id]!,
            plateId: id,
            seedCell,
            targetCells: microplateMinAreaCells,
          });
        }

        const plates: FoundationPlate[] = Array.from({ length: platesCount }, (_, id) => {
          const seedCell = seedCells[id] ?? 0;
          const seedX = mesh.siteX[seedCell] ?? 0;
          const seedY = mesh.siteY[seedCell] ?? 0;

          const role = roleById[id]!;
          const kind = kindById[id]!;

          let velocityX = 0;
          let velocityY = 0;
          let rotation = 0;

          if (role === "polarCap") {
            const sign = id === 0 ? 1 : -1;
            const speed = tangentialSpeed * (0.85 + rng(100, "PlateGraphPolarSpeed") / 400);
            velocityX = sign * speed;
            velocityY = 0;
            rotation = (rng(60, "PlateGraphPolarRotation") - 30) * 0.02;
          } else if (role === "polarMicroplate") {
            const hemisphereSign = id < 2 + microPerPole ? 1 : -1;
            const base = hemisphereSign > 0 ? 0 : 180;
            const jitter = (rng(Math.max(1, Math.floor(tangentialJitterDeg * 2)), "PlateGraphPolarJitter") - tangentialJitterDeg) as number;
            const angleDeg = base + jitter;
            const rad = (angleDeg * Math.PI) / 180;
            const speed = tangentialSpeed * (0.55 + rng(100, "PlateGraphPolarMicroSpeed") / 500);
            velocityX = Math.cos(rad) * speed;
            velocityY = Math.sin(rad) * speed;
            rotation = (rng(60, "PlateGraphPolarMicroRotation") - 30) * 0.03;
          } else {
            const baseAngleDeg = rng(360, "PlateGraphAngle");
            const speed = 0.5 + rng(100, "PlateGraphSpeed") / 200;
            const rad = (baseAngleDeg * Math.PI) / 180;
            velocityX = Math.cos(rad) * speed;
            velocityY = Math.sin(rad) * speed;
            rotation = (rng(60, "PlateGraphRotation") - 30) * 0.1;
          }

          return {
            id,
            role,
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

        for (let i = 0; i < cellCount; i++) {
          const locked = lockedPlateId[i] | 0;
          if (locked < 0) continue;
          bestCost[i] = 0;
          cellToPlate[i] = locked;
          heap.push({ cost: 0, plateId: locked, cellId: i });
        }

        for (let plateId = 0; plateId < platesCount; plateId++) {
          const seed = seedCells[plateId] | 0;
          if (seed < 0 || seed >= cellCount) continue;
          if ((cellToPlate[seed] | 0) >= 0) continue;
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
            if (!allowedById[plateId]![n]) continue;
            const locked = lockedPlateId[n] | 0;
            if (locked >= 0 && locked !== (plateId | 0)) continue;

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
