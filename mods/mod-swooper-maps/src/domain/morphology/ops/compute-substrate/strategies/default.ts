import { createStrategy } from "@swooper/mapgen-core/authoring";

import ComputeSubstrateContract from "../contract.js";
import { erodibilityForTile, sedimentDepthForTile, validateSubstrateInputs } from "../rules/index.js";

export const defaultStrategy = createStrategy(ComputeSubstrateContract, "default", {
  run: (input, config) => {
    const size = validateSubstrateInputs(input);
    const uplift = input.upliftPotential as Uint8Array;
    const rift = input.riftPotential as Uint8Array;
    const boundaryCloseness = input.boundaryCloseness as Uint8Array;
    const boundaryType = input.boundaryType as Uint8Array;
    const crustType = input.crustType as Uint8Array;
    const crustAge = input.crustAge as Uint8Array;

    const erodibilityK = new Float32Array(size);
    const sedimentDepth = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      erodibilityK[i] = erodibilityForTile(
        config,
        uplift[i] ?? 0,
        boundaryCloseness[i] ?? 0,
        boundaryType[i] ?? 0,
        crustType[i] ?? 0,
        crustAge[i] ?? 0
      );
      sedimentDepth[i] = sedimentDepthForTile(
        config,
        rift[i] ?? 0,
        boundaryCloseness[i] ?? 0,
        boundaryType[i] ?? 0,
        crustType[i] ?? 0,
        crustAge[i] ?? 0
      );
    }

    return { erodibilityK, sedimentDepth };
  },
});
