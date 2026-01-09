import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const PlanReefsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature (C)." }),
  },
  { additionalProperties: false }
);

const PlanReefsOutputSchema = Type.Object(
  {
    placements: Type.Array(FeaturePlacementSchema),
  },
  { additionalProperties: false }
);

const PlanReefsConfigSchema = Type.Object(
  {
    warmThreshold: Type.Number({ default: 12 }),
    density: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
  },
  { additionalProperties: false }
);

export const PlanReefsContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/plan-reefs",
  input: PlanReefsInputSchema,
  output: PlanReefsOutputSchema,
  strategies: {
    default: PlanReefsConfigSchema,
    "shipping-lanes": PlanReefsConfigSchema,
  },
});
