import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ComputeLandWaterBudgetContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-land-water-budget",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
      rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
      humidity: TypedArraySchemas.u8({ description: "Humidity (0..255) per tile." }),
      surfaceTemperatureC: TypedArraySchemas.f32({ description: "Surface temperature proxy (C)." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      pet: TypedArraySchemas.f32({
        description: "Potential evapotranspiration proxy (rainfall units, advisory).",
      }),
      aridityIndex: TypedArraySchemas.f32({
        description: "Aridity index (0..1) derived from precipitation vs PET (advisory).",
      }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        tMinC: Type.Number({
          default: 0,
          minimum: -60,
          maximum: 40,
          description: "Minimum temperature for PET scaling (C).",
        }),
        tMaxC: Type.Number({
          default: 35,
          minimum: -10,
          maximum: 80,
          description: "Maximum temperature for PET scaling (C).",
        }),
        petBase: Type.Number({
          default: 18,
          minimum: 0,
          maximum: 200,
          description: "Baseline PET value (rainfall units).",
        }),
        petTemperatureWeight: Type.Number({
          default: 75,
          minimum: 0,
          maximum: 400,
          description: "Temperature contribution to PET scaling.",
        }),
        humidityDampening: Type.Number({
          default: 0.55,
          minimum: 0,
          maximum: 1,
          description: "How much humidity reduces PET (0..1).",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeLandWaterBudgetContract;
