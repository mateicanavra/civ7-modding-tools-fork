import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ComputeRadiativeForcingContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-radiative-forcing",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      insolation: TypedArraySchemas.f32({ description: "Insolation proxy (0..1) per tile." }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        equatorInsolation: Type.Number({
          default: 1,
          minimum: 0,
          maximum: 2,
          description: "Insolation proxy at the equator.",
        }),
        poleInsolation: Type.Number({
          default: 0.35,
          minimum: 0,
          maximum: 2,
          description: "Insolation proxy at the poles.",
        }),
        latitudeExponent: Type.Number({
          default: 1.2,
          minimum: 0.1,
          maximum: 6,
          description: "Controls how sharply forcing falls off with latitude.",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeRadiativeForcingContract;
