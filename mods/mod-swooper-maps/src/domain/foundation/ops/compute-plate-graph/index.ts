import { createOp } from "@swooper/mapgen-core/authoring";
import { wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import { requireEnvDimensions } from "../../lib/normalize.js";
import { requireCrust, requireMesh } from "../../lib/require.js";
import ComputePlateGraphContract from "./contract.js";
import type { FoundationPlate } from "./contract.js";

function distanceSq(ax: number, ay: number, bx: number, by: number, wrapWidth: number): number {
  const dx = wrapDeltaPeriodic(ax - bx, wrapWidth);
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function chooseUniqueSeedCells(cellCount: number, seedCount: number, rng: (max: number, label?: string) => number): number[] {
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
        void crust;

        const rngSeed = input.rngSeed | 0;
        const rng = createLabelRng(rngSeed);

        const cellCount = mesh.cellCount | 0;
        const wrapWidth = mesh.wrapWidth;

        const platesCount = config.plateCount;
        if (platesCount > cellCount) {
          throw new Error("[Foundation] PlateGraph plateCount exceeds mesh cellCount.");
        }

        const seedCells = chooseUniqueSeedCells(cellCount, platesCount, rng);

        const plates: FoundationPlate[] = seedCells.map((seedCell, id) => {
          const seedX = mesh.siteX[seedCell] ?? 0;
          const seedY = mesh.siteY[seedCell] ?? 0;

          const baseAngleDeg = rng(360, "PlateGraphAngle");
          const speed = 0.5 + rng(100, "PlateGraphSpeed") / 200;
          const rad = (baseAngleDeg * Math.PI) / 180;
          const velocityX = Math.cos(rad) * speed;
          const velocityY = Math.sin(rad) * speed;

          const rotation = (rng(60, "PlateGraphRotation") - 30) * 0.1;
          const kind: FoundationPlate["kind"] = id < Math.max(1, Math.floor(platesCount * 0.6)) ? "major" : "minor";

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

        const cellToPlate = new Int16Array(cellCount);
        for (let i = 0; i < cellCount; i++) {
          const x = mesh.siteX[i] ?? 0;
          const y = mesh.siteY[i] ?? 0;

          let bestId = 0;
          let bestDist = Infinity;
          for (let p = 0; p < plates.length; p++) {
            const plate = plates[p]!;
            const dist = distanceSq(x, y, plate.seedX, plate.seedY, wrapWidth);
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
