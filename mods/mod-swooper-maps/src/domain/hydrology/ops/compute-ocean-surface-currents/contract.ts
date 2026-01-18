import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const ComputeOceanSurfaceCurrentsContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-ocean-surface-currents",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
      isWaterMask: TypedArraySchemas.u8({ description: "Water mask per tile (1=water, 0=land)." }),
      windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
      windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      currentU: TypedArraySchemas.i8({ description: "Current U component per tile (-127..127)." }),
      currentV: TypedArraySchemas.i8({ description: "Current V component per tile (-127..127)." }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        strength: Type.Number({
          default: 1,
          minimum: 0,
          maximum: 4,
          description: "Global current strength multiplier.",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default ComputeOceanSurfaceCurrentsContract;
