import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { ResourcePlanBasinsContract } from "../contract.js";
import { defaultStrategy } from "./default.js";

const EMPTY_CONFIG: Static<typeof ResourcePlanBasinsContract["strategies"]["hydro-fluvial"]> = {} as Static<
  typeof ResourcePlanBasinsContract["strategies"]["hydro-fluvial"]
>;
const resolveConfig = (input?: Static<typeof ResourcePlanBasinsContract["strategies"]["hydro-fluvial"]>) =>
  applySchemaDefaults(ResourcePlanBasinsContract.strategies["hydro-fluvial"], input ?? EMPTY_CONFIG);

export const hydroFluvialStrategy = createStrategy(ResourcePlanBasinsContract, "hydro-fluvial", {
  resolveConfig,
  run: (input, config) => {
    const resolved = resolveConfig(config);
    const boosted = {
      ...resolved,
      resources: resolved.resources.map((res) => ({
        ...res,
        moistureBias: res.moistureBias * 1.5,
      })),
    };
    return defaultStrategy.run(input, boosted as never);
  },
});
