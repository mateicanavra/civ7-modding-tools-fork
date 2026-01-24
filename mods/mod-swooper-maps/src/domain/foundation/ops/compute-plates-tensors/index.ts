import { createOp } from "@swooper/mapgen-core/authoring";

import { projectPlatesFromModel } from "./lib/project-plates.js";
import { requireCrust, requireMesh, requirePlateGraph, requireTectonics } from "../../lib/require.js";
import ComputePlatesTensorsContract from "./contract.js";

const computePlatesTensors = createOp(ComputePlatesTensorsContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const width = input.width | 0;
        const height = input.height | 0;
        const mesh = requireMesh(input.mesh, "foundation/compute-plates-tensors");
        const crust = requireCrust(input.crust, mesh.cellCount | 0, "foundation/compute-plates-tensors");
        const plateGraph = requirePlateGraph(input.plateGraph, mesh.cellCount | 0, "foundation/compute-plates-tensors");
        const tectonics = requireTectonics(input.tectonics, mesh.cellCount | 0, "foundation/compute-plates-tensors");

        const boundaryInfluenceDistance = config.boundaryInfluenceDistance;
        const boundaryDecay = config.boundaryDecay;
        const movementScale = config.movementScale;
        const rotationScale = config.rotationScale;

        const { plates, tileToCellIndex, crustTiles } = projectPlatesFromModel({
          width,
          height,
          mesh,
          crust,
          plateGraph,
          tectonics,
          boundaryInfluenceDistance,
          boundaryDecay,
          movementScale,
          rotationScale,
        });

        return {
          tileToCellIndex,
          crustTiles,
          plates,
        } as const;
      },
    },
  },
});

export default computePlatesTensors;
