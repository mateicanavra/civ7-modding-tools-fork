import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const PlanReefsContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/plan-reefs",
  input: Type.Object({
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature (C)." }),
  }),
  output: Type.Object({
    placements: Type.Array(FeaturePlacementSchema),
  }),
  strategies: {
    default: Type.Object({
      warmThreshold: Type.Number({ default: 12 }),
      density: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
    }),
    "shipping-lanes": Type.Object({
      warmThreshold: Type.Number({ default: 12 }),
      density: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
    }),
  },
});

export default PlanReefsContract;
