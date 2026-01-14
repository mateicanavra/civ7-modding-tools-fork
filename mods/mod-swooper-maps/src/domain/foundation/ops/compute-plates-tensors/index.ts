import { createOp } from "@swooper/mapgen-core/authoring";

import { projectPlatesFromModel } from "../../lib/project-plates.js";
import type { FoundationMesh } from "../compute-mesh/contract.js";
import type { FoundationPlateGraph } from "../compute-plate-graph/contract.js";
import type { FoundationTectonics } from "../compute-tectonics/contract.js";
import ComputePlatesTensorsContract from "./contract.js";

function requireMesh(mesh: FoundationMesh | undefined): FoundationMesh {
  if (!mesh) {
    throw new Error("[Foundation] Mesh not provided for foundation/compute-plates-tensors.");
  }
  const cellCount = mesh.cellCount | 0;
  if (cellCount <= 0) throw new Error("[Foundation] Invalid mesh.cellCount for plate projection.");
  if (!(mesh.siteX instanceof Float32Array) || mesh.siteX.length !== cellCount) {
    throw new Error("[Foundation] Invalid mesh.siteX for plate projection.");
  }
  if (!(mesh.siteY instanceof Float32Array) || mesh.siteY.length !== cellCount) {
    throw new Error("[Foundation] Invalid mesh.siteY for plate projection.");
  }
  if (typeof mesh.wrapWidth !== "number" || !Number.isFinite(mesh.wrapWidth) || mesh.wrapWidth <= 0) {
    throw new Error("[Foundation] Invalid mesh.wrapWidth for plate projection.");
  }
  return mesh;
}

function requirePlateGraph(
  plateGraph: FoundationPlateGraph | undefined,
  expectedCellCount: number
): FoundationPlateGraph {
  if (!plateGraph) {
    throw new Error("[Foundation] PlateGraph not provided for foundation/compute-plates-tensors.");
  }
  if (!(plateGraph.cellToPlate instanceof Int16Array) || plateGraph.cellToPlate.length !== expectedCellCount) {
    throw new Error("[Foundation] Invalid plateGraph.cellToPlate for plate projection.");
  }
  if (!Array.isArray(plateGraph.plates) || plateGraph.plates.length <= 0) {
    throw new Error("[Foundation] Invalid plateGraph.plates for plate projection.");
  }
  return plateGraph;
}

function requireTectonics(
  tectonics: FoundationTectonics | undefined,
  expectedCellCount: number
): FoundationTectonics {
  if (!tectonics) {
    throw new Error("[Foundation] Tectonics not provided for foundation/compute-plates-tensors.");
  }
  if (!(tectonics.boundaryType instanceof Uint8Array) || tectonics.boundaryType.length !== expectedCellCount) {
    throw new Error("[Foundation] Invalid tectonics.boundaryType for plate projection.");
  }
  return tectonics;
}

const computePlatesTensors = createOp(ComputePlatesTensorsContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const width = input.width | 0;
        const height = input.height | 0;
        const mesh = requireMesh(input.mesh as unknown as FoundationMesh | undefined);
        const plateGraph = requirePlateGraph(input.plateGraph as unknown as FoundationPlateGraph | undefined, mesh.cellCount | 0);
        const tectonics = requireTectonics(input.tectonics as unknown as FoundationTectonics | undefined, mesh.cellCount | 0);

        const boundaryInfluenceDistance = config.boundaryInfluenceDistance;
        const boundaryDecay = config.boundaryDecay;
        const movementScale = config.movementScale;
        const rotationScale = config.rotationScale;

        const { plates } = projectPlatesFromModel({
          width,
          height,
          mesh,
          plateGraph,
          tectonics,
          boundaryInfluenceDistance,
          boundaryDecay,
          movementScale,
          rotationScale,
        });

        return {
          plates,
        } as const;
      },
    },
  },
});

export default computePlatesTensors;
