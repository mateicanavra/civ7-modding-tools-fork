import { createOp } from "@swooper/mapgen-core/authoring";
import { clamp01, wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import { requireMesh } from "../../lib/require.js";
import ComputeCrustContract from "./contract.js";

function distanceSq(ax: number, ay: number, bx: number, by: number, wrapWidth: number): number {
  const dx = wrapDeltaPeriodic(ax - bx, wrapWidth);
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function ageNorm(age: number): number {
  return clamp01((age | 0) / 255);
}

function chooseUniqueSeedCells(cellCount: number, seedCount: number, rng: (max: number, label?: string) => number): number[] {
  const indices = Array.from({ length: cellCount }, (_, i) => i);
  for (let i = 0; i < seedCount; i++) {
    const j = i + (rng(cellCount - i, "CrustSeedShuffle") | 0);
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices.slice(0, seedCount);
}

function neighborsFor(mesh: { neighborsOffsets: Int32Array; neighbors: Int32Array }, cellId: number): Int32Array {
  const start = mesh.neighborsOffsets[cellId] | 0;
  const end = mesh.neighborsOffsets[cellId + 1] | 0;
  return mesh.neighbors.slice(start, end);
}

const computeCrust = createOp(ComputeCrustContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const mesh = requireMesh(input.mesh, "foundation/compute-crust");
        const rngSeed = input.rngSeed | 0;
        const rng = createLabelRng(rngSeed);

        const cellCount = mesh.cellCount | 0;

        const continentalRatio = clamp01(config.continentalRatio);
        const shelfWidthCells = Math.max(1, config.shelfWidthCells | 0);
        const shelfElevationBoost = clamp01(config.shelfElevationBoost);
        const marginElevationPenalty = clamp01(config.marginElevationPenalty);
        const continentalBaseElevation = clamp01(config.continentalBaseElevation);
        const continentalAgeBoost = clamp01(config.continentalAgeBoost);
        const oceanicBaseElevation = clamp01(config.oceanicBaseElevation);
        const oceanicAgeDepth = clamp01(config.oceanicAgeDepth);

        const type = new Uint8Array(cellCount);
        const age = new Uint8Array(cellCount);
        const buoyancy = new Float32Array(cellCount);
        const baseElevation = new Float32Array(cellCount);
        const strength = new Float32Array(cellCount);

        const platesCount = Math.min(cellCount, Math.max(2, Math.round(cellCount / 2)));
        const seedCells = chooseUniqueSeedCells(cellCount, platesCount, rng);

        const wrapWidth = mesh.wrapWidth;
        const cellToPlate = new Int16Array(cellCount);
        for (let i = 0; i < cellCount; i++) {
          const x = mesh.siteX[i] ?? 0;
          const y = mesh.siteY[i] ?? 0;

          let bestId = 0;
          let bestDist = Infinity;
          for (let p = 0; p < seedCells.length; p++) {
            const seedCell = seedCells[p]!;
            const seedX = mesh.siteX[seedCell] ?? 0;
            const seedY = mesh.siteY[seedCell] ?? 0;

            const dist = distanceSq(x, y, seedX, seedY, wrapWidth);
            if (dist < bestDist) {
              bestDist = dist;
              bestId = p;
            }
          }

          cellToPlate[i] = bestId;
        }

        const plateCellCounts = new Int32Array(platesCount);
        for (let i = 0; i < cellCount; i++) {
          const plateId = cellToPlate[i] | 0;
          plateCellCounts[plateId] = (plateCellCounts[plateId] | 0) + 1;
        }

        const plateAdjSets: Array<Set<number>> = Array.from({ length: platesCount }, () => new Set<number>());
        for (let i = 0; i < cellCount; i++) {
          const plateA = cellToPlate[i] | 0;
          const neighbors = neighborsFor(mesh, i);
          for (let j = 0; j < neighbors.length; j++) {
            const n = neighbors[j] | 0;
            const plateB = cellToPlate[n] | 0;
            if (plateA !== plateB) {
              plateAdjSets[plateA]!.add(plateB);
              plateAdjSets[plateB]!.add(plateA);
            }
          }
        }
        const plateAdj = plateAdjSets.map((set) => Array.from(set).sort((a, b) => a - b));

        const ratio = Math.max(0, Math.min(1, continentalRatio));
        const targetContinentalCells = Math.round(ratio * cellCount);

        const isContinentalPlate = new Uint8Array(platesCount);
        let continentalCells = 0;

        if (targetContinentalCells >= cellCount) {
          isContinentalPlate.fill(1);
          continentalCells = cellCount;
        } else if (targetContinentalCells > 0) {
          const seedPlateCount = Math.max(1, Math.round(Math.sqrt(platesCount) * ratio));
          const shuffledPlateIds = Array.from({ length: platesCount }, (_, i) => i);
          for (let i = 0; i < seedPlateCount; i++) {
            const j = i + (rng(platesCount - i, "CrustContinentSeedShuffle") | 0);
            const tmp = shuffledPlateIds[i]!;
            shuffledPlateIds[i] = shuffledPlateIds[j]!;
            shuffledPlateIds[j] = tmp;
          }
          const seedPlates = shuffledPlateIds.slice(0, seedPlateCount);

          const frontier: number[] = [];
          for (let i = 0; i < seedPlates.length; i++) {
            const plateId = seedPlates[i] | 0;
            if (isContinentalPlate[plateId] === 1) continue;
            isContinentalPlate[plateId] = 1;
            continentalCells += plateCellCounts[plateId] | 0;

            const adj = plateAdj[plateId] ?? [];
            for (let a = 0; a < adj.length; a++) frontier.push(adj[a] | 0);
          }

          while (continentalCells < targetContinentalCells && frontier.length > 0) {
            const pickIndex = rng(frontier.length, "CrustContinentFrontierPick") | 0;
            const picked = frontier[pickIndex] | 0;
            frontier[pickIndex] = frontier[frontier.length - 1]!;
            frontier.pop();

            if (isContinentalPlate[picked] === 1) continue;
            isContinentalPlate[picked] = 1;
            continentalCells += plateCellCounts[picked] | 0;

            const adj = plateAdj[picked] ?? [];
            for (let a = 0; a < adj.length; a++) {
              const neighborPlate = adj[a] | 0;
              if (isContinentalPlate[neighborPlate] === 0) frontier.push(neighborPlate);
            }
          }
        }

        const plateAgeBias = new Int16Array(platesCount);
        for (let p = 0; p < platesCount; p++) {
          plateAgeBias[p] = ((rng(41, "CrustPlateAgeBias") | 0) - 20) | 0;
        }

        const distToBoundary = new Int32Array(cellCount);
        distToBoundary.fill(-1);

        const queue: number[] = [];
        for (let i = 0; i < cellCount; i++) {
          const plateId = cellToPlate[i] | 0;
          const neighbors = neighborsFor(mesh, i);
          let isBoundary = false;
          for (let j = 0; j < neighbors.length; j++) {
            const n = neighbors[j] | 0;
            if ((cellToPlate[n] | 0) !== plateId) {
              isBoundary = true;
              break;
            }
          }
          if (isBoundary) {
            distToBoundary[i] = 0;
            queue.push(i);
          }
        }

        for (let q = 0; q < queue.length; q++) {
          const cellId = queue[q] | 0;
          const plateId = cellToPlate[cellId] | 0;
          const baseDist = distToBoundary[cellId] | 0;

          const neighbors = neighborsFor(mesh, cellId);
          for (let j = 0; j < neighbors.length; j++) {
            const n = neighbors[j] | 0;
            if ((cellToPlate[n] | 0) !== plateId) continue;
            if (distToBoundary[n] !== -1) continue;
            distToBoundary[n] = baseDist + 1;
            queue.push(n);
          }
        }

        const plateMaxDist = new Int32Array(platesCount);
        for (let i = 0; i < cellCount; i++) {
          const plateId = cellToPlate[i] | 0;
          const d = distToBoundary[i] | 0;
          if (d > (plateMaxDist[plateId] | 0)) plateMaxDist[plateId] = d;
        }

        for (let i = 0; i < cellCount; i++) {
          const plateId = cellToPlate[i] | 0;
          const maxDist = plateMaxDist[plateId] | 0;
          const d = distToBoundary[i] | 0;
          const dist01 = maxDist <= 0 ? 0 : d / maxDist;

          const isContinental = isContinentalPlate[plateId] === 1;
          type[i] = isContinental ? 1 : 0;

          const bias = plateAgeBias[plateId] | 0;
          const baseAge = isContinental ? 180 + 75 * dist01 : 255 * dist01;
          const biased = Math.round(baseAge + bias);
          age[i] = Math.max(0, Math.min(255, biased)) & 0xff;
        }

        const distToCoast = new Int16Array(cellCount);
        distToCoast.fill(-1);
        const coastQueue: number[] = [];
        for (let i = 0; i < cellCount; i++) {
          const myType = type[i] ?? 0;
          const neighbors = neighborsFor(mesh, i);
          let isCoast = false;
          for (let j = 0; j < neighbors.length; j++) {
            const n = neighbors[j] | 0;
            if ((type[n] ?? 0) !== myType) {
              isCoast = true;
              break;
            }
          }
          if (isCoast) {
            distToCoast[i] = 0;
            coastQueue.push(i);
          }
        }
        for (let q = 0; q < coastQueue.length; q++) {
          const cellId = coastQueue[q] | 0;
          const myType = type[cellId] ?? 0;
          const baseDist = distToCoast[cellId] | 0;
          const neighbors = neighborsFor(mesh, cellId);
          for (let j = 0; j < neighbors.length; j++) {
            const n = neighbors[j] | 0;
            if ((type[n] ?? 0) !== myType) continue;
            if (distToCoast[n] !== -1) continue;
            distToCoast[n] = (baseDist + 1) as number;
            coastQueue.push(n);
          }
        }

        for (let i = 0; i < cellCount; i++) {
          const isContinental = (type[i] ?? 0) === 1;
          const a01 = ageNorm(age[i] ?? 0);
          const coastDist = distToCoast[i] < 0 ? shelfWidthCells * 8 : (distToCoast[i] | 0);
          const shelf01 = clamp01(1 - coastDist / shelfWidthCells);

          let base = isContinental
            ? continentalBaseElevation + continentalAgeBoost * a01
            : oceanicBaseElevation - oceanicAgeDepth * a01;
          if (isContinental) {
            base -= marginElevationPenalty * shelf01;
          } else {
            base += shelfElevationBoost * shelf01;
          }
          base = clamp01(base);

          baseElevation[i] = base;
          buoyancy[i] = base;

          const interior01 = clamp01(coastDist / (shelfWidthCells * 2));
          let s = isContinental ? 0.55 + 0.35 * a01 + 0.2 * interior01 : 0.15 + 0.15 * (1 - a01);
          strength[i] = clamp01(s);
        }

        return {
          crust: { type, age, buoyancy, baseElevation, strength },
        } as const;
      },
    },
  },
});

export default computeCrust;
