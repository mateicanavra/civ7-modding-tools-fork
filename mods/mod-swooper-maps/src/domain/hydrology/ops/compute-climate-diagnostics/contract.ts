import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ComputeClimateDiagnosticsContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-climate-diagnostics",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
      elevation: TypedArraySchemas.i16({ description: "Elevation (meters) per tile." }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
      windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
      windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
      rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
      humidity: TypedArraySchemas.u8({ description: "Humidity (0..255) per tile." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      rainShadowIndex: TypedArraySchemas.f32({
        description: "Rain shadow proxy (0..1) per tile (advisory).",
      }),
      continentalityIndex: TypedArraySchemas.f32({
        description: "Continentality proxy (0..1) per tile (advisory).",
      }),
      convergenceIndex: TypedArraySchemas.f32({
        description: "Convergence proxy (0..1) per tile (advisory).",
      }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        barrierSteps: Type.Integer({
          default: 4,
          minimum: 1,
          maximum: 16,
          description: "How far upwind to scan for barriers (tiles).",
        }),
        barrierElevationM: Type.Integer({
          default: 500,
          minimum: 0,
          maximum: 9000,
          description: "Elevation threshold treated as a barrier when estimating rain shadow.",
        }),
        continentalityMaxDist: Type.Integer({
          default: 12,
          minimum: 1,
          maximum: 80,
          description: "Distance-to-water value mapped to continentalityIndex=1 (tiles).",
        }),
        convergenceNormalization: Type.Number({
          default: 64,
          minimum: 1,
          maximum: 512,
          description: "Normalization factor for convergence proxy from wind divergence.",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeClimateDiagnosticsContract;
