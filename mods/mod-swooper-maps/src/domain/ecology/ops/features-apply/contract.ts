import { Type, defineOpContract } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

export const FeaturesApplyContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/apply",
  input: Type.Object(
    {
      vegetation: Type.Array(FeaturePlacementSchema),
      wetlands: Type.Array(FeaturePlacementSchema),
      reefs: Type.Array(FeaturePlacementSchema),
      ice: Type.Array(FeaturePlacementSchema),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      placements: Type.Array(FeaturePlacementSchema),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        maxPerTile: Type.Integer({ minimum: 1, default: 1 }),
      },
      { additionalProperties: false }
    ),
  },
});

export default FeaturesApplyContract;
