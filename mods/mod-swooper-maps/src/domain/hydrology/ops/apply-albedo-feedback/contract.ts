import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ApplyAlbedoFeedbackContract = defineOp({
  kind: "compute",
  id: "hydrology/apply-albedo-feedback",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
      rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
      surfaceTemperatureC: TypedArraySchemas.f32({ description: "Base surface temperature proxy (C)." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      surfaceTemperatureC: TypedArraySchemas.f32({
        description: "Surface temperature after bounded albedo feedback (C).",
      }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        iterations: Type.Integer({
          default: 4,
          minimum: 0,
          maximum: 20,
          description: "Fixed iteration count for bounded feedback (no convergence loops).",
        }),
        snowCoolingC: Type.Number({
          default: 4,
          minimum: 0,
          maximum: 25,
          description: "Cooling applied at full snow cover (C).",
        }),
        seaIceCoolingC: Type.Number({
          default: 6,
          minimum: 0,
          maximum: 30,
          description: "Cooling applied at full sea ice cover (C).",
        }),
        minC: Type.Number({
          default: -60,
          minimum: -120,
          maximum: 60,
          description: "Minimum allowed output temperature (C).",
        }),
        maxC: Type.Number({
          default: 60,
          minimum: -60,
          maximum: 120,
          description: "Maximum allowed output temperature (C).",
        }),
        landSnowStartC: Type.Number({
          default: 0,
          minimum: -60,
          maximum: 30,
          description: "Temperature at which snow starts to accumulate on land (C).",
        }),
        landSnowFullC: Type.Number({
          default: -12,
          minimum: -80,
          maximum: 10,
          description: "Temperature at which land snow cover is saturated (C).",
        }),
        seaIceStartC: Type.Number({
          default: -1,
          minimum: -60,
          maximum: 10,
          description: "Temperature at which sea ice starts to form (C).",
        }),
        seaIceFullC: Type.Number({
          default: -10,
          minimum: -80,
          maximum: 10,
          description: "Temperature at which sea ice cover is saturated (C).",
        }),
        precipitationInfluence: Type.Number({
          default: 0.25,
          minimum: 0,
          maximum: 1,
          description: "How much rainfall boosts snow cover accumulation (dimensionless).",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ApplyAlbedoFeedbackContract;
