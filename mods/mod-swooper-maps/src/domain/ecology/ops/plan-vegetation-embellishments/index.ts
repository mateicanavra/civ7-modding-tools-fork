import { createOp } from "@swooper/mapgen-core/authoring";
import {
  PlanVegetationEmbellishmentsSchema,
  resolveVegetationEmbellishmentsConfig,
  type ResolvedVegetationEmbellishmentsConfig,
} from "./schema.js";
import { planVegetationEmbellishments as planVegetationEmbellishmentsImpl } from "./plan.js";

export const planVegetationEmbellishments = createOp<
  typeof PlanVegetationEmbellishmentsSchema["properties"]["input"],
  typeof PlanVegetationEmbellishmentsSchema["properties"]["output"],
  { default: typeof PlanVegetationEmbellishmentsSchema["properties"]["config"] }
>({
  kind: "plan",
  id: "ecology/features/vegetation-embellishments",
  input: PlanVegetationEmbellishmentsSchema.properties.input,
  output: PlanVegetationEmbellishmentsSchema.properties.output,
  strategies: {
    default: {
      config: PlanVegetationEmbellishmentsSchema.properties.config,
      resolveConfig: (config) => resolveVegetationEmbellishmentsConfig(config),
      run: (input, config) => {
        const placements = planVegetationEmbellishmentsImpl(
          input,
          config as ResolvedVegetationEmbellishmentsConfig
        );
        return { placements };
      },
    },
  },
} as const);

export * from "./schema.js";
