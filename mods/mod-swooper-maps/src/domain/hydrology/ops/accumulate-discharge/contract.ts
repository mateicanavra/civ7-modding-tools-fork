import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

const AccumulateDischargeContract = defineOp({
  kind: "compute",
  id: "hydrology/accumulate-discharge",
  input: Type.Object(
    {
      width: Type.Integer({ minimum: 1 }),
      height: Type.Integer({ minimum: 1 }),
      landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
      flowDir: TypedArraySchemas.i32({
        description: "Steepest-descent receiver index per tile (or -1 for sinks/edges).",
      }),
      rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
      humidity: TypedArraySchemas.u8({ description: "Relative humidity (0..255) per tile." }),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      runoff: TypedArraySchemas.f32({ description: "Local runoff source proxy per tile." }),
      discharge: TypedArraySchemas.f32({ description: "Accumulated discharge proxy per tile." }),
      sinkMask: TypedArraySchemas.u8({ description: "Mask (1/0): land tiles that are routing sinks." }),
      outletMask: TypedArraySchemas.u8({
        description: "Mask (1/0): land tiles that drain directly into ocean/edges (land→water/out-of-bounds).",
      }),
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        runoffScale: Type.Number({
          default: 1,
          minimum: 0,
          maximum: 10,
          description: "Linear scale applied to rainfall when computing a runoff proxy.",
        }),
        infiltrationFraction: Type.Number({
          default: 0.15,
          minimum: 0,
          maximum: 1,
          description: "Fraction of runoff removed as infiltration (dimensionless).",
        }),
        humidityDampening: Type.Number({
          default: 0.25,
          minimum: 0,
          maximum: 1,
          description: "How much humidity reduces runoff source (dimensionless).",
        }),
        minRunoff: Type.Number({
          default: 0,
          minimum: 0,
          maximum: 200,
          description: "Minimum runoff source value (after scaling).",
        }),
      },
      { additionalProperties: false }
    ),
  },
});

export default AccumulateDischargeContract;

