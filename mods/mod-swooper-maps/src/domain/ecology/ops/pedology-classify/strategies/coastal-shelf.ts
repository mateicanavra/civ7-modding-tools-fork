import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PedologyClassifyContract } from "../contract.js";
import { defaultStrategy } from "./default.js";

const EMPTY_CONFIG: Static<typeof PedologyClassifyContract["strategies"]["coastal-shelf"]> = {} as Static<
  typeof PedologyClassifyContract["strategies"]["coastal-shelf"]
>;
const normalize = (input?: Static<typeof PedologyClassifyContract["strategies"]["coastal-shelf"]>) =>
  applySchemaDefaults(PedologyClassifyContract.strategies["coastal-shelf"], input ?? EMPTY_CONFIG);

export const coastalShelfStrategy = createStrategy(PedologyClassifyContract, "coastal-shelf", {
  normalize,
  run: (input, config) => {
    const resolved = normalize(config);
    // Coastal shelves emphasize sediment and moisture slightly more.
    const boosted = {
      ...resolved,
      sedimentWeight: resolved.sedimentWeight * 1.2,
      climateWeight: resolved.climateWeight * 1.1,
    };
    return defaultStrategy.run(input, boosted as never);
  },
});
