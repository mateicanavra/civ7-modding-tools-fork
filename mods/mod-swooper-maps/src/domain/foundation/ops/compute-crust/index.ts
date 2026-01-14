import { createOp } from "@swooper/mapgen-core/authoring";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import { requireMesh } from "../../lib/require.js";
import ComputeCrustContract from "./contract.js";

const computeCrust = createOp(ComputeCrustContract, {
  strategies: {
    default: {
      run: (input, config) => {
        const mesh = requireMesh(input.mesh, "foundation/compute-crust");
        const rngSeed = input.rngSeed | 0;
        const rng = createLabelRng(rngSeed);

        const cellCount = mesh.cellCount | 0;

        const continentalRatio = config.continentalRatio;

        const type = new Uint8Array(cellCount);
        const age = new Uint8Array(cellCount);

        const threshold = Math.max(0, Math.min(1, continentalRatio)) * 1_000_000;
        for (let i = 0; i < cellCount; i++) {
          const draw = rng(1_000_000, "CrustType");
          type[i] = draw < threshold ? 1 : 0;
          age[i] = rng(256, "CrustAge") & 0xff;
        }

        return {
          crust: { type, age },
        } as const;
      },
    },
  },
});

export default computeCrust;
