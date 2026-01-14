import { createOp } from "@swooper/mapgen-core/authoring";
import { wrapDeltaPeriodic } from "@swooper/mapgen-core/lib/math";

import { BOUNDARY_TYPE } from "../../constants.js";
import type { BoundaryType } from "../../constants.js";
import type { FoundationMesh } from "../compute-mesh/contract.js";
import type { FoundationCrust } from "../compute-crust/contract.js";
import type { FoundationPlateGraph } from "../compute-plate-graph/contract.js";
import ComputeTectonicsContract from "./contract.js";

function requireMesh(mesh: FoundationMesh | undefined): FoundationMesh {
  if (!mesh) {
    throw new Error("[Foundation] Mesh not provided for foundation/compute-tectonics.");
  }
  const cellCount = mesh.cellCount | 0;
  if (cellCount <= 0) throw new Error("[Foundation] Invalid mesh.cellCount for tectonics.");
  if (!(mesh.siteX instanceof Float32Array) || mesh.siteX.length !== cellCount) {
    throw new Error("[Foundation] Invalid mesh.siteX for tectonics.");
  }
  if (!(mesh.siteY instanceof Float32Array) || mesh.siteY.length !== cellCount) {
    throw new Error("[Foundation] Invalid mesh.siteY for tectonics.");
  }
  if (!(mesh.neighborsOffsets instanceof Int32Array) || mesh.neighborsOffsets.length !== cellCount + 1) {
    throw new Error("[Foundation] Invalid mesh.neighborsOffsets for tectonics.");
  }
  if (!(mesh.neighbors instanceof Int32Array)) {
    throw new Error("[Foundation] Invalid mesh.neighbors for tectonics.");
  }
  if (typeof mesh.wrapWidth !== "number" || !Number.isFinite(mesh.wrapWidth) || mesh.wrapWidth <= 0) {
    throw new Error("[Foundation] Invalid mesh.wrapWidth for tectonics.");
  }
  return mesh;
}

function requireCrust(crust: FoundationCrust | undefined, expectedCellCount: number): FoundationCrust {
  if (!crust) throw new Error("[Foundation] Crust not provided for foundation/compute-tectonics.");
  if (!(crust.type instanceof Uint8Array) || crust.type.length !== expectedCellCount) {
    throw new Error("[Foundation] Invalid crust.type for tectonics.");
  }
  if (!(crust.age instanceof Uint8Array) || crust.age.length !== expectedCellCount) {
    throw new Error("[Foundation] Invalid crust.age for tectonics.");
  }
  return crust;
}

function requirePlateGraph(graph: FoundationPlateGraph | undefined, expectedCellCount: number): FoundationPlateGraph {
  if (!graph) throw new Error("[Foundation] PlateGraph not provided for foundation/compute-tectonics.");
  if (!(graph.cellToPlate instanceof Int16Array) || graph.cellToPlate.length !== expectedCellCount) {
    throw new Error("[Foundation] Invalid plateGraph.cellToPlate for tectonics.");
  }
  if (!Array.isArray(graph.plates) || graph.plates.length <= 0) {
    throw new Error("[Foundation] Invalid plateGraph.plates for tectonics.");
  }
  return graph;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value | 0)) | 0;
}

const computeTectonics = createOp(ComputeTectonicsContract, {
  strategies: {
    default: {
      run: (input) => {
        const mesh = requireMesh(input.mesh as unknown as FoundationMesh | undefined);
        const crust = requireCrust(input.crust as unknown as FoundationCrust | undefined, mesh.cellCount | 0);
        const plateGraph = requirePlateGraph(
          input.plateGraph as unknown as FoundationPlateGraph | undefined,
          mesh.cellCount | 0
        );

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
