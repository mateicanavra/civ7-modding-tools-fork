import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ComputeCryosphereStateContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-cryosphere-state",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
      surfaceTemperatureC: TypedArraySchemas.f32({ description: "Surface temperature proxy (C)." }),
      rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      snowCover: TypedArraySchemas.u8({ description: "Snow cover fraction (0..255) per tile." }),
      seaIceCover: TypedArraySchemas.u8({ description: "Sea ice cover fraction (0..255) per tile." }),
      albedo: TypedArraySchemas.u8({ description: "Albedo proxy (0..255) per tile." }),
      freezeIndex: TypedArraySchemas.f32({
        description: "Freeze persistence index (0..1) per tile (advisory).",
      }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
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
        freezeIndexStartC: Type.Number({
          default: 2,
          minimum: -60,
          maximum: 30,
          description: "Temperature at which freezeIndex begins increasing (C).",
        }),
        freezeIndexFullC: Type.Number({
          default: -12,
          minimum: -80,
          maximum: 10,
          description: "Temperature at which freezeIndex is saturated (C).",
        }),
        precipitationInfluence: Type.Number({
          default: 0.25,
          minimum: 0,
          maximum: 1,
          description: "How much rainfall boosts snow cover accumulation (dimensionless).",
        }),
        baseAlbedo: Type.Integer({
          default: 30,
          minimum: 0,
          maximum: 255,
          description: "Baseline albedo proxy when no snow/ice is present.",
        }),
        snowAlbedoBoost: Type.Integer({
          default: 140,
          minimum: 0,
          maximum: 255,
          description: "Albedo boost at full snow cover.",
        }),
        seaIceAlbedoBoost: Type.Integer({
          default: 180,
          minimum: 0,
          maximum: 255,
          description: "Albedo boost at full sea ice cover.",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeCryosphereStateContract;
