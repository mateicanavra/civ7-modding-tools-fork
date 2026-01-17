import { Type, TypedArraySchemas, defineOp } from "@swooper/mapgen-core/authoring";

/**
 * Computes a prevailing wind field (U/V) from latitude plus deterministic noise.
 *
 * Important invariants:
 * - RNG crosses the op boundary as *data only* (`rngSeed`). The op must construct its own local RNG.
 * - Outputs are deterministic given the same seed + inputs.
 *
 * Practical guidance:
 * - If winds feel too uniform: increase `windVariance` and/or `windJetStreaks`.
 * - If winds dominate too strongly: decrease `windJetStrength`.
 */
const ComputeAtmosphericCirculationInputSchema = Type.Object(
  {
    /** Tile grid width. */
    width: Type.Integer({ minimum: 1, description: "Tile grid width (columns)." }),
    /** Tile grid height. */
    height: Type.Integer({ minimum: 1, description: "Tile grid height (rows)." }),
    /** Latitude by row in degrees; length must equal `height`. */
    latitudeByRow: TypedArraySchemas.f32({ description: "Latitude per row (degrees)." }),
    /** Deterministic RNG seed (derived in the step; pure data). */
    rngSeed: Type.Integer({
      minimum: 0,
      maximum: 2_147_483_647,
      description: "Deterministic RNG seed (derived in the step; pure data).",
    }),
  },
  {
    additionalProperties: false,
    description: "Inputs for wind-field computation (deterministic, data-only).",
  }
);

/**
 * Wind field output (discrete i8 components).
 */
const ComputeAtmosphericCirculationOutputSchema = Type.Object(
  {
    /** Wind U component per tile (-127..127). */
    windU: TypedArraySchemas.i8({ description: "Wind U component per tile (-127..127)." }),
    /** Wind V component per tile (-127..127). */
    windV: TypedArraySchemas.i8({ description: "Wind V component per tile (-127..127)." }),
  },
  {
    additionalProperties: false,
    description: "Wind field output per tile (U/V components).",
  }
);

/**
 * Default wind-field parameters.
 */
const ComputeAtmosphericCirculationDefaultStrategySchema = Type.Object(
  {
    /** Number of jet stream bands influencing storm tracks (higher = more bands). */
    windJetStreaks: Type.Integer({
      default: 3,
      minimum: 0,
      maximum: 12,
      description: "Number of jet stream bands influencing storm tracks.",
    }),
    /** Overall jet stream intensity multiplier (higher = stronger prevailing winds). */
    windJetStrength: Type.Number({
      default: 1,
      minimum: 0,
      maximum: 5,
      description: "Overall jet stream intensity multiplier.",
    }),
    /** Directional variance applied to winds (higher = noisier/more variable). */
    windVariance: Type.Number({
      default: 0.6,
      minimum: 0,
      maximum: 2,
      description: "Directional variance applied to winds.",
    }),
  },
  {
    additionalProperties: false,
    description: "Atmospheric circulation parameters (default strategy).",
  }
);

const ComputeAtmosphericCirculationContract = defineOp({
  kind: "compute",
  id: "hydrology/compute-atmospheric-circulation",
  input: ComputeAtmosphericCirculationInputSchema,
  output: ComputeAtmosphericCirculationOutputSchema,
  strategies: {
    default: ComputeAtmosphericCirculationDefaultStrategySchema,
  },
});

export default ComputeAtmosphericCirculationContract;
