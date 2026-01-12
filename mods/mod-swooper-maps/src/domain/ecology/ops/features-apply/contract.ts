import { Type, defineOp } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const FeaturesApplyContract = defineOp({
  kind: "plan",
  id: "ecology/features/apply",
  input: Type.Object(
    {
      vegetation: Type.Array(FeaturePlacementSchema, {
        description: "Planned vegetation feature placements.",
      }),
      wetlands: Type.Array(FeaturePlacementSchema, {
        description: "Planned wetland feature placements.",
      }),
      reefs: Type.Array(FeaturePlacementSchema, {
        description: "Planned reef feature placements.",
      }),
      ice: Type.Array(FeaturePlacementSchema, {
        description: "Planned ice feature placements.",
      }),
    },
    {
      description: "Planned feature placements grouped by concern before apply.",
    }
  ),
  output: Type.Object(
    {
      placements: Type.Array(FeaturePlacementSchema, {
        description: "Flattened feature placements ready for application.",
      }),
    },
    {
      description: "Aggregated feature placements after merging all concerns.",
    }
  ),
  strategies: {
    default: Type.Object(
      {
        maxPerTile: Type.Integer({
          minimum: 1,
          default: 1,
          description: "Maximum number of features to apply per tile.",
        }),
      },
      {
        description: "Limits used when consolidating planned feature placements.",
      }
    ),
  },
});

export default FeaturesApplyContract;
