import { Type, defineOp } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const FeaturesApplyContract = defineOp({
  kind: "plan",
  id: "ecology/features/apply",
  input: Type.Object({
    vegetation: Type.Array(FeaturePlacementSchema),
    wetlands: Type.Array(FeaturePlacementSchema),
    reefs: Type.Array(FeaturePlacementSchema),
    ice: Type.Array(FeaturePlacementSchema),
  }),
  output: Type.Object({
    placements: Type.Array(FeaturePlacementSchema),
  }),
  strategies: {
    default: Type.Object({
      maxPerTile: Type.Integer({ minimum: 1, default: 1 }),
    }),
  },
});

export default FeaturesApplyContract;
