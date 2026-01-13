import { createOp } from "@swooper/mapgen-core/authoring";
import { devLogIf } from "@swooper/mapgen-core";
import type { TraceScope } from "@swooper/mapgen-core";
import { buildDelaunayMesh } from "@swooper/mapgen-core/lib/mesh";

import type { RngFunction } from "../../types.js";
import ComputeMeshContract from "./contract.js";

function requireRng(rng: RngFunction | undefined): RngFunction {
  if (!rng) {
    throw new Error("[Foundation] RNG not provided for foundation/compute-mesh.");
  }
  return rng;
}

const computeMesh = createOp(ComputeMeshContract, {
  strategies: {
    default: {
      normalize: (config, ctx) => {
        const { width, height } = (ctx as any)?.env?.dimensions ?? {};
        const area = Math.max(1, (Number(width) | 0) * (Number(height) | 0));

        const referenceArea = Math.max(1, config.referenceArea | 0);
        const power = Number.isFinite(config.plateScalePower) ? config.plateScalePower : 0.5;

        const scale = Math.pow(area / referenceArea, power);
        const scaledPlateCount = Math.max(2, Math.round((config.plateCount | 0) * scale));
        const cellCount = Math.max(1, (scaledPlateCount * (config.cellsPerPlate | 0)) | 0);

        return {
          ...config,
          cellCount,
        };
      },
      run: (input, config) => {
        const width = input.width | 0;
        const height = input.height | 0;
        const trace = (input.trace ?? null) as TraceScope | null;

        const rng = requireRng(input.rng as unknown as RngFunction | undefined);

        const cellCount = config.cellCount ?? 0;
        if (!Number.isInteger(cellCount) || cellCount <= 0) {
          throw new Error("[Foundation] compute-mesh missing derived cellCount (normalization bug).");
        }
        const relaxationSteps = config.relaxationSteps;

        devLogIf(
          trace,
          "LOG_FOUNDATION_MESH",
          `[Foundation] Mesh cellCount=${cellCount}, relaxationSteps=${relaxationSteps}`
        );

        return {
          mesh: Object.freeze(
            buildDelaunayMesh({
              width,
              height,
              cellCount,
              relaxationSteps,
              rng,
            })
          ),
        } as const;
      },
    },
  },
});

export default computeMesh;
