import { createStrategy } from "@swooper/mapgen-core/authoring";
import PedologyClassifyContract from "../contract.js";
import { computeReliefProxy, fertilityForTile, soilPaletteIndex } from "../rules/index.js";

export const defaultStrategy = createStrategy(PedologyClassifyContract, "default", {
  run: (input, config) => {
    const size = input.width * input.height;
    const relief = computeReliefProxy(input.slope as Float32Array | undefined, input.elevation as Int16Array, size);
    const sediment = input.sedimentDepth as Float32Array | undefined;
    const bedrock = input.bedrockAge as Int16Array | undefined;

    const soilType = new Uint8Array(size);
    const fertility = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      if (input.landMask[i] === 0) {
        soilType[i] = 0;
        fertility[i] = 0;
        continue;
      }
      const fert = fertilityForTile({
        rainfall: input.rainfall[i],
        humidity: input.humidity[i],
        relief: relief[i],
        sedimentDepth: sediment ? sediment[i] : 0,
        bedrockAge: bedrock ? bedrock[i] : 0,
        weights: config,
      });
      fertility[i] = fert;
      const moisture = (input.rainfall[i] + input.humidity[i]) / 510;
      soilType[i] = soilPaletteIndex(fert, relief[i], moisture);
    }

    return { soilType, fertility };
  },
});
