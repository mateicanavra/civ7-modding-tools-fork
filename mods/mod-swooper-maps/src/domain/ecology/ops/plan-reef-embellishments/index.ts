import { createOp, type Static } from "@swooper/mapgen-core/authoring";
import {
  PlanReefEmbellishmentsSchema,
  resolveReefEmbellishmentsConfig,
  type ResolvedReefEmbellishmentsConfig,
} from "./schema.js";
import { planReefEmbellishments as planReefEmbellishmentsImpl } from "./plan.js";

type ReefEmbellishmentsInput = Static<typeof PlanReefEmbellishmentsSchema["properties"]["input"]>;
type ReefEmbellishmentsConfig = Static<typeof PlanReefEmbellishmentsSchema["properties"]["config"]>;

export const planReefEmbellishments = createOp({
  kind: "plan",
  id: "ecology/features/reef-embellishments",
  input: PlanReefEmbellishmentsSchema.properties.input,
  output: PlanReefEmbellishmentsSchema.properties.output,
  strategies: {
    default: {
      config: PlanReefEmbellishmentsSchema.properties.config,
      resolveConfig: (config: ReefEmbellishmentsConfig) => resolveReefEmbellishmentsConfig(config),
      run: (input: ReefEmbellishmentsInput, config: ReefEmbellishmentsConfig) => {
        const placements = planReefEmbellishmentsImpl(
          input,
          config as ResolvedReefEmbellishmentsConfig
        );
        return { placements };
      },
    },
  },
} as const);

export * from "./schema.js";
