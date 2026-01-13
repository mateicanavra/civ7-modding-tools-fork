import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";
import type { LabelRng } from "@swooper/mapgen-core/lib/rng";

const StrategySchema = Type.Object(
  {
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

export const HydrologyWindFieldSchema = Type.Object(
  {
    windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
    windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
    currentU: TypedArraySchemas.i8({ description: "Current U component per tile (-127..127)." }),
    currentV: TypedArraySchemas.i8({ description: "Current V component per tile (-127..127)." }),
  },
  { additionalProperties: false }
);

const ComputeWindFieldsContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-wind-fields",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
      isWaterMask: TypedArraySchemas.u8({ description: "Water mask per tile (1=water, 0=land)." }),
      rng: Type.Unsafe<LabelRng>(),
    },
    { additionalProperties: false }
  ),
  output: Type.Object({ wind: HydrologyWindFieldSchema }, { additionalProperties: false }),
  strategies: {
    default: StrategySchema,
  },
});

export default ComputeWindFieldsContract;
export type ComputeWindFieldsConfig = Static<typeof StrategySchema>;
export type HydrologyWindFields = Static<typeof HydrologyWindFieldSchema>;
