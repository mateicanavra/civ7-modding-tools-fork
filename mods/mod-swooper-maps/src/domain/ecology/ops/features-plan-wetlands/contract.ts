import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const PlanWetlandsInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
    effectiveMoisture: TypedArraySchemas.f32({ description: "Effective moisture per tile." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature (C)." }),
    fertility: TypedArraySchemas.f32({ description: "Fertility overlay (0..1)." }),
    elevation: TypedArraySchemas.i16({ description: "Elevation in meters." })},
  {}
);

const PlanWetlandsOutputSchema = Type.Object(
  {
    placements: Type.Array(FeaturePlacementSchema)},
  {}
);

const PlanWetlandsConfigSchema = Type.Object(
  {
    moistureThreshold: Type.Number({ minimum: 0, maximum: 2, default: 0.75 }),
    fertilityThreshold: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
    maxElevation: Type.Integer({ default: 1200 })},
  {}
);

const PlanWetlandsContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/plan-wetlands",
  input: PlanWetlandsInputSchema,
  output: PlanWetlandsOutputSchema,
  strategies: {
    default: PlanWetlandsConfigSchema,
    "delta-focused": PlanWetlandsConfigSchema}});

export default PlanWetlandsContract;
