import { createOp, type Static } from "@swooper/mapgen-core/authoring";
import {
  PlanVegetationEmbellishmentsSchema,
  resolveVegetationEmbellishmentsConfig,
  type ResolvedVegetationEmbellishmentsConfig,
} from "./schema.js";
import { planVegetationEmbellishments as planVegetationEmbellishmentsImpl } from "./plan.js";

type VegetationEmbellishmentsInput =
  Static<typeof PlanVegetationEmbellishmentsSchema["properties"]["input"]>;
type VegetationEmbellishmentsConfig =
  Static<typeof PlanVegetationEmbellishmentsSchema["properties"]["config"]>;

export const planVegetationEmbellishments = createOp({
  kind: "plan",
  id: "ecology/features/vegetation-embellishments",
  input: PlanVegetationEmbellishmentsSchema.properties.input,
  output: PlanVegetationEmbellishmentsSchema.properties.output,
  strategies: {
    default: {
      config: PlanVegetationEmbellishmentsSchema.properties.config,
      resolveConfig: (config: VegetationEmbellishmentsConfig) =>
        resolveVegetationEmbellishmentsConfig(config),
      run: (input: VegetationEmbellishmentsInput, config: VegetationEmbellishmentsConfig) => {
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
