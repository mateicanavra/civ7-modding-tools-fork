import { createStrategy, type Static } from "@swooper/mapgen-core/authoring";

import PlanFloodplainsContract from "../contract.js";

type Config = Static<(typeof PlanFloodplainsContract)["strategies"]["default"]>;

function normalizeConfig(config: Config): Config {
  const minLength = Math.max(1, Math.floor(config.minLength));
  const maxLength = Math.max(1, Math.floor(config.maxLength));

  return {
    ...config,
    minLength,
    maxLength: Math.max(maxLength, minLength),
  };
}

export const defaultStrategy = createStrategy(PlanFloodplainsContract, "default", {
  normalize: (config) => normalizeConfig(config),
  run: (_input, config) => {
    return {
      minLength: config.minLength,
      maxLength: config.maxLength,
    };
  },
});
