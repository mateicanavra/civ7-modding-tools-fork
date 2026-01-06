import { createOp } from "@swooper/mapgen-core/authoring";
import {
  FeaturesPlacementSchema,
  resolveFeaturesPlacementConfig,
  type ResolvedFeaturesPlacementConfig,
} from "./schema.js";
import { planFeaturePlacements as planFeaturePlacementsImpl } from "./plan.js";

export const planFeaturePlacements = createOp<
  typeof FeaturesPlacementSchema["properties"]["input"],
  typeof FeaturesPlacementSchema["properties"]["output"],
  { default: typeof FeaturesPlacementSchema["properties"]["config"] }
>({
  kind: "plan",
  id: "ecology/features/placement",
  input: FeaturesPlacementSchema.properties.input,
  output: FeaturesPlacementSchema.properties.output,
  strategies: {
    default: {
      config: FeaturesPlacementSchema.properties.config,
      resolveConfig: (config) => resolveFeaturesPlacementConfig(config),
      run: (input, config) => {
        const placements = planFeaturePlacementsImpl(
          input,
          config as ResolvedFeaturesPlacementConfig
        );
        return { placements };
      },
    },
  },
} as const);

export * from "./schema.js";
