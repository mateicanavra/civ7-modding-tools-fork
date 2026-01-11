import { Type, TypedArraySchemas, defineOpContract } from "@swooper/mapgen-core/authoring";

const ResourcePlanBasinsContract = defineOpContract({
  kind: "plan",
  id: "ecology/resources/plan-basins",
  input: Type.Object({
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 }),
    landMask: TypedArraySchemas.u8({ description: "Land mask (1 = land, 0 = water)." }),
    fertility: TypedArraySchemas.f32({ description: "Fertility field (0..1)." }),
    soilType: TypedArraySchemas.u8({ description: "Soil palette indices." }),
    rainfall: TypedArraySchemas.u8({ description: "Rainfall per tile (0..255)." }),
    humidity: TypedArraySchemas.u8({ description: "Humidity per tile (0..255)." }),
  }),
  output: Type.Object({
    basins: Type.Array(
      Type.Object({
        resourceId: Type.String(),
        plots: Type.Array(Type.Integer({ minimum: 0 })),
        intensity: Type.Array(Type.Number({ minimum: 0, maximum: 1 })),
        confidence: Type.Number({ minimum: 0, maximum: 1 }),
      })
    ),
  }),
  strategies: {
    default: Type.Object({
      resources: Type.Array(
        Type.Object({
          id: Type.String(),
          target: Type.Integer({ minimum: 1, default: 6 }),
          fertilityBias: Type.Number({ minimum: 0, maximum: 2, default: 1 }),
          moistureBias: Type.Number({ minimum: 0, maximum: 2, default: 1 }),
          spacing: Type.Integer({ minimum: 1, default: 4 }),
        }),
        { default: [] }
      ),
    }),
    "hydro-fluvial": Type.Object({
      resources: Type.Array(
        Type.Object({
          id: Type.String(),
          target: Type.Integer({ minimum: 1, default: 6 }),
          fertilityBias: Type.Number({ minimum: 0, maximum: 2, default: 1 }),
          moistureBias: Type.Number({ minimum: 0, maximum: 2, default: 1 }),
          spacing: Type.Integer({ minimum: 1, default: 4 }),
        }),
        { default: [] }
      ),
    }),
    mixed: Type.Object({
      resources: Type.Array(
        Type.Object({
          id: Type.String(),
          target: Type.Integer({ minimum: 1, default: 6 }),
          fertilityBias: Type.Number({ minimum: 0, maximum: 2, default: 1 }),
          moistureBias: Type.Number({ minimum: 0, maximum: 2, default: 1 }),
          spacing: Type.Integer({ minimum: 1, default: 4 }),
        }),
        { default: [] }
      ),
    }),
  },
});

export default ResourcePlanBasinsContract;
