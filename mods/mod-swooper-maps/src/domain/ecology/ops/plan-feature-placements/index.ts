import { createOp, type Static } from "@swooper/mapgen-core/authoring";
import {
  FeaturesPlacementSchema,
  resolveFeaturesPlacementConfig,
  type ResolvedFeaturesPlacementConfig,
} from "./schema.js";
import { planFeaturePlacements as planFeaturePlacementsImpl } from "./plan.js";

type FeaturesPlacementInput = Static<typeof FeaturesPlacementSchema["properties"]["input"]>;
type FeaturesPlacementConfig = Static<typeof FeaturesPlacementSchema["properties"]["config"]>;

export const planFeaturePlacements = createOp({
  kind: "plan",
  id: "ecology/features/placement",
  input: FeaturesPlacementSchema.properties.input,
  output: FeaturesPlacementSchema.properties.output,
  strategies: {
    default: {
      config: FeaturesPlacementSchema.properties.config,
      resolveConfig: (config: FeaturesPlacementConfig) => resolveFeaturesPlacementConfig(config),
      run: (input: FeaturesPlacementInput, config: FeaturesPlacementConfig) => {
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
