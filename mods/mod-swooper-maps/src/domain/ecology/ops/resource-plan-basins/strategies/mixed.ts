import { applySchemaDefaults, createStrategy, type Static } from "@swooper/mapgen-core/authoring";
import { ResourcePlanBasinsContract } from "../contract.js";
import { defaultStrategy } from "./default.js";

const EMPTY_CONFIG: Static<typeof ResourcePlanBasinsContract["strategies"]["mixed"]> = {} as Static<
  typeof ResourcePlanBasinsContract["strategies"]["mixed"]
>;
const normalize = (input?: Static<typeof ResourcePlanBasinsContract["strategies"]["mixed"]>) =>
  applySchemaDefaults(ResourcePlanBasinsContract.strategies.mixed, input ?? EMPTY_CONFIG);

export const mixedStrategy = createStrategy(ResourcePlanBasinsContract, "mixed", {
  normalize,
  run: (input, config) => {
    const resolved = normalize(config);
    const balanced = {
      ...resolved,
      resources: resolved.resources.map((res, idx) => ({
        ...res,
        fertilityBias: res.fertilityBias * (idx % 2 === 0 ? 1.1 : 0.9),
        moistureBias: res.moistureBias * (idx % 2 === 0 ? 0.9 : 1.2),
      })),
    };
    return defaultStrategy.run(input, balanced as never);
  },
});
