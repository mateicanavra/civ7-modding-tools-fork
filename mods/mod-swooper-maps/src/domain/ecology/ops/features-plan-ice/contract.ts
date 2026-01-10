import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const PlanIceContract = defineOp({
  kind: "plan",
  id: "ecology/features/plan-ice",
  input: Type.Object({
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature (C)." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation (meters)." }),
  }),
  output: Type.Object({
    placements: Type.Array(FeaturePlacementSchema),
  }),
  strategies: {
    default: Type.Object({
      seaIceThreshold: Type.Number({ default: -8 }),
      alpineThreshold: Type.Integer({ default: 2800 }),
    }),
    continentality: Type.Object({
      seaIceThreshold: Type.Number({ default: -8 }),
      alpineThreshold: Type.Integer({ default: 2800 }),
    }),
  },
});

export default PlanIceContract;
