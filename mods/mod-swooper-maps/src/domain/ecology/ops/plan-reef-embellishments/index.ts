import { createOp } from "@swooper/mapgen-core/authoring";
import {
  PlanReefEmbellishmentsSchema,
  resolveReefEmbellishmentsConfig,
  type ResolvedReefEmbellishmentsConfig,
} from "./schema.js";
import { planReefEmbellishments as planReefEmbellishmentsImpl } from "./plan.js";

export const planReefEmbellishments = createOp({
  kind: "plan",
  id: "ecology/features/reef-embellishments",
  input: PlanReefEmbellishmentsSchema.properties.input,
  output: PlanReefEmbellishmentsSchema.properties.output,
  strategies: {
    default: {
      config: PlanReefEmbellishmentsSchema.properties.config,
      resolveConfig: (config) => resolveReefEmbellishmentsConfig(config),
      run: (input, config) => {
        const placements = planReefEmbellishmentsImpl(
          input,
          config as ResolvedReefEmbellishmentsConfig
        );
        return { placements };
      },
    },
  },
});

export * from "./schema.js";
