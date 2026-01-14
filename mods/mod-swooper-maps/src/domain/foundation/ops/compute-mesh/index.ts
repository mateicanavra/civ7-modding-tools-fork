import { createOp } from "@swooper/mapgen-core/authoring";
import { buildDelaunayMesh } from "@swooper/mapgen-core/lib/mesh";

import ComputeMeshContract from "./contract.js";

const computeMesh = createOp(ComputeMeshContract, {
  strategies: {
    default: {
      normalize: (config, ctx) => {
        const { width, height } = (ctx as any)?.env?.dimensions ?? {};
        const area = Math.max(1, (Number(width) | 0) * (Number(height) | 0));

        const referenceArea = Math.max(1, config.referenceArea | 0);
        const power = config.plateScalePower;

        const scale = Math.pow(area / referenceArea, power);
        const scaledPlateCount = Math.max(2, Math.round((config.plateCount | 0) * scale));
        const cellCount = Math.max(1, scaledPlateCount * (config.cellsPerPlate | 0));

        return {
          ...config,
          plateCount: scaledPlateCount,
          cellCount,
        };
      },
      run: (input, config) => {
        const width = input.width | 0;
        const height = input.height | 0;
        const rngSeed = input.rngSeed | 0;

        const cellCount = config.cellCount ?? 0;
        if (!Number.isInteger(cellCount) || cellCount <= 0) {
          throw new Error("[Foundation] compute-mesh missing derived cellCount (normalization bug).");
        }
        const relaxationSteps = config.relaxationSteps;

        return {
          mesh: buildDelaunayMesh({
            width,
            height,
            cellCount,
            relaxationSteps,
            rngSeed,
          }),
        } as const;
      },
    },
  },
});

export default computeMesh;
