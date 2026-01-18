import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const TransportMoistureContract = defineOp({
  kind: "compute",
  id: "hydrology/transport-moisture",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
      windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
      windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
      evaporation: TypedArraySchemas.f32({ description: "Evaporation sources proxy (0..1) per tile." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      humidity: TypedArraySchemas.f32({ description: "Humidity proxy (0..1) per tile." }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        iterations: Type.Integer({
          default: 28,
          minimum: 0,
          maximum: 200,
          description: "Fixed advection iterations (no convergence loops).",
        }),
        advection: Type.Number({
          default: 0.65,
          minimum: 0,
          maximum: 1,
          description: "How much upwind humidity influences a tile each step.",
        }),
        retention: Type.Number({
          default: 0.92,
          minimum: 0,
          maximum: 1,
          description: "How much humidity is retained per iteration.",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default TransportMoistureContract;
