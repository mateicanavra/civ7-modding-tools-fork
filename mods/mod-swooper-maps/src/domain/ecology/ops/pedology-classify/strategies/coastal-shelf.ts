import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PedologyClassifyContract } from "../contract.js";
import { defaultStrategy } from "./default.js";

const EMPTY_CONFIG: Static<typeof PedologyClassifyContract["strategies"]["coastal-shelf"]> = {} as Static<
  typeof PedologyClassifyContract["strategies"]["coastal-shelf"]
>;
const resolveConfig = (input?: Static<typeof PedologyClassifyContract["strategies"]["coastal-shelf"]>) =>
  applySchemaDefaults(PedologyClassifyContract.strategies["coastal-shelf"], input ?? EMPTY_CONFIG);

export const coastalShelfStrategy = createStrategy(PedologyClassifyContract, "coastal-shelf", {
  resolveConfig,
  run: (input, config) => {
    const resolved = resolveConfig(config);
    // Coastal shelves emphasize sediment and moisture slightly more.
    const boosted = {
      ...resolved,
      sedimentWeight: resolved.sedimentWeight * 1.2,
      climateWeight: resolved.climateWeight * 1.1,
    };
    return defaultStrategy.run(input, boosted as never);
  },
});
