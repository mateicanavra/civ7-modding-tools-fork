import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { PedologyClassifyContract } from "../contract.js";
import { defaultStrategy } from "./default.js";

const EMPTY_CONFIG: Static<typeof PedologyClassifyContract["strategies"]["orogeny-boosted"]> = {} as Static<
  typeof PedologyClassifyContract["strategies"]["orogeny-boosted"]
>;
const normalize = (input?: Static<typeof PedologyClassifyContract["strategies"]["orogeny-boosted"]>) =>
  applySchemaDefaults(PedologyClassifyContract.strategies["orogeny-boosted"], input ?? EMPTY_CONFIG);

export const orogenyBoostedStrategy = createStrategy(PedologyClassifyContract, "orogeny-boosted", {
  normalize,
  run: (input, config) => {
    const resolved = normalize(config);
    // Uplifted terrain: relief has more influence, fertility ceiling lower.
    const boosted = {
      ...resolved,
      reliefWeight: resolved.reliefWeight * 1.4,
      fertilityCeiling: Math.min(resolved.fertilityCeiling, 0.9),
    };
    return defaultStrategy.run(input, boosted as never);
  },
});
