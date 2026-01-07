import { Type, defineOpContract } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const FeaturesApplyInputSchema = Type.Object(
  {
    vegetation: Type.Array(FeaturePlacementSchema),
    wetlands: Type.Array(FeaturePlacementSchema),
    reefs: Type.Array(FeaturePlacementSchema),
    ice: Type.Array(FeaturePlacementSchema),
  },
  { additionalProperties: false }
);

const FeaturesApplyOutputSchema = Type.Object(
  {
    placements: Type.Array(FeaturePlacementSchema),
  },
  { additionalProperties: false }
);

const FeaturesApplyConfigSchema = Type.Object(
  {
    maxPerTile: Type.Integer({ minimum: 1, default: 1 }),
  },
  { additionalProperties: false }
);

export const FeaturesApplyContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/apply",
  input: FeaturesApplyInputSchema,
  output: FeaturesApplyOutputSchema,
  strategies: {
    default: FeaturesApplyConfigSchema,
  },
});
