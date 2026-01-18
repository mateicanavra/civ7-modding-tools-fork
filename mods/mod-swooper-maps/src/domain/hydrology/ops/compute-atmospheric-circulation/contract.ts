import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ComputeAtmosphericCirculationContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-atmospheric-circulation",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
      rngSeed: Type.Integer({
        minimum: 0,
        maximum: 2_147_483_647,
        description: "Deterministic RNG seed (derived in the step; pure data).",
      }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
      windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        windJetStreaks: Type.Integer({
          default: 3,
          minimum: 0,
          maximum: 12,
          description: "Number of jet stream bands influencing storm tracks.",
        }),
        windJetStrength: Type.Number({
          default: 1,
          minimum: 0,
          maximum: 5,
          description: "Overall jet stream intensity multiplier.",
        }),
        windVariance: Type.Number({
          default: 0.6,
          minimum: 0,
          maximum: 2,
          description: "Directional variance applied to winds.",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeAtmosphericCirculationContract;
