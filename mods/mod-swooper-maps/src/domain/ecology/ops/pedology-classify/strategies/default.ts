import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PedologyClassifyContract } from "../contract.js";
import { computeReliefProxy, fertilityForTile, normalizeOptionalField, soilPaletteIndex, validateInput } from "../rules/index.js";

type Config = Static<typeof PedologyClassifyContract["strategies"]["default"]>;
const EMPTY_CONFIG: Config = {} as Config;
const resolveConfig = (config?: Config) =>
  applySchemaDefaults(PedologyClassifyContract.strategies.default, config ?? EMPTY_CONFIG);

export const defaultStrategy = createStrategy(PedologyClassifyContract, "default", {
  resolveConfig,
  run: (input, config) => {
    const resolved = resolveConfig(config);
    const size = validateInput(input);
    const relief = computeReliefProxy(input.slope as Float32Array | undefined, input.elevation as Int16Array, size);
    const sediment = normalizeOptionalField(input.sedimentDepth as Float32Array | undefined, size);
    const bedrock = normalizeOptionalField(input.bedrockAge as Int16Array | undefined, size);

    const soilType = new Uint8Array(size);
    const fertility = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      if (input.landMask[i] === 0) {
        soilType[i] = 0;
        fertility[i] = 0;
        continue;
      }
      const fert = fertilityForTile({
        rainfall: input.rainfall[i]!,
        humidity: input.humidity[i]!,
        relief: relief[i]!,
        sedimentDepth: sediment[i]!,
        bedrockAge: bedrock[i]!,
        weights: resolved,
      });
      fertility[i] = fert;
      const moisture = (input.rainfall[i]! + input.humidity[i]!) / 510;
      soilType[i] = soilPaletteIndex(fert, relief[i]!, moisture);
    }

    return { soilType, fertility };
  },
});
