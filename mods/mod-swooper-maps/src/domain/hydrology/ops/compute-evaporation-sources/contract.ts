import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ComputeEvaporationSourcesContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-evaporation-sources",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
      surfaceTemperatureC: TypedArraySchemas.f32({ description: "Surface temperature proxy (C)." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      evaporation: TypedArraySchemas.f32({ description: "Evaporation sources proxy (0..1) per tile." }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        oceanStrength: Type.Number({
          default: 1,
          minimum: 0,
          maximum: 5,
          description: "Evaporation multiplier applied to water tiles.",
        }),
        landStrength: Type.Number({
          default: 0.2,
          minimum: 0,
          maximum: 5,
          description: "Evaporation multiplier applied to land tiles.",
        }),
        minTempC: Type.Number({
          default: -10,
          minimum: -60,
          maximum: 40,
          description: "Temperature threshold below which evaporation is ~0.",
        }),
        maxTempC: Type.Number({
          default: 30,
          minimum: -10,
          maximum: 80,
          description: "Temperature threshold above which evaporation is saturated.",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeEvaporationSourcesContract;
