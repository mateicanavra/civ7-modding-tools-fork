import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const PlanIceInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature (C)." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation (meters)." }),
  },
  { additionalProperties: false }
);

const PlanIceOutputSchema = Type.Object(
  {
    placements: Type.Array(FeaturePlacementSchema),
  },
  { additionalProperties: false }
);

const PlanIceConfigSchema = Type.Object(
  {
    seaIceThreshold: Type.Number({ default: -8 }),
    alpineThreshold: Type.Integer({ default: 2800 }),
  },
  { additionalProperties: false }
);

export const PlanIceContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/plan-ice",
  input: PlanIceInputSchema,
  output: PlanIceOutputSchema,
  strategies: {
    default: PlanIceConfigSchema,
    continentality: PlanIceConfigSchema,
  },
});

export default PlanIceContract;
