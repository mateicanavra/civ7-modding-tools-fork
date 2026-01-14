import { createOp } from "@swooper/mapgen-core/authoring";
import { devLogIf } from "@swooper/mapgen-core";
import type { TraceScope } from "@swooper/mapgen-core";

import type { RngFunction } from "../../types.js";
import type { FoundationMesh } from "../compute-mesh/contract.js";
import ComputeCrustContract from "./contract.js";

function requireRng(rng: RngFunction | undefined): RngFunction {
  if (!rng) {
    throw new Error("[Foundation] RNG not provided for foundation/compute-crust.");
  }
  return rng;
}

function requireMesh(mesh: FoundationMesh | undefined): FoundationMesh {
  if (!mesh) {
    throw new Error("[Foundation] Mesh not provided for foundation/compute-crust.");
  }
  const cellCount = mesh.cellCount | 0;
  if (cellCount <= 0) throw new Error("[Foundation] Invalid mesh.cellCount for crust.");
  if (!(mesh.siteX instanceof Float32Array) || mesh.siteX.length !== cellCount) {
    throw new Error("[Foundation] Invalid mesh.siteX for crust.");
  }
  if (!(mesh.siteY instanceof Float32Array) || mesh.siteY.length !== cellCount) {
    throw new Error("[Foundation] Invalid mesh.siteY for crust.");
  }
  return mesh;
}

const computeCrust = createOp(ComputeCrustContract, {
  strategies: {
    default: {
      run: (input) => {
        const mesh = requireMesh(input.mesh as unknown as FoundationMesh | undefined);
        const rng = requireRng(input.rng as unknown as RngFunction | undefined);
        const trace = (input.trace ?? null) as TraceScope | null;

        const cellCount = mesh.cellCount | 0;

        // Additive scaffolding: crust is model-first, but not yet a consumer surface.
        // Keep it deterministic and shape-correct.
        const continentalRatio = 0.3;

        devLogIf(
          trace,
          "LOG_FOUNDATION_CRUST",
          `[Foundation] Crust cellCount=${cellCount}, continentalRatio=${continentalRatio}`
        );

        const type = new Uint8Array(cellCount);
        const age = new Uint8Array(cellCount);

        const threshold = Math.max(0, Math.min(1, continentalRatio)) * 1_000_000;
        for (let i = 0; i < cellCount; i++) {
          const draw = rng(1_000_000, "CrustType");
          type[i] = draw < threshold ? 1 : 0;
          age[i] = rng(256, "CrustAge") & 0xff;
        }

        return {
          crust: Object.freeze({ type, age }),
        } as const;
      },
    },
  },
});

export default computeCrust;
