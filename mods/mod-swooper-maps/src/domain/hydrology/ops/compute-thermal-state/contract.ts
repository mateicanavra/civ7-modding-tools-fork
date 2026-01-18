import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ComputeThermalStateContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-thermal-state",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      insolation: TypedArraySchemas.f32({ description: "Insolation proxy (0..1) per tile." }),
      elevation: TypedArraySchemas.i16({ description: "Elevation (meters) per tile." }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      surfaceTemperatureC: TypedArraySchemas.f32({
        description: "Surface temperature proxy (Celsius) per tile.",
      }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        baseTemperatureC: Type.Number({
          default: 14,
          minimum: -40,
          maximum: 60,
          description: "Global baseline temperature at sea level and mid-insolation.",
        }),
        insolationScaleC: Type.Number({
          default: 28,
          minimum: 0,
          maximum: 80,
          description: "Temperature delta contributed by insolation forcing.",
        }),
        lapseRateCPerM: Type.Number({
          default: -0.0065,
          minimum: -0.02,
          maximum: 0,
          description: "Temperature change per meter of elevation (negative cools with altitude).",
        }),
        landCoolingC: Type.Number({
          default: 2,
          minimum: 0,
          maximum: 15,
          description: "Extra cooling applied to land tiles (continentality proxy).",
        }),
        minC: Type.Number({
          default: -40,
          minimum: -120,
          maximum: 60,
          description: "Minimum allowed output temperature (C).",
        }),
        maxC: Type.Number({
          default: 50,
          minimum: -40,
          maximum: 120,
          description: "Maximum allowed output temperature (C).",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeThermalStateContract;
