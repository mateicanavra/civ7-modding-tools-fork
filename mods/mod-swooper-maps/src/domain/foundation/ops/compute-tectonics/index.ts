import { createOp } from "@swooper/mapgen-core/authoring";
import { wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";

import { BOUNDARY_TYPE } from "../../constants.js";
import type { BoundaryType } from "../../constants.js";
import { requireCrust, requireMesh, requirePlateGraph } from "../../lib/require.js";
import ComputeTectonicsContract from "./contract.js";

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value | 0)) | 0;
}

const computeTectonics = createOp(ComputeTectonicsContract, {
  strategies: {
    default: {
      run: (input) => {
        const mesh = requireMesh(input.mesh, "foundation/compute-tectonics");
        const crust = requireCrust(input.crust, mesh.cellCount | 0, "foundation/compute-tectonics");
        const plateGraph = requirePlateGraph(input.plateGraph, mesh.cellCount | 0, "foundation/compute-tectonics");

        const cellCount = mesh.cellCount | 0;
        const wrapWidth = mesh.wrapWidth;

        const boundaryType = new Uint8Array(cellCount);
        const upliftPotential = new Uint8Array(cellCount);
        const riftPotential = new Uint8Array(cellCount);
        const shearStress = new Uint8Array(cellCount);
        const volcanism = new Uint8Array(cellCount);
        const fracture = new Uint8Array(cellCount);
        const cumulativeUplift = new Uint8Array(cellCount);

        for (let i = 0; i < cellCount; i++) {
          const plateAId = plateGraph.cellToPlate[i] | 0;
          const plateA = plateGraph.plates[plateAId];
          if (!plateA) continue;

          const ax = mesh.siteX[i] ?? 0;
          const ay = mesh.siteY[i] ?? 0;

          let chosenType: BoundaryType = BOUNDARY_TYPE.none;
          let bestIntensity = 0;

          const start = mesh.neighborsOffsets[i] | 0;
          const end = mesh.neighborsOffsets[i + 1] | 0;
          for (let cursor = start; cursor < end; cursor++) {
            const j = mesh.neighbors[cursor] | 0;
            if (j < 0 || j >= cellCount) continue;

            const plateBId = plateGraph.cellToPlate[j] | 0;
            if (plateBId === plateAId) continue;

            const plateB = plateGraph.plates[plateBId];
            if (!plateB) continue;

            const bx = mesh.siteX[j] ?? 0;
            const by = mesh.siteY[j] ?? 0;

            const dx = wrapDeltaPeriodic(bx - ax, wrapWidth);
            const dy = by - ay;

            const rvx = (plateB.velocityX ?? 0) - (plateA.velocityX ?? 0);
            const rvy = (plateB.velocityY ?? 0) - (plateA.velocityY ?? 0);

            const relSpeed = Math.sqrt(rvx * rvx + rvy * rvy);
            const intensity = clampByte(Math.round(relSpeed * 180));

            const dot = dx * rvx + dy * rvy;
            const threshold = 0.05;
            const type: BoundaryType =
              dot > threshold
                ? BOUNDARY_TYPE.divergent
                : dot < -threshold
                  ? BOUNDARY_TYPE.convergent
                  : BOUNDARY_TYPE.transform;

            if (intensity > bestIntensity) {
              bestIntensity = intensity;
              chosenType = type;
            }
          }

          boundaryType[i] = chosenType;

          if (chosenType === BOUNDARY_TYPE.convergent) {
            upliftPotential[i] = bestIntensity;
            cumulativeUplift[i] = bestIntensity;
            volcanism[i] = clampByte(Math.round(bestIntensity * 0.5) + (crust.type[i] === 0 ? 40 : 0));
          } else if (chosenType === BOUNDARY_TYPE.divergent) {
            riftPotential[i] = bestIntensity;
            fracture[i] = clampByte(Math.round(bestIntensity * 0.25));
          } else if (chosenType === BOUNDARY_TYPE.transform) {
            shearStress[i] = bestIntensity;
            fracture[i] = clampByte(Math.round(bestIntensity * 0.5));
          }
        }

        return {
          tectonics: {
            boundaryType,
            upliftPotential,
            riftPotential,
            shearStress,
            volcanism,
            fracture,
            cumulativeUplift,
          },
        } as const;
      },
    },
  },
});

export default computeTectonics;
