import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

const StrategySchema = Type.Object(
  {
    mantleBumps: Type.Optional(
      Type.Integer({
        default: 4,
        minimum: 1,
        maximum: 64,
        description: "Number of mantle plume hotspots.",
      })
    ),
    mantleAmplitude: Type.Optional(
      Type.Number({
        default: 0.6,
        minimum: 0.1,
        maximum: 5,
        description: "Strength of mantle pressure contributions.",
      })
    ),
    mantleScale: Type.Optional(
      Type.Number({
        default: 0.4,
        minimum: 0.1,
        maximum: 1,
        description: "Spatial scale of mantle effects.",
      })
    ),
    windJetStreaks: Type.Optional(
      Type.Integer({
        default: 3,
        minimum: 0,
        maximum: 12,
        description: "Number of jet stream bands influencing storm tracks.",
      })
    ),
    windJetStrength: Type.Optional(
      Type.Number({
        default: 1,
        minimum: 0,
        maximum: 5,
        description: "Overall jet stream intensity multiplier.",
      })
    ),
    windVariance: Type.Optional(
      Type.Number({
        default: 0.6,
        minimum: 0,
        maximum: 2,
        description: "Directional variance applied to winds.",
      })
    ),
  },
  { additionalProperties: false }
);

const ComputeDynamicsTensorsContract = defineOp({
  kind: "compute",
  id: "foundation/compute-dynamics-tensors",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
      isWaterMask: TypedArraySchemas.u8({ description: "Water mask per tile (1=water, 0=land)." }),
      rng: Type.Any(),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      dynamics: Type.Object(
        {
          windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
          windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
          currentU: TypedArraySchemas.i8({ description: "Current U component per tile (-127..127)." }),
          currentV: TypedArraySchemas.i8({ description: "Current V component per tile (-127..127)." }),
          pressure: TypedArraySchemas.u8({ description: "Mantle pressure per tile (0..255)." }),
        },
        { additionalProperties: false }
      ),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputeDynamicsTensorsContract;
export type ComputeDynamicsTensorsConfig = Static<typeof StrategySchema>;
