import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";
import { FeaturePlacementSchema } from "../../shared/placement-schema.js";

const PlanVegetationInputSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    biomeIndex: TypedArraySchemas.u8({ description: "Biome indices per tile." }),
    vegetationDensity: TypedArraySchemas.f32({ description: "Vegetation density (0..1)." }),
    effectiveMoisture: TypedArraySchemas.f32({ description: "Effective moisture per tile." }),
    surfaceTemperature: TypedArraySchemas.f32({ description: "Surface temperature (C)." }),
    fertility: TypedArraySchemas.f32({ description: "Fertility overlay (0..1)." }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
  },
  { additionalProperties: false }
);

const PlanVegetationOutputSchema = Type.Object(
  {
    placements: Type.Array(FeaturePlacementSchema),
  },
  { additionalProperties: false }
);

const PlanVegetationConfigSchema = Type.Object(
  {
    baseDensity: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
    fertilityWeight: Type.Number({ minimum: 0, maximum: 2, default: 0.4 }),
    moistureWeight: Type.Number({ minimum: 0, maximum: 2, default: 0.6 }),
    coldCutoff: Type.Number({ default: -10 }),
  },
  { additionalProperties: false }
);

export const PlanVegetationContract = defineOpContract({
  kind: "plan",
  id: "ecology/features/plan-vegetation",
  input: PlanVegetationInputSchema,
  output: PlanVegetationOutputSchema,
  strategies: {
    default: PlanVegetationConfigSchema,
    clustered: PlanVegetationConfigSchema,
  },
});

export default PlanVegetationContract;
