import { createOp } from "@swooper/mapgen-core/authoring";
import { devLogIf } from "@swooper/mapgen-core";
import type { TraceScope } from "@swooper/mapgen-core";

import type { DirectionalityConfig, RngFunction } from "../../types.js";
import type { FoundationMesh } from "../compute-mesh/contract.js";
import type { FoundationCrust } from "../compute-crust/contract.js";
import ComputePlateGraphContract from "./contract.js";
import type { ComputePlateGraphConfig, FoundationPlate } from "./contract.js";

function requireRng(rng: RngFunction | undefined): RngFunction {
  if (!rng) {
    throw new Error("[Foundation] RNG not provided for foundation/compute-plate-graph.");
  }
  return rng;
}

function requireMesh(mesh: FoundationMesh | undefined): FoundationMesh {
  if (!mesh) {
    throw new Error("[Foundation] Mesh not provided for foundation/compute-plate-graph.");
  }
  const cellCount = mesh.cellCount | 0;
  if (cellCount <= 0) throw new Error("[Foundation] Invalid mesh.cellCount for plateGraph.");
  if (!(mesh.siteX instanceof Float32Array) || mesh.siteX.length !== cellCount) {
    throw new Error("[Foundation] Invalid mesh.siteX for plateGraph.");
  }
  if (!(mesh.siteY instanceof Float32Array) || mesh.siteY.length !== cellCount) {
    throw new Error("[Foundation] Invalid mesh.siteY for plateGraph.");
  }
  return mesh;
}

function requireCrust(crust: FoundationCrust | undefined, expectedCellCount: number): FoundationCrust {
  if (!crust) throw new Error("[Foundation] Crust not provided for foundation/compute-plate-graph.");
  if (!(crust.type instanceof Uint8Array) || crust.type.length !== expectedCellCount) {
    throw new Error("[Foundation] Invalid crust.type for plateGraph.");
  }
  if (!(crust.age instanceof Uint8Array) || crust.age.length !== expectedCellCount) {
    throw new Error("[Foundation] Invalid crust.age for plateGraph.");
  }
  return crust;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  const n = Math.trunc(value as number);
  return Math.max(min, Math.min(max, n));
}

function wrappedDistanceSq(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  width: number,
  wrapX: boolean
): number {
  const rawDx = ax - bx;
  const dx = wrapX ? Math.sign(rawDx) * Math.min(Math.abs(rawDx), width - Math.abs(rawDx)) : rawDx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function applyDirectionalityBias(
  directionality: DirectionalityConfig | null | undefined,
  rng: RngFunction,
  angleDeg: number,
  magnitude: number
): { angleDeg: number; magnitude: number } {
  if (!directionality) return { angleDeg, magnitude };

  const cohesion = Math.max(0, Math.min(1, directionality.cohesion ?? 0));
  if (cohesion <= 0) return { angleDeg, magnitude };

  const plateAxisDeg = (directionality.primaryAxes?.plateAxisDeg ?? 0) | 0;
  const angleJitterDeg = (directionality.variability?.angleJitterDeg ?? 0) | 0;
  const magnitudeVariance = directionality.variability?.magnitudeVariance ?? 0.35;

  const jitter = rng(angleJitterDeg * 2 + 1, "PlateGraphDirJit") - angleJitterDeg;
  const blended = angleDeg * (1 - cohesion) + plateAxisDeg * cohesion + jitter * magnitudeVariance;

  return { angleDeg: blended, magnitude };
}

function chooseUniqueSeedCells(cellCount: number, seedCount: number, rng: RngFunction): number[] {
  const indices = Array.from({ length: cellCount }, (_, i) => i);
  for (let i = 0; i < seedCount; i++) {
    const j = i + (rng(cellCount - i, "PlateGraphSeedShuffle") | 0);
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices.slice(0, seedCount);
}

const computePlateGraph = createOp(ComputePlateGraphContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const mesh = requireMesh(input.mesh as unknown as FoundationMesh | undefined);
        const crust = requireCrust(input.crust as unknown as FoundationCrust | undefined, mesh.cellCount | 0);
        void crust;

        const directionality = (input.directionality ?? null) as DirectionalityConfig | null;
        const rng = requireRng(input.rng as unknown as RngFunction | undefined);
        const trace = (input.trace ?? null) as TraceScope | null;

        const width = Math.max(1e-6, (mesh.bbox?.xr ?? 0) - (mesh.bbox?.xl ?? 0));
        const wrapX = !!mesh.wrapX;
        const cellCount = mesh.cellCount | 0;

        const platesCount = clampInt(
          (config as unknown as ComputePlateGraphConfig)?.plates?.count,
          8,
          2,
          Math.max(2, cellCount)
        );

        devLogIf(
          trace,
          "LOG_FOUNDATION_PLATE_GRAPH",
          `[Foundation] PlateGraph cellCount=${cellCount}, platesCount=${platesCount}, wrapX=${wrapX}`
        );

        const seedCells = chooseUniqueSeedCells(cellCount, platesCount, rng);

        const plates: FoundationPlate[] = seedCells.map((seedCell, id) => {
          const seedX = mesh.siteX[seedCell] ?? 0;
          const seedY = mesh.siteY[seedCell] ?? 0;

          const baseAngleDeg = rng(360, "PlateGraphAngle");
          const speed = 0.5 + rng(100, "PlateGraphSpeed") / 200;
          const biased = applyDirectionalityBias(directionality, rng, baseAngleDeg, speed);

          const rad = (biased.angleDeg * Math.PI) / 180;
          const velocityX = Math.cos(rad) * biased.magnitude;
          const velocityY = Math.sin(rad) * biased.magnitude;

          const rotation = (rng(60, "PlateGraphRotation") - 30) * 0.1;
          const kind: FoundationPlate["kind"] = id < Math.max(1, Math.floor(platesCount * 0.6)) ? "major" : "minor";

          return Object.freeze({
            id,
            kind,
            seedX,
            seedY,
            velocityX,
            velocityY,
            rotation,
          });
        });

        const cellToPlate = new Int16Array(cellCount);
        for (let i = 0; i < cellCount; i++) {
          const x = mesh.siteX[i] ?? 0;
          const y = mesh.siteY[i] ?? 0;

          let bestId = 0;
          let bestDist = Infinity;
          for (let p = 0; p < plates.length; p++) {
            const plate = plates[p]!;
            const dist = wrappedDistanceSq(x, y, plate.seedX, plate.seedY, width, wrapX);
            if (dist < bestDist) {
              bestDist = dist;
              bestId = p;
            }
          }

          cellToPlate[i] = bestId;
        }

        return {
          plateGraph: { cellToPlate, plates },
        };
      },
    },
  },
});

export default computePlateGraph;
