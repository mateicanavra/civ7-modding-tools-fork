import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Computes a runoff proxy and accumulates it along Hydrology-derived routing to derive discharge.
 *
 * Routing ownership invariant:
 * - `flowDir` is owned within Hydrology (derived from Morphology topography), and should not be recomputed inside this op.
 */
const AccumulateDischargeInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Land mask per tile (1=land, 0=water). */
    landMask: TypedArraySchemas.u8({ description: "Land mask per tile (1=land, 0=water)." }),
    /** Steepest-descent receiver index per tile (or -1 for sinks/edges). */
    flowDir: TypedArraySchemas.i32({
      description: "Steepest-descent receiver index per tile (or -1 for sinks/edges).",
    }),
    /** Rainfall (0..200) per tile. */
    rainfall: TypedArraySchemas.u8({ description: "Rainfall (0..200) per tile." }),
    /** Relative humidity (0..255) per tile. */
    humidity: TypedArraySchemas.u8({ description: "Relative humidity (0..255) per tile." }),
  },
  {
    additionalProperties: false,
    description: "Inputs for discharge accumulation (routing + rainfall/humidity proxies).",
  }
);

/**
 * Discharge-related outputs.
 */
const AccumulateDischargeOutputSchema = Type.Object(
  {
    /** Local runoff source proxy per tile. */
    runoff: TypedArraySchemas.f32({ description: "Local runoff source proxy per tile." }),
    /** Accumulated discharge proxy per tile. */
    discharge: TypedArraySchemas.f32({ description: "Accumulated discharge proxy per tile." }),
    /** Mask (1/0): land tiles that are routing sinks. */
    sinkMask: TypedArraySchemas.u8({ description: "Mask (1/0): land tiles that are routing sinks." }),
    /** Mask (1/0): land tiles that drain directly into ocean/edges (land→water/out-of-bounds). */
    outletMask: TypedArraySchemas.u8({
      description: "Mask (1/0): land tiles that drain directly into ocean/edges (land→water/out-of-bounds).",
    }),
  },
  {
    additionalProperties: false,
    description: "Discharge accumulation outputs (runoff/discharge + sink/outlet masks).",
  }
);

/**
 * Default discharge accumulation parameters.
 */
const AccumulateDischargeDefaultStrategySchema = Type.Object(
  {
    /** Linear scale applied to rainfall when computing a runoff proxy. */
    runoffScale: Type.Number({
      default: 1,
      minimum: 0,
      maximum: 10,
      description: "Linear scale applied to rainfall when computing a runoff proxy.",
    }),
    /** Fraction of runoff removed as infiltration (dimensionless). */
    infiltrationFraction: Type.Number({
      default: 0.15,
      minimum: 0,
      maximum: 1,
      description: "Fraction of runoff removed as infiltration (dimensionless).",
    }),
    /** How much humidity reduces runoff source (dimensionless). */
    humidityDampening: Type.Number({
      default: 0.25,
      minimum: 0,
      maximum: 1,
      description: "How much humidity reduces runoff source (dimensionless).",
    }),
    /** Minimum runoff source value (after scaling). */
    minRunoff: Type.Number({
      default: 0,
      minimum: 0,
      maximum: 200,
      description: "Minimum runoff source value (after scaling).",
    }),
  },
  {
    additionalProperties: false,
    description: "Discharge accumulation parameters (default strategy).",
  }
);

const AccumulateDischargeContract = defineOp({
  kind: "compute",
  id: "hydrology/accumulate-discharge",
  input: AccumulateDischargeInputSchema,
  output: AccumulateDischargeOutputSchema,
  strategies: {
    default: AccumulateDischargeDefaultStrategySchema,
  },
});

export default AccumulateDischargeContract;
