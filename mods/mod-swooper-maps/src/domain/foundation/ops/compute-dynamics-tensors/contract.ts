import { TypedArraySchemas, Type, defineOp } from "@swooper/mapgen-core/authoring";
import type { Static } from "@swooper/mapgen-core/authoring";

import { FoundationConfigSchema } from "@mapgen/domain/config";

const StrategySchema = Type.Partial(FoundationConfigSchema);

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
